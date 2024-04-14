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

## Installation

[![](images/addon/firefox-addons.png)](https://addons.mozilla.org/en-US/firefox/addon/kita-browser/)
[![](images/addon/chrome-web-store.png)](https://chromewebstore.google.com/detail/kita-browser/bfcnppooaljdcjdkcgdnlbggjoimlcgn)


## Start dev environment

Create a `.env` from `env_template`. For development, set `APPLICATION_ENVIRONMENT` to `dev`. This will use browser local storage. For building and using extension set `APPLICATION_ENVIRONMENT` to `prod`.

Install dependencies

```
npm install
```

Run locally

```
npm run start
```

Build application

```
npm run build
```
