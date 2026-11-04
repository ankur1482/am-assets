import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('AssetManagerApp structure', () => {
  it('declares no constants after the main return, where they would never be initialised', () => {
    const lines = readFileSync('components/AssetManagerApp.tsx', 'utf8').split(/\r?\n/);
    const start = lines.findIndex(line => line.startsWith('export default function AssetManagerApp'));
    const mainReturn = lines.findIndex((line, index) => index > start && /^ {2}return \(\s*$/.test(line));
    expect(mainReturn).toBeGreaterThan(start);
    const unreachable = lines.slice(mainReturn).filter(line => /^ {2}(const|let|var) /.test(line));
    expect(unreachable).toEqual([]);
  });
});
