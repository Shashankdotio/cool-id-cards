# Cardverse

Cardverse is a client-side custom ID card maker built with React, Vite, and TypeScript. Card templates live in `src/templates/<id>/config.ts`, with artwork in `public/templates/<id>/`.

## Dunder Mifflin employee ID

The **the office: dunder mifflin id** template is a landscape employee card with a replaceable portrait, editable employee name and location, a job-title dropdown with a custom-title option, and a randomized Code 128 employee ID. Its back has a QR code generated from entered URL or text and an editable return message.

Template artwork is in `public/templates/dundermifflin/`. The front uses the supplied JPEG as its base and data-driven background masks to cover its sample name, photo, title, location, and barcode so the editor can render current values without modifying the original artwork.

## Gallery thumbnails

Add static gallery images in `public/previews/` using `<templateId>-front.webp` and, optionally, `<templateId>-back.webp`. PNG and JPG files are also supported. For sharp results, use approximately 1011 x 638 px for landscape cards and 638 x 1011 px for portrait cards. If a back image is absent, the gallery shows only the front; if a front image is absent, it falls back to the template's front artwork. These images are used only in the templates gallery and do not affect the editor or exports. The same naming pattern is also accepted in `public/thumbnails/`.

## Development

```sh
npm install
npm run dev
```

Run `npm run build` and `npm run lint` to validate changes.
