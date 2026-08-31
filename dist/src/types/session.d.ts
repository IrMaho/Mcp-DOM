export type SessionStatus = 'recording' | 'stopped' | 'paused' | 'corrupted';
export type CapabilityStatus = 'HEALTHY' | 'PARTIAL' | 'UNAVAILABLE' | 'RESTRICTED';
export interface CapabilityHealth {
    domRecording: CapabilityStatus;
    userEvents: CapabilityStatus;
    console: CapabilityStatus;
    network: CapabilityStatus;
    screenshots: CapabilityStatus;
    shadowDom: CapabilityStatus;
    iframes: CapabilityStatus;
    details?: Record<string, string>;
}
export interface SessionStats {
    eventCount: number;
    mutationCount: number;
    errorCount: number;
    consoleCount: number;
    networkCount: number;
    checkpointCount: number;
    screenshotCount: number;
    nodeCount: number;
}
export interface ViewportInfo {
    width: number;
    height: number;
    devicePixelRatio: number;
    scrollX: number;
    scrollY: number;
}
export interface SessionMetadata {
    id: string;
    name: string;
    url: string;
    origin: string;
    title: string;
    userAgent: string;
    schemaVersion: string;
    recorderVersion: string;
    extensionVersion: string;
    startTime: number;
    endTime?: number;
    durationMs?: number;
    status: SessionStatus;
    health: CapabilityHealth;
    stats: SessionStats;
    tags?: string[];
    notes?: string;
    customData?: Record<string, unknown>;
}
export interface Annotation {
    id: string;
    sessionId: string;
    timestamp: number;
    sequence?: number;
    eventId?: string;
    nodeId?: number;
    author: 'USER' | 'AGENT' | 'SYSTEM';
    label: string;
    comment: string;
    category?: 'NOTE' | 'ROOT_CAUSE' | 'HYPOTHESIS' | 'WARNING' | 'VERIFIED';
    createdAt: number;
}
//# sourceMappingURL=session.d.ts.map