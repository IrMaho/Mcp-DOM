import { JSONRPCRequest, JSONRPCResponse } from '../types/mcp-types';
import { ForensicStorageProvider } from '../storage/storage-interface';
export declare class ForensicMCPServer {
    private storage;
    private toolsHandler;
    private resourcesHandler;
    private protocolVersion;
    private serverInfo;
    constructor(storage?: ForensicStorageProvider);
    handleRequest(request: JSONRPCRequest): Promise<JSONRPCResponse | null>;
    startStdio(): void;
}
//# sourceMappingURL=server.d.ts.map