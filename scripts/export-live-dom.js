import fs from 'fs';
import path from 'path';

async function exportLivePageDOM() {
  console.log('======================================================');
  console.log('🌐 EXPORTING LIVE ACTIVE BROWSER DOM');
  console.log('======================================================');

  // 1. Check bridge status
  let health;
  try {
    const healthRes = await fetch('http://127.0.0.1:3847/health');
    health = await healthRes.json();
    console.log('[Bridge Status]:', health);
  } catch (err) {
    console.error('❌ Bridge server is offline. Please start it or run: dom-antigravity bridge');
    return;
  }

  if (health.connectedBrowsers === 0) {
    console.log('\n⚠️ No Chrome tab currently connected to ws://127.0.0.1:3847.');
    console.log('👉 Please press F5 / Refresh on your active Chrome tab so it connects, then run this again.\n');
    return;
  }

  // 2. Query inspect_live_page for metadata
  console.log('\n[1/2] Querying live page metadata...');
  const pageRes = await fetch('http://127.0.0.1:3847/api/mcp/tool', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'inspect_live_page',
      arguments: {},
    }),
  });
  const pageData = await pageRes.json();
  let pageInfo = {};
  try {
    pageInfo = JSON.parse(pageData.content[0].text);
    console.log('✔ Active Page Title:', pageInfo.title);
    console.log('✔ Active Page URL:', pageInfo.url);
    console.log('✔ Viewport:', `${pageInfo.viewport?.width}x${pageInfo.viewport?.height}`);
  } catch {
    console.log('Page metadata:', pageData);
  }

  // 3. Query get_live_dom_snapshot
  console.log('\n[2/2] Fetching full live DOM HTML tree...');
  const domRes = await fetch('http://127.0.0.1:3847/api/mcp/tool', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'get_live_dom_snapshot',
      arguments: { format: 'html' },
    }),
  });
  const domData = await domRes.json();
  const html = domData.content?.[0]?.text || '';

  if (!html || html.length === 0) {
    console.error('❌ Received empty DOM snapshot from browser.');
    return;
  }

  const outputPath = path.resolve(process.cwd(), 'live-active-page-dom.html');
  fs.writeFileSync(outputPath, html, 'utf-8');

  console.log('\n======================================================');
  console.log('🎉 LIVE DOM SUCCESSFULLY CAPTURED & SAVED!');
  console.log('======================================================');
  console.log('• Output File:', outputPath);
  console.log('• Total HTML Characters:', html.length.toLocaleString());
  console.log('• Total File Size:', (Buffer.byteLength(html, 'utf-8') / 1024).toFixed(2), 'KB');
  console.log('• Page Title:', pageInfo.title || 'N/A');
  console.log('• Page URL:', pageInfo.url || 'N/A');
}

exportLivePageDOM().catch(console.error);
