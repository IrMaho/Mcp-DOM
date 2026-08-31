import { DOMSnapshot } from '../types/dom-node';
import { BaseEvent } from '../types/events';
import { DisappearingElementReport } from '../types/lifecycle';
export declare class DisappearingElementAnalyzer {
    static analyze(targetQuery: string | number, events: BaseEvent[], initialSnapshot?: DOMSnapshot): DisappearingElementReport;
}
//# sourceMappingURL=disappearing-analyzer.d.ts.map