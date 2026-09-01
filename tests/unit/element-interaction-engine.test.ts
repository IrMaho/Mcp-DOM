import { describe, it, expect, beforeEach } from 'vitest';
import { ElementInteractionEngine } from '../../src/core/element-interaction-engine';
import { NodeRegistry } from '../../src/core/node-registry';

describe('ElementInteractionEngine', () => {
  let engine: ElementInteractionEngine;
  let registry: NodeRegistry;

  beforeEach(() => {
    registry = new NodeRegistry();
    engine = new ElementInteractionEngine(registry);
    document.body.innerHTML = `
      <div id="interactive-page">
        <button id="counter-btn">Clicks: <span id="count">0</span></button>
        <input id="text-input" type="text" value="" />
        <select id="fruit-select">
          <option value="apple">Apple</option>
          <option value="banana">Banana</option>
          <option value="orange">Orange</option>
        </select>
      </div>
    `;

    const btn = document.getElementById('counter-btn') as HTMLButtonElement;
    const countSpan = document.getElementById('count') as HTMLElement;
    let count = 0;
    btn.addEventListener('click', () => {
      count++;
      countSpan.textContent = String(count);
    });
  });

  it('interacts with a button via click and measures state change', async () => {
    const result = await engine.interact({
      action: 'click',
      target: { selector: '#counter-btn' },
    });

    expect(result.success).toBe(true);
    expect(result.action).toBe('click');
    expect(result.target.id).toBe('counter-btn');

    const countSpan = document.getElementById('count');
    expect(countSpan?.textContent).toBe('1');
  });

  it('types text into an input field and triggers input events', async () => {
    const input = document.getElementById('text-input') as HTMLInputElement;
    let receivedInput = '';
    input.addEventListener('input', (e) => {
      receivedInput = (e.target as HTMLInputElement).value;
    });

    const result = await engine.interact({
      action: 'type',
      target: { selector: '#text-input' },
      text: 'Antigravity AI',
    });

    expect(result.success).toBe(true);
    expect(input.value).toBe('Antigravity AI');
    expect(receivedInput).toBe('Antigravity AI');
  });

  it('clears an input field', async () => {
    const input = document.getElementById('text-input') as HTMLInputElement;
    input.value = 'Existing content';

    const result = await engine.interact({
      action: 'clear',
      target: { selector: '#text-input' },
    });

    expect(result.success).toBe(true);
    expect(input.value).toBe('');
  });

  it('selects option in a dropdown', async () => {
    const select = document.getElementById('fruit-select') as HTMLSelectElement;

    const result = await engine.interact({
      action: 'select_option',
      target: { selector: '#fruit-select' },
      optionValue: 'banana',
    });

    expect(result.success).toBe(true);
    expect(select.value).toBe('banana');
  });

  it('throws structured error when target cannot be found', async () => {
    await expect(
      engine.interact({
        action: 'click',
        target: { selector: '#non-existent-element' },
      })
    ).rejects.toThrow('Target element could not be resolved');
  });
});
