import { LiveElementInfo } from '../types/browser-control';
import { LiveDOMInspector } from './live-dom-inspector';
import { NodeRegistry } from './node-registry';

export interface ElementPickerOptions {
  onSelected?: (info: LiveElementInfo) => void;
  onCanceled?: () => void;
  highlightColor?: string;
  nodeRegistry?: NodeRegistry;
}

export class ElementPicker {
  private isExplicitModeActive = false;
  private isGlobalShortcutActive = false;
  private highlighterEl: HTMLElement | null = null;
  private badgeEl: HTMLElement | null = null;
  private lastSelectedElement: LiveElementInfo | null = null;
  private options: ElementPickerOptions = {};

  private onMouseMoveBound: (e: MouseEvent) => void;
  private onClickBound: (e: MouseEvent) => void;
  private onKeyDownBound: (e: KeyboardEvent) => void;
  private onGlobalClickBound: (e: MouseEvent) => void;

  constructor(options: ElementPickerOptions = {}) {
    this.options = options;

    this.onMouseMoveBound = this.handleMouseMove.bind(this);
    this.onClickBound = this.handleClick.bind(this);
    this.onKeyDownBound = this.handleKeyDown.bind(this);
    this.onGlobalClickBound = this.handleGlobalCtrlShiftClick.bind(this);

    this.initGlobalShortcutListener();
  }

  /**
   * Always-on listener for Ctrl + Shift + Click anywhere in the document
   */
  public initGlobalShortcutListener(): void {
    if (typeof window === 'undefined' || this.isGlobalShortcutActive) return;
    window.addEventListener('click', this.onGlobalClickBound, true);
    this.isGlobalShortcutActive = true;
  }

  /**
   * Start explicit interactive visual element picker mode (with crosshair and hover highlight)
   */
  public startPicker(options?: ElementPickerOptions): void {
    if (typeof document === 'undefined') return;
    if (options) {
      this.options = { ...this.options, ...options };
    }

    if (this.isExplicitModeActive) return;
    this.isExplicitModeActive = true;

    this.ensureHighlighter();
    if (document.body) {
      document.body.style.cursor = 'crosshair';
    }

    window.addEventListener('mousemove', this.onMouseMoveBound, true);
    window.addEventListener('click', this.onClickBound, true);
    window.addEventListener('keydown', this.onKeyDownBound, true);
  }

  /**
   * Stop explicit picker mode and restore normal cursor & DOM state
   */
  public stopPicker(): void {
    if (!this.isExplicitModeActive) return;
    this.isExplicitModeActive = false;

    if (typeof document !== 'undefined' && document.body) {
      document.body.style.cursor = 'default';
    }

    this.removeHighlighter();

    if (typeof window !== 'undefined') {
      window.removeEventListener('mousemove', this.onMouseMoveBound, true);
      window.removeEventListener('click', this.onClickBound, true);
      window.removeEventListener('keydown', this.onKeyDownBound, true);
    }
  }

  /**
   * Retrieve the last element selected via Ctrl+Shift+Click or Picker mode
   */
  public getLastSelectedElement(): LiveElementInfo | null {
    return this.lastSelectedElement;
  }

  /**
   * Set or override the selected element programmatically (supports Element or pre-serialized LiveElementInfo)
   */
  public setSelectedElement(element: Element | LiveElementInfo): LiveElementInfo {
    let info: LiveElementInfo;
    if ('tag' in element && 'bestSelector' in element && typeof (element as any).getAttribute !== 'function') {
      info = element as LiveElementInfo;
    } else {
      info = LiveDOMInspector.inspectElement(element as Element, this.options.nodeRegistry);
      this.flashSelection(element as Element);
    }
    this.lastSelectedElement = info;
    if (this.options.onSelected) {
      this.options.onSelected(info);
    }
    return info;
  }

  /**
   * Global shortcut handler: Ctrl + Shift + Click
   */
  private handleGlobalCtrlShiftClick(e: MouseEvent): void {
    if (!e.ctrlKey || !e.shiftKey) return;

    const target = e.target as HTMLElement | null;
    if (!target || this.isExtensionOwned(target)) return;

    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    const info = this.setSelectedElement(target);
    this.notifyExtension(info);
  }

  /**
   * Explicit mode mouse move handler (updates highlighter bounds)
   */
  private handleMouseMove(e: MouseEvent): void {
    if (!this.isExplicitModeActive) return;

    const target = e.target as HTMLElement | null;
    if (!target || this.isExtensionOwned(target)) {
      this.hideHighlighter();
      return;
    }

    this.updateHighlighter(target);
  }

  /**
   * Explicit mode click handler (selects target and terminates picker)
   */
  private handleClick(e: MouseEvent): void {
    if (!this.isExplicitModeActive) return;

    const target = e.target as HTMLElement | null;
    if (!target || this.isExtensionOwned(target)) return;

    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    const info = this.setSelectedElement(target);
    this.notifyExtension(info);
    this.stopPicker();
  }

