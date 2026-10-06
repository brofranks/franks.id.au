# franks.id.au

Source for https://franks.id.au. Built with Eleventy and Nunjucks. Requires Node.js 24+.

```sh
npm ci
npm run dev     # Live preview on http://127.0.0.1:8080
npm run build   # Clean production build into public/
npm test        # Content-rendering regression checks
```

All modes share `public/`. Stop the preview before running tests or a separate build. The generated site can be served by any static host.

Base styles are derived from [Lightspeed](https://git.sr.ht/~bt/lightspeed) by Bradley Taunt.

Sun, moon, email, and LinkedIn icons are from [Tabler Icons](https://github.com/tabler/tabler-icons) by Paweł Kuna (MIT).
