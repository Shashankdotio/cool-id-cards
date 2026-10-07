# Oscorp artwork placeholders

The SVGs in this folder are layout placeholders so the template works before custom artwork is ready.

- Replace `front-background.svg` with the front card artwork/background. Keep a portrait viewBox with the same 54:85.6 aspect ratio; the field positions are in `src/templates/oscorp/config.ts`.
- Replace `back-background.svg` with the back card artwork/background using the same portrait aspect ratio.
- Replace `magnetic-stripe.svg` and `oscorp-logo.svg` with your own stripe/logo art, keeping a transparent SVG or PNG where appropriate. Their placement is configured in `src/templates/oscorp/config.ts`.

Keep the card's standard physical size at 85.6 × 54 mm in the template config. Uploaded photos are handled locally in the browser.
