import { DOMSnapshot, LogicalNodeId } from '../types/dom-node';
import { BaseEvent } from '../types/events';
import { ElementLifecycleTrace } from '../types/lifecycle';
export declare class LifecycleTracer {
    static traceElement(target: {
        nodeId?: LogicalNodeId;
        selector?: string;
    }, events: BaseEvent[], initialSnapshot?: DOMSnapshot): ElementLifecycleTrace | null;
}
//# sourceMappingURL=lifecycle-tracer.d.ts.map