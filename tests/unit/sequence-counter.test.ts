import { describe, it, expect } from 'vitest';
import { SequenceCounter } from '../../src/core/sequence-counter';

describe('SequenceCounter', () => {
  it('should generate strictly monotonically increasing sequence numbers', () => {
    const counter = new SequenceCounter();
    const seq1 = counter.nextSequence();
    const seq2 = counter.nextSequence();
    const seq3 = counter.nextSequence();

    expect(seq1).toBe(1);
    expect(seq2).toBe(2);
    expect(seq3).toBe(3);
    expect(seq3).toBeGreaterThan(seq2);
    expect(seq2).toBeGreaterThan(seq1);
  });

  it('should generate valid event IDs with proper prefixes', () => {
    const counter = new SequenceCounter();
    const id1 = counter.generateEventId('mut');
    const id2 = counter.generateEventId('usr');

    expect(id1.startsWith('mut_1_')).toBe(true);
    expect(id2.startsWith('usr_2_')).toBe(true);
  });

  it('should generate non-negative relative timestamps and valid wall clock', () => {
    const counter = new SequenceCounter();
    const rel = counter.getRelativeTimestamp();
    const wall = counter.getWallClock();

    expect(rel).toBeGreaterThanOrEqual(0);
    expect(wall).toBeGreaterThan(1700000000000);
  });
});
