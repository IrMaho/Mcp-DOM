# Operational Test: `get_element_visual_state`

**Status**: **PASS** (2/2 Assertions Passed)
**Transport**: `JSON-RPC 2.0 over Stdio Subprocess`
**Execution Mode**: `live`
**Duration**: 8ms

## Test Objective
Inspects layout, visibility, and geometry for #search-input

## Raw Transmitted JSON-RPC Request
```json
{
  "jsonrpc": "2.0",
  "id": "op_req_034_get_element_visual_state",
  "method": "tools/call",
  "params": {
    "name": "get_element_visual_state",
    "arguments": {
      "selector": "#search-input"
    }
  }
}
```

## Raw Received JSON-RPC Response
```json
{
  "jsonrpc": "2.0",
  "id": "op_req_034_get_element_visual_state",
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\n  \"selector\": \"#search-input\",\n  \"bounds\": {\n    \"x\": 0,\n    \"y\": 0,\n    \"width\": 0,\n    \"height\": 0,\n    \"top\": 0,\n    \"right\": 0,\n    \"bottom\": 0,\n    \"left\": 0\n  },\n  \"viewport\": {\n    \"scrollX\": 0,\n    \"scrollY\": 0,\n    \"width\": 1024,\n    \"height\": 768,\n    \"devicePixelRatio\": 1\n  },\n  \"layout\": {\n    \"display\": \"inline-block\",\n    \"position\": \"static\",\n    \"zIndex\": \"auto\",\n    \"opacity\": 1,\n    \"visibility\": \"visible\",\n    \"overflow\": \"clip\",\n    \"boxSizing\": \"content-box\",\n    \"pointerEvents\": \"auto\"\n  },\n  \"occlusion\": {\n    \"isInViewport\": false,\n    \"isClipped\": true,\n    \"isZeroDimension\": true,\n    \"isTransparent\": false,\n    \"isDisplayNone\": false,\n    \"isVisibilityHidden\": false,\n    \"isOffscreen\": true,\n    \"occludedBy\": null\n  },\n  \"computedStyleSummary\": {\n    \"display\": \"inline-block\",\n    \"position\": \"static\",\n    \"zIndex\": \"auto\",\n    \"opacity\": \"1\",\n    \"visibility\": \"visible\",\n    \"pointerEvents\": \"auto\"\n  }\n}"
      }
    ]
  }
}
```

## Assertions
- [x] **JSON-RPC 2.0 Stdio Status Code & Envelope**: Successful JSON-RPC 2.0 resolution across stdio pipe
- [x] **Inspects layout, visibility, and geometry for #search-input**: selector, bounds, viewport, layout, occlusion, computedStyleSummary
