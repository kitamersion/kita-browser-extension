#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');

const DIST_PATH = path.resolve(__dirname, '../dist');
const RELOAD_SCRIPT = `
// Auto-reload script for development
if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.reload) {
  console.log('🔄 Extension auto-reload triggered');
  chrome.runtime.reload();
}
`;

function injectReloadScript() {
  const backgroundPath = path.join(DIST_PATH, 'background.js');
  
  if (fs.existsSync(backgroundPath)) {
    let content = fs.readFileSync(backgroundPath, 'utf8');
    
    // Only inject if not already present
    if (!content.includes('Extension auto-reload triggered')) {
      content += '\n' + RELOAD_SCRIPT;
      fs.writeFileSync(backgroundPath, content);
      console.log('✅ Auto-reload script injected into background.js');
    }
  }
}

function watchAndReload() {
  console.log('🔍 Watching for changes in dist/ folder...');
  
  const watcher = chokidar.watch(DIST_PATH, {
    ignored: /\.map$/, // Ignore source map files
    persistent: true
  });

  watcher.on('change', (filePath) => {
    console.log(`📝 File changed: ${path.relative(DIST_PATH, filePath)}`);
    
    if (filePath.endsWith('background.js')) {
      // Re-inject reload script when background.js changes
      setTimeout(injectReloadScript, 100);
    }
  });

  watcher.on('ready', () => {
    console.log('👀 Initial scan complete. Ready for changes.');
    injectReloadScript();
  });
}

if (require.main === module) {
  watchAndReload();
}

module.exports = { injectReloadScript, watchAndReload };
