import { describe, it, expect, beforeEach } from 'vitest';
import { ForensicMCPServer } from '../../src/mcp/server';
import { MemoryStorageProvider } from '../../src/storage/memory-storage';

describe('E2E: Live Browser Injected UI Debugging & Visual Forensics', () => {
  let server: ForensicMCPServer;
  let storage: MemoryStorageProvider;

  beforeEach(() => {
    storage = new MemoryStorageProvider();
    server = new ForensicMCPServer(storage);

    // Setup realistic host application with injected extension UI
    document.body.innerHTML = `
      <div id="host-application">
        <header id="host-header">
          <h1>Customer Portal</h1>
        </header>
        <main id="host-main-container">
          <div id="account-card" class="card">
            <h2>Account Details</h2>
            <p>Welcome back, User!</p>
          </div>
          <!-- Dynamically injected extension widget -->
          <div id="injected-assistant-widget" class="assistant-panel" style="display: block; opacity: 1;">
            <span id="widget-label">AI Coding Assistant</span>
            <button id="injected-action-btn" class="ai-btn" style="width: 120px; height: 36px;">
              Trigger Action
            </button>
          </div>
        </main>
      </div>
    `;

    // Host application logic: clicking the button triggers a virtual DOM re-render that replaces #host-main-container
    const injectedBtn = document.getElementById('injected-action-btn') as HTMLButtonElement;
    injectedBtn.addEventListener('click', () => {
      const mainContainer = document.getElementById('host-main-container');
      if (mainContainer) {
        // Simulates host framework (React/Vue/Angular) wiping injected DOM during state update
        mainContainer.innerHTML = `
          <div id="account-card" class="card">
            <h2>Account Details</h2>
            <p>Welcome back, User!</p>
            <div class="alert success">Action Completed!</div>
          </div>
        `;
      }
    });
  });

  it('autonomous AI agent inspects, selects, observes, interacts, and diagnoses why injected UI disappeared', async () => {
    // -------------------------------------------------------------
    // Step 1: User selects target element via Ctrl + Shift + Click
    // -------------------------------------------------------------
    const targetBtn = document.getElementById('injected-action-btn') as HTMLElement;
    targetBtn.dispatchEvent(
      new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        ctrlKey: true,
        shiftKey: true,
      })
    );

    // -------------------------------------------------------------
    // Step 2: Agent retrieves selected element via MCP
    // -------------------------------------------------------------
    const selectedRes = await server.handleRequest({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: { name: 'get_selected_element', arguments: {} },
    });

    expect(selectedRes?.result).toBeDefined();
    const selectedData = JSON.parse((selectedRes?.result as any).content[0].text);
    expect(selectedData.selected).toBe(true);
    expect(selectedData.element.id).toBe('injected-action-btn');
    expect(selectedData.element.bestSelector).toBe('#injected-action-btn');

    // -------------------------------------------------------------
    // Step 3: Agent inspects live element & visual layout
    // -------------------------------------------------------------
    const inspectRes = await server.handleRequest({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'inspect_live_element',
        arguments: { selector: '#injected-action-btn' },
      },
    });

    const elementInfo = JSON.parse((inspectRes?.result as any).content[0].text);
    expect(elementInfo.tag).toBe('button');
    expect(elementInfo.visibility.isVisible).toBe(true);
    expect(elementInfo.context.parentChain).toContain('#injected-assistant-widget');

    // -------------------------------------------------------------
    // Step 4: Agent captures visual baseline screenshot
    // -------------------------------------------------------------
    const preScreenshotRes = await server.handleRequest({
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'capture_element_screenshot',
        arguments: { selector: '#injected-action-btn' },
      },
    });
    const preScreenshot = JSON.parse((preScreenshotRes?.result as any).content[0].text);
    expect(preScreenshot.captureType).toBe('ELEMENT');
    expect(preScreenshot.dataUrl).toContain('data:image/png');

    // -------------------------------------------------------------
    // Step 5: Agent starts focused element observation
    // -------------------------------------------------------------
    const startObsRes = await server.handleRequest({
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: {
        name: 'start_element_observation',
        arguments: { selector: '#injected-action-btn' },
      },
    });
    const obsStartData = JSON.parse((startObsRes?.result as any).content[0].text);
    expect(obsStartData.status).toBe('OBSERVATION_ACTIVE');

    // -------------------------------------------------------------
    // Step 6: Agent triggers live interaction (click)
    // -------------------------------------------------------------
    const interactRes = await server.handleRequest({
      jsonrpc: '2.0',
      id: 5,
      method: 'tools/call',
      params: {
        name: 'interact_with_element',
        arguments: {
          action: 'click',
          selector: '#injected-action-btn',
          waitForStabilization: true,
          stabilizationTimeoutMs: 100,
        },
      },
    });
    const interactData = JSON.parse((interactRes?.result as any).content[0].text);
    expect(interactData.success).toBe(true);
    expect(interactData.action).toBe('click');

    // -------------------------------------------------------------
    // Step 7: Agent stops observation and receives forensic bundle
    // -------------------------------------------------------------
    const stopObsRes = await server.handleRequest({
      jsonrpc: '2.0',
      id: 6,
      method: 'tools/call',
      params: {
        name: 'stop_element_observation',
        arguments: {},
      },
    });
    const bundle = JSON.parse((stopObsRes?.result as any).content[0].text);

    // Verify root cause diagnostics in observation bundle
    expect(bundle.targetSelector).toBe('#injected-action-btn');
    expect(bundle.disappeared).toBe(true);
    expect(bundle.disappearanceReason).toContain('unmounted');
    expect(bundle.finalState).toBeNull();
    expect(bundle.mutations.length).toBeGreaterThan(0);

    // -------------------------------------------------------------
    // Step 8: Agent captures post-interaction screenshot for visual diff
    // -------------------------------------------------------------
    const postScreenshotRes = await server.handleRequest({
      jsonrpc: '2.0',
      id: 7,
      method: 'tools/call',
      params: {
        name: 'capture_page_screenshot',
        arguments: {},
      },
    });
    const postScreenshot = JSON.parse((postScreenshotRes?.result as any).content[0].text);
    expect(postScreenshot.captureType).toBe('FULL_PAGE');
    expect(postScreenshot.dataUrl).toBeDefined();

    // -------------------------------------------------------------
    // Step 9: Agent verifies live DOM state matches diagnosis
    // -------------------------------------------------------------
    const liveSubtreeRes = await server.handleRequest({
      jsonrpc: '2.0',
      id: 8,
      method: 'tools/call',
      params: {
        name: 'get_live_dom_subtree',
        arguments: { selector: '#host-main-container' },
      },
    });
    const subtreeData = (liveSubtreeRes?.result as any).content[0].text;
    expect(subtreeData).toContain('Action Completed!');
    expect(subtreeData).not.toContain('injected-action-btn');
  });
});
