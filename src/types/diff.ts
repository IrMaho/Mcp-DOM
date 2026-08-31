import { LogicalNodeId, VirtualDOMNode } from './dom-node';

export interface AddedNodeDiff {
  id: LogicalNodeId;
  tagName?: string;
  parentId?: LogicalNodeId | null;
  attributes?: Record<string, string>;
  textContent?: string;
  selector: string;
  htmlSnippet: string;
  node: VirtualDOMNode;
}

export interface RemovedNodeDiff {
  id: LogicalNodeId;
  tagName?: string;
  lastKnownParentId?: LogicalNodeId | null;
  selector: string;
  attributes?: Record<string, string>;
  textContent?: string;
}

export interface MovedNodeDiff {
  id: LogicalNodeId;
  tagName?: string;
  oldParentId?: LogicalNodeId | null;
  newParentId?: LogicalNodeId | null;
  oldIndex: number;
  newIndex: number;
  selector: string;
}

export interface AttributeChangeDiff {
  nodeId: LogicalNodeId;
  tagName?: string;
  attributeName: string;
  oldValue: string | null;
  newValue: string | null;
  selector: string;
}

export interface ClassChangeDiff {
  nodeId: LogicalNodeId;
  tagName?: string;
  addedClasses: string[];
  removedClasses: string[];
  oldClassString: string;
  newClassString: string;
  selector: string;
}

export interface StyleChangeDiff {
  nodeId: LogicalNodeId;
  tagName?: string;
  propertyName: string;
  oldValue: string | null;
  newValue: string | null;
  selector: string;
}

export interface TextChangeDiff {
  nodeId: LogicalNodeId;
  parentId?: LogicalNodeId | null;
  parentSelector?: string;
  oldText: string;
  newText: string;
}

export interface DOMDiffSummary {
  addedNodesCount: number;
  removedNodesCount: number;
  movedNodesCount: number;
  attributeChangesCount: number;
  classChangesCount: number;
  styleChangesCount: number;
  textChangesCount: number;
  totalChanges: number;
  hasStructuralChanges: boolean;
  hasVisibilityChanges: boolean;
}

export interface DOMDiffResult {
  t1: {
    timestamp: number;
    sequence?: number;
    eventId?: string;
    nodeCount: number;
  };
  t2: {
    timestamp: number;
    sequence?: number;
    eventId?: string;
    nodeCount: number;
  };
  addedNodes: AddedNodeDiff[];
  removedNodes: RemovedNodeDiff[];
  movedNodes: MovedNodeDiff[];
  changedAttributes: AttributeChangeDiff[];
  changedClasses: ClassChangeDiff[];
  changedStyles: StyleChangeDiff[];
  changedText: TextChangeDiff[];
  summary: DOMDiffSummary;
}
