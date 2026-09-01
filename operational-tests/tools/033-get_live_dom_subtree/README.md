# Operational Test: `get_live_dom_subtree`

**Status**: **PASS** (2/2 Assertions Passed)
**Transport**: `JSON-RPC 2.0 over Stdio Subprocess`
**Execution Mode**: `live`
**Duration**: 10ms

## Test Objective
Reconstructs live HTML subtree for #interactive-section

## Raw Transmitted JSON-RPC Request
```json
{
  "jsonrpc": "2.0",
  "id": "op_req_033_get_live_dom_subtree",
  "method": "tools/call",
  "params": {
    "name": "get_live_dom_subtree",
    "arguments": {
      "selector": "#interactive-section"
    }
  }
}
```

## Raw Received JSON-RPC Response
```json
{
  "jsonrpc": "2.0",
  "id": "op_req_033_get_live_dom_subtree",
  "result": {
    "content": [
      {
        "type": "text",
        "text": "<section id=\"interactive-section\">\n      <h2>Interactive Form Controls</h2>\n      <div style=\"margin-bottom: 12px;\">\n        <label for=\"search-input\">Search Input: </label>\n        <input id=\"search-input\" class=\"input-field\" type=\"text\" placeholder=\"Type here...\" value=\"initial query\">\n      </div>\n\n      <div style=\"margin-bottom: 12px;\">\n        <button id=\"primary-action-btn\" class=\"btn\" data-testid=\"action-button\">⚡ Run Analysis</button>\n        <span id=\"click-counter\" style=\"margin-left: 10px;\">Clicks: 0</span>\n      </div>\n\n      <div style=\"margin-bottom: 12px;\">\n        <label for=\"category-select\">Category: </label>\n        <select id=\"category-select\" class=\"input-field\">\n          <option value=\"opt-default\">Default Option</option>\n          <option value=\"opt-security\">Security Analysis</option>\n          <option value=\"opt-performance\">Performance Trace</option>\n        </select>\n      </div>\n\n      <div style=\"margin-bottom: 12px;\">\n        <label><input type=\"checkbox\" id=\"feature-toggle\"> Enable Deep Scanning</label>\n      </div>\n\n      <div id=\"scroll-box\">\n        <p>Scrollable item 1</p>\n        <p>Scrollable item 2</p>\n        <p>Scrollable item 3</p>\n        <p>Scrollable item 4</p>\n        <p id=\"scroll-target\">🎯 Deep Target Element</p>\n        <p>Scrollable item 6</p>\n      </div>\n    </section>"
      }
    ]
  }
}
```

## Assertions
- [x] **JSON-RPC 2.0 Stdio Status Code & Envelope**: Successful JSON-RPC 2.0 resolution across stdio pipe
- [x] **Reconstructs live HTML subtree for #interactive-section**: Received valid payload content
