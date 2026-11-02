// GlowChem server - zero dependencies, needs Node 18+ (global fetch).
// Keeps the YouCam API key on the server and runs the 3-step YouCam flow:
//   File API -> upload to pre-signed URL -> skin-analysis task -> poll result.
const http = require('http');
const fs = require('fs');
const path = require('path');

// ---------- tiny .env loader ----------
(function loadEnv() {
  const p = path.join(__dirname, '.env');
  if (!fs.existsSync(p)) return;
  const text = fs.readFileSync(p, 'utf8').replace(/^﻿/, '');
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!m) continue;
    let v = m[2];
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!(m[1] in process.env) || process.env[m[1]] === '') process.env[m[1]] = v;
  }
})();

const PORT = Number(process.env.PORT) || 3000;
const API_BASE = process.env.YOUCAM_API_BASE || 'https://yce-api-01.makeupar.com';
const KEY = (process.env.YOUCAM_API_KEY || '').trim();
const DEMO = /^(1|true|yes)$/i.test(process.env.DEMO_MODE || '');

// 8 concerns -> 12 units per scan (SD). Chosen because they drive irritation / ingredient choice.
const CONCERNS = ['redness', 'moisture', 'oiliness', 'acne', 'pore', 'texture', 'radiance', 'wrinkle'];

const FRIENDLY_ERRORS = {
  error_below_min_image_size: 'The photo is too small. Use a photo whose shorter side is at least 480 pixels.',
  error_exceed_max_image_size: 'The photo is too large. Try a smaller one.',
  error_src_face_too_small: 'Your face is too small in the photo. Move closer so your face fills about 60-80% of the width.',
  error_src_face_out_of_bound: 'Part of your face is outside the photo. Keep your whole face in the centre of the frame.',
  error_lighting_dark: 'The photo is too dark. Face a window or a bright light and try again.',
  error_no_face: 'No face was found. Use a clear, front-facing selfie.'
};

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function youcam(method, route, body) {
  const res = await fetch(API_BASE + route, {
    method,
    headers: { Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  });
  let json = null;
  const text = await res.text();
  try { json = JSON.parse(text); } catch (e) { /* not json */ }
  if (!res.ok || !json || (json.status && json.status !== 200)) {
    const code = json && (json.error_code || json.error);
    const msg = (json && (json.error || json.message)) || text.slice(0, 200) || ('HTTP ' + res.status);
    const err = new Error(
      res.status === 401 || res.status === 403
        ? 'YouCam rejected the API key (HTTP ' + res.status + '). Check YOUCAM_API_KEY in your .env file.'
        : FRIENDLY_ERRORS[code] || 'YouCam API error: ' + msg
    );
    err.status = res.status === 401 || res.status === 403 ? 401 : 502;
    console.error('[YouCam]', method, route, res.status, text.slice(0, 500));
    throw err;
  }
  return json;
}

function findKey(obj, key, depth = 0) {
  if (!obj || typeof obj !== 'object' || depth > 5) return undefined;
  if (key in obj) return obj[key];
  for (const k of Object.keys(obj)) {
    const r = findKey(obj[k], key, depth + 1);
    if (r !== undefined) return r;
  }
  return undefined;
}

function parseResult(data) {
  const scores = {};
  const out = data && data.results && data.results.output;
  if (Array.isArray(out)) {
    for (const o of out) {
      if (!o || !o.type) continue;
      scores[o.type] = { ui: o.ui_score, raw: o.raw_score, masks: o.mask_urls || [] };
    }
  } else {
    // Fallback for score_info.json style objects: { redness: {ui_score, raw_score}, all: {score}, skin_age }
    const info = findKey(data, 'score_info') || (data && data.results) || {};
    for (const k of CONCERNS) {
      const v = info[k] || info['hd_' + k];
      if (v && typeof v === 'object') {
        const inner = v.ui_score !== undefined ? v : v.whole;
        if (inner) scores[k] = { ui: inner.ui_score, raw: inner.raw_score, masks: [] };
      }
    }
  }
  const all = findKey(data, 'all');
  const overall = all && typeof all === 'object' ? all.score : (typeof all === 'number' ? all : undefined);
  const skinAge = findKey(data, 'skin_age');
  return { scores, overall, skinAge };
}

async function analyze(buf, mime) {
  const ext = mime === 'image/png' ? 'png' : 'jpg';
  // 1) ask for an upload slot
  const f = await youcam('POST', '/s2s/v2.0/file', {
    files: [{ content_type: mime, file_name: 'selfie.' + ext, file_size: buf.length }]
  });
  const file = f.data && f.data.files && f.data.files[0];
  const reqInfo = file && file.requests && file.requests[0];
  if (!file || !reqInfo) throw new Error('YouCam did not return an upload URL.');

  // 2) upload the bytes to the pre-signed URL (calling the File API alone does NOT upload anything)
  const headers = {};
  for (const [k, v] of Object.entries(reqInfo.headers || {})) {
    if (k.toLowerCase() !== 'content-length') headers[k] = v; // fetch sets length itself
  }
  if (!headers['Content-Type'] && !headers['content-type']) headers['Content-Type'] = mime;
  const up = await fetch(reqInfo.url, { method: reqInfo.method || 'PUT', headers, body: buf });
  if (!up.ok) throw new Error('Uploading the photo to YouCam failed (HTTP ' + up.status + ').');

  // 3) start the skin-analysis task
  const t = await youcam('POST', '/s2s/v2.0/task/skin-analysis', {
    src_file_id: file.file_id,
    dst_actions: CONCERNS,
    format: 'json'
  });
  const taskId = t.data && t.data.task_id;
  if (!taskId) throw new Error('YouCam did not return a task id.');

  // 4) poll until it finishes (no units are used while it is still running)
  const started = Date.now();
  while (Date.now() - started < 90000) {
    await sleep(2000);
    const r = await youcam('GET', '/s2s/v2.0/task/skin-analysis/' + encodeURIComponent(taskId));
    const status = r.data && r.data.task_status;
    if (status === 'success') {
      const parsed = parseResult(r.data);
      if (!Object.keys(parsed.scores).length) {
        console.error('[YouCam] Unexpected result shape:', JSON.stringify(r).slice(0, 1500));
        throw new Error('The scan finished but the result format was not recognised. Please send the server log to the developer.');
      }
      return parsed;
    }
    if (status === 'error') {
      const code = (r.data && (r.data.error || r.data.error_code)) || '';
      throw Object.assign(new Error(FRIENDLY_ERRORS[code] || 'The scan failed' + (code ? ' (' + code + ')' : '') + '. Try a clearer, well-lit, front-facing selfie.'), { status: 422 });
    }
  }
  throw new Error('The scan took too long. Please try again.');
}

function demoResult() {
  const demo = { redness: 62, moisture: 58, oiliness: 74, acne: 71, pore: 69, texture: 76, radiance: 66, wrinkle: 83 };
  const scores = {};
  for (const k of CONCERNS) scores[k] = { ui: demo[k], raw: demo[k] - 4, masks: [] };
  return { scores, overall: 70, skinAge: 29, demo: true };
}

// ---------- http server ----------
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };

