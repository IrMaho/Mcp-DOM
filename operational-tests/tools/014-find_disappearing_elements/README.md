# Operational Test: `find_disappearing_elements`

**Status**: **PASS** (2/2 Assertions Passed)
**Transport**: `JSON-RPC 2.0 over Stdio Subprocess`
**Execution Mode**: `historical`
**Duration**: 37ms

## Test Objective
Discovers short-lived button 10 that existed for 330ms

## Raw Transmitted JSON-RPC Request
```json
{
  "jsonrpc": "2.0",
  "id": "op_req_014_find_disappearing_elements",
  "method": "tools/call",
  "params": {
    "name": "find_disappearing_elements",
    "arguments": {
      "sessionId": "operational_acceptance_session_001",
      "maxLifespanMs": 1000
    }
  }
}
```

## Raw Received JSON-RPC Response
```json
{
  "jsonrpc": "2.0",
  "id": "op_req_014_find_disappearing_elements",
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\n  \"sessionId\": \"operational_acceptance_session_001\",\n  \"maxLifespanMs\": 1000,\n  \"disappearingElementsCount\": 13,\n  \"elements\": [\n    {\n      \"nodeId\": 4,\n      \"tagName\": \"div\",\n      \"selector\": \"#host-sidebar\",\n      \"createdAt\": 0,\n      \"removedAt\": 380,\n      \"lifespanMs\": 380,\n      \"mutationCount\": 0\n    },\n    {\n      \"nodeId\": 4,\n      \"tagName\": \"div\",\n      \"selector\": \"#host-sidebar\",\n      \"createdAt\": 0,\n      \"removedAt\": 380,\n      \"lifespanMs\": 380,\n      \"mutationCount\": 0\n    },\n    {\n      \"nodeId\": 4,\n      \"tagName\": \"div\",\n      \"selector\": \"#host-sidebar\",\n      \"createdAt\": 0,\n      \"removedAt\": 380,\n      \"lifespanMs\": 380,\n      \"mutationCount\": 0\n    },\n    {\n      \"nodeId\": 4,\n      \"tagName\": \"div\",\n      \"selector\": \"#host-sidebar\",\n      \"createdAt\": 0,\n      \"removedAt\": 380,\n      \"lifespanMs\": 380,\n      \"mutationCount\": 0\n    },\n    {\n      \"nodeId\": 4,\n      \"tagName\": \"div\",\n      \"selector\": \"#host-sidebar\",\n      \"createdAt\": 0,\n      \"removedAt\": 380,\n      \"lifespanMs\": 380,\n      \"mutationCount\": 0\n    },\n    {\n      \"nodeId\": 4,\n      \"tagName\": \"div\",\n      \"selector\": \"#host-sidebar\",\n      \"createdAt\": 0,\n      \"removedAt\": 380,\n      \"lifespanMs\": 380,\n      \"mutationCount\": 0\n    },\n    {\n      \"nodeId\": 4,\n      \"tagName\": \"div\",\n      \"selector\": \"#host-sidebar\",\n      \"createdAt\": 0,\n      \"removedAt\": 380,\n      \"lifespanMs\": 380,\n      \"mutationCount\": 0\n    },\n    {\n      \"nodeId\": 4,\n      \"tagName\": \"div\",\n      \"selector\": \"#host-sidebar\",\n      \"createdAt\": 0,\n      \"removedAt\": 380,\n      \"lifespanMs\": 380,\n      \"mutationCount\": 0\n    },\n    {\n      \"nodeId\": 4,\n      \"tagName\": \"div\",\n      \"selector\": \"#host-sidebar\",\n      \"createdAt\": 0,\n      \"removedAt\": 380,\n      \"lifespanMs\": 380,\n      \"mutationCount\": 0\n    },\n    {\n      \"nodeId\": 4,\n      \"tagName\": \"div\",\n      \"selector\": \"#host-sidebar\",\n      \"createdAt\": 0,\n      \"removedAt\": 380,\n      \"lifespanMs\": 380,\n      \"mutationCount\": 0\n    },\n    {\n      \"nodeId\": 4,\n      \"tagName\": \"div\",\n      \"selector\": \"#host-sidebar\",\n      \"createdAt\": 0,\n      \"removedAt\": 380,\n      \"lifespanMs\": 380,\n      \"mutationCount\": 0\n    },\n    {\n      \"nodeId\": 4,\n      \"tagName\": \"div\",\n      \"selector\": \"#host-sidebar\",\n      \"createdAt\": 0,\n      \"removedAt\": 380,\n      \"lifespanMs\": 380,\n      \"mutationCount\": 0\n    },\n    {\n      \"nodeId\": 4,\n      \"tagName\": \"div\",\n      \"selector\": \"#host-sidebar\",\n      \"createdAt\": 0,\n      \"removedAt\": 380,\n      \"lifespanMs\": 380,\n      \"mutationCount\": 0\n    }\n  ]\n}"
      }
    ]
  }
}
```

## Assertions
- [x] **JSON-RPC 2.0 Stdio Status Code & Envelope**: Successful JSON-RPC 2.0 resolution across stdio pipe
- [x] **Discovers short-lived button 10 that existed for 330ms**: sessionId, maxLifespanMs, disappearingElementsCount, elements