  /**
   * Explicit mode keydown handler (Escape cancels picker)
   */
  private handleKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape' && this.isExplicitModeActive) {
      e.preventDefault();
      this.stopPicker();
      if (this.options.onCanceled) {
        this.options.onCanceled();
      }
    }
  }

  /**
   * Check if element belongs to extension UI
   */
  private isExtensionOwned(element: Element): boolean {
    if (element.id === 'forensic-recorder-floating-host' || element.id === 'forensic-inspect-highlighter') {
      return true;
    }
    if (element.closest('#forensic-recorder-floating-host') || element.closest('#forensic-inspect-highlighter')) {
      return true;
    }
    if (element.hasAttribute('data-forensic-internal') || element.closest('[data-forensic-internal]')) {
      return true;
    }
    return false;
  }

  /**
   * Create highlighter elements in DOM
   */
  private ensureHighlighter(): void {
    if (typeof document === 'undefined' || this.highlighterEl) return;

    const color = this.options.highlightColor || '#0ea5e9';

    const overlay = document.createElement('div');
    overlay.id = 'forensic-inspect-highlighter';
    overlay.setAttribute('data-forensic-internal', 'true');
    overlay.style.position = 'fixed';
    overlay.style.pointerEvents = 'none';
    overlay.style.zIndex = '2147483640';
    overlay.style.border = `2px solid ${color}`;
    overlay.style.background = 'rgba(14, 165, 233, 0.18)';
    overlay.style.borderRadius = '3px';
    overlay.style.boxShadow = `0 0 12px ${color}88`;
    overlay.style.transition = 'all 0.05s ease-out';
    overlay.style.display = 'none';

    const badge = document.createElement('div');
    badge.setAttribute('data-forensic-internal', 'true');
    badge.style.position = 'absolute';
    badge.style.bottom = '100%';
    badge.style.left = '0';
    badge.style.transform = 'translateY(-4px)';
    badge.style.background = '#0f172a';
    badge.style.color = '#38bdf8';
    badge.style.fontSize = '11px';
    badge.style.fontFamily = 'monospace';
    badge.style.fontWeight = 'bold';
    badge.style.padding = '2px 6px';
    badge.style.borderRadius = '3px';
    badge.style.boxShadow = '0 2px 6px rgba(0,0,0,0.5)';
    badge.style.whiteSpace = 'nowrap';
    badge.style.pointerEvents = 'none';

    overlay.appendChild(badge);
    document.body.appendChild(overlay);

    this.highlighterEl = overlay;
    this.badgeEl = badge;
  }

  private updateHighlighter(target: HTMLElement): void {
    this.ensureHighlighter();
    if (!this.highlighterEl || !this.badgeEl) return;

    const rect = target.getBoundingClientRect();
    this.highlighterEl.style.display = 'block';
    this.highlighterEl.style.left = `${rect.left}px`;
    this.highlighterEl.style.top = `${rect.top}px`;
    this.highlighterEl.style.width = `${Math.max(1, rect.width)}px`;
    this.highlighterEl.style.height = `${Math.max(1, rect.height)}px`;

    const tag = target.tagName.toLowerCase();
    const id = target.id ? `#${target.id}` : '';
    const cls = target.className && typeof target.className === 'string'
      ? '.' + target.className.split(/\s+/)[0]
      : '';
    const dims = `${Math.round(rect.width)}×${Math.round(rect.height)}`;
    this.badgeEl.textContent = `<${tag}${id}${cls}> [${dims}]`;
  }

  private hideHighlighter(): void {
    if (this.highlighterEl) {
      this.highlighterEl.style.display = 'none';
    }
  }

  private removeHighlighter(): void {
    if (this.highlighterEl && this.highlighterEl.parentElement) {
      this.highlighterEl.remove();
    }
    this.highlighterEl = null;
    this.badgeEl = null;
  }

  /**
   * Flash green outline when selection succeeds
   */
  private flashSelection(element: Element): void {
    if (typeof document === 'undefined' || !element.getBoundingClientRect) return;

    const rect = element.getBoundingClientRect();
    const flash = document.createElement('div');
    flash.setAttribute('data-forensic-internal', 'true');
    flash.style.position = 'fixed';
    flash.style.left = `${rect.left}px`;
    flash.style.top = `${rect.top}px`;
    flash.style.width = `${Math.max(1, rect.width)}px`;
    flash.style.height = `${Math.max(1, rect.height)}px`;
    flash.style.border = '2px solid #22c55e';
    flash.style.background = 'rgba(34, 197, 94, 0.25)';
    flash.style.zIndex = '2147483645';
    flash.style.pointerEvents = 'none';
    flash.style.transition = 'opacity 0.6s ease-out';
    document.body.appendChild(flash);

    setTimeout(() => {
      flash.style.opacity = '0';
      setTimeout(() => flash.remove(), 600);
    }, 400);
  }

  /**
   * Notify extension background & bridge of new element selection
   */
  private notifyExtension(info: LiveElementInfo): void {
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
        chrome.runtime.sendMessage({
          type: 'ELEMENT_SELECTED',
          elementInfo: info,
          timestamp: Date.now(),
        });
      }
    } catch {
      // Background worker might be idle
    }
  }

  public destroy(): void {
    this.stopPicker();
    if (typeof window !== 'undefined') {
      window.removeEventListener('click', this.onGlobalClickBound, true);
    }
    this.isGlobalShortcutActive = false;
  }
}
