export type AmfiNav = { schemeCode: string; schemeName: string; nav: number; navDate: string };

// AMFI's NAVAll.txt is semicolon separated. Its columns have changed over
// time (Nov 2026 added "Plan" and "Option" before the NAV), so columns are
// located from the header line by name instead of fixed positions.
export function findAmfiNav(text: string, code: string): AmfiNav | { error: "not-found" | "no-nav" } {
  const lines = text.split(/\r?\n/);
  const header = (lines.find((l) => /^\s*Scheme Code\s*;/i.test(l)) || "").split(";").map((h) => h.trim().toLowerCase());
  const col = (re: RegExp, fallback: number) => {
    const i = header.findIndex((h) => re.test(h));
    return i >= 0 ? i : fallback;
  };
  const navCol = col(/net asset value/, 4);
  const dateCol = col(/^date$/, navCol + 1);
  const nameCol = col(/scheme name/, 3);
  const planCol = header.findIndex((h) => h === "plan");
  const optionCol = header.findIndex((h) => h === "option");

  const line = lines.find((l) => l.startsWith(code + ";"));
  if (!line) return { error: "not-found" };
  const parts = line.split(";").map((p) => p.trim());
  const nav = Number(parts[navCol]);
  if (!Number.isFinite(nav) || nav <= 0) return { error: "no-nav" };
  const nameParts = [parts[nameCol], planCol >= 0 ? parts[planCol] : "", optionCol >= 0 ? parts[optionCol] : ""];
  const schemeName = nameParts
    .filter((p, i) => p && p !== "-" && (i === 0 || !nameParts[0].toLowerCase().includes(p.toLowerCase())))
    .join(" - ");
  return { schemeCode: code, schemeName, nav, navDate: parts[dateCol] || "" };
}
