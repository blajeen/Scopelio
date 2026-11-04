const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const target = path.join(root, 'dist', 'scopelio');
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.cpSync(path.join(root, 'extension'), target, { recursive: true });
const manifest = JSON.parse(fs.readFileSync(path.join(target, 'manifest.json'), 'utf8'));
for (const file of ['popup.html', 'popup.css', 'identity.css', 'popup.js', 'shared.js', 'i18n.js', 'matcher.js', 'orbit.js', 'content.js', 'background.js', '_locales/en/messages.json', '_locales/pt_BR/messages.json', ...Object.values(manifest.icons)]) {
  if (!fs.existsSync(path.join(target, file))) throw new Error(`Missing asset: ${file}`);
}
if (process.platform === 'win32') {
  const escape = value => "'" + value.replaceAll("'", "''") + "'";
  const output = path.join(root, 'dist', `scopelio-${manifest.version}.zip`);
  execFileSync('powershell.exe', ['-NoProfile', '-Command', `Compress-Archive -Path ${escape(path.join(target, '*'))} -DestinationPath ${escape(output)} -Force`]);
  console.log(`Package: ${output}`);
}
console.log(`Unpacked extension: ${target}`);
