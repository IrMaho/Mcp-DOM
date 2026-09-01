import { describe, it, expect, beforeEach } from 'vitest';
import { LiveToolsHandler } from '../../src/mcp/live-tools-handler';

describe('LiveToolsHandler', () => {
  let handler: LiveToolsHandler;

  beforeEach(() => {
    handler = new LiveToolsHandler();
    document.body.innerHTML = `
      <div id="live-root">
        <header id="header">
          <h1 id="title">Live Page Title</h1>
        </header>
        <main id="main">
          <button id="action-btn" class="btn primary">Click Me</button>
          <input id="search-input" type="text" value="initial query" />
        </main>
      </div>
    `;
  });

  it('handles inspect_live_page', async () => {
    const res = await handler.handleToolCall('inspect_live_page', {});
    expect(res.isError).toBeUndefined();
    const data = JSON.parse((res.content[0] as any).text);
    expect(data.viewport).toBeDefined();
    expect(data.readyState).toBeDefined();
  });

  it('handles inspect_live_element', async () => {
    const res = await handler.handleToolCall('inspect_live_element', {
      selector: '#action-btn',
    });
    expect(res.isError).toBeUndefined();
    const data = JSON.parse((res.content[0] as any).text);
    expect(data.tag).toBe('button');
    expect(data.id).toBe('action-btn');
    expect(data.bestSelector).toBe('#action-btn');
  });

  it('handles get_selected_element and element picker controls', async () => {
    // 1. Initial state (no element selected)
    const initialRes = await handler.handleToolCall('get_selected_element', {});
    const initialData = JSON.parse((initialRes.content[0] as any).text);
    expect(initialData.selected).toBe(false);

    // 2. Start picker
    const startRes = await handler.handleToolCall('start_element_picker', {});
    const startData = JSON.parse((startRes.content[0] as any).text);
    expect(startData.status).toBe('PICKER_ACTIVE');

    // 3. Programmatic selection
    const btn = document.getElementById('action-btn') as HTMLElement;
    handler.getLocalController().getPicker().setSelectedElement(btn);

    // 4. Retrieve selected element
    const selectedRes = await handler.handleToolCall('get_selected_element', {});
    const selectedData = JSON.parse((selectedRes.content[0] as any).text);
    expect(selectedData.selected).toBe(true);
    expect(selectedData.element.id).toBe('action-btn');

    // 5. Stop picker
    const stopRes = await handler.handleToolCall('stop_element_picker', {});
    const stopData = JSON.parse((stopRes.content[0] as any).text);
    expect(stopData.status).toBe('PICKER_INACTIVE');
  });

  it('handles capture_page_screenshot and capture_element_screenshot', async () => {
    const pageScrRes = await handler.handleToolCall('capture_page_screenshot', {});
    const pageData = JSON.parse((pageScrRes.content[0] as any).text);
    expect(pageData.screenshotId).toBeDefined();
    expect(pageData.captureType).toBe('FULL_PAGE');
    expect(pageData.dataUrl).toContain('data:image/png');

    const elScrRes = await handler.handleToolCall('capture_element_screenshot', {
      selector: '#action-btn',
    });
    const elData = JSON.parse((elScrRes.content[0] as any).text);
    expect(elData.captureType).toBe('ELEMENT');
    expect(elData.targetSelector).toBe('#action-btn');
    expect(elData.dataUrl).toContain('data:image/png');
  });

  it('handles interact_with_element (type and click)', async () => {
    const typeRes = await handler.handleToolCall('interact_with_element', {
      action: 'type',
      selector: '#search-input',
      text: ' new query',
    });
    const typeData = JSON.parse((typeRes.content[0] as any).text);
    expect(typeData.success).toBe(true);
    expect(typeData.action).toBe('type');

    const input = document.getElementById('search-input') as HTMLInputElement;
    expect(input.value).toBe('initial query new query');
  });

  it('handles start_element_observation and stop_element_observation', async () => {
    const startRes = await handler.handleToolCall('start_element_observation', {
      selector: '#action-btn',
    });
    const startData = JSON.parse((startRes.content[0] as any).text);
    expect(startData.status).toBe('OBSERVATION_ACTIVE');

    const stopRes = await handler.handleToolCall('stop_element_observation', {});
    const stopData = JSON.parse((stopRes.content[0] as any).text);
    expect(stopData.targetSelector).toBe('#action-btn');
    expect(stopData.disappeared).toBe(false);
  });

  it('handles get_live_dom_snapshot, get_live_dom_subtree, and get_element_visual_state', async () => {
    const snapRes = await handler.handleToolCall('get_live_dom_snapshot', { format: 'html' });
    expect((snapRes.content[0] as any).text).toContain('<html');

    const subtreeRes = await handler.handleToolCall('get_live_dom_subtree', { selector: '#header' });
    expect((subtreeRes.content[0] as any).text).toContain('Live Page Title');

    const visualRes = await handler.handleToolCall('get_element_visual_state', { selector: '#action-btn' });
    const visualData = JSON.parse((visualRes.content[0] as any).text);
    expect(visualData.selector).toBe('#action-btn');
    expect(visualData.layout).toBeDefined();
  });
});
