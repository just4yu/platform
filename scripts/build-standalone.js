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

  // Insert inline JSON right before the main script closing tag </script> of our logic.
  // Add a <script id="devData" type="application/json">...</script>
  let out = html;

  // Ensure loader reads from devData instead of fetching public/developers.json
  out = out.replace(
    /const\s+res\s*=\s*await\s*fetch\('public\/developers\.json'\)[^;]*;[\s\S]*?const\s+raw\s*=\s*await\s*res\.json\(\);/,
    `const devDataEl = document.getElementById('devData');
                const raw = JSON.parse(devDataEl.textContent);`
  );

  // Inject the devData script before the first occurrence of our main logic script opener
  // Simpler: prepend right before </body>
  const devScript = `\n    <script id="devData" type="application/json">${devs}</script>\n`;
  out = out.replace(/\n\s*<\/body>/, devScript + '\n  </body>');

  fs.writeFileSync(HTML_OUT, out);
  console.log(`Built standalone HTML at ${HTML_OUT}`);
}

build();