import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, '..');

const HTML_SRC = path.join(ROOT, 'just4u-complete-platform.html');
const DEVS_JSON = path.join(ROOT, 'public', 'developers.json');
const HTML_OUT = path.join(ROOT, 'just4u-standalone.html');

function build() {
  const html = fs.readFileSync(HTML_SRC, 'utf-8');
  const devs = fs.readFileSync(DEVS_JSON, 'utf-8');

  let out = html;

  // Remove any fetch to public/developers.json if present
  out = out.replace(/await\s*fetch\('public\/developers\.json'\)[\s\S]*?;[\s\S]*?displayDevelopers\(\);?\s*\}/, 'displayDevelopers(); }');

  // Inject window.allDevelopers assignment before </body>
  const inline = `\n    <script>window.allDevelopers = ${devs};</script>\n`;
  out = out.replace(/\n\s*<\/body>/, inline + '\n</body>');

  fs.writeFileSync(HTML_OUT, out);
  console.log(`Built standalone HTML at ${HTML_OUT}`);
}

build();