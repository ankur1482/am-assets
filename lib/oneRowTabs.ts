/**
 * Chooses which tabs stay in a single row, in their original order. Tabs in `mustShow`, such as the
 * selected one, always stay. Everything else that does not fit goes under the More button.
 */
export function fitTabs(widths: number[], available: number, moreWidth: number, gap: number, mustShow: number[] = []): number[] {
  const all = widths.map((_, index) => index);
  const total = widths.reduce((sum, width) => sum + width, 0) + gap * Math.max(0, widths.length - 1);
  // Not measured yet, or the row is hidden: there is nothing to go on, so keep every tab.
  if (available <= 0 || total <= available) return all;

  const shown = new Set(mustShow.filter((index) => index >= 0 && index < widths.length));
  let used = moreWidth + [...shown].reduce((sum, index) => sum + widths[index] + gap, 0);
  for (const index of all) {
    if (shown.has(index)) continue;
    if (used + widths[index] + gap > available) break;
    shown.add(index);
    used += widths[index] + gap;
  }
  return all.filter((index) => shown.has(index));
}