function readBody(req, limit = 15 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = []; let size = 0;
    req.on('data', (c) => { size += c.length; if (size > limit) { reject(Object.assign(new Error('Photo is too large.'), { status: 413 })); req.destroy(); } else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function send(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(obj));
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (req.method === 'GET' && url.pathname === '/api/health') {
      return send(res, 200, { ok: true, hasKey: !!KEY, demo: DEMO });
    }
    if (req.method === 'POST' && url.pathname === '/api/analyze') {
      if (DEMO) { await sleep(1500); return send(res, 200, demoResult()); }
      if (!KEY) return send(res, 400, { error: 'No API key found. Put your key in the .env file after YOUCAM_API_KEY= and restart the server.' });
      const body = JSON.parse((await readBody(req)) || '{}');
      const m = /^data:(image\/(?:jpeg|png));base64,(.+)$/s.exec(body.image || '');
      if (!m) return send(res, 400, { error: 'Please send a JPG or PNG photo.' });
      const buf = Buffer.from(m[2], 'base64');
      if (buf.length > 10 * 1024 * 1024) return send(res, 413, { error: 'Photo must be under 10 MB.' });
      return send(res, 200, await analyze(buf, m[1]));
    }
    if (req.method === 'GET') {
      let p = url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname);
      const file = path.join(__dirname, 'public', path.normalize(p).replace(/^(\.\.[\/\\])+/, ''));
      if (!file.startsWith(path.join(__dirname, 'public'))) { res.writeHead(403); return res.end(); }
      if (fs.existsSync(file) && fs.statSync(file).isFile()) {
        res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
        return fs.createReadStream(file).pipe(res);
      }
    }
    res.writeHead(404); res.end('Not found');
  } catch (e) {
    console.error(e);
    send(res, e.status || 500, { error: e.message || 'Server error' });
  }
});

server.listen(PORT, () => {
  console.log('\n  GlowChem is running -> http://localhost:' + PORT);
  console.log('  API key: ' + (KEY ? 'found' : 'MISSING (add it to .env)') + (DEMO ? '   |   DEMO MODE ON (sample data)' : '') + '\n');
});
