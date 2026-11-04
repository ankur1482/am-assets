import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { checksums, decryptText, encryptText, parseArgs, parseEnv, safeJoin, SCHEMA_FILES, verifyBackup } from './recovery-lib.mjs';

const tempFolder = () => fs.mkdtemp(path.join(os.tmpdir(), 'recovery-test-'));

describe('full backup tools', () => {
  it('reads env files, with or without quotes and comments', () => {
    expect(parseEnv('# note\nA=1\nB="two words"\r\nC=\'x=y\'\n\nD=')).toEqual({ A: '1', B: 'two words', C: 'x=y', D: '' });
  });
  it('reads command options', () => {
    expect(parseArgs(['backup', '--code', 'dir', '--data', '--confirm', 'x'])).toEqual({ positional: ['backup'], flags: { code: 'dir', data: true, confirm: 'x' } });
  });
  it('encrypts secrets so only the right passphrase opens them', () => {
    const sealed = encryptText('SECRET=1', 'correct horse');
    expect(sealed).not.toContain('SECRET');
    expect(decryptText(sealed, 'correct horse')).toBe('SECRET=1');
    expect(() => decryptText(sealed, 'wrong')).toThrow();
  });
  it('detects a changed, missing or added file in a backup', async () => {
    const folder = await tempFolder();
    await fs.mkdir(path.join(folder, 'database'));
    await fs.writeFile(path.join(folder, 'database', 'a.json'), '1');
    await fs.writeFile(path.join(folder, 'b.txt'), '2');
    await fs.writeFile(path.join(folder, 'manifest.json'), JSON.stringify({ checksums: await checksums(folder) }));
    expect((await verifyBackup(folder)).problems).toEqual([]);
    await fs.writeFile(path.join(folder, 'database', 'a.json'), 'tampered');
    await fs.rm(path.join(folder, 'b.txt'));
    await fs.writeFile(path.join(folder, 'extra.txt'), '3');
    expect((await verifyBackup(folder)).problems.sort()).toEqual(['Changed: database/a.json', 'Missing: b.txt', 'Unexpected: extra.txt']);
    await fs.rm(folder, { recursive: true });
  });
  it('refuses storage paths that escape the backup folder', () => {
    expect(() => safeJoin('/backup/storage', '../../etc/passwd')).toThrow('Unsafe');
    expect(safeJoin('/backup/storage', 'a/b.pdf')).toContain('b.pdf');
  });
  it('lists every schema file that exists in the project', async () => {
    for (const file of SCHEMA_FILES) await fs.access(path.join('supabase', file));
  });
});
