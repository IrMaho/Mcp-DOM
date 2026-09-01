import fs from 'fs';
import path from 'path';

async function testRealBrowserCapture() {
  console.log('======================================================');
  console.log('📸 REAL CHROME BROWSER FULL-PAGE & ELEMENT CROP TEST');
  console.log('======================================================\n');

  try {
    const healthRes = await fetch('http://127.0.0.1:3847/health');
    const health = await healthRes.json();
    console.log(`[Bridge Status]:`, health);

    if (health.connectedBrowsers === 0) {
      console.warn('\n⚠️ No Chrome tab currently connected to ws://127.0.0.1:3847.');
      console.warn('👉 Please refresh your open ChatGPT / Web tab in Google Chrome, then re-run.');
      return;
    }

    console.log(`\n✔ Detected ${health.connectedBrowsers} connected browser tab(s).`);

    // 1. Capture Full Page Screenshot
    console.log('\n[1/2] Capturing Full Page Screenshot via MCP...');
    const resPage = await fetch('http://127.0.0.1:3847/api/mcp/tool', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'capture_page_screenshot',
        arguments: {},
      }),
    });

    const mcpResultPage = await resPage.json();
    const parsedPage = JSON.parse(mcpResultPage.content[0].text);

    console.log('✔ Full Page Captured:');
    console.log(`  - URL: ${parsedPage.url}`);
    console.log(`  - Dimensions: ${parsedPage.dimensions?.width}x${parsedPage.dimensions?.height}`);

    if (parsedPage.dataUrl && parsedPage.dataUrl.startsWith('data:image/png;base64,')) {
      const base64 = parsedPage.dataUrl.replace(/^data:image\/png;base64,/, '');
      const buf = Buffer.from(base64, 'base64');
      const outPath = path.resolve('operational-tests/tools/027-capture_page_screenshot/evidence/screenshot.png');
      fs.writeFileSync(outPath, buf);
      fs.writeFileSync(path.resolve('real-browser-screenshot.png'), buf);
      console.log(`  -> Saved to: ${outPath} (${buf.length} bytes)`);
    }

    // 2. Capture Cropped Element Screenshot (#prompt-textarea or button)
    console.log('\n[2/2] Capturing Cropped Element Screenshot (#prompt-textarea) via MCP...');
    const resElem = await fetch('http://127.0.0.1:3847/api/mcp/tool', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'capture_element_screenshot',
        arguments: { selector: '#prompt-textarea' },
      }),
    });

    const mcpResultElem = await resElem.json();
    const parsedElem = JSON.parse(mcpResultElem.content[0].text);

    console.log('✔ Element Captured & Cropped:');
    console.log(`  - Target: ${parsedElem.targetSelector}`);
    console.log(`  - Bounds:`, parsedElem.targetBounds);
    console.log(`  - Cropped Dimensions: ${parsedElem.dimensions?.width}x${parsedElem.dimensions?.height}`);

    if (parsedElem.dataUrl && parsedElem.dataUrl.startsWith('data:image/png;base64,')) {
      const base64 = parsedElem.dataUrl.replace(/^data:image\/png;base64,/, '');
      const buf = Buffer.from(base64, 'base64');
      const outPath = path.resolve('operational-tests/tools/028-capture_element_screenshot/evidence/screenshot.png');
      fs.writeFileSync(outPath, buf);
      fs.writeFileSync(path.resolve('real-element-screenshot.png'), buf);
      console.log(`  -> Saved to: ${outPath} (${buf.length} bytes)`);
      console.log(`  -> Saved to: real-element-screenshot.png`);
    }

    console.log('\n🎉 ALL REAL SCREENSHOTS (PAGE + CROPPED ELEMENT) CAPTURED SUCCESSFULLY!');
  } catch (err) {
    console.error('Error communicating with bridge:', err.message);
  }
}

testRealBrowserCapture();
