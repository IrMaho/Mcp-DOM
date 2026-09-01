import fs from 'fs';
import { JSDOM } from 'jsdom';
// Browser Forensic MCP Server Runner (v2.0.0)
import { ForensicMCPServer } from '../dist/server/mcp-server.js';

if (typeof document === 'undefined') {
  let fixtureHtml = `<!DOCTYPE html>
<html>
<head><title>Live DOM</title></head>
<body>
  <header class="card"><h1>Operational DOM Test Fixture</h1></header>
  <main id="main-content">
    <section id="interactive-section">
      <button id="primary-action-btn" class="btn">⚡ Run Analysis</button>
      <input id="search-input" class="input-field" type="text" value="initial query"/>
      <div id="removable-card"><span id="removable-label">Card</span></div>
    </section>
  </main>
</body>
</html>`;

  if (process.env.DOM_FIXTURE_PATH && fs.existsSync(process.env.DOM_FIXTURE_PATH)) {
    fixtureHtml = fs.readFileSync(process.env.DOM_FIXTURE_PATH, 'utf-8');
  }

  const dom = new JSDOM(fixtureHtml, {
    url: 'https://app.internal/dashboard',
    pretendToBeVisual: true,
    runScripts: 'dangerously',
  });

  global.window = dom.window;
  global.document = dom.window.document;
  global.Element = dom.window.Element;
  global.HTMLElement = dom.window.HTMLElement;
  global.HTMLInputElement = dom.window.HTMLInputElement;
  global.HTMLSelectElement = dom.window.HTMLSelectElement;
  global.HTMLCanvasElement = dom.window.HTMLCanvasElement;
  global.MouseEvent = dom.window.MouseEvent;
  global.KeyboardEvent = dom.window.KeyboardEvent;
  global.CustomEvent = dom.window.CustomEvent;
  global.MutationObserver = dom.window.MutationObserver;
}

const server = new ForensicMCPServer();
server.startStdio();
