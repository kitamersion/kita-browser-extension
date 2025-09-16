![GitHub Issues or Pull Requests](https://img.shields.io/github/issues/kitamersion/kita-browser-extension?style=for-the-badge)
![GitHub Release](https://img.shields.io/github/v/release/kitamersion/kita-browser-extension?style=for-the-badge)
![GitHub License](https://img.shields.io/github/license/kitamersion/kita-browser-extension?style=for-the-badge)
[![][firefox-shield]][firefox-addon-url]
[![][chrome-shield]][chrome-addon-url]

[firefox-addon-url]: https://addons.mozilla.org/en-US/firefox/addon/kita-browser/
[firefox-shield]: https://img.shields.io/badge/Firefox-Install-blue?style=for-the-badge
[chrome-addon-url]: https://chromewebstore.google.com/detail/kita-browser/bfcnppooaljdcjdkcgdnlbggjoimlcgn
[chrome-shield]: https://img.shields.io/badge/Chrome-Install-yellow?style=for-the-badge

<div align="center">
  <a href="https://github.com/kitamersion/kita-browser-extension">
    <img src="ext/icons/enabled/icon512.png" alt="Logo" width="80" height="80">
  </a>

  <h1 align="center">Kita browser extension</h1>

  <p align="center">
    A user-friendly tool for tracking immersion across mutiple platforms.
  </p>

<a align="center" href="https://www.kitamersion.com">⭐ www.kitamersion.com ⭐</a>

</div>

**View all application images ➡️ [/image/README.md](/images/README.md)**

![kita-popup-darkmode](/images/app/kita-popup-darkmode.png)

---

## Development

### Prerequisites

- Node.js 20.19.4 (specified in `engines` field)
- npm

### Quick Start

1. **Clone and install dependencies**

```bash
git clone https://github.com/kitamersion/kita-browser-extension
cd kita-browser-extension
npm install
```

2. **Environment setup**
   Create a `.env` file from `env_template`. Set `APPLICATION_ENVIRONMENT` to:

- `dev` - Uses browser local storage (for development)
- `prod` - Uses production storage (for building extension)

  **For AniList integration in development:**
  1.  Open `scripts/get-anilist-token.html` in your browser
  2.  Enter your AniList Client ID (get this from [AniList Developer Settings](https://anilist.co/settings/developer))
  3.  Click the authorization link and approve the app
  4.  Copy the redirect URL and paste it in the token extractor
  5.  Add the extracted token to your `.env` file:
      ```
      ANILIST_ACCESS_TOKEN=your_token_here
      ```

3. **Development workflow**

```bash
# Start development mode with auto-rebuild (recommended)
npm run dev

# Or for Firefox
npm run dev:firefox

# Quick one-time build for testing
npm run dev:quick
```

4. **Load extension in browser**

- Open Chrome and go to `chrome://extensions/`
- Enable "Developer mode"
- Click "Load unpacked" and select the `./dist` folder
- **Development tip**: You only need refresh your page or click the refresh button in Chrome extensions page after changes, no need to re-import!

### Available Scripts

**Development:**

- `npm run dev` - Full development mode with watch (Chrome)
- `npm run dev:firefox` - Development mode for Firefox
- `npm run dev:quick` - Quick build without watching
- `npm run graphql:codegen:watch` - Watch GraphQL schema changes

**Production:**

- `npm run build` - Full production build
- `npm run build:chrome` - Build Chrome manifest
- `npm run build:firefox` - Build Firefox manifest

**Development server (for testing components):**

- `npm start` - Webpack dev server
- `npm run start:live` - With hot reload

**Testing:**

- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode

**Code quality:**

- `npm run lint` - Run linting and formatting
- `npm run prettier:fix` - Format code

### Development Tips

1. **First time setup:** Run `npm run dev` once to generate the initial build
2. **Daily workflow:** Just hit refresh on the extension in Chrome after `npm run dev` is running
3. **GraphQL changes:** The dev script automatically regenerates types
4. **Manifest changes:** Auto-copied when files in `./ext/` change
5. **Quick iterations:** Use `npm run dev:quick` for one-off builds
6. **Debugging:** Source maps are enabled in development mode for easier debugging

### Build Process Explained

The development build process:

1. Generates GraphQL types from schema
2. Copies extension files (manifest.json, icons) to `./dist`
3. Builds source code with Webpack (watch mode)
4. Watches for changes in `./ext/` folder and auto-copies them
5. Browser extension updates when you refresh in Chrome

### Project Structure

```
src/
├── pages/
│   ├── background/     # Service worker
│   ├── content/        # Content scripts
│   ├── popup/          # Extension popup
│   ├── settings/       # Settings page
│   └── statistics/     # Statistics page
├── components/         # Reusable React components
├── api/               # API integrations
├── context/           # React contexts
├── hooks/             # Custom React hooks
└── utils/             # Utility functions

ext/
├── manifest.json      # Base manifest template
└── icons/            # Extension icons

dist/                 # Built extension (load this in Chrome)
```

## Installation

[![](images/addon/firefox-addons.png)](https://addons.mozilla.org/en-US/firefox/addon/kita-browser/)
[![](images/addon/chrome-web-store.png)](https://chromewebstore.google.com/detail/kita-browser/bfcnppooaljdcjdkcgdnlbggjoimlcgn)
