import { MCPResourceDefinition } from '../types/mcp-types';
import { ForensicStorageProvider } from '../storage/storage-interface';
export declare class MCPResourcesHandler {
    private storage;
    constructor(storage: ForensicStorageProvider);
    listResources(): Promise<MCPResourceDefinition[]>;
    readResource(uri: string): Promise<{
        uri: string;
        mimeType: string;
        text: string;
    }>;
}
//# sourceMappingURL=resources-handler.d.ts.map