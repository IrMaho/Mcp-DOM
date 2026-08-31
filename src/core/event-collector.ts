import { BaseEvent, UserEvent, NavigationEvent } from '../types/events';
import { ViewportInfo } from '../types/session';
import { NodeRegistry } from './node-registry';
import { PrivacyEngine } from './privacy-engine';
import { SequenceCounter } from './sequence-counter';

export type EventCollectorCallback = (event: BaseEvent) => void;

export class EventCollector {
  private registry: NodeRegistry;
  private privacy: PrivacyEngine;
  private sequenceCounter: SequenceCounter;
  private callback: EventCollectorCallback;
  private sessionId: string;
  private isListening: boolean = false;
  private cleanups: Array<() => void> = [];

  constructor(
    registry: NodeRegistry,
    privacy: PrivacyEngine,
    sequenceCounter: SequenceCounter,
    callback: EventCollectorCallback,
    sessionId: string = ''
  ) {
    this.registry = registry;
    this.privacy = privacy;
    this.sequenceCounter = sequenceCounter;
    this.callback = callback;
    this.sessionId = sessionId;
  }

  public setSessionId(sessionId: string): void {
    this.sessionId = sessionId;
  }

  public start(): void {
    if (this.isListening) return;
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    this.isListening = true;
    this.cleanups = [];

    // 1. User Interaction Listeners
    this.attachUserEventListeners();

    // 2. Navigation & History Listeners
    this.attachNavigationListeners();

    // 3. Viewport & Scroll Listeners
    this.attachViewportListeners();
  }

  public stop(): void {
    this.cleanups.forEach((cleanup) => {
      try {
        cleanup();
      } catch {
        // Ignored
      }
    });
    this.cleanups = [];
    this.isListening = false;
  }

  private attachUserEventListeners(): void {
    const userEvents: Array<{
      type: string;
      handler: (e: Event) => void;
      options?: AddEventListenerOptions;
    }> = [
      {
        type: 'click',
        handler: (e: Event) => this.handlePointerEvent(e, 'USER_CLICK'),
        options: { capture: true, passive: true },
      },
      {
        type: 'dblclick',
        handler: (e: Event) => this.handlePointerEvent(e, 'USER_DBLCLICK'),
        options: { capture: true, passive: true },
      },
      {
        type: 'input',
        handler: (e: Event) => this.handleInputEvent(e),
        options: { capture: true, passive: true },
      },
      {
        type: 'change',
        handler: (e: Event) => this.handleInputEvent(e, 'USER_CHANGE'),
        options: { capture: true, passive: true },
      },
      {
        type: 'submit',
        handler: (e: Event) => this.handleSubmitEvent(e),
        options: { capture: true, passive: true },
      },
      {
        type: 'keydown',
        handler: (e: Event) => this.handleKeyboardEvent(e as KeyboardEvent, 'USER_KEYDOWN'),
        options: { capture: true, passive: true },
      },
      {
        type: 'keyup',
        handler: (e: Event) => this.handleKeyboardEvent(e as KeyboardEvent, 'USER_KEYUP'),
        options: { capture: true, passive: true },
      },
      {
        type: 'focus',
        handler: (e: Event) => this.handleFocusBlurEvent(e, 'USER_FOCUS'),
        options: { capture: true, passive: true },
      },
      {
        type: 'blur',
        handler: (e: Event) => this.handleFocusBlurEvent(e, 'USER_BLUR'),
        options: { capture: true, passive: true },
      },
    ];

    userEvents.forEach(({ type, handler, options }) => {
      document.addEventListener(type, handler, options);
      this.cleanups.push(() => document.removeEventListener(type, handler, options));
    });
  }

  private handlePointerEvent(e: Event, type: 'USER_CLICK' | 'USER_DBLCLICK'): void {
    const mouseEvent = e as MouseEvent;
    const target = e.target as Element | null;
    const timestamp = this.sequenceCounter.getRelativeTimestamp();
    const wallClockTime = this.sequenceCounter.getWallClock();
    const nodeId = target ? this.registry.getOrCreateId(target, timestamp) : undefined;
    const selector = target && target.nodeType === Node.ELEMENT_NODE ? this.registry.computeSelector(target) : undefined;

    const sequence = this.sequenceCounter.nextSequence();
    const event: UserEvent = {
      id: this.sequenceCounter.generateEventId('usr_clk'),
      sessionId: this.sessionId,
      timestamp,
      sequence,
      wallClockTime,
      type,
      category: 'USER',
      source: 'USER_INTERACTION',
      targetNodeId: nodeId,
      targetSelector: selector,
      payload: {
        eventType: e.type,
        targetNodeId: nodeId,
        targetSelector: selector,
        clientX: mouseEvent.clientX,
        clientY: mouseEvent.clientY,
        button: mouseEvent.button,
        isTrusted: e.isTrusted,
      },
    };

    this.callback(event);
  }

  private handleInputEvent(e: Event, eventType: 'USER_INPUT' | 'USER_CHANGE' = 'USER_INPUT'): void {
    const target = e.target as HTMLElement | null;
    if (!target) return;

    const timestamp = this.sequenceCounter.getRelativeTimestamp();
    const wallClockTime = this.sequenceCounter.getWallClock();
    const nodeId = this.registry.getOrCreateId(target, timestamp);
    const selector = this.registry.computeSelector(target);

    let inputValue = '';
    if (target.tagName.toLowerCase() === 'input') {
      const input = target as HTMLInputElement;
      inputValue = this.privacy.maskValue(input.value, input.type, input.name);
    } else if (target.tagName.toLowerCase() === 'textarea') {
      const textarea = target as HTMLTextAreaElement;
      inputValue = this.privacy.maskValue(textarea.value, 'textarea', textarea.name);
    } else if (target.tagName.toLowerCase() === 'select') {
      const select = target as HTMLSelectElement;
      inputValue = select.value;
    }

    const sequence = this.sequenceCounter.nextSequence();
    const event: UserEvent = {
      id: this.sequenceCounter.generateEventId('usr_inp'),
      sessionId: this.sessionId,
      timestamp,
      sequence,
      wallClockTime,
      type: eventType,
      category: 'USER',
      source: 'USER_INTERACTION',
      targetNodeId: nodeId,
      targetSelector: selector,
      payload: {
        eventType: e.type,
        targetNodeId: nodeId,
        targetSelector: selector,
        inputValue,
        isTrusted: e.isTrusted,
      },
    };

    this.callback(event);
  }

  private handleSubmitEvent(e: Event): void {
    const target = e.target as HTMLElement | null;
    const timestamp = this.sequenceCounter.getRelativeTimestamp();
    const wallClockTime = this.sequenceCounter.getWallClock();
    const nodeId = target ? this.registry.getOrCreateId(target, timestamp) : undefined;
    const selector = target ? this.registry.computeSelector(target) : undefined;

    const sequence = this.sequenceCounter.nextSequence();
    const event: UserEvent = {
      id: this.sequenceCounter.generateEventId('usr_sub'),
      sessionId: this.sessionId,
      timestamp,
      sequence,
      wallClockTime,
      type: 'USER_SUBMIT',
      category: 'USER',
      source: 'USER_INTERACTION',
      targetNodeId: nodeId,
      targetSelector: selector,
      payload: {
        eventType: 'submit',
        targetNodeId: nodeId,
        targetSelector: selector,
      },
    };

    this.callback(event);
  }

  private handleKeyboardEvent(e: KeyboardEvent, type: 'USER_KEYDOWN' | 'USER_KEYUP'): void {
    const target = e.target as HTMLElement | null;
    const timestamp = this.sequenceCounter.getRelativeTimestamp();
    const wallClockTime = this.sequenceCounter.getWallClock();
    const nodeId = target ? this.registry.getOrCreateId(target, timestamp) : undefined;
    const selector = target ? this.registry.computeSelector(target) : undefined;

    // Redact specific key contents if typing in sensitive password field
    let key = e.key;
    if (target && target.tagName.toLowerCase() === 'input') {
      const input = target as HTMLInputElement;
      if (input.type === 'password') {
        key = '*';
      }
    }

    const sequence = this.sequenceCounter.nextSequence();
    const event: UserEvent = {
      id: this.sequenceCounter.generateEventId('usr_key'),
      sessionId: this.sessionId,
      timestamp,
      sequence,
      wallClockTime,
      type,
      category: 'USER',
      source: 'USER_INTERACTION',
      targetNodeId: nodeId,
      targetSelector: selector,
      payload: {
        eventType: e.type,
        targetNodeId: nodeId,
        targetSelector: selector,
        key,
        code: e.code,
        isTrusted: e.isTrusted,
      },
    };

    this.callback(event);
  }

  private handleFocusBlurEvent(e: Event, type: 'USER_FOCUS' | 'USER_BLUR'): void {
    const target = e.target as HTMLElement | null;
    const timestamp = this.sequenceCounter.getRelativeTimestamp();
    const wallClockTime = this.sequenceCounter.getWallClock();
    const nodeId = target ? this.registry.getOrCreateId(target, timestamp) : undefined;
    const selector = target ? this.registry.computeSelector(target) : undefined;

    const sequence = this.sequenceCounter.nextSequence();
    const event: UserEvent = {
      id: this.sequenceCounter.generateEventId('usr_foc'),
      sessionId: this.sessionId,
      timestamp,
      sequence,
      wallClockTime,
      type,
      category: 'USER',
      source: 'USER_INTERACTION',
      targetNodeId: nodeId,
      targetSelector: selector,
      payload: {
        eventType: e.type,
        targetNodeId: nodeId,
        targetSelector: selector,
      },
    };

    this.callback(event);
  }

