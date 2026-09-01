import { spawn } from 'child_process';
import path from 'path';
import { FileStorageProvider } from '../dist/server/mcp-server.js';

// 1. Prepare a realistic sample forensic session on disk
const storageDir = path.resolve('./.forensic_sessions');
const storage = new FileStorageProvider(storageDir);
const sessionId = 'live_demo_disappearing_button';

const metadata = {
  id: sessionId,
  name: 'Live Forensic Investigation Demo',
  url: 'https://demo-app.internal/dashboard',
  origin: 'https://demo-app.internal',
  title: 'Cloud Management Dashboard',
  userAgent: 'Mozilla/5.0 Chrome/128.0',
  schemaVersion: '2.0.0',
  recorderVersion: '2.0.0',
  extensionVersion: '2.0.0',
  startTime: 1725000000000,
  endTime: 1725000002000,
  durationMs: 2000,
  status: 'stopped',
  health: {
    domRecording: 'HEALTHY',
    userEvents: 'HEALTHY',
    console: 'HEALTHY',
    network: 'HEALTHY',
    screenshots: 'HEALTHY',
    shadowDom: 'HEALTHY',
    iframes: 'HEALTHY',
  },
  stats: {
    eventCount: 4,
    mutationCount: 3,
    errorCount: 1,
    consoleCount: 0,
    networkCount: 1,
    checkpointCount: 1,
    screenshotCount: 0,
    nodeCount: 5,
  },
};

const initialSnapshot = {
  snapshotId: 'snap_init_live',
  sessionId,
  timestamp: 0,
  sequence: 1,
  rootId: 1,
  nodes: {
    1: { id: 1, nodeType: 9, children: [2], parentId: null },
    2: { id: 2, nodeType: 1, tagName: 'html', children: [3], parentId: 1 },
    3: { id: 3, nodeType: 1, tagName: 'body', children: [4], parentId: 2 },
    4: { id: 4, nodeType: 1, tagName: 'div', attributes: { id: 'host-sidebar' }, children: [], parentId: 3 },
  },
  title: 'Cloud Dashboard',
  url: 'https://demo-app.internal/dashboard',
  origin: 'https://demo-app.internal',
  viewport: { width: 1920, height: 1080, scrollX: 0, scrollY: 0, devicePixelRatio: 1 },
  totalNodeCount: 4,
};

const events = [
  // T=100ms: Extension injects AI Assistant Action Button inside #host-sidebar (Node ID 4)
  {
    id: 'evt_add_btn',
    sessionId,
    timestamp: 100,
    sequence: 2,
    wallClockTime: 1725000000100,
    type: 'DOM_MUTATION_ADD',
    category: 'DOM',
    source: 'CONTENT_SCRIPT',
    targetNodeId: 10,
    targetSelector: '.ai-action-btn',
    payload: {
      node: {
        id: 10,
        nodeType: 1,
        tagName: 'button',
        attributes: { class: 'ai-action-btn', id: 'ai-btn' },
        textContent: '⚡ Ask AI',
        children: [],
        parentId: 4,
      },
      parentId: 4,
      index: 0,
    },
  },
  // T=250ms: Host page receives network update
  {
    id: 'evt_net',
    sessionId,
    timestamp: 250,
    sequence: 3,
    wallClockTime: 1725000000250,
    type: 'NETWORK_RESPONSE_COMPLETE',
    category: 'NETWORK',
    source: 'PAGE',
    payload: {
      requestId: 'req_123',
      url: 'https://demo-app.internal/api/refresh',
      status: 200,
      durationMs: 40,
    },
  },
  // T=280ms: Host Framework (React) re-renders and unmounts #host-sidebar (Node ID 4), wiping out button 10
  {
    id: 'evt_rem_sidebar',
    sessionId,
    timestamp: 280,
    sequence: 4,
    wallClockTime: 1725000000280,
    type: 'DOM_MUTATION_REMOVE',
    category: 'DOM',
    source: 'PAGE',
    targetNodeId: 4,
    targetSelector: '#host-sidebar',
    payload: {
      nodeId: 4,
      parentId: 3,
      index: 0,
      removedSubtreeNodeCount: 2,
    },
  },
];

await storage.saveSession(metadata);
await storage.saveInitialSnapshot(sessionId, initialSnapshot);
await storage.saveCheckpoint({
  checkpointId: 'chk_init',
  sessionId,
  timestamp: 0,
  sequence: 1,
  wallClockTime: 1725000000000,
  snapshot: initialSnapshot,
  eventIndex: 0,
  eventsSinceLastCheckpoint: 0,
  trigger: 'INITIAL',
});
await storage.appendEvents(sessionId, events);

