// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = require("fs");

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

if (process.env.TARGET_BROWSER === FIREFOX) {
  manifest.browser_specific_settings = {
    gecko: {
      id: packageJson["browser-extension"]["firefox"]["id"],
    },
  };
} else if (process.env.TARGET_BROWSER === CHROME) {
  delete manifest.browser_specific_settings;
}

manifest = JSON.stringify(manifest, null, 4);

fs.writeFileSync(EXTENSION_PATH, manifest);
