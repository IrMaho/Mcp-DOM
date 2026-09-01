#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const ALL_34_TOOLS = [
  // Historical Forensics (21)
  'list_sessions',
  'get_session',
  'export_session',
  'import_session',
  'delete_session',
  'get_timeline',
  'get_events',
  'get_events_around',
  'get_dom_state',
  'get_dom_node',
  'get_dom_subtree',
  'diff_dom',
  'trace_element',
  'find_disappearing_elements',
  'why_did_element_disappear',
  'get_diagnostics',
  'get_network_events',
  'get_screenshots',
  'annotate_session',
  'get_annotations',
  'get_recording_health',
  // Live Browser Control & Visual Intelligence (13)
  'inspect_live_page',
  'inspect_live_element',
  'get_selected_element',
  'start_element_picker',
  'stop_element_picker',
  'capture_page_screenshot',
  'capture_element_screenshot',
  'interact_with_element',
  'start_element_observation',
  'stop_element_observation',
  'get_live_dom_snapshot',
  'get_live_dom_subtree',
  'get_element_visual_state',
];

const SERVER_SCRIPT_PATH = path.join(ROOT_DIR, 'bin', 'mcp-server.js').replace(/\\/g, '/');

function getMcpConfigObject() {
  return {
    mcpServers: {
      'browser-forensics': {
        command: 'node',
        args: [SERVER_SCRIPT_PATH],
        disabled: false,
        alwaysAllow: ALL_34_TOOLS,
      },
    },
  };
}

function getClaudeDesktopConfig() {
  return {
    mcpServers: {
      'browser-forensics': {
        command: 'node',
        args: [SERVER_SCRIPT_PATH],
      },
    },
  };
}

function getCursorConfig() {
  return {
    mcpServers: {
      'browser-forensics': {
        command: 'node',
        args: [SERVER_SCRIPT_PATH],
      },
    },
  };
}

async function installToWorkspace(targetDir = process.cwd()) {
  const resolvedTarget = path.resolve(targetDir);
  console.log(`\n======================================================`);
  console.log(`📦 INSTALLING BROWSER-FORENSICS MCP INTO WORKSPACE`);
  console.log(`======================================================`);
  console.log(`Target: ${resolvedTarget}\n`);

  const agentsDir = path.join(resolvedTarget, '.agents');
  const skillsDir = path.join(agentsDir, 'skills', 'browser-forensics');

  fs.mkdirSync(skillsDir, { recursive: true });

  // 1. Write / Update .agents/mcp_config.json
  const mcpConfigFile = path.join(agentsDir, 'mcp_config.json');
  let configToSave = getMcpConfigObject();

  if (fs.existsSync(mcpConfigFile)) {
    try {
      const existing = JSON.parse(fs.readFileSync(mcpConfigFile, 'utf-8'));
      existing.mcpServers = existing.mcpServers || {};
      existing.mcpServers['browser-forensics'] = getMcpConfigObject().mcpServers['browser-forensics'];
      configToSave = existing;
    } catch {
      // Overwrite if corrupt
    }
  }

  fs.writeFileSync(mcpConfigFile, JSON.stringify(configToSave, null, 2));
  console.log(`✔ Configured: ${path.relative(resolvedTarget, mcpConfigFile)}`);

  // 2. Copy complete SKILL.md
  const sourceSkill = path.join(ROOT_DIR, '.agents', 'skills', 'browser-forensics', 'SKILL.md');
  const targetSkill = path.join(skillsDir, 'SKILL.md');
  if (fs.existsSync(sourceSkill)) {
    fs.copyFileSync(sourceSkill, targetSkill);
    console.log(`✔ Installed Skill: ${path.relative(resolvedTarget, targetSkill)}`);
  }

  // 3. Configure Cursor (.cursor/mcp.json) if folder exists or requested
  const cursorDir = path.join(resolvedTarget, '.cursor');
  if (fs.existsSync(cursorDir)) {
    const cursorMcp = path.join(cursorDir, 'mcp.json');
    fs.writeFileSync(cursorMcp, JSON.stringify(getCursorConfig(), null, 2));
    console.log(`✔ Configured Cursor: ${path.relative(resolvedTarget, cursorMcp)}`);
  }

  console.log('\n======================================================');
  console.log('🎉 WORKSPACE INSTALLATION SUCCESSFUL!');
  console.log('======================================================');
  console.log('• All 34 MCP tools are now registered for any AI Agent in this project.');
  console.log('• To launch the Chrome Extension Bridge on port 3847, run:');
  console.log('    dom-antigravity bridge\n');
}

