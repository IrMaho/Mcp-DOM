import fs from 'fs';
import path from 'path';
import { FORENSIC_MCP_TOOLS } from '../dist/server/mcp-server.js';

const targetDir = 'C:/Users/ASUS/.gemini/antigravity-ide/mcp/browser-forensics';
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

for (const tool of FORENSIC_MCP_TOOLS) {
  const filePath = path.join(targetDir, `${tool.name}.json`);
  fs.writeFileSync(
    filePath,
    JSON.stringify(
      {
        name: tool.name,
        description: tool.description,
        parameters: tool.inputSchema,
      },
      null,
      2
    ),
    'utf8'
  );
}

const instructionsPath = path.join(targetDir, 'instructions.md');
const instructions = `# Browser Forensics MCP Server Guidelines

Use this MCP server to investigate browser forensic recordings, trace element lifecycles, and perform automated root-cause analysis on disappearing UI, DOM mutations, and runtime errors.

## Primary Workflows:
1. Discovery: \`list_sessions\`, \`get_session\`, \`get_timeline\`
2. Fast Forensic Diagnosis: \`why_did_element_disappear\`, \`trace_element\`
3. Time-Travel Reconstruction: \`get_dom_state\`, \`get_dom_subtree\`, \`diff_dom\`
4. Diagnostics & Corroboration: \`get_events_around\`, \`get_diagnostics\`, \`get_network_events\`
`;

fs.writeFileSync(instructionsPath, instructions, 'utf8');

console.log(`Successfully generated ${FORENSIC_MCP_TOOLS.length} schemas and instructions.md in ${targetDir}`);
