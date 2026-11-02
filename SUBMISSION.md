# GlowChem - Submission Kit

Deadline: Nov 2, 11:45 am ET = 9:45 PM Pakistan time. Aim to press Submit by 8:30 PM.

---

## 1. GitHub (do this before Devpost)

**Important: never upload your `.env` file (it holds your API key).**

1. In the glowchem folder, create a new file named `.gitignore` containing exactly one line:
   ```
   .env
   ```
2. On github.com click New repository. Name: `glowchem`. Choose **Public**, and in "Add license" pick **MIT** (the rules require a license for public repos). Do NOT tick "Add a README" (we already have one).
3. Open a terminal in the glowchem folder and run (replace YOURNAME):
   ```
   git init
   git add .
   git commit -m "GlowChem: YouCam skin scan + Irritant Watch"
   git branch -M main
   git remote add origin https://github.com/YOURNAME/glowchem.git
   git pull origin main --allow-unrelated-histories --no-edit
   git push -u origin main
   ```
   (If git is not installed: github.com > your repo > Add file > Upload files, drag everything EXCEPT `.env`.)
4. Check on github.com that `.env` is NOT listed. Only `.env.example` should be there.

---

## 2. Devpost text (copy-paste)

**Project name:** GlowChem

**Tagline:** See what your skin needs, then check what's in your products.

**Description:**

### The problem
Skincare is bought on hype, but ingredient lists are written in chemical names, and the same product can soothe one face and wreck another. A redness-prone, dry face and an oily, acne-prone face should read the same label very differently. Shoppers guess, react badly, and return products.

### What GlowChem does
GlowChem connects what the AI sees on your skin with what is actually in the bottle.

**1. Skin Scan (YouCam AI Skin Analysis API).** The user uploads or takes one selfie. Our Node server calls the YouCam API (File API, upload, `skin-analysis` task, polling) to score eight concerns: redness, moisture, oil balance, acne, pores, texture, radiance and wrinkles. Results show as an overall score, AI-estimated skin age, per-concern bars and the API's detection maps.

**2. Irritant Watch (chemistry engine).** The scan automatically builds a skin profile (sensitive, dry, acne-prone). The user pastes any product's ingredient list. Every ingredient is checked against a database of irritants, fragrance allergens, harsh surfactants, strong actives, risky preservatives and pore-cloggers, each with a one-line chemistry explanation. Scoring is weighted by (a) the ingredient's position in the list, a proxy for concentration, and (b) how relevant it is to the user's scanned skin. The output is a clear verdict: Looks gentle, Use with caution, or Not recommended, with the exact ingredients to blame and why.

### Consumer and eCommerce value
- Shoppers get an explained, personal "good for you / not for you" answer before buying.
- Retailers and brands can cut returns and adverse reactions, and build trust with transparent recommendations.
- The same engine can sit on any product page: scan once, check every product.

### How we use the YouCam API
- `POST /s2s/v2.0/file` and a PUT to the pre-signed URL to upload the selfie
- `POST /s2s/v2.0/task/skin-analysis` with 8 SD concerns (`redness, moisture, oiliness, acne, pore, texture, radiance, wrinkle`)
- `GET /s2s/v2.0/task/skin-analysis/{task_id}` polling until success, then `ui_score` and `mask_urls` are used in the interface and to drive the Irritant Watch profile
The API key stays on the server and is never exposed to the browser.

### Built by
A chemistry graduate (BS Hons Chemistry) and educator with a marketing background, which is why the ingredient science is the core of the product.

### How to run
See README in the repository. Needs Node.js 18+, no dependencies. Add the YouCam API key to `.env`, run `node server.js`, open http://localhost:3000. Setting `DEMO_MODE=true` shows the interface with sample data.

### Disclaimer
Cosmetic guidance, not medical advice. Patch-test new products.

**Built with:** Node.js, JavaScript, HTML/CSS, YouCam AI Skin Analysis API

**Women in Tech Special Award:** tick the self-identification option on the submission form.

---

## 3. Demo video script (about 2 min, speak in English, no music)

Record your screen with the browser at http://localhost:3000. Use Win+G (Xbox Game Bar) on Windows, or Zoom/OBS. Upload to YouTube as **Public** (or Unlisted is NOT enough, choose Public).

| Time | Show | Say |
|---|---|---|
| 0:00-0:15 | GlowChem home | "Hi, I'm Mujeeba. Skincare labels are written in chemistry, and the same product can help one face and irritate another. GlowChem fixes that." |
| 0:15-0:35 | Skin Scan tab, upload selfie, click Analyze | "Step one uses the YouCam AI Skin Analysis API. My server uploads the selfie through the YouCam File API, starts a skin-analysis task and polls for the result." |
| 0:35-1:00 | Results screen | "I get an overall score, skin age, and scores for redness, moisture, oil, acne, pores, texture, radiance and wrinkles, plus the API's detection maps. My redness and moisture are weak spots." |
| 1:00-1:10 | Click "Check my products" | "These results automatically set my skin profile in Irritant Watch." |
| 1:10-1:45 | Irritant Watch, click sample product | "Now I paste a product's ingredients. GlowChem flags fragrance, harsh sulfates and alcohol, coconut oil, and more, with the chemistry reason for each, and weighs them against my scan. Verdict: not recommended for me." |
| 1:45-2:00 | Paste a gentle product | "A gentle moisturiser gets 'Looks gentle'. For shoppers it means fewer bad reactions, and for retailers fewer returns. Thank you." |

Do NOT show: your API key, the `.env` file, or any logos or music you do not own.

---

## 4. Devpost checklist
- [ ] GitHub URL (public + MIT, `.env` not uploaded)
- [ ] YouTube URL (public, 1-3 min)
- [ ] Text description pasted
- [ ] Women in Tech option ticked
- [ ] Testing instructions: "Run locally per README (Node 18+, add YouCam API key to .env). DEMO_MODE=true works without a key."
- [ ] Pressed **Submit** (not just Save draft)
