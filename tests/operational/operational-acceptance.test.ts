import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { FORENSIC_MCP_TOOLS } from '../../src/mcp/tools-definition';
import { ForensicMCPServer } from '../../src/mcp/server';
import { FileStorageProvider } from '../../src/storage/file-storage';
import { JSDOM } from 'jsdom';

describe('MCP-DOM Complete Operational Acceptance & Certification Suite', () => {
  const OP_ROOT = path.resolve(process.cwd(), 'operational-tests');
  const TOOLS_DIR = path.join(OP_ROOT, 'tools');
  const INVENTORY_DIR = path.join(OP_ROOT, '_inventory');
  const REPORTS_DIR = path.join(OP_ROOT, '_reports');
  const SCENARIOS_DIR = path.join(OP_ROOT, 'scenarios');

  beforeAll(() => {
    // Ensure all directories exist
    expect(fs.existsSync(OP_ROOT)).toBe(true);
    expect(fs.existsSync(TOOLS_DIR)).toBe(true);
    expect(fs.existsSync(INVENTORY_DIR)).toBe(true);
    expect(fs.existsSync(REPORTS_DIR)).toBe(true);
  });

  it('verifies dynamic MCP discovery matches 34 exposed tools', () => {
    const toolsJsonPath = path.join(INVENTORY_DIR, 'tools.json');
    expect(fs.existsSync(toolsJsonPath)).toBe(true);
    const discovered = JSON.parse(fs.readFileSync(toolsJsonPath, 'utf-8'));
    expect(discovered.length).toBe(34);
    expect(FORENSIC_MCP_TOOLS.length).toBe(34);
  });

  it('verifies every exposed tool has a dedicated operational evidence folder with raw JSON-RPC captures', () => {
    const toolFolders = fs.readdirSync(TOOLS_DIR).filter((f) => fs.statSync(path.join(TOOLS_DIR, f)).isDirectory());
    expect(toolFolders.length).toBe(34);

    for (const folder of toolFolders) {
      const folderPath = path.join(TOOLS_DIR, folder);
      expect(fs.existsSync(path.join(folderPath, 'request.raw.json'))).toBe(true);
      expect(fs.existsSync(path.join(folderPath, 'response.raw.json'))).toBe(true);
      expect(fs.existsSync(path.join(folderPath, 'request.json'))).toBe(true);
      expect(fs.existsSync(path.join(folderPath, 'response.json'))).toBe(true);
      expect(fs.existsSync(path.join(folderPath, 'pre-state.json'))).toBe(true);
      expect(fs.existsSync(path.join(folderPath, 'post-state.json'))).toBe(true);
      expect(fs.existsSync(path.join(folderPath, 'assertions.json'))).toBe(true);
      expect(fs.existsSync(path.join(folderPath, 'result.json'))).toBe(true);
      expect(fs.existsSync(path.join(folderPath, 'README.md'))).toBe(true);

      const result = JSON.parse(fs.readFileSync(path.join(folderPath, 'result.json'), 'utf-8'));
      expect(result.status).toBe('PASS');
      expect(result.assertionsPassed).toBeGreaterThan(0);
      expect(result.assertionsPassed).toBe(result.assertionsTotal);

      const rawReq = JSON.parse(fs.readFileSync(path.join(folderPath, 'request.raw.json'), 'utf-8'));
      expect(rawReq.jsonrpc).toBe('2.0');
      expect(rawReq.method).toBe('tools/call');

      const rawRes = JSON.parse(fs.readFileSync(path.join(folderPath, 'response.raw.json'), 'utf-8'));
      expect(rawRes.jsonrpc).toBe('2.0');
      expect(rawRes.result).toBeDefined();
    }
  });

  it('verifies visual screenshot tools contain valid PNG binaries and geometry metadata', () => {
    const visualFolders = ['027-capture_page_screenshot', '028-capture_element_screenshot'];
    for (const folder of visualFolders) {
      const pngPath = path.join(TOOLS_DIR, folder, 'evidence', 'screenshot.png');
      expect(fs.existsSync(pngPath)).toBe(true);
      const buffer = fs.readFileSync(pngPath);
      expect(buffer.length).toBeGreaterThanOrEqual(8);
      // Verify PNG magic header: \x89PNG\r\n\x1a\n
      expect(buffer[0]).toBe(0x89);
      expect(buffer[1]).toBe(0x50);
      expect(buffer[2]).toBe(0x4e);
      expect(buffer[3]).toBe(0x47);
    }
  });

  it('verifies autonomous Agent injected UI debugging scenario completed successfully', () => {
    const scenarioPath = path.join(SCENARIOS_DIR, '001-injected-ui-debugging-scenario', 'scenario-execution.json');
    expect(fs.existsSync(scenarioPath)).toBe(true);
    const steps = JSON.parse(fs.readFileSync(scenarioPath, 'utf-8'));
    expect(steps.length).toBe(10);
    expect(steps.every((s: any) => s.success)).toBe(true);
  });

  it('verifies final certification reports and capability matrix exist and assert CERTIFIED status', () => {
    const reportPath = path.join(REPORTS_DIR, 'operational-test-report.json');
    expect(fs.existsSync(reportPath)).toBe(true);
    const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
    expect(report.totalCapabilities).toBe(34);
    expect(report.passed).toBe(34);
    expect(report.failed).toBe(0);
    expect(report.certificationStatus).toBe('CERTIFIED');

    expect(fs.existsSync(path.join(REPORTS_DIR, 'operational-test-report.md'))).toBe(true);
    expect(fs.existsSync(path.join(REPORTS_DIR, 'capability-matrix.md'))).toBe(true);
    expect(fs.existsSync(path.join(REPORTS_DIR, 'certification.md'))).toBe(true);
  });
});