async function installGlobal() {
  const homeDir = process.env.USERPROFILE || process.env.HOME || '';
  const globalPluginDir = path.join(homeDir, '.gemini', 'config', 'plugins', 'browser-forensics');
  const globalSkillsDir = path.join(globalPluginDir, 'skills', 'browser-forensics');

  console.log(`\n======================================================`);
  console.log(`🌐 INSTALLING GLOBAL ANTIGRAVITY PLUGIN`);
  console.log(`======================================================`);
  console.log(`Global Path: ${globalPluginDir}\n`);

  fs.mkdirSync(globalSkillsDir, { recursive: true });

  // 1. Write plugin.json
  const pluginJson = {
    name: 'browser-forensics',
    version: '2.0.0',
    description: 'Antigravity Browser Forensic Recorder, Live DOM Intelligence, Visual Element Picker, and Root-Cause Analyzer (34 Tools)',
    author: { name: 'Google DeepMind / Antigravity Team' },
    license: 'Apache-2.0',
    skills: ['browser-forensics'],
    mcpServers: ['browser-forensics'],
  };
  fs.writeFileSync(path.join(globalPluginDir, 'plugin.json'), JSON.stringify(pluginJson, null, 2));
  console.log('✔ Global plugin.json updated');

  // 2. Write global mcp_config.json
  fs.writeFileSync(path.join(globalPluginDir, 'mcp_config.json'), JSON.stringify(getMcpConfigObject(), null, 2));
  console.log('✔ Global mcp_config.json registered (34 Tools)');

  // 3. Copy SKILL.md
  const sourceSkill = path.join(ROOT_DIR, '.agents', 'skills', 'browser-forensics', 'SKILL.md');
  if (fs.existsSync(sourceSkill)) {
    fs.copyFileSync(sourceSkill, path.join(globalSkillsDir, 'SKILL.md'));
    console.log('✔ Global SKILL.md synchronized');
  }

  console.log('\n======================================================');
  console.log('🎉 GLOBAL PLUGIN REGISTRATION COMPLETE!');
  console.log('======================================================');
  console.log('The browser-forensics MCP server is now globally available across ALL projects in Antigravity!\n');
}

async function checkStatus() {
  console.log('======================================================');
  console.log('⚡ DOM & BROWSER FORENSICS MCP STATUS');
  console.log('======================================================\n');

  console.log(`• MCP Server Bin: ${SERVER_SCRIPT_PATH}`);
  console.log(`• Registered Capabilities: ${ALL_34_TOOLS.length} Tools`);
  console.log(`    - 21 Historical Forensics & Time-Travel Tools`);
  console.log(`    - 13 Live Browser Control & Visual Inspection Tools`);

  try {
    const res = await fetch('http://127.0.0.1:3847/health');
    const data = await res.json();
    console.log(`• WebSocket Bridge Server (:3847): ONLINE (Status: ${data.status})`);
    console.log(`• Connected Chrome Tab(s): ${data.connectedBrowsers}`);
  } catch {
    console.log('• WebSocket Bridge Server (:3847): OFFLINE (Start with: `dom-antigravity bridge`)');
  }

  console.log('');
}

async function captureScreenshot() {
  const scriptPath = path.join(ROOT_DIR, 'scripts', 'capture-real-chrome.js');
  const p = spawn('node', [scriptPath], { stdio: 'inherit' });
  p.on('exit', (code) => process.exit(code || 0));
}

function printConfig(target) {
  if (target === 'claude') {
    console.log(JSON.stringify(getClaudeDesktopConfig(), null, 2));
  } else if (target === 'cursor') {
    console.log(JSON.stringify(getCursorConfig(), null, 2));
  } else {
    console.log(JSON.stringify(getMcpConfigObject(), null, 2));
  }
}

// Parse Command Line Arguments
const args = process.argv.slice(2);
const command = args[0];

if (!command || command === 'help' || command === '--help' || command === '-h') {
  console.log(`
DOM & Browser Forensics CLI — dom-antigravity (v2.0.0)

Commands:
  dom-antigravity install --workspace       Install MCP config & skills into current workspace (.agents)
  dom-antigravity install --global          Install globally for ALL projects in Antigravity IDE
  dom-antigravity install --target <path>   Install MCP config into a specific project path
  dom-antigravity status                    Check bridge server & connected Chrome tab status
  dom-antigravity bridge                    Start WebSocket bridge on port 3847 for Chrome Extension
  dom-antigravity screenshot                Capture clean live Chrome screenshot (Full Page + Element)
  dom-antigravity server                    Run standalone stdio JSON-RPC MCP server
  dom-antigravity config [claude|cursor]    Print JSON config for Claude / Cursor / Antigravity

Aliases:
  dom-antigravity install -w
  dom-antigravity install -g
`);
  process.exit(0);
}

if (command === 'install' || command === 'install-global') {
  const isGlobal = command === 'install-global' || args.includes('--global') || args.includes('-g');
  const isWorkspace = args.includes('--workspace') || args.includes('-w');
  const targetIdx = args.indexOf('--target');
  const targetPath = targetIdx !== -1 ? args[targetIdx + 1] : null;

  if (isGlobal) {
    installGlobal();
  } else if (targetPath) {
    installToWorkspace(targetPath);
  } else if (isWorkspace || args.length === 1) {
    installToWorkspace(process.cwd());
  } else {
    installToWorkspace(args[1]);
  }
} else if (command === 'status') {
  checkStatus();
} else if (command === 'bridge') {
  import('./bridge-server.js');
} else if (command === 'server') {
  import('./mcp-server.js');
} else if (command === 'screenshot' || command === 'capture') {
  captureScreenshot();
} else if (command === 'dom' || command === 'export-dom') {
  import('../scripts/export-live-dom.js');
} else if (command === 'config') {
  printConfig(args[1]);
} else {
  console.error(`Unknown command: ${command}. Run 'dom-antigravity help' for usage.`);
  process.exit(1);
}
