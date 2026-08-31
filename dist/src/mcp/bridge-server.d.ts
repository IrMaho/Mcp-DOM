import { ForensicStorageProvider } from '../storage/storage-interface';
export declare class MCPBridgeServer {
    private port;
    private storage;
    private toolsHandler;
    private httpServer;
    private wss;
    constructor(port?: number, storage?: ForensicStorageProvider);
    start(): Promise<void>;
    stop(): Promise<void>;
}
//# sourceMappingURL=bridge-server.d.ts.map