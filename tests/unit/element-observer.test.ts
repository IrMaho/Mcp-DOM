import { describe, it, expect, beforeEach } from 'vitest';
import { ElementObserver } from '../../src/core/element-observer';
import { NodeRegistry } from '../../src/core/node-registry';

describe('ElementObserver', () => {
  let observer: ElementObserver;
  let registry: NodeRegistry;

  beforeEach(() => {
    registry = new NodeRegistry();
    observer = new ElementObserver(registry);
    document.body.innerHTML = `
      <div id="wrapper">
        <div id="target-widget" class="widget">
          <p id="widget-text">Original Widget Text</p>
        </div>
      </div>
    `;
  });

  it('starts observation and records live mutations affecting target', async () => {
    const target = document.getElementById('target-widget') as HTMLElement;
    const { observationId, initialState } = observer.startObservation(target);

    expect(observationId).toBeDefined();
    expect(initialState.id).toBe('target-widget');

    // Mutate attribute
    target.className = 'widget active updated';

    // Mutate children
    const newSpan = document.createElement('span');
    newSpan.textContent = 'New injected badge';
    target.appendChild(newSpan);

    // Wait for mutation observer to batch
    await new Promise((resolve) => setTimeout(resolve, 50));

    const bundle = observer.stopObservation();
    expect(bundle.observationId).toBe(observationId);
    expect(bundle.disappeared).toBe(false);
    expect(bundle.finalState?.classes).toContain('updated');
    expect(bundle.mutations.length).toBeGreaterThan(0);
  });

  it('detects unmounting/disappearance and generates correlation evidence', async () => {
    const target = document.getElementById('target-widget') as HTMLElement;
    observer.startObservation(target);

    // Remove target from DOM
    target.remove();

    // Wait for mutation observer
    await new Promise((resolve) => setTimeout(resolve, 50));

    const bundle = observer.stopObservation();
    expect(bundle.disappeared).toBe(true);
    expect(bundle.disappearanceReason).toContain('unmounted');
    expect(bundle.finalState).toBeNull();
  });
});
