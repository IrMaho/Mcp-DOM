# Operational Test: `inspect_live_element`

**Status**: **PASS** (2/2 Assertions Passed)
**Transport**: `JSON-RPC 2.0 over Stdio Subprocess`
**Execution Mode**: `live`
**Duration**: 100ms

## Test Objective
Deeply inspects #primary-action-btn styles, bounds, and role

## Raw Transmitted JSON-RPC Request
```json
{
  "jsonrpc": "2.0",
  "id": "op_req_023_inspect_live_element",
  "method": "tools/call",
  "params": {
    "name": "inspect_live_element",
    "arguments": {
      "selector": "#primary-action-btn"
    }
  }
}
```

## Raw Received JSON-RPC Response
```json
{
  "jsonrpc": "2.0",
  "id": "op_req_023_inspect_live_element",
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\n  \"tag\": \"button\",\n  \"id\": \"primary-action-btn\",\n  \"classes\": [\n    \"btn\"\n  ],\n  \"role\": \"button\",\n  \"text\": \"⚡ Run Analysis\",\n  \"normalizedText\": \"⚡ Run Analysis\",\n  \"value\": \"\",\n  \"type\": \"submit\",\n  \"selector\": \"#primary-action-btn\",\n  \"bestSelector\": \"#primary-action-btn\",\n  \"selectorCandidates\": [\n    \"#primary-action-btn\",\n    \"button[data-testid=\\\"action-button\\\"]\",\n    \"button.btn\",\n    \"button.btn\"\n  ],\n  \"bounds\": {\n    \"x\": 0,\n    \"y\": 0,\n    \"width\": 0,\n    \"height\": 0,\n    \"top\": 0,\n    \"right\": 0,\n    \"bottom\": 0,\n    \"left\": 0\n  },\n  \"visibility\": {\n    \"isVisible\": true,\n    \"display\": \"inline-block\",\n    \"visibility\": \"visible\",\n    \"opacity\": 1,\n    \"pointerEvents\": \"auto\",\n    \"isClipped\": false,\n    \"isInViewport\": true,\n    \"zIndex\": \"auto\"\n  },\n  \"computedStyle\": {\n    \"display\": \"inline-block\",\n    \"visibility\": \"visible\",\n    \"opacity\": \"1\",\n    \"position\": \"static\",\n    \"zIndex\": \"auto\",\n    \"pointerEvents\": \"auto\",\n    \"overflow\": \"\",\n    \"boxSizing\": \"border-box\",\n    \"color\": \"rgb(15, 23, 42)\",\n    \"backgroundColor\": \"rgb(56, 189, 248)\",\n    \"fontSize\": \"medium\"\n  },\n  \"attributes\": {\n    \"id\": \"primary-action-btn\",\n    \"class\": \"btn\",\n    \"data-testid\": \"action-button\"\n  },\n  \"state\": {\n    \"disabled\": false,\n    \"readOnly\": false,\n    \"focused\": false,\n    \"isShadowHost\": false,\n    \"hasShadowRoot\": false\n  },\n  \"context\": {\n    \"parentChain\": [\n      \"#interactive-section > div:nth-of-type(2)\",\n      \"#interactive-section\",\n      \"#main-content\",\n      \"body\"\n    ],\n    \"parentSelector\": \"#interactive-section > div:nth-of-type(2)\",\n    \"childrenSummary\": {\n      \"count\": 0,\n      \"tags\": []\n    },\n    \"containingBlock\": \"#interactive-section > div:nth-of-type(2)\",\n    \"iframe\": null,\n    \"shadowRoot\": null\n  },\n  \"forensics\": {\n    \"logicalNodeId\": null,\n    \"creationSequence\": null,\n    \"lastMutationSequence\": null,\n    \"eventCount\": 0,\n    \"isRecorded\": false\n  }\n}"
      }
    ]
  }
}
```

## Assertions
- [x] **JSON-RPC 2.0 Stdio Status Code & Envelope**: Successful JSON-RPC 2.0 resolution across stdio pipe
- [x] **Deeply inspects #primary-action-btn styles, bounds, and role**: tag, id, classes, role, text, normalizedText, value, type, selector, bestSelector, selectorCandidates, bounds, visibility, computedStyle, attributes, state, context, forensics
