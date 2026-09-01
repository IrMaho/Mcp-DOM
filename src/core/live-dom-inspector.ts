import { LiveElementInfo, LivePageInfo, ElementVisualState } from '../types/browser-control';
import { NodeRegistry } from './node-registry';
import { PrivacyEngine } from './privacy-engine';

export class LiveDOMInspector {
  private static privacyEngine = new PrivacyEngine();

  /**
   * Inspect high-level state of the active browser page/document
   */
  public static inspectPage(doc: Document = document): LivePageInfo {
    const win = doc.defaultView || (typeof window !== 'undefined' ? window : ({} as any));
    const activeEl = doc.activeElement as HTMLElement | null;

    return {
      url: win.location?.href || doc.location?.href || '',
      title: doc.title || '',
      origin: win.location?.origin || '',
      viewport: {
        width: win.innerWidth || doc.documentElement?.clientWidth || 1920,
        height: win.innerHeight || doc.documentElement?.clientHeight || 1080,
        scrollX: win.scrollX || win.pageXOffset || doc.documentElement?.scrollLeft || 0,
        scrollY: win.scrollY || win.pageYOffset || doc.documentElement?.scrollTop || 0,
        devicePixelRatio: win.devicePixelRatio || 1,
      },
      documentDimensions: {
        width: Math.max(doc.body?.scrollWidth || 0, doc.documentElement?.scrollWidth || 0),
        height: Math.max(doc.body?.scrollHeight || 0, doc.documentElement?.scrollHeight || 0),
      },
      activeElement: activeEl
        ? {
            tag: activeEl.tagName?.toLowerCase() || '',
            selector: this.computeBestSelector(activeEl),
            text: activeEl.textContent?.slice(0, 100).trim(),
          }
        : undefined,
      focusedElement: (typeof doc.hasFocus === 'function' && doc.hasFocus() && activeEl)
        ? {
            tag: activeEl.tagName?.toLowerCase() || '',
            selector: this.computeBestSelector(activeEl),
          }
        : undefined,
      visibilityState: doc.visibilityState || 'visible',
      readyState: doc.readyState || 'complete',
      framesCount: doc.querySelectorAll ? doc.querySelectorAll('iframe, frame').length : 0,
    };
  }

  /**
   * Deeply inspect a live DOM element with complete metadata, geometry, styles, and context
   */
  public static inspectElement(element: Element, registry?: NodeRegistry): LiveElementInfo {
    const doc = element.ownerDocument || document;
    const win = doc.defaultView || (typeof window !== 'undefined' ? window : ({} as any));
    const htmlEl = element as HTMLElement;

    // 1. Tag & Class
    const tag = element.tagName ? element.tagName.toLowerCase() : 'element';
    const classList = this.extractClasses(element);

    // 2. Selectors
    const { bestSelector, candidates } = this.generateSelectorCandidates(element);

    // 3. Attributes
    const attributes: Record<string, string> = {};
    const ariaAttributes: Record<string, string> = {};
    if (element.attributes) {
      for (let i = 0; i < element.attributes.length; i++) {
        const attr = element.attributes[i];
        if (attr) {
          attributes[attr.name] = attr.value;
          if (attr.name.startsWith('aria-')) {
            ariaAttributes[attr.name] = attr.value;
          }
        }
      }
    }

    // 4. Role & Text
    const role = element.getAttribute('role') || this.inferImplicitRole(element);
    const isMasked = this.privacyEngine.shouldMaskText(element);
    const rawText = element.textContent || '';
    const text = this.privacyEngine.sanitizeText(rawText, isMasked);
    const normalizedText = text.replace(/\s+/g, ' ').trim();

    // 5. Value (for inputs/selects/textareas)
    let value: string | undefined = undefined;
    const inputEl = element as HTMLInputElement;
    if (typeof inputEl.value === 'string') {
      value = this.privacyEngine.maskValue(inputEl.value, inputEl.type, inputEl.name);
    }

    // 6. Geometry & Bounds
    const rect = element.getBoundingClientRect ? element.getBoundingClientRect() : {
      x: 0, y: 0, width: 0, height: 0, top: 0, right: 0, bottom: 0, left: 0,
    };
    const bounds = {
      x: rect.x ?? rect.left ?? 0,
      y: rect.y ?? rect.top ?? 0,
      width: rect.width ?? 0,
      height: rect.height ?? 0,
      top: rect.top ?? 0,
      right: rect.right ?? 0,
      bottom: rect.bottom ?? 0,
      left: rect.left ?? 0,
    };

    // 7. Computed Styles
    const computed = win.getComputedStyle ? win.getComputedStyle(element) : null;
    const display = computed?.display || 'block';
    const visibility = computed?.visibility || 'visible';
    const opacity = computed ? parseFloat(computed.opacity) || 1 : 1;
    const pointerEvents = computed?.pointerEvents || 'auto';
    const zIndex = computed?.zIndex || 'auto';

    // 8. Visibility Analysis
    const vpWidth = win.innerWidth || doc.documentElement?.clientWidth || 1920;
    const vpHeight = win.innerHeight || doc.documentElement?.clientHeight || 1080;
    const hasLayout = bounds.width > 0 || bounds.height > 0 || bounds.right > 0 || bounds.bottom > 0;

    const isInViewport = !hasLayout || (
      bounds.right > 0 &&
      bounds.bottom > 0 &&
      bounds.left < vpWidth &&
      bounds.top < vpHeight
    );

    const isClipped = hasLayout && (
      bounds.right <= 0 ||
      bounds.bottom <= 0 ||
      bounds.left >= vpWidth ||
      bounds.top >= vpHeight
    );

    const isVisible =
      !isClipped &&
      display !== 'none' &&
      visibility !== 'hidden' &&
      opacity > 0 &&
      isInViewport;

    // 9. Element State
    const state = {
      disabled: (htmlEl as any).disabled ?? element.hasAttribute('disabled'),
      readOnly: (htmlEl as any).readOnly ?? element.hasAttribute('readonly'),
      checked: (htmlEl as any).checked,
      selected: (htmlEl as any).selected,
      focused: doc.activeElement === element,
      isShadowHost: !!element.shadowRoot,
      hasShadowRoot: !!element.shadowRoot,
    };

    // 10. Parent Chain & Context
    const parentChain: string[] = [];
    let curr: Element | null = element.parentElement;
    while (curr && curr.tagName && curr.tagName.toLowerCase() !== 'html') {
      parentChain.push(this.computeBestSelector(curr));
      curr = curr.parentElement;
    }

    const childrenSummary = {
      count: element.children ? element.children.length : 0,
      tags: element.children
        ? Array.from(element.children).slice(0, 10).map((c) => c.tagName.toLowerCase())
        : [],
    };

    // 11. Forensics correlation
    let forensics: LiveElementInfo['forensics'] = undefined;
    if (registry) {
      const logicalId = registry.getId(element);
      forensics = {
        logicalNodeId: logicalId ?? null,
        creationSequence: null,
        lastMutationSequence: null,
        eventCount: 0,
        isRecorded: logicalId !== null && logicalId !== undefined,
      };
    }

    return {
      tag,
      id: element.id || undefined,
      classes: classList,
      role: role || undefined,
      ariaAttributes: Object.keys(ariaAttributes).length > 0 ? ariaAttributes : undefined,
      text: text.slice(0, 200),
      normalizedText: normalizedText.slice(0, 200),
      value,
      type: (inputEl as any).type || undefined,
      selector: bestSelector,
      bestSelector,
      selectorCandidates: candidates,
      bounds,
      visibility: {
        isVisible,
        display,
        visibility,
        opacity,
        pointerEvents,
        isClipped,
        isInViewport,
        zIndex,
      },
      computedStyle: computed
        ? {
            display,
            visibility,
            opacity: String(opacity),
            position: computed.position,
            zIndex: String(zIndex),
            pointerEvents,
            overflow: computed.overflow,
            boxSizing: computed.boxSizing,
            color: computed.color,
            backgroundColor: computed.backgroundColor,
            fontSize: computed.fontSize,
          }
        : {},
      attributes,
      state,
      context: {
        parentChain,
        parentSelector: parentChain[0] || undefined,
        childrenSummary,
        containingBlock: computed?.position === 'fixed' ? 'viewport' : parentChain[0] || undefined,
        iframe: null,
        shadowRoot: element.shadowRoot ? 'open' : null,
      },
      forensics,
    };
  }

