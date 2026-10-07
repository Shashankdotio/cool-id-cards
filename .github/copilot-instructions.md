# Project: Cardverse (fan-made custom ID card maker)

Rules for every task:
- Stack: React + Vite + TypeScript. Static site only, deployed on Vercel. 
- Fully client-side. NO backend, NO login/signup, NO accounts, NO database, NO analytics, NO ads. User photos never leave the browser.
- Keep the UI extremely simple: three screens only (landing, templates gallery, editor). No draggable windows, no modals unless necessary, no animations beyond basic hover.
- Visual style: off-white background (#fafafa), electric blue (#1a1adb) headings in a tall condensed sans-serif (Google font "Anton" or "Bebas Neue" or similar), lowercase playful copy, plain gray beveled buttons with small icons. Minimal, lots of whitespace, a few small pixel-art decorations on the landing page only.
- Templates are data-driven: each lives in src/templates/<id>/config.ts with images in public/templates/<id>/. Adding a new card must require only a new config file plus images.
- Real card size is 85.6 x 54 mm. Anything print-related must use real millimeters.
- Write clean, commented, typed code. No TODO placeholders in finished features. Keep dependencies minimal.
- Footer on every page: "Fan-made project. Not affiliated with or endorsed by any rights holders. For cosplay, props and personal use only. Not a real ID."
- After each task, tell me how to run it and what to test. 