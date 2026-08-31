import { DOMDiffResult } from '../types/diff';

export class DiffFormatter {
  public static formatMarkdown(diff: DOMDiffResult): string {
    const lines: string[] = [];
    lines.push(`### DOM Structural Diff: T1 (${diff.t1.timestamp.toFixed(1)}ms) → T2 (${diff.t2.timestamp.toFixed(1)}ms)`);
    lines.push(`- **Summary**: Total Changes: ${diff.summary.totalChanges} (Added: ${diff.summary.addedNodesCount}, Removed: ${diff.summary.removedNodesCount}, Moved: ${diff.summary.movedNodesCount}, Attr Changes: ${diff.summary.attributeChangesCount}, Class Changes: ${diff.summary.classChangesCount}, Text Changes: ${diff.summary.textChangesCount})`);
    lines.push(`- **Structural Shift**: ${diff.summary.hasStructuralChanges ? 'YES' : 'NO'}`);
    lines.push(`- **Visibility Impact**: ${diff.summary.hasVisibilityChanges ? 'YES' : 'NO'}`);
    lines.push('');

    if (diff.addedNodes.length > 0) {
      lines.push('#### ➕ Added Nodes');
      for (const node of diff.addedNodes) {
        lines.push(`- **[ID: ${node.id}]** \`${node.selector}\` — ${node.htmlSnippet}`);
      }
      lines.push('');
    }

    if (diff.removedNodes.length > 0) {
      lines.push('#### ➖ Removed Nodes');
      for (const node of diff.removedNodes) {
        lines.push(`- **[ID: ${node.id}]** \`${node.selector}\` (Parent ID: ${node.lastKnownParentId ?? 'none'})`);
      }
      lines.push('');
    }

    if (diff.movedNodes.length > 0) {
      lines.push('#### 🔄 Moved / Reparented Nodes');
      for (const node of diff.movedNodes) {
        lines.push(`- **[ID: ${node.id}]** \`${node.selector}\`: Parent ${node.oldParentId} (idx: ${node.oldIndex}) → Parent ${node.newParentId} (idx: ${node.newIndex})`);
      }
      lines.push('');
    }

    if (diff.changedClasses.length > 0) {
      lines.push('#### 🏷️ Class Modifications');
      for (const cl of diff.changedClasses) {
        const added = cl.addedClasses.length > 0 ? ` +[${cl.addedClasses.join(', ')}]` : '';
        const removed = cl.removedClasses.length > 0 ? ` -[${cl.removedClasses.join(', ')}]` : '';
        lines.push(`- **[ID: ${cl.nodeId}]** \`${cl.selector}\`:${added}${removed}`);
      }
      lines.push('');
    }

    if (diff.changedStyles.length > 0) {
      lines.push('#### 🎨 Style Modifications');
      for (const st of diff.changedStyles) {
        lines.push(`- **[ID: ${st.nodeId}]** \`${st.selector}\`: \`${st.propertyName}\`: "${st.oldValue ?? ''}" → "${st.newValue ?? ''}"`);
      }
      lines.push('');
    }

    if (diff.changedAttributes.length > 0) {
      lines.push('#### 📝 Attribute Modifications');
      for (const at of diff.changedAttributes) {
        if (at.attributeName.toLowerCase() !== 'class' && at.attributeName.toLowerCase() !== 'style') {
          lines.push(`- **[ID: ${at.nodeId}]** \`${at.selector}\`: \`${at.attributeName}\`: "${at.oldValue ?? ''}" → "${at.newValue ?? ''}"`);
        }
      }
      lines.push('');
    }

    if (diff.changedText.length > 0) {
      lines.push('#### 🔤 Text Modifications');
      for (const tx of diff.changedText) {
        lines.push(`- **[ID: ${tx.nodeId}]** (Parent: \`${tx.parentSelector ?? ''}\`): "${tx.oldText}" → "${tx.newText}"`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }
}
