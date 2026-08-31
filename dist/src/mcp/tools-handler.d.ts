import { MCPToolCallResult } from '../types/mcp-types';
import { ForensicStorageProvider } from '../storage/storage-interface';
export declare class MCPToolsHandler {
    private storage;
    constructor(storage: ForensicStorageProvider);
    handleToolCall(name: string, args: Record<string, any>): Promise<MCPToolCallResult>;
    private getReconstructor;
    private handleListSessions;
    private handleGetSession;
    private handleExportSession;
    private handleImportSession;
    private handleDeleteSession;
    private handleGetTimeline;
    private handleGetEvents;
    private handleGetEventsAround;
    private handleGetDOMState;
    private handleGetDOMNode;
    private handleGetDOMSubtree;
    private handleDiffDOM;
    private handleTraceElement;
    private handleFindDisappearingElements;
    private handleWhyDidElementDisappear;
    private handleGetDiagnostics;
    private handleGetNetworkEvents;
    private handleGetScreenshots;
    private handleAnnotateSession;
    private handleGetAnnotations;
    private handleGetRecordingHealth;
}
//# sourceMappingURL=tools-handler.d.ts.map