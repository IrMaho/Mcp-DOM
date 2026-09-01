import { LogicalNodeId, DOMSnapshot } from './dom-node';
import { BaseEvent } from './events';
import { DisappearingElementReport } from './lifecycle';

/**
 * Supported Live Browser Command Types
 */
export type BrowserCommandType =
  | 'LIVE_PAGE_INSPECT'
  | 'LIVE_ELEMENT_INSPECT'
  | 'GET_SELECTED_ELEMENT'
  | 'ELEMENT_PICKER_START'
  | 'ELEMENT_PICKER_STOP'
  | 'ELEMENT_SELECTED'
  | 'LIVE_PAGE_SCREENSHOT'
  | 'LIVE_ELEMENT_SCREENSHOT'
  | 'LIVE_ELEMENT_INTERACT'
  | 'ELEMENT_OBSERVATION_START'
  | 'ELEMENT_OBSERVATION_STOP'
  | 'LIVE_DOM_SNAPSHOT'
  | 'LIVE_DOM_SUBTREE'
  | 'GET_ELEMENT_VISUAL_STATE';

/**
 * Flexible Target Specifier for Live Elements
 */
export interface LiveElementTarget {
  selectedElementRef?: string;
  nodeId?: LogicalNodeId;
  selector?: string;
  xpath?: string;
  coordinates?: { x: number; y: number };
}

/**
 * Rich Structured Information for a Live DOM Element
 */
export interface LiveElementInfo {
  tag: string;
  id?: string;
  classes: string[];
  role?: string;
  ariaAttributes?: Record<string, string>;
  text: string;
  normalizedText: string;
  value?: string;
  type?: string;
  selector: string;
  bestSelector: string;
  selectorCandidates: string[];
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  visibility: {
    isVisible: boolean;
    display: string;
    visibility: string;
    opacity: number;
    pointerEvents: string;
    isClipped: boolean;
    isInViewport: boolean;
    zIndex: string | number;
  };
  computedStyle: Record<string, string>;
  attributes: Record<string, string>;
  state: {
    disabled: boolean;
    readOnly: boolean;
    checked?: boolean;
    selected?: boolean;
    focused: boolean;
    isShadowHost: boolean;
    hasShadowRoot: boolean;
  };
  context: {
    parentChain: string[];
    parentSelector?: string;
    childrenSummary: { count: number; tags: string[] };
    containingBlock?: string;
    iframe?: string | null;
    shadowRoot?: string | null;
  };
  forensics?: {
    logicalNodeId: LogicalNodeId | null;
    creationSequence: number | null;
    lastMutationSequence: number | null;
    eventCount: number;
    isRecorded: boolean;
  };
}

/**
 * High-Level Information for the Active Page
 */
export interface LivePageInfo {
  url: string;
  title: string;
  origin: string;
  viewport: {
    width: number;
    height: number;
    scrollX: number;
    scrollY: number;
    devicePixelRatio: number;
  };
  documentDimensions: {
    width: number;
    height: number;
  };
  activeElement?: {
    tag: string;
    selector: string;
    text?: string;
  };
  focusedElement?: {
    tag: string;
    selector: string;
  };
  visibilityState: DocumentVisibilityState;
  readyState: DocumentReadyState;
  framesCount: number;
}

/**
 * Supported User Actions on Live Elements
 */
export type ElementInteractionAction =
  | 'click'
  | 'double_click'
  | 'right_click'
  | 'hover'
  | 'focus'
  | 'blur'
  | 'type'
  | 'clear'
  | 'press_key'
  | 'select_option'
  | 'scroll_into_view'
  | 'scroll';

/**
 * Payload for Live Element Interaction
 */
export interface ElementInteractionPayload {
  action: ElementInteractionAction;
  target: LiveElementTarget;
  text?: string;
  key?: string;
  optionValue?: string;
  scrollDelta?: { x?: number; y?: number };
  options?: {
    waitForStabilization?: boolean;
    stabilizationTimeoutMs?: number;
    captureScreenshots?: boolean;
  };
}

/**
 * Structured Evidence Result for an Interaction
 */
export interface InteractionResult {
  success: boolean;
  action: ElementInteractionAction;
  target: LiveElementInfo;
  beforeState?: LiveElementInfo;
  afterState?: LiveElementInfo;
  beforeScreenshot?: string;
  afterScreenshot?: string;
  effects: {
    domMutations: number;
    consoleErrors: number;
    networkRequests: number;
    runtimeErrors: string[];
  };
  durationMs: number;
  stabilized: boolean;
  error?: string;
}

/**
 * Screenshot Capture Result with Temporal and DOM Metadata
 */
export interface LiveScreenshotResult {
  screenshotId: string;
  timestamp: number;
  url: string;
  viewport: {
    width: number;
    height: number;
    scrollX: number;
    scrollY: number;
    devicePixelRatio: number;
  };
  targetSelector?: string;
  targetNodeId?: LogicalNodeId;
  targetBounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  dataUrl: string;
  imageFormat: 'png' | 'jpeg';
  dimensions: {
    width: number;
    height: number;
  };
  captureType: 'FULL_PAGE' | 'ELEMENT';
}

/**
 * Focused Element Observation Bundle
 */
export interface ElementObservationBundle {
  observationId: string;
  targetSelector: string;
  targetNodeId?: LogicalNodeId;
  startTime: number;
  endTime: number;
  durationMs: number;
  initialState: LiveElementInfo;
  finalState: LiveElementInfo | null;
  disappeared: boolean;
  disappearanceReason?: string;
  mutations: BaseEvent[];
  diagnostics: BaseEvent[];
  networkEvents: BaseEvent[];
  screenshots: LiveScreenshotResult[];
  correlationReport?: DisappearingElementReport;
}

/**
 * Detailed Visual and Layout State for an Element
 */
export interface ElementVisualState {
  selector: string;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  viewport: {
    scrollX: number;
    scrollY: number;
    width: number;
    height: number;
    devicePixelRatio: number;
  };
  layout: {
    display: string;
    position: string;
    zIndex: string | number;
    opacity: number;
    visibility: string;
    overflow: string;
    boxSizing: string;
    pointerEvents: string;
  };
  occlusion: {
    isInViewport: boolean;
    isClipped: boolean;
    isZeroDimension: boolean;
    isTransparent: boolean;
    isDisplayNone: boolean;
    isVisibilityHidden: boolean;
    isOffscreen: boolean;
    occludedBy?: string | null;
  };
  computedStyleSummary: Record<string, string>;
}

/**
 * Typed Generic Browser Command Request
 */
export interface BrowserCommandRequest<T = any> {
  id: string;
  command: BrowserCommandType;
  tabId?: number;
  frameId?: number;
  timestamp: number;
  payload?: T;
}

/**
 * Typed Generic Browser Command Response
 */
export interface BrowserCommandResponse<T = any> {
  id: string;
  command: BrowserCommandType;
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    retryable?: boolean;
    details?: any;
  };
  timestamp: number;
  durationMs?: number;
}
