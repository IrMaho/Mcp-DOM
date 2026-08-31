export interface JSONRPCRequest {
    jsonrpc: '2.0';
    id: string | number | null;
    method: string;
    params?: Record<string, unknown>;
}
export interface JSONRPCResponse {
    jsonrpc: '2.0';
    id: string | number | null;
    result?: unknown;
    error?: {
        code: number;
        message: string;
        data?: unknown;
    };
}
export interface MCPToolDefinition {
    name: string;
    description: string;
    inputSchema: {
        type: 'object';
        properties: Record<string, unknown>;
        required?: string[];
    };
}
export interface MCPResourceDefinition {
    uri: string;
    name: string;
    mimeType: string;
    description?: string;
}
export interface MCPContentText {
    type: 'text';
    text: string;
}
export interface MCPContentImage {
    type: 'image';
    data: string;
    mimeType: string;
}
export interface MCPContentResource {
    type: 'resource';
    resource: {
        uri: string;
        mimeType: string;
        text?: string;
        blob?: string;
    };
}
export type MCPContentItem = MCPContentText | MCPContentImage | MCPContentResource;
export interface MCPToolCallResult {
    content: MCPContentItem[];
    isError?: boolean;
}
//# sourceMappingURL=mcp-types.d.ts.map