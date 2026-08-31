import { DOMSnapshot, LogicalNodeId } from '../types/dom-node';
import { StateReconstructor } from '../reconstruction/state-reconstructor';
import { TimeController } from './time-controller';
export interface ReplayEngineOptions {
    container?: HTMLElement;
    onNodeSelected?: (nodeId: LogicalNodeId, selector: string) => void;
    onNodeHovered?: (nodeId: LogicalNodeId | null) => void;
}
export declare class ReplayEngine {
    private reconstructor;
    private timeController;
    private container;
    private iframe;
    private selectedNodeId;
    private onNodeSelected?;
    private onNodeHovered?;
    private currentSnapshot;
    constructor(reconstructor: StateReconstructor, timeController: TimeController, options?: ReplayEngineOptions);
    setContainer(container: HTMLElement): void;
    private setupIframe;
    renderAtTimestamp(timestamp: number): DOMSnapshot;
    renderSnapshot(snapshot: DOMSnapshot): void;
    selectNode(nodeId: LogicalNodeId | null): void;
    private generateSandboxedHtml;
    private attachIframeInspector;
    private highlightSelectedNode;
    private escapeHtml;
    private escapeAttr;
}
//# sourceMappingURL=replay-engine.d.ts.map