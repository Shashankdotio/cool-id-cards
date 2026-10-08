# Cardverse

Cardverse is a client-side custom ID card maker built with React, Vite, and TypeScript. Card templates live in `src/templates/<id>/config.ts`, with artwork in `public/templates/<id>/`.

## Dunder Mifflin employee ID

The **the office: dunder mifflin id** template is a landscape employee card with a replaceable portrait, editable employee name and location, a job-title dropdown with a custom-title option, and a randomized Code 128 employee ID. Its back has a QR code generated from entered URL or text and an editable return message.

Template artwork is in `public/templates/dundermifflin/`. The front uses the supplied JPEG as its base and data-driven background masks to cover its sample name, photo, title, location, and barcode so the editor can render current values without modifying the original artwork.

## Development

```sh
npm install
npm run dev
```

Run `npm run build` and `npm run lint` to validate changes.
