import { LogicalNodeId, VirtualDOMNode, DOMSnapshot } from './dom-node';
export type EventCategory = 'DOM' | 'USER' | 'NAVIGATION' | 'CONSOLE' | 'ERROR' | 'NETWORK' | 'VIEWPORT' | 'STYLE' | 'EXTENSION' | 'SCREENSHOT' | 'CHECKPOINT' | 'ANNOTATION';
export type EventSource = 'PAGE' | 'CONTENT_SCRIPT' | 'PAGE_INJECTED_SCRIPT' | 'SERVICE_WORKER' | 'DEVTOOLS' | 'USER_INTERACTION' | 'BROWSER_RUNTIME' | 'UNKNOWN';
export type EventType = 'DOM_SNAPSHOT' | 'DOM_MUTATION_ADD' | 'DOM_MUTATION_REMOVE' | 'DOM_MUTATION_MOVE' | 'DOM_MUTATION_ATTR' | 'DOM_MUTATION_TEXT' | 'USER_CLICK' | 'USER_DBLCLICK' | 'USER_INPUT' | 'USER_CHANGE' | 'USER_SUBMIT' | 'USER_KEYDOWN' | 'USER_KEYUP' | 'USER_FOCUS' | 'USER_BLUR' | 'USER_SCROLL' | 'USER_MOUSEMOVE' | 'USER_MOUSEENTER' | 'USER_MOUSELEAVE' | 'NAV_PUSH_STATE' | 'NAV_REPLACE_STATE' | 'NAV_POPSTATE' | 'NAV_HASHCHANGE' | 'NAV_DOM_LOADED' | 'NAV_LOAD' | 'NAV_BEFORE_UNLOAD' | 'NAV_VISIBILITY_CHANGE' | 'RUNTIME_CONSOLE_LOG' | 'RUNTIME_CONSOLE_WARN' | 'RUNTIME_CONSOLE_ERROR' | 'RUNTIME_CONSOLE_INFO' | 'RUNTIME_CONSOLE_DEBUG' | 'RUNTIME_ERROR' | 'RUNTIME_UNHANDLED_REJECTION' | 'NETWORK_REQUEST_START' | 'NETWORK_RESPONSE_COMPLETE' | 'NETWORK_REQUEST_FAILED' | 'VIEWPORT_RESIZE' | 'VIEWPORT_SCROLL' | 'STYLE_INSERTION' | 'STYLE_MUTATION' | 'EXTENSION_INJECT_UI' | 'EXTENSION_MUTATION' | 'EXTENSION_CLEANUP' | 'EXTENSION_MESSAGE' | 'CHECKPOINT' | 'SCREENSHOT_CHECKPOINT' | 'ANNOTATION';
export interface CausalMetadata {
    precededBy?: string;
    triggeredBy?: string;
    correlatedWith?: string[];
    relationship?: 'PRECEDED_BY' | 'FOLLOWED_BY' | 'TRIGGERED_BY' | 'CORRELATED_WITH' | 'UNKNOWN';
}
export interface BaseEvent {
    id: string;
    sessionId: string;
    timestamp: number;
    sequence: number;
    wallClockTime: number;
    type: EventType;
    category: EventCategory;
    source: EventSource;
    targetNodeId?: LogicalNodeId;
    targetSelector?: string;
    causality?: CausalMetadata;
    payload: Record<string, unknown>;
}
export interface DOMAddNodePayload {
    node: VirtualDOMNode;
    parentId: LogicalNodeId | null;
    previousSiblingId?: LogicalNodeId | null;
    nextSiblingId?: LogicalNodeId | null;
    index: number;
}
export interface DOMRemoveNodePayload {
    nodeId: LogicalNodeId;
    tagName?: string;
    parentId: LogicalNodeId | null;
    index: number;
    selectorHint?: string;
    removedSubtreeNodeCount: number;
}
export interface DOMMoveNodePayload {
    nodeId: LogicalNodeId;
    oldParentId: LogicalNodeId | null;
    newParentId: LogicalNodeId | null;
    oldIndex: number;
    newIndex: number;
    previousSiblingId?: LogicalNodeId | null;
    nextSiblingId?: LogicalNodeId | null;
}
export interface DOMAttrChangePayload {
    nodeId: LogicalNodeId;
    attributeName: string;
    oldValue: string | null;
    newValue: string | null;
    selectorHint?: string;
}
export interface DOMTextChangePayload {
    nodeId: LogicalNodeId;
    parentId: LogicalNodeId | null;
    oldText: string;
    newText: string;
}
export interface UserInteractionPayload {
    eventType: string;
    targetNodeId?: LogicalNodeId;
    targetSelector?: string;
    clientX?: number;
    clientY?: number;
    button?: number;
    key?: string;
    code?: string;
    inputValue?: string;
    isTrusted?: boolean;
}
export interface NavigationPayload {
    navigationType: 'pushState' | 'replaceState' | 'popstate' | 'hashchange' | 'load' | 'DOMContentLoaded' | 'visibilitychange';
    url: string;
    previousUrl?: string;
    state?: unknown;
    title?: string;
}
export interface ConsolePayload {
    level: 'log' | 'warn' | 'error' | 'info' | 'debug';
    args: Array<{
        type: string;
        value: unknown;
    }>;
    formattedMessage: string;
    stackTrace?: string;
    sourceFile?: string;
    lineNumber?: number;
    columnNumber?: number;
}
export interface RuntimeErrorPayload {
    message: string;
    name?: string;
    filename?: string;
    lineno?: number;
    colno?: number;
    stack?: string;
    isUnhandledRejection?: boolean;
}
export interface NetworkRequestPayload {
    requestId: string;
    url: string;
    method: string;
    resourceType: 'fetch' | 'xhr' | 'script' | 'stylesheet' | 'image' | 'other';
    requestHeaders?: Record<string, string>;
    hasBody?: boolean;
    initiator?: string;
}
export interface NetworkResponsePayload {
    requestId: string;
    url: string;
    method: string;
    status: number;
    statusText: string;
    durationMs: number;
    responseHeaders?: Record<string, string>;
    responseSize?: number;
    error?: string;
}
export interface ScreenshotPayload {
    screenshotId: string;
    dataUrl: string;
    viewport: {
        width: number;
        height: number;
        scrollX: number;
        scrollY: number;
        devicePixelRatio: number;
    };
    triggerReason: 'INITIAL' | 'PERIODIC' | 'MUTATION_SPIKE' | 'ERROR' | 'MANUAL';
}
export interface CheckpointPayload {
    checkpointId: string;
    snapshot: DOMSnapshot;
    eventsSinceLastCheckpoint: number;
    totalEventsSoFar: number;
}
export type DOMSnapshotEvent = BaseEvent & {
    type: 'DOM_SNAPSHOT';
    payload: {
        snapshot: DOMSnapshot;
    };
};
export type DOMAddEvent = BaseEvent & {
    type: 'DOM_MUTATION_ADD';
    payload: DOMAddNodePayload;
};
export type DOMRemoveEvent = BaseEvent & {
    type: 'DOM_MUTATION_REMOVE';
    payload: DOMRemoveNodePayload;
};
export type DOMMoveEvent = BaseEvent & {
    type: 'DOM_MUTATION_MOVE';
    payload: DOMMoveNodePayload;
};
export type DOMAttrEvent = BaseEvent & {
    type: 'DOM_MUTATION_ATTR';
    payload: DOMAttrChangePayload;
};
export type DOMTextEvent = BaseEvent & {
    type: 'DOM_MUTATION_TEXT';
    payload: DOMTextChangePayload;
};
export type UserEvent = BaseEvent & {
    type: `USER_${string}`;
    payload: UserInteractionPayload;
};
export type NavigationEvent = BaseEvent & {
    type: `NAV_${string}`;
    payload: NavigationPayload;
};
export type ConsoleEvent = BaseEvent & {
    type: `RUNTIME_CONSOLE_${string}`;
    payload: ConsolePayload;
};
export type RuntimeErrorEvent = BaseEvent & {
    type: 'RUNTIME_ERROR' | 'RUNTIME_UNHANDLED_REJECTION';
    payload: RuntimeErrorPayload;
};
export type NetworkRequestEvent = BaseEvent & {
    type: 'NETWORK_REQUEST_START';
    payload: NetworkRequestPayload;
};
export type NetworkResponseEvent = BaseEvent & {
    type: 'NETWORK_RESPONSE_COMPLETE' | 'NETWORK_REQUEST_FAILED';
    payload: NetworkResponsePayload;
};
export type ScreenshotEvent = BaseEvent & {
    type: 'SCREENSHOT_CHECKPOINT';
    payload: ScreenshotPayload;
};
export type CheckpointEvent = BaseEvent & {
    type: 'CHECKPOINT';
    payload: CheckpointPayload;
};
export type ForensicEvent = DOMSnapshotEvent | DOMAddEvent | DOMRemoveEvent | DOMMoveEvent | DOMAttrEvent | DOMTextEvent | UserEvent | NavigationEvent | ConsoleEvent | RuntimeErrorEvent | NetworkRequestEvent | NetworkResponseEvent | ScreenshotEvent | CheckpointEvent | BaseEvent;
//# sourceMappingURL=events.d.ts.map