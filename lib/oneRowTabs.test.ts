import { describe, expect, it } from 'vitest';
import { fitTabs } from './oneRowTabs';

describe('fitTabs', () => {
  it('keeps every tab when they all fit, without a More button', () => {
    expect(fitTabs([50, 50, 50], 170, 40, 10)).toEqual([0, 1, 2]);
  });

  it('leaves room for the More button when some do not fit', () => {
    // 40 for More, then 60 each including the gap: two fit in 170, a third does not.
    expect(fitTabs([50, 50, 50, 50], 170, 40, 10)).toEqual([0, 1]);
  });

  it('keeps the selected tab in the row, in its original place', () => {
    expect(fitTabs([50, 50, 50, 50], 170, 40, 10, [3])).toEqual([0, 3]);
  });

  it('keeps a pinned tab and the selected tab even when space is very tight', () => {
    expect(fitTabs([50, 50, 50, 50], 60, 40, 10, [0, 2])).toEqual([0, 2]);
  });

  it('keeps every tab before the row has been measured', () => {
    expect(fitTabs([50, 50], 0, 40, 10)).toEqual([0, 1]);
  });

  it('ignores a selected tab that is not in the list', () => {
    expect(fitTabs([50, 50, 50], 110, 40, 10, [-1, 9])).toEqual([0]);
  });
});
