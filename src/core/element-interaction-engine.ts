import {
  ElementInteractionPayload,
  InteractionResult,
  LiveElementInfo,
  LiveElementTarget,
} from '../types/browser-control';
import { LiveDOMInspector } from './live-dom-inspector';
import { NodeRegistry } from './node-registry';

export class ElementInteractionEngine {
  private registry?: NodeRegistry;
  private lastSelectedElementRef?: Element;

  constructor(registry?: NodeRegistry) {
    this.registry = registry;
  }

  public setLastSelectedElement(element: Element): void {
    this.lastSelectedElementRef = element;
  }

  /**
   * Deterministically resolve target element from target specifier
   */
  public resolveTarget(
    targetSpec: LiveElementTarget,
    doc: Document = document
  ): Element {
    // 1. Target by in-memory selected element reference
    if (targetSpec.selectedElementRef && this.lastSelectedElementRef) {
      if (doc.contains(this.lastSelectedElementRef)) {
        return this.lastSelectedElementRef;
      }
    }

    // 2. Target by LogicalNodeId (if registry available)
    if (typeof targetSpec.nodeId === 'number' && this.registry) {
      const node = this.registry.getNode(targetSpec.nodeId);
      if (node && node instanceof Element && doc.contains(node)) {
        return node;
      }
    }

    // 3. Target by CSS Selector
    if (targetSpec.selector) {
      try {
        const matches = doc.querySelectorAll(targetSpec.selector);
        if (matches.length > 1) {
          // Check if one is visibly rendered
          for (let i = 0; i < matches.length; i++) {
            const el = matches[i];
            const info = LiveDOMInspector.inspectElement(el);
            if (info.visibility.isVisible) {
              return el;
            }
          }
          return matches[0];
        } else if (matches.length === 1) {
          return matches[0];
        }
      } catch (err: any) {
        throw new Error(`Invalid CSS selector "${targetSpec.selector}": ${err.message}`);
      }
    }

    // 4. Target by XPath
    if (targetSpec.xpath && doc.evaluate) {
      try {
        const result = doc.evaluate(
          targetSpec.xpath,
          doc,
          null,
          XPathResult.FIRST_ORDERED_NODE_TYPE,
          null
        );
        if (result.singleNodeValue && result.singleNodeValue instanceof Element) {
          return result.singleNodeValue;
        }
      } catch (err: any) {
        throw new Error(`Invalid XPath "${targetSpec.xpath}": ${err.message}`);
      }
    }

    // 5. Target by Coordinates
    if (targetSpec.coordinates && doc.elementFromPoint) {
      const { x, y } = targetSpec.coordinates;
      const el = doc.elementFromPoint(x, y);
      if (el) return el;
    }

    throw new Error(
      `Target element could not be resolved from specifier: ${JSON.stringify(targetSpec)}`
    );
  }

  /**
   * Execute an interaction on a live element and measure its immediate before/after effects
   */
  public async interact(
    payload: ElementInteractionPayload,
    doc: Document = document
  ): Promise<InteractionResult> {
    const startTime = Date.now();
    const targetElement = this.resolveTarget(payload.target, doc);

    // 1. Capture Before State
    const beforeState = LiveDOMInspector.inspectElement(targetElement, this.registry);

    // Track effects during interaction window
    let mutationCount = 0;
    const runtimeErrors: string[] = [];
    const observer = new MutationObserver((mutations) => {
      mutationCount += mutations.length;
    });

    try {
      observer.observe(doc.body || doc.documentElement, {
        childList: true,
        attributes: true,
        characterData: true,
        subtree: true,
      });
    } catch {
      // Ignored if body unattached
    }

    const errorHandler = (evt: ErrorEvent) => {
      runtimeErrors.push(evt.message || 'Runtime Error');
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('error', errorHandler);
    }

    // 2. Perform the User Action
    try {
      await this.dispatchAction(targetElement, payload);
    } finally {
      if (typeof window !== 'undefined') {
        window.removeEventListener('error', errorHandler);
      }
    }

    // 3. Stabilization Delay (if requested)
    let stabilized = true;
    if (payload.options?.waitForStabilization) {
      const timeoutMs = payload.options.stabilizationTimeoutMs || 300;
      await new Promise((resolve) => setTimeout(resolve, Math.min(2000, timeoutMs)));
    }

    observer.disconnect();

    // 4. Capture After State (check if still in DOM)
    let afterState: LiveElementInfo | undefined = undefined;
    if (doc.contains(targetElement)) {
      afterState = LiveDOMInspector.inspectElement(targetElement, this.registry);
    }

    const durationMs = Date.now() - startTime;

    return {
      success: true,
      action: payload.action,
      target: afterState || beforeState,
      beforeState,
      afterState,
      effects: {
        domMutations: mutationCount,
        consoleErrors: 0,
        networkRequests: 0,
        runtimeErrors,
      },
      durationMs,
      stabilized,
    };
  }

  /**
   * Dispatch action-specific native and synthetic events
   */
  private async dispatchAction(element: Element, payload: ElementInteractionPayload): Promise<void> {
    const htmlEl = element as HTMLElement;

    switch (payload.action) {
      case 'click': {
        this.scrollIntoViewIfNeeded(element);
        this.dispatchMouseEvent(element, 'pointerdown');
        this.dispatchMouseEvent(element, 'mousedown');
        if (typeof htmlEl.focus === 'function') htmlEl.focus();
        this.dispatchMouseEvent(element, 'pointerup');
        this.dispatchMouseEvent(element, 'mouseup');
        if (typeof htmlEl.click === 'function') {
          htmlEl.click();
        } else {
          this.dispatchMouseEvent(element, 'click');
        }
        break;
      }

      case 'double_click': {
        this.scrollIntoViewIfNeeded(element);
        this.dispatchMouseEvent(element, 'click');
        this.dispatchMouseEvent(element, 'click');
        this.dispatchMouseEvent(element, 'dblclick');
        break;
      }

      case 'right_click': {
        this.scrollIntoViewIfNeeded(element);
        this.dispatchMouseEvent(element, 'pointerdown', { button: 2 });
        this.dispatchMouseEvent(element, 'mousedown', { button: 2 });
        this.dispatchMouseEvent(element, 'contextmenu', { button: 2 });
        break;
      }

      case 'hover': {
        this.dispatchMouseEvent(element, 'pointerenter');
        this.dispatchMouseEvent(element, 'mouseenter');
        this.dispatchMouseEvent(element, 'mouseover');
        this.dispatchMouseEvent(element, 'mousemove');
        break;
      }

      case 'focus': {
        if (typeof htmlEl.focus === 'function') {
          htmlEl.focus();
        }
        element.dispatchEvent(new FocusEvent('focus', { bubbles: true }));
        break;
      }

      case 'blur': {
        if (typeof htmlEl.blur === 'function') {
          htmlEl.blur();
        }
        element.dispatchEvent(new FocusEvent('blur', { bubbles: true }));
        break;
      }

      case 'type': {
        const text = payload.text || '';
        const inputEl = element as HTMLInputElement | HTMLTextAreaElement;

        if (typeof htmlEl.focus === 'function') htmlEl.focus();

        for (const char of text) {
          element.dispatchEvent(new KeyboardEvent('keydown', { key: char, bubbles: true }));
          element.dispatchEvent(new KeyboardEvent('keypress', { key: char, bubbles: true }));

          if ('value' in inputEl) {
            inputEl.value = (inputEl.value || '') + char;
          }

          element.dispatchEvent(new InputEvent('input', { data: char, inputType: 'insertText', bubbles: true }));
          element.dispatchEvent(new KeyboardEvent('keyup', { key: char, bubbles: true }));
        }

        element.dispatchEvent(new Event('change', { bubbles: true }));
        break;
      }

      case 'clear': {
        const inputEl = element as HTMLInputElement | HTMLTextAreaElement;
        if ('value' in inputEl) {
          inputEl.value = '';
          element.dispatchEvent(new InputEvent('input', { inputType: 'deleteContentBackward', bubbles: true }));
          element.dispatchEvent(new Event('change', { bubbles: true }));
        }
        break;
      }

      case 'press_key': {
        const key = payload.key || 'Enter';
        element.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
        element.dispatchEvent(new KeyboardEvent('keypress', { key, bubbles: true }));
        element.dispatchEvent(new KeyboardEvent('keyup', { key, bubbles: true }));
        break;
      }

      case 'select_option': {
        const selectEl = element as HTMLSelectElement;
        if (selectEl.tagName?.toLowerCase() === 'select' && payload.optionValue) {
          selectEl.value = payload.optionValue;
          element.dispatchEvent(new Event('change', { bubbles: true }));
        }
        break;
      }

      case 'scroll_into_view': {
        this.scrollIntoViewIfNeeded(element, true);
        break;
      }

      case 'scroll': {
        const dx = payload.scrollDelta?.x || 0;
        const dy = payload.scrollDelta?.y || 0;
        if (typeof element.scrollBy === 'function') {
          element.scrollBy(dx, dy);
        }
        break;
      }

      default:
        throw new Error(`Unsupported interaction action: ${(payload as any).action}`);
    }
  }

  private scrollIntoViewIfNeeded(element: Element, force: boolean = false): void {
    if (typeof element.scrollIntoView === 'function') {
      try {
        element.scrollIntoView({ behavior: 'auto', block: 'center', inline: 'center' });
      } catch {
        // Fallback
        element.scrollIntoView(force);
      }
    }
  }

  private dispatchMouseEvent(
    element: Element,
    type: string,
    options: { button?: number; bubbles?: boolean; cancelable?: boolean } = {}
  ): void {
    const rect = element.getBoundingClientRect ? element.getBoundingClientRect() : { left: 0, top: 0, width: 0, height: 0 };
    const clientX = rect.left + rect.width / 2;
    const clientY = rect.top + rect.height / 2;

    const event = new MouseEvent(type, {
      bubbles: options.bubbles !== undefined ? options.bubbles : true,
      cancelable: options.cancelable !== undefined ? options.cancelable : true,
      clientX,
      clientY,
      button: options.button || 0,
      buttons: options.button === 2 ? 2 : 1,
    });

    element.dispatchEvent(event);
  }
}