  private attachNavigationListeners(): void {
    if (typeof window === 'undefined' || !window.history) return;

    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;

    window.history.pushState = (...args) => {
      const result = originalPushState.apply(window.history, args);
      this.recordNavigation('pushState', window.location.href, args[0], args[2] ? String(args[2]) : undefined);
      return result;
    };

    window.history.replaceState = (...args) => {
      const result = originalReplaceState.apply(window.history, args);
      this.recordNavigation('replaceState', window.location.href, args[0], args[2] ? String(args[2]) : undefined);
      return result;
    };

    const popstateHandler = (e: PopStateEvent) => {
      this.recordNavigation('popstate', window.location.href, e.state);
    };
    window.addEventListener('popstate', popstateHandler);

    const hashchangeHandler = (e: HashChangeEvent) => {
      this.recordNavigation('hashchange', e.newURL, undefined, undefined, e.oldURL);
    };
    window.addEventListener('hashchange', hashchangeHandler);

    const visibilityHandler = () => {
      this.recordNavigation('visibilitychange', window.location.href, {
        visibilityState: document.visibilityState,
        hidden: document.hidden,
      });
    };
    document.addEventListener('visibilitychange', visibilityHandler);

    this.cleanups.push(() => {
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
      window.removeEventListener('popstate', popstateHandler);
      window.removeEventListener('hashchange', hashchangeHandler);
      document.removeEventListener('visibilitychange', visibilityHandler);
    });
  }

  private recordNavigation(
    navigationType: 'pushState' | 'replaceState' | 'popstate' | 'hashchange' | 'load' | 'DOMContentLoaded' | 'visibilitychange',
    url: string,
    state?: unknown,
    title?: string,
    previousUrl?: string
  ): void {
    const timestamp = this.sequenceCounter.getRelativeTimestamp();
    const wallClockTime = this.sequenceCounter.getWallClock();
    const sequence = this.sequenceCounter.nextSequence();

    const event: NavigationEvent = {
      id: this.sequenceCounter.generateEventId('nav'),
      sessionId: this.sessionId,
      timestamp,
      sequence,
      wallClockTime,
      type: `NAV_${navigationType.toUpperCase()}` as any,
      category: 'NAVIGATION',
      source: 'PAGE',
      payload: {
        navigationType,
        url: this.privacy.sanitizeUrl(url),
        previousUrl: previousUrl ? this.privacy.sanitizeUrl(previousUrl) : undefined,
        state,
        title: title || document.title,
      },
    };

    this.callback(event);
  }

  private attachViewportListeners(): void {
    if (typeof window === 'undefined') return;

    let resizeTimeout: ReturnType<typeof setTimeout> | null = null;
    const resizeHandler = () => {
      if (resizeTimeout) clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        const timestamp = this.sequenceCounter.getRelativeTimestamp();
        const wallClockTime = this.sequenceCounter.getWallClock();
        const sequence = this.sequenceCounter.nextSequence();

        const event: BaseEvent = {
          id: this.sequenceCounter.generateEventId('vp_res'),
          sessionId: this.sessionId,
          timestamp,
          sequence,
          wallClockTime,
          type: 'VIEWPORT_RESIZE',
          category: 'VIEWPORT',
          source: 'BROWSER_RUNTIME',
          payload: {
            width: window.innerWidth,
            height: window.innerHeight,
            devicePixelRatio: window.devicePixelRatio,
          },
        };

        this.callback(event);
      }, 100);
    };
    window.addEventListener('resize', resizeHandler, { passive: true });

    let scrollTimeout: ReturnType<typeof setTimeout> | null = null;
    const scrollHandler = () => {
      if (scrollTimeout) clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        const timestamp = this.sequenceCounter.getRelativeTimestamp();
        const wallClockTime = this.sequenceCounter.getWallClock();
        const sequence = this.sequenceCounter.nextSequence();

        const event: BaseEvent = {
          id: this.sequenceCounter.generateEventId('vp_scr'),
          sessionId: this.sessionId,
          timestamp,
          sequence,
          wallClockTime,
          type: 'VIEWPORT_SCROLL',
          category: 'VIEWPORT',
          source: 'BROWSER_RUNTIME',
          payload: {
            scrollX: window.scrollX,
            scrollY: window.scrollY,
          },
        };

        this.callback(event);
      }, 100);
    };
    window.addEventListener('scroll', scrollHandler, { passive: true });

    this.cleanups.push(() => {
      if (resizeTimeout) clearTimeout(resizeTimeout);
      if (scrollTimeout) clearTimeout(scrollTimeout);
      window.removeEventListener('resize', resizeHandler);
      window.removeEventListener('scroll', scrollHandler);
    });
  }
}
