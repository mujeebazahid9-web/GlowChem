# GlowChem

**See what your skin needs, then check what's in your products.**

GlowChem combines the **YouCam AI Skin Analysis API** with a chemistry-based ingredient checker:

1. **Skin Scan** - one selfie is analysed by the YouCam API (redness, moisture, oil balance, acne, pores, texture, radiance, wrinkles).
2. **Irritant Watch** - paste a product's ingredient list. Every ingredient is checked against a database of irritants, allergens and pore-cloggers, weighted by its position in the list (a proxy for concentration) and by how relevant it is to *your* scanned skin profile. The result is a clear verdict (Looks gentle / Use with caution / Not recommended) with a one-line chemistry explanation per flagged ingredient.

**Consumer / eCommerce value:** fewer bad reactions and returns, and an explained "good for you / not for you" reason for every skincare recommendation.

## YouCam API usage

Server flow (`server.js`), using the V2 API at `https://yce-api-01.makeupar.com`:

1. `POST /s2s/v2.0/file` - request an upload slot
2. `PUT` the photo to the pre-signed URL
3. `POST /s2s/v2.0/task/skin-analysis` with 8 SD concerns: `redness, moisture, oiliness, acne, pore, texture, radiance, wrinkle`
4. `GET /s2s/v2.0/task/skin-analysis/{task_id}` until `task_status` is `success`

The API key stays on the server and is never sent to the browser. One scan uses 12 units.

## Run it

Requires **Node.js 18 or newer** (https://nodejs.org). No `npm install` needed.

1. Copy `.env.example` to `.env` and paste your key after `YOUCAM_API_KEY=` (no quotes, no spaces).
2. In this folder run:
   ```
   node server.js
   ```
3. Open http://localhost:3000

Tip: set `DEMO_MODE=true` in `.env` to try the interface with sample data and no API units. Remove it for a real scan.

## Troubleshooting

- **"No API key found"** - the file must be named exactly `.env` (not `.env.txt`), and you must restart `node server.js` after editing it.
- **"YouCam rejected the API key"** - re-copy the key from the YouCam API console and make sure the redeem code was applied to the same account.
- **Face too small / too dark** - face the camera in bright light, face filling 60-80% of the photo width, forehead visible.
- **Port in use** - set `PORT=3001` in `.env`.

## Files

- `server.js` - zero-dependency Node server + YouCam API integration
- `public/index.html` - the whole interface and the Irritant Watch engine
- `.env.example` - config template

## Disclaimer

Cosmetic guidance only, not medical advice. Ingredient flags are general; concentration and formulation matter. Patch-test new products and see a dermatologist for skin conditions or allergies.

## License

MIT