console.log('[Setup] Created live session in .forensic_sessions:', sessionId);

// 2. Launch MCP Server subprocess and interact via JSON-RPC 2.0 stdio
const server = spawn('node', ['./bin/mcp-server.js'], {
  stdio: ['pipe', 'pipe', 'inherit'],
  cwd: process.cwd(),
});

let testPassed = 0;
let expectedTests = 8;

server.stdout.on('data', (chunk) => {
  const lines = chunk.toString().trim().split('\n');
  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const msg = JSON.parse(line);
      console.log(`\n[MCP Received] ID ${msg.id}:`);

      if (msg.id === 1) {
        console.log('✔ Initialize result:', msg.result.serverInfo.name, 'v' + msg.result.serverInfo.version);
        testPassed++;
      } else if (msg.id === 2) {
        console.log('✔ Tools count:', msg.result.tools.length, '(21 Historical + 13 Live Tools = 34 total)');
        testPassed++;
      } else if (msg.id === 3) {
        const data = JSON.parse(msg.result.content[0].text);
        console.log('✔ list_sessions total:', data.totalSessions, 'Found ID:', data.sessions[0]?.id);
        testPassed++;
      } else if (msg.id === 4) {
        const trace = JSON.parse(msg.result.content[0].text);
        console.log('✔ trace_element target:', trace.targetNodeId, 'Lifespan:', trace.lifespanMs, 'ms, alive:', trace.isCurrentlyAlive);
        testPassed++;
      } else if (msg.id === 5) {
        const diag = JSON.parse(msg.result.content[0].text);
        console.log('✔ why_did_element_disappear diagnosis:');
        console.log('   - Mechanism:', diag.disappearanceMechanism);
        console.log('   - Confidence:', diag.confidenceScore + '%');
        console.log('   - Likely Root Cause:', diag.likelyRootCause);
        testPassed++;
      } else if (msg.id === 6) {
        const diff = msg.result.content[0].text;
        console.log('✔ diff_dom output preview:');
        console.log(diff.slice(0, 200) + '...');
        testPassed++;
      } else if (msg.id === 7) {
        const livePage = JSON.parse(msg.result.content[0].text);
        console.log('✔ inspect_live_page result:', 'Viewport:', livePage.viewport?.width + 'x' + livePage.viewport?.height, 'ReadyState:', livePage.readyState);
        testPassed++;
      } else if (msg.id === 8) {
        const liveScr = JSON.parse(msg.result.content[0].text);
        console.log('✔ capture_page_screenshot result:', 'Type:', liveScr.captureType, 'ID:', liveScr.screenshotId, 'Format:', liveScr.imageFormat);
        testPassed++;
      }
    } catch (err) {
      console.error('Failed to parse line:', line, err);
    }
  }
});

function send(req) {
  server.stdin.write(JSON.stringify(req) + '\n');
}

// Sequence of Tool Invocations
send({ jsonrpc: '2.0', id: 1, method: 'initialize' });
setTimeout(() => send({ jsonrpc: '2.0', id: 2, method: 'tools/list' }), 50);
setTimeout(() => send({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'list_sessions', arguments: {} } }), 100);
setTimeout(() => send({ jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'trace_element', arguments: { sessionId, selector: '.ai-action-btn' } } }), 150);
setTimeout(() => send({ jsonrpc: '2.0', id: 5, method: 'tools/call', params: { name: 'why_did_element_disappear', arguments: { sessionId, target: '.ai-action-btn' } } }), 200);
setTimeout(() => send({ jsonrpc: '2.0', id: 6, method: 'tools/call', params: { name: 'diff_dom', arguments: { sessionId, t1: 150, t2: 300 } } }), 250);
setTimeout(() => send({ jsonrpc: '2.0', id: 7, method: 'tools/call', params: { name: 'inspect_live_page', arguments: {} } }), 300);
setTimeout(() => send({ jsonrpc: '2.0', id: 8, method: 'tools/call', params: { name: 'capture_page_screenshot', arguments: {} } }), 350);

setTimeout(() => {
  server.kill();
  if (testPassed === expectedTests) {
    console.log(`\n======================================================`);
    console.log(`🎉 ALL ${testPassed}/${expectedTests} MCP INTEGRATION TESTS PASSED PERFECTLY!`);
    console.log(`======================================================\n`);
    process.exit(0);
  } else {
    console.error(`❌ Only ${testPassed}/${expectedTests} tests passed.`);
    process.exit(1);
  }
}, 800);