  /**
   * Inspect detailed visual and occlusion state
   */
  public static inspectVisualState(element: Element): ElementVisualState {
    const doc = element.ownerDocument || document;
    const win = doc.defaultView || (typeof window !== 'undefined' ? window : ({} as any));
    const rect = element.getBoundingClientRect ? element.getBoundingClientRect() : {
      x: 0, y: 0, width: 0, height: 0, top: 0, right: 0, bottom: 0, left: 0,
    };
    const computed = win.getComputedStyle ? win.getComputedStyle(element) : null;

    const vpWidth = win.innerWidth || doc.documentElement?.clientWidth || 1920;
    const vpHeight = win.innerHeight || doc.documentElement?.clientHeight || 1080;
    const scrollX = win.scrollX || win.pageXOffset || 0;
    const scrollY = win.scrollY || win.pageYOffset || 0;
    const dpr = win.devicePixelRatio || 1;

    const display = computed?.display || 'block';
    const visibility = computed?.visibility || 'visible';
    const opacity = computed ? parseFloat(computed.opacity) || 1 : 1;

    const isInViewport =
      rect.right > 0 && rect.bottom > 0 && rect.left < vpWidth && rect.top < vpHeight;
    const isZeroDimension = rect.width === 0 || rect.height === 0;
    const isOffscreen = rect.right <= 0 || rect.bottom <= 0 || rect.left >= vpWidth || rect.top >= vpHeight;

    // Check top element at center point
    let occludedBy: string | null = null;
    if (doc.elementFromPoint && isInViewport && !isZeroDimension && display !== 'none') {
      const centerX = Math.max(0, Math.min(vpWidth - 1, rect.left + rect.width / 2));
      const centerY = Math.max(0, Math.min(vpHeight - 1, rect.top + rect.height / 2));
      try {
        const topEl = doc.elementFromPoint(centerX, centerY);
        if (topEl && topEl !== element && !element.contains(topEl) && !topEl.contains(element)) {
          occludedBy = this.computeBestSelector(topEl);
        }
      } catch {
        // Ignored
      }
    }

    return {
      selector: this.computeBestSelector(element),
      bounds: {
        x: rect.x ?? rect.left ?? 0,
        y: rect.y ?? rect.top ?? 0,
        width: rect.width ?? 0,
        height: rect.height ?? 0,
        top: rect.top ?? 0,
        right: rect.right ?? 0,
        bottom: rect.bottom ?? 0,
        left: rect.left ?? 0,
      },
      viewport: {
        scrollX,
        scrollY,
        width: vpWidth,
        height: vpHeight,
        devicePixelRatio: dpr,
      },
      layout: {
        display,
        position: computed?.position || 'static',
        zIndex: computed?.zIndex || 'auto',
        opacity,
        visibility,
        overflow: computed?.overflow || 'visible',
        boxSizing: computed?.boxSizing || 'content-box',
        pointerEvents: computed?.pointerEvents || 'auto',
      },
      occlusion: {
        isInViewport,
        isClipped: isZeroDimension || isOffscreen,
        isZeroDimension,
        isTransparent: opacity === 0,
        isDisplayNone: display === 'none',
        isVisibilityHidden: visibility === 'hidden',
        isOffscreen,
        occludedBy,
      },
      computedStyleSummary: computed
        ? {
            display,
            position: computed.position,
            zIndex: computed.zIndex,
            opacity: String(opacity),
            visibility,
            pointerEvents: computed.pointerEvents,
          }
        : {},
    };
  }

  /**
   * Helper: Generate a ranked list of selector candidates and the best one
   */
  public static generateSelectorCandidates(element: Element): { bestSelector: string; candidates: string[] } {
    const doc = element.ownerDocument || document;
    const tag = element.tagName ? element.tagName.toLowerCase() : 'element';
    const candidates: string[] = [];

    // 1. Stable ID
    if (element.id && /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(element.id)) {
      const idSel = `#${element.id}`;
      try {
        if (doc.querySelectorAll && doc.querySelectorAll(idSel).length === 1) {
          candidates.push(idSel);
        }
      } catch {
        candidates.push(idSel);
      }
    }

    // 2. Test IDs / Semantic attributes
    const testAttrs = ['data-testid', 'data-test', 'data-id', 'data-qa', 'data-cy', 'aria-label', 'name'];
    for (const attr of testAttrs) {
      const val = element.getAttribute(attr);
      if (val && /^[a-zA-Z0-9_-]+$/.test(val)) {
        const attrSel = `${tag}[${attr}="${val}"]`;
        try {
          if (doc.querySelectorAll && doc.querySelectorAll(attrSel).length === 1) {
            candidates.push(attrSel);
          }
        } catch {
          candidates.push(attrSel);
        }
      }
    }

    // 3. Class combination
    const classes = this.extractClasses(element).filter(
      (c) => /^[a-zA-Z0-9_-]+$/.test(c) && !c.startsWith('ng-') && !c.startsWith('_ng')
    );
    if (classes.length > 0) {
      const classSel = `${tag}.${classes.slice(0, 3).join('.')}`;
      try {
        if (doc.querySelectorAll && doc.querySelectorAll(classSel).length === 1) {
          candidates.push(classSel);
        }
      } catch {
        candidates.push(classSel);
      }
    }

    // 4. Parent nth-of-type
    if (element.parentElement && element.parentElement.children) {
      const siblings = Array.from(element.parentElement.children).filter(
        (s) => s.tagName && s.tagName.toLowerCase() === tag
      );
      if (siblings.length > 1) {
        const idx = siblings.indexOf(element) + 1;
        if (idx > 0) {
          const parentSel = this.computeBestSelector(element.parentElement);
          candidates.push(`${parentSel} > ${tag}:nth-of-type(${idx})`);
        }
      }
    }

    // Fallback: tag + classes or tag alone
    const basicSel = classes.length > 0 ? `${tag}.${classes[0]}` : tag;
    candidates.push(basicSel);

    const bestSelector = candidates[0] || tag;
    return { bestSelector, candidates };
  }

  public static computeBestSelector(element: Element): string {
    return this.generateSelectorCandidates(element).bestSelector;
  }

  private static extractClasses(element: Element): string[] {
    if (element.classList && typeof element.classList.forEach === 'function') {
      return Array.from(element.classList);
    }
    if (typeof element.className === 'string') {
      return element.className.split(/\s+/).filter(Boolean);
    }
    if (element.className && typeof (element.className as any).baseVal === 'string') {
      return (element.className as any).baseVal.split(/\s+/).filter(Boolean);
    }
    return [];
  }

  private static inferImplicitRole(element: Element): string | undefined {
    const tag = element.tagName ? element.tagName.toLowerCase() : '';
    switch (tag) {
      case 'a':
        return element.hasAttribute('href') ? 'link' : undefined;
      case 'button':
        return 'button';
      case 'input': {
        const type = (element as HTMLInputElement).type || 'text';
        if (type === 'button' || type === 'submit' || type === 'reset') return 'button';
        if (type === 'checkbox') return 'checkbox';
        if (type === 'radio') return 'radio';
        return 'textbox';
      }
      case 'select':
        return 'combobox';
      case 'textarea':
        return 'textbox';
      case 'nav':
        return 'navigation';
      case 'header':
        return 'banner';
      case 'footer':
        return 'contentinfo';
      case 'main':
        return 'main';
      case 'article':
        return 'article';
      case 'section':
        return 'region';
      default:
        return undefined;
    }
  }
}
