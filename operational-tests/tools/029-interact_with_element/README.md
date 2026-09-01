# Operational Test: `interact_with_element`

**Status**: **PASS** (2/2 Assertions Passed)
**Transport**: `JSON-RPC 2.0 over Stdio Subprocess`
**Execution Mode**: `live`
**Duration**: 333ms

## Test Objective
Types text into input and measures immediate effects

## Raw Transmitted JSON-RPC Request
```json
{
  "jsonrpc": "2.0",
  "id": "op_req_029_interact_with_element",
  "method": "tools/call",
  "params": {
    "name": "interact_with_element",
    "arguments": {
      "action": "type",
      "selector": "#search-input",
      "text": " operational test text"
    }
  }
}
```

## Raw Received JSON-RPC Response
```json
{
  "jsonrpc": "2.0",
  "id": "op_req_029_interact_with_element",
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\n  \"success\": true,\n  \"action\": \"type\",\n  \"target\": {\n    \"tag\": \"input\",\n    \"id\": \"search-input\",\n    \"classes\": [\n      \"input-field\"\n    ],\n    \"role\": \"textbox\",\n    \"text\": \"\",\n    \"normalizedText\": \"\",\n    \"value\": \"initial query operational test text\",\n    \"type\": \"text\",\n    \"selector\": \"#search-input\",\n    \"bestSelector\": \"#search-input\",\n    \"selectorCandidates\": [\n      \"#search-input\",\n      \"input.input-field\",\n      \"input.input-field\"\n    ],\n    \"bounds\": {\n      \"x\": 0,\n      \"y\": 0,\n      \"width\": 0,\n      \"height\": 0,\n      \"top\": 0,\n      \"right\": 0,\n      \"bottom\": 0,\n      \"left\": 0\n    },\n    \"visibility\": {\n      \"isVisible\": true,\n      \"display\": \"inline-block\",\n      \"visibility\": \"visible\",\n      \"opacity\": 1,\n      \"pointerEvents\": \"auto\",\n      \"isClipped\": false,\n      \"isInViewport\": true,\n      \"zIndex\": \"auto\"\n    },\n    \"computedStyle\": {\n      \"display\": \"inline-block\",\n      \"visibility\": \"visible\",\n      \"opacity\": \"1\",\n      \"position\": \"static\",\n      \"zIndex\": \"auto\",\n      \"pointerEvents\": \"auto\",\n      \"overflow\": \"clip\",\n      \"boxSizing\": \"content-box\",\n      \"color\": \"rgb(248, 250, 252)\",\n      \"backgroundColor\": \"rgb(15, 23, 42)\",\n      \"fontSize\": \"medium\"\n    },\n    \"attributes\": {\n      \"id\": \"search-input\",\n      \"class\": \"input-field\",\n      \"type\": \"text\",\n      \"placeholder\": \"Type here...\",\n      \"value\": \"initial query\"\n    },\n    \"state\": {\n      \"disabled\": false,\n      \"readOnly\": false,\n      \"checked\": false,\n      \"focused\": true,\n      \"isShadowHost\": false,\n      \"hasShadowRoot\": false\n    },\n    \"context\": {\n      \"parentChain\": [\n        \"#interactive-section > div:nth-of-type(1)\",\n        \"#interactive-section\",\n        \"#main-content\",\n        \"body\"\n      ],\n      \"parentSelector\": \"#interactive-section > div:nth-of-type(1)\",\n      \"childrenSummary\": {\n        \"count\": 0,\n        \"tags\": []\n      },\n      \"containingBlock\": \"#interactive-section > div:nth-of-type(1)\",\n      \"iframe\": null,\n      \"shadowRoot\": null\n    },\n    \"forensics\": {\n      \"logicalNodeId\": null,\n      \"creationSequence\": null,\n      \"lastMutationSequence\": null,\n      \"eventCount\": 0,\n      \"isRecorded\": false\n    }\n  },\n  \"beforeState\": {\n    \"tag\": \"input\",\n    \"id\": \"search-input\",\n    \"classes\": [\n      \"input-field\"\n    ],\n    \"role\": \"textbox\",\n    \"text\": \"\",\n    \"normalizedText\": \"\",\n    \"value\": \"initial query\",\n    \"type\": \"text\",\n    \"selector\": \"#search-input\",\n    \"bestSelector\": \"#search-input\",\n    \"selectorCandidates\": [\n      \"#search-input\",\n      \"input.input-field\",\n      \"input.input-field\"\n    ],\n    \"bounds\": {\n      \"x\": 0,\n      \"y\": 0,\n      \"width\": 0,\n      \"height\": 0,\n      \"top\": 0,\n      \"right\": 0,\n      \"bottom\": 0,\n      \"left\": 0\n    },\n    \"visibility\": {\n      \"isVisible\": true,\n      \"display\": \"inline-block\",\n      \"visibility\": \"visible\",\n      \"opacity\": 1,\n      \"pointerEvents\": \"auto\",\n      \"isClipped\": false,\n      \"isInViewport\": true,\n      \"zIndex\": \"auto\"\n    },\n    \"computedStyle\": {\n      \"display\": \"inline-block\",\n      \"visibility\": \"visible\",\n      \"opacity\": \"1\",\n      \"position\": \"static\",\n      \"zIndex\": \"auto\",\n      \"pointerEvents\": \"auto\",\n      \"overflow\": \"clip\",\n      \"boxSizing\": \"content-box\",\n      \"color\": \"rgb(248, 250, 252)\",\n      \"backgroundColor\": \"rgb(15, 23, 42)\",\n      \"fontSize\": \"medium\"\n    },\n    \"attributes\": {\n      \"id\": \"search-input\",\n      \"class\": \"input-field\",\n      \"type\": \"text\",\n      \"placeholder\": \"Type here...\",\n      \"value\": \"initial query\"\n    },\n    \"state\": {\n      \"disabled\": false,\n      \"readOnly\": false,\n      \"checked\": false,\n      \"focused\": false,\n      \"isShadowHost\": false,\n      \"hasShadowRoot\": false\n    },\n    \"context\": {\n      \"parentChain\": [\n        \"#interactive-section > div:nth-of-type(1)\",\n        \"#interactive-section\",\n        \"#main-content\",\n        \"body\"\n      ],\n      \"parentSelector\": \"#interactive-section > div:nth-of-type(1)\",\n      \"childrenSummary\": {\n        \"count\": 0,\n        \"tags\": []\n      },\n      \"containingBlock\": \"#interactive-section > div:nth-of-type(1)\",\n      \"iframe\": null,\n      \"shadowRoot\": null\n    },\n    \"forensics\": {\n      \"logicalNodeId\": null,\n      \"creationSequence\": null,\n      \"lastMutationSequence\": null,\n      \"eventCount\": 0,\n      \"isRecorded\": false\n    }\n  },\n  \"afterState\": {\n    \"tag\": \"input\",\n    \"id\": \"search-input\",\n    \"classes\": [\n      \"input-field\"\n    ],\n    \"role\": \"textbox\",\n    \"text\": \"\",\n    \"normalizedText\": \"\",\n    \"value\": \"initial query operational test text\",\n    \"type\": \"text\",\n    \"selector\": \"#search-input\",\n    \"bestSelector\": \"#search-input\",\n    \"selectorCandidates\": [\n      \"#search-input\",\n      \"input.input-field\",\n      \"input.input-field\"\n    ],\n    \"bounds\": {\n      \"x\": 0,\n      \"y\": 0,\n      \"width\": 0,\n      \"height\": 0,\n      \"top\": 0,\n      \"right\": 0,\n      \"bottom\": 0,\n      \"left\": 0\n    },\n    \"visibility\": {\n      \"isVisible\": true,\n      \"display\": \"inline-block\",\n      \"visibility\": \"visible\",\n      \"opacity\": 1,\n      \"pointerEvents\": \"auto\",\n      \"isClipped\": false,\n      \"isInViewport\": true,\n      \"zIndex\": \"auto\"\n    },\n    \"computedStyle\": {\n      \"display\": \"inline-block\",\n      \"visibility\": \"visible\",\n      \"opacity\": \"1\",\n      \"position\": \"static\",\n      \"zIndex\": \"auto\",\n      \"pointerEvents\": \"auto\",\n      \"overflow\": \"clip\",\n      \"boxSizing\": \"content-box\",\n      \"color\": \"rgb(248, 250, 252)\",\n      \"backgroundColor\": \"rgb(15, 23, 42)\",\n      \"fontSize\": \"medium\"\n    },\n    \"attributes\": {\n      \"id\": \"search-input\",\n      \"class\": \"input-field\",\n      \"type\": \"text\",\n      \"placeholder\": \"Type here...\",\n      \"value\": \"initial query\"\n    },\n    \"state\": {\n      \"disabled\": false,\n      \"readOnly\": false,\n      \"checked\": false,\n      \"focused\": true,\n      \"isShadowHost\": false,\n      \"hasShadowRoot\": false\n    },\n    \"context\": {\n      \"parentChain\": [\n        \"#interactive-section > div:nth-of-type(1)\",\n        \"#interactive-section\",\n        \"#main-content\",\n        \"body\"\n      ],\n      \"parentSelector\": \"#interactive-section > div:nth-of-type(1)\",\n      \"childrenSummary\": {\n        \"count\": 0,\n        \"tags\": []\n      },\n      \"containingBlock\": \"#interactive-section > div:nth-of-type(1)\",\n      \"iframe\": null,\n      \"shadowRoot\": null\n    },\n    \"forensics\": {\n      \"logicalNodeId\": null,\n      \"creationSequence\": null,\n      \"lastMutationSequence\": null,\n      \"eventCount\": 0,\n      \"isRecorded\": false\n    }\n  },\n  \"effects\": {\n    \"domMutations\": 0,\n    \"consoleErrors\": 0,\n    \"networkRequests\": 0,\n    \"runtimeErrors\": []\n  },\n  \"durationMs\": 330,\n  \"stabilized\": true\n}"
      }
    ]
  }
}
```

## Assertions
- [x] **JSON-RPC 2.0 Stdio Status Code & Envelope**: Successful JSON-RPC 2.0 resolution across stdio pipe
- [x] **Types text into input and measures immediate effects**: success, action, target, beforeState, afterState, effects, durationMs, stabilized
