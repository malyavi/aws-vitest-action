// A real Vitest suite with one passing and one failing test, so the smoke job
// exercises the argument assembly, the results file and the outputs against
// Vitest itself rather than against a stand-in that writes the file directly.
import {describe, expect, it} from 'vitest';

describe('arithmetic', () => {
  it('adds', () => {
    expect(1 + 1).toBe(2);
  });

  it('fails on purpose, so the report has something to carry', () => {
    expect(1 + 1).toBe(3);
  });
});
