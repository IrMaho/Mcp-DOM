import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ElementPicker } from '../../src/core/element-picker';
import { NodeRegistry } from '../../src/core/node-registry';

describe('ElementPicker', () => {
  let picker: ElementPicker;
  let registry: NodeRegistry;

  beforeEach(() => {
    registry = new NodeRegistry();
    document.body.innerHTML = `
      <div id="app-root">
        <header id="app-header">
          <button id="nav-btn" class="btn primary">Menu</button>
        </header>
        <main id="main-content">
          <div id="card" class="card">
            <h2 id="card-title">Card Title</h2>
            <p id="card-desc">Card Description</p>
          </div>
        </main>
        <div id="forensic-recorder-floating-host">
          <button id="extension-internal-btn">Extension Button</button>
        </div>
      </div>
    `;
    picker = new ElementPicker({ nodeRegistry: registry });
  });

  afterEach(() => {
    picker.destroy();
  });

  it('selects element via Ctrl + Shift + Click shortcut', () => {
    const targetBtn = document.getElementById('nav-btn') as HTMLButtonElement;

    // Simulate Ctrl + Shift + Click
    const clickEvent = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      ctrlKey: true,
      shiftKey: true,
    });

    targetBtn.dispatchEvent(clickEvent);

    const selected = picker.getLastSelectedElement();
    expect(selected).not.toBeNull();
    expect(selected?.id).toBe('nav-btn');
    expect(selected?.bestSelector).toBe('#nav-btn');
  });

  it('ignores extension UI during selection', () => {
    const extBtn = document.getElementById('extension-internal-btn') as HTMLButtonElement;

    const clickEvent = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      ctrlKey: true,
      shiftKey: true,
    });

    extBtn.dispatchEvent(clickEvent);

    const selected = picker.getLastSelectedElement();
    expect(selected).toBeNull();
  });

  it('supports explicit picker mode and hover highlights', () => {
    picker.startPicker();

    const card = document.getElementById('card') as HTMLElement;

    // Simulate hover
    const mouseMoveEvent = new MouseEvent('mousemove', {
      bubbles: true,
      clientX: 50,
      clientY: 50,
    });
    card.dispatchEvent(mouseMoveEvent);

    const highlighter = document.getElementById('forensic-inspect-highlighter');
    expect(highlighter).not.toBeNull();

    // Click selects and stops picker
    const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
    card.dispatchEvent(clickEvent);

    const selected = picker.getLastSelectedElement();
    expect(selected?.id).toBe('card');

    picker.stopPicker();
    expect(document.getElementById('forensic-inspect-highlighter')).toBeNull();
  });
});
