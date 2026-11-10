import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { APP_VERSION } from "./appVersion";

describe("APP_VERSION", () => {
  it("matches package.json and the newest CHANGES.md entry", () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf8"));
    expect(pkg.version).toBe(`${APP_VERSION}.0`);
    const newest = readFileSync("CHANGES.md", "utf8").match(/^## .*$/m)?.[0] || "";
    expect(newest).toContain(`Version ${APP_VERSION}`);
  });
});
