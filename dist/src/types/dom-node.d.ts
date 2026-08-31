export type LogicalNodeId = number;
export declare enum VirtualDOMNodeType {
    ELEMENT_NODE = 1,
    ATTRIBUTE_NODE = 2,
    TEXT_NODE = 3,
    CDATA_SECTION_NODE = 4,
    PROCESSING_INSTRUCTION_NODE = 7,
    COMMENT_NODE = 8,
    DOCUMENT_NODE = 9,
    DOCUMENT_TYPE_NODE = 10,
    DOCUMENT_FRAGMENT_NODE = 11
}
export interface NodeIdentity {
    id: LogicalNodeId;
    tagName?: string;
    nodeType: VirtualDOMNodeType;
    createdAt: number;
    initialParentId?: LogicalNodeId | null;
    initialSelectorHint?: string;
    isCustomElement?: boolean;
}
export interface VirtualDOMNode {
    id: LogicalNodeId;
    nodeType: VirtualDOMNodeType;
    tagName?: string;
    attributes?: Record<string, string>;
    textContent?: string;
    children?: LogicalNodeId[];
    parentId?: LogicalNodeId | null;
    isShadowRoot?: boolean;
    shadowMode?: 'open' | 'closed';
    isShadowHost?: boolean;
    frameId?: string;
    isCustomElement?: boolean;
    namespaceURI?: string | null;
    isDetached?: boolean;
    isHidden?: boolean;
    computedStyles?: Record<string, string>;
    boundingClientRect?: {
        x: number;
        y: number;
        width: number;
        height: number;
        top: number;
        left: number;
        bottom: number;
        right: number;
    };
}
export interface DOMSnapshot {
    snapshotId: string;
    sessionId: string;
    timestamp: number;
    sequence: number;
    rootId: LogicalNodeId;
    nodes: Record<LogicalNodeId, VirtualDOMNode>;
    title: string;
    url: string;
    origin: string;
    viewport: {
        width: number;
        height: number;
        scrollX: number;
        scrollY: number;
        devicePixelRatio: number;
    };
    doctype?: string;
    totalNodeCount: number;
}
//# sourceMappingURL=dom-node.d.ts.map