#!/usr/bin/env node

import { MCPBridgeServer } from '../dist/server/bridge-server.js';

const port = process.env.PORT ? parseInt(process.env.PORT) : 3847;
const bridge = new MCPBridgeServer(port);

bridge.start().then(() => {
  console.log(`[MCP Bridge] HTTP and WebSocket server listening on http://localhost:${port}`);
}).catch((err) => {
  console.error('[MCP Bridge] Failed to start:', err);
  process.exit(1);
});
