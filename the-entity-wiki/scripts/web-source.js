// Canonical UI source. Legacy HTML fallback supports older checked-out snapshots.
const fs = require('fs');
const path = require('path');
const web = path.resolve(__dirname, '..', 'web');
const UI_SOURCE_PATH = fs.existsSync(path.join(web, 'app.jsx')) ? path.join(web, 'app.jsx') : path.join(web, 'index.html');
module.exports = { UI_SOURCE_PATH, readUiSource: () => fs.readFileSync(UI_SOURCE_PATH, 'utf8') };
