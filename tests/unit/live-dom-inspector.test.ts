import { describe, it, expect, beforeEach } from 'vitest';
import { LiveDOMInspector } from '../../src/core/live-dom-inspector';
import { NodeRegistry } from '../../src/core/node-registry';

describe('LiveDOMInspector', () => {
  let registry: NodeRegistry;

  beforeEach(() => {
    registry = new NodeRegistry();
    document.body.innerHTML = '';
  });

  it('inspects page-level properties correctly', () => {
    document.title = 'Test Forensic Page';
    document.body.innerHTML = `
      <div id="main-container" style="width: 1000px; height: 800px;">
        <input id="focused-input" type="text" value="hello" />
      </div>
    `;

    const input = document.getElementById('focused-input') as HTMLInputElement;
    input.focus();

    const pageInfo = LiveDOMInspector.inspectPage(document);

    expect(pageInfo.title).toBe('Test Forensic Page');
    expect(pageInfo.viewport).toBeDefined();
    expect(pageInfo.viewport.devicePixelRatio).toBeGreaterThanOrEqual(1);
    expect(pageInfo.activeElement?.selector).toContain('focused-input');
    expect(pageInfo.framesCount).toBe(0);
  });

  it('deeply inspects element metadata, selectors, styles, and state', () => {
    document.body.innerHTML = `
      <div id="app" class="wrapper container">
        <form id="login-form">
          <input
            id="user-email"
            name="email"
            data-testid="login-email-input"
            type="email"
            class="input-field primary"
            value="alice@example.com"
            aria-label="User Email Address"
          />
          <button id="submit-btn" type="submit" role="button" disabled>Submit</button>
        </form>
      </div>
    `;

    const input = document.getElementById('user-email') as HTMLInputElement;
    const btn = document.getElementById('submit-btn') as HTMLButtonElement;

    const inputInfo = LiveDOMInspector.inspectElement(input, registry);
    expect(inputInfo.tag).toBe('input');
    expect(inputInfo.id).toBe('user-email');
    expect(inputInfo.classes).toContain('input-field');
    expect(inputInfo.classes).toContain('primary');
    expect(inputInfo.bestSelector).toBe('#user-email');
    expect(inputInfo.selectorCandidates).toContain('input[data-testid="login-email-input"]');
    expect(inputInfo.ariaAttributes?.['aria-label']).toBe('User Email Address');
    expect(inputInfo.context.parentChain).toContain('#login-form');
    expect(inputInfo.forensics?.isRecorded).toBe(false);

    const btnInfo = LiveDOMInspector.inspectElement(btn, registry);
    expect(btnInfo.tag).toBe('button');
    expect(btnInfo.role).toBe('button');
    expect(btnInfo.state.disabled).toBe(true);
  });

  it('masks sensitive input values and passwords', () => {
    document.body.innerHTML = `
      <form>
        <input id="pwd" type="password" name="password" value="SuperSecret123" />
        <input id="token" type="text" name="authToken" value="Bearer abcxyz987" />
      </form>
    `;

    const pwd = document.getElementById('pwd') as HTMLInputElement;
    const token = document.getElementById('token') as HTMLInputElement;

    const pwdInfo = LiveDOMInspector.inspectElement(pwd);
    expect(pwdInfo.value).toBe('••••••••');

    const tokenInfo = LiveDOMInspector.inspectElement(token);
    expect(tokenInfo.value).toBe('••••••••');
  });

  it('inspects detailed visual and occlusion state', () => {
    document.body.innerHTML = `
      <div id="hidden-box" style="display: none; width: 200px; height: 100px;">
        <span id="child-span">Hidden content</span>
      </div>
    `;

    const hiddenBox = document.getElementById('hidden-box') as HTMLElement;
    const visualState = LiveDOMInspector.inspectVisualState(hiddenBox);

    expect(visualState.selector).toBe('#hidden-box');
    expect(visualState.occlusion.isDisplayNone).toBe(true);
  });
});
