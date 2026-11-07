#!/usr/bin/env node
/* Runs the browser test harnesses headlessly against the real app.
   Usage: node tests/run.js            (all suites)
          node tests/run.js ui sync    (selected suites)
   Needs Chrome or Edge installed (or set CHROME=/path/to/browser).
   The "barcode" suite talks to the live Open Food Facts API and needs internet. */
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');
const { spawn } = require('child_process');

const root = path.resolve(__dirname, '..');
const SUITES = {
  ui: { file: 'ui.html', budget: 6000 },
  barcode: { file: 'barcode.html', budget: 45000 },
  sync: { file: 'sync.html', budget: 30000 },
};
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };

function findBrowser() {
  const candidates = [process.env.CHROME,
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/microsoft-edge'].filter(Boolean);
  return candidates.find((p) => fs.existsSync(p));
}
function serve() {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/index.html';
      const f = path.join(root, p);
      if (!f.startsWith(root)) { res.writeHead(403); res.end(); return; }
      fs.readFile(f, (e, d) => {
        if (e) { res.writeHead(404); res.end('not found'); return; }
        res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(d);
      });
    });
    srv.listen(0, '127.0.0.1', () => resolve(srv));
  });
}
const decode = (s) => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

(async () => {
  const browser = findBrowser();
  if (!browser) { console.error('No Chrome/Edge found. Set CHROME=/path/to/browser'); process.exit(2); }
  const wanted = process.argv.slice(2).filter((a) => SUITES[a]);
  const names = wanted.length ? wanted : Object.keys(SUITES);
  const srv = await serve(); const port = srv.address().port;
  let failed = 0, total = 0;
  for (const name of names) {
    const suite = SUITES[name];
    const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'fl-test-'));
    const url = `http://localhost:${port}/tests/${suite.file}`;
    // Launch asynchronously: this process also serves the pages, so a blocking spawnSync would starve the server.
    const dumpFile = path.join(profile, 'dom.html'); const fd = fs.openSync(dumpFile, 'w');
    const args = ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--no-proxy-server', `--user-data-dir=${profile}`, `--virtual-time-budget=${suite.budget}`, '--dump-dom', url];
    const r = await new Promise((resolve) => {
      const child = spawn(browser, args, { stdio: ['ignore', fd, 'ignore'] });
      const timer = setTimeout(() => { child.kill(); resolve({ error: new Error('timeout after 180s') }); }, 180000);
      child.on('exit', (code) => { clearTimeout(timer); resolve({ status: code }); });
      child.on('error', (error) => { clearTimeout(timer); resolve({ error }); });
    });
    fs.closeSync(fd);
    if (r.error) console.log('  browser error: ' + r.error.message);
    const dom = fs.existsSync(dumpFile) ? fs.readFileSync(dumpFile, 'utf8') : '';
    try { fs.rmSync(profile, { recursive: true, force: true }); } catch {}
    const m = /<pre id="test-out"[^>]*>([\s\S]*?)<\/pre>/.exec(dom);
    const lines = m ? decode(m[1]).split('\n').map((l) => l.trim()).filter(Boolean) : [];
    console.log(`\n== ${name} ==`);
    if (!lines.length || !lines.includes('DONE')) { console.log('  (no result: harness did not finish; try a larger budget or check the network)'); failed++; continue; }
    for (const l of lines) { if (l.startsWith('PASS')) total++; else if (l.startsWith('FAIL') || l.startsWith('EXC')) { failed++; console.log('  ' + l); } else if (l.startsWith('ERRORS') && l !== 'ERRORS []') { failed++; console.log('  ' + l); } else if (l !== 'DONE' && l !== 'ERRORS []') console.log('  ' + l); }
    console.log(`  ${lines.filter((l) => l.startsWith('PASS')).length} passed`);
  }
  srv.close();
  console.log(`\n${total} checks passed, ${failed} problem(s)`);
  process.exit(failed ? 1 : 0);
})();
