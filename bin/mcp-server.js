#!/usr/bin/env node

import { ForensicMCPServer } from '../dist/server/mcp-server.js';

const server = new ForensicMCPServer();
server.startStdio();
