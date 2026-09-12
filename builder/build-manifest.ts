// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = require("fs");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { execSync } = require("child_process");

const PACKAGE_PATH = "./package.json";
const EXTENSION_PATH = "./dist/manifest.json";
const FIREFOX = "firefox";
const CHROME = "chrome";

/**
 * Parsed contents of the package.json file.
 */
const packageJson = JSON.parse(fs.readFileSync(PACKAGE_PATH, "utf8"));
let manifest = fs.readFileSync(EXTENSION_PATH, "utf8");

manifest = JSON.parse(manifest);

// The real, authoritative version lives in git tags (bumped by the release workflow), not in the
// checked-in manifest.json - stamping it here keeps every build (CI or local) automatically in
// sync with the latest tag, with no separate value to remember to bump. Falls back to whatever's
// already in manifest.json when there's no tag reachable (e.g. a shallow clone with no tags fetched).
try {
  manifest.version = execSync("git describe --tags --abbrev=0", { encoding: "utf8" }).trim().replace(/^v/, "");
} catch {
  // no-op: keep the manifest's existing version
}

if (process.env.TARGET_BROWSER === FIREFOX) {
  delete manifest.background;
  manifest.browser_specific_settings = {
    gecko: {
      id: packageJson["browser-extension"]["firefox"]["id"],
    },
  };

  manifest.background = {
    scripts: ["background.js"],
  };
} else if (process.env.TARGET_BROWSER === CHROME) {
  delete manifest.background;
  delete manifest.browser_specific_settings;

  manifest.background = {
    service_worker: "background.js",
  };
}

manifest = JSON.stringify(manifest, null, 4);

fs.writeFileSync(EXTENSION_PATH, manifest);
