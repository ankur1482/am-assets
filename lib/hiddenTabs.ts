// Menu tabs a user has chosen to hide. Hiding only removes the tab from the
// menus; the data still counts in net worth, goals and every total.
// These tabs can never be hidden, or the user could lock themselves out of
// the screen that brings tabs back.
export const LOCKED_TABS = ["dashboard", "settings", "admin"];

export function normalizeHiddenTabs(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.filter((x): x is string => typeof x === "string" && !!x && !LOCKED_TABS.includes(x)))];
}

export function toggleHiddenTab(hidden: string[], id: string): string[] {
  if (LOCKED_TABS.includes(id)) return hidden;
  return hidden.includes(id) ? hidden.filter((x) => x !== id) : [...hidden, id];
}
