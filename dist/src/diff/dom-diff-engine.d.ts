import { DOMSnapshot } from '../types/dom-node';
import { DOMDiffResult } from '../types/diff';
export declare class DOMDiffEngine {
    static diff(s1: DOMSnapshot, s2: DOMSnapshot): DOMDiffResult;
    private static diffInlineStyles;
    private static renderNodeSnippet;
}
//# sourceMappingURL=dom-diff-engine.d.ts.map