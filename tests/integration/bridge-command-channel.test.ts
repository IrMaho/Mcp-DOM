import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { WebSocket } from 'ws';
import { MCPBridgeServer } from '../../src/mcp/bridge-server';
import { MemoryStorageProvider } from '../../src/storage/memory-storage';

describe('Integration: MCP Bridge Command Channel', () => {
  let bridgeServer: MCPBridgeServer;
  let clientWs: WebSocket | null = null;
  const PORT = 3899;

  beforeEach(async () => {
    bridgeServer = new MCPBridgeServer(PORT, new MemoryStorageProvider());
    await bridgeServer.start();
  });

  afterEach(async () => {
    if (clientWs && clientWs.readyState === WebSocket.OPEN) {
      clientWs.close();
    }
    await bridgeServer.stop();
  });

  it('dispatches live browser command across WebSocket and resolves response', async () => {
    // 1. Connect simulated browser extension
    clientWs = new WebSocket(`ws://127.0.0.1:${PORT}`);
    await new Promise<void>((resolve) => {
      clientWs!.on('open', () => resolve());
    });

    // 2. Setup mock browser extension handler
    clientWs.on('message', (data: string) => {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'BROWSER_COMMAND_REQUEST') {
        // Echo back a successful command response
        clientWs!.send(
          JSON.stringify({
            type: 'BROWSER_COMMAND_RESPONSE',
            id: msg.id,
            command: msg.command,
            success: true,
            data: {
              mockResult: 'LIVE_PAGE_INSPECT_SUCCESS',
              url: 'https://example.com/app',
            },
          })
        );
      }
    });

    // 3. MCP server sends command via bridge
    const result = await bridgeServer.sendCommand('LIVE_PAGE_INSPECT', {});
    expect(result.mockResult).toBe('LIVE_PAGE_INSPECT_SUCCESS');
    expect(result.url).toBe('https://example.com/app');
  });

  it('relays asynchronous ELEMENT_SELECTED notification to MCP picker', async () => {
    clientWs = new WebSocket(`ws://127.0.0.1:${PORT}`);
    await new Promise<void>((resolve) => {
      clientWs!.on('open', () => resolve());
    });

    // Simulated extension sends ELEMENT_SELECTED notification
    clientWs.send(
      JSON.stringify({
        type: 'ELEMENT_SELECTED',
        elementInfo: {
          tag: 'button',
          id: 'shortcut-selected-btn',
          bestSelector: '#shortcut-selected-btn',
          classes: ['btn'],
          text: 'Selected via Ctrl+Shift+Click',
          bounds: { x: 10, y: 20, width: 100, height: 40 },
        },
      })
    );

    // Wait brief tick for WebSocket event loop
    await new Promise((resolve) => setTimeout(resolve, 50));

    const selectedToolRes = await bridgeServer.getToolsHandler().handleToolCall('get_selected_element', {});
    const data = JSON.parse((selectedToolRes.content[0] as any).text);
    expect(data.selected).toBe(true);
    expect(data.element.id).toBe('shortcut-selected-btn');
  });
});
