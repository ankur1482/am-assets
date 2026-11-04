import { createCipheriv, createDecipheriv, createHash, randomBytes, scryptSync } from 'node:crypto';
import { createReadStream, promises as fs } from 'node:fs';
import path from 'node:path';
import { createInterface } from 'node:readline/promises';

// Parents come before the rows that reference them. The second value is the table's unique key.
export const TABLES = [
  ['profiles', 'id'],
  ['user_roles', 'user_id'],
  ['workspaces', 'id'],
  ['workspace_members', 'id'],
  ['accounts', 'id'],
  ['records', 'id'],
  ['asset_documents', 'id'],
  ['oauth_credentials', 'user_id,provider'],
];
export const SCHEMA_FILES = ['schema.sql', 'household-workspaces.sql', 'oauth_credentials_migration.sql', 'kotak_migration.sql'];
export const DOCUMENT_BUCKET = 'asset-documents';

export function parseEnv(text) {
  const values = {};
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match) continue;
    const raw = match[2], quoted = raw.length > 1 && ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'")));
    values[match[1]] = quoted ? raw.slice(1, -1) : raw;
  }
  return values;
}

export function parseArgs(argv) {
  const flags = {}, positional = [];
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith('--')) { positional.push(argv[i]); continue; }
    const name = argv[i].slice(2);
    if (argv[i + 1] !== undefined && !argv[i + 1].startsWith('--')) flags[name] = argv[++i];
    else flags[name] = true;
  }
  return { flags, positional };
}

export function encryptText(text, passphrase) {
  const salt = randomBytes(16), iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', scryptSync(passphrase, salt, 32), iv);
  const body = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  return JSON.stringify({ salt: salt.toString('base64'), iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), body: body.toString('base64') });
}

/** Throws on a wrong passphrase or altered file, because the authentication tag will not match. */
export function decryptText(payload, passphrase) {
  const { salt, iv, tag, body } = JSON.parse(payload);
  const decipher = createDecipheriv('aes-256-gcm', scryptSync(passphrase, Buffer.from(salt, 'base64'), 32), Buffer.from(iv, 'base64'));
  decipher.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(body, 'base64')), decipher.final()]).toString('utf8');
}

export const sha256File = file => new Promise((resolve, reject) => {
  const hash = createHash('sha256');
  createReadStream(file).on('data', chunk => hash.update(chunk)).on('end', () => resolve(hash.digest('hex'))).on('error', reject);
});

export async function listFiles(directory, base = directory) {
  const found = [];
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) found.push(...await listFiles(full, base));
    else found.push(path.relative(base, full).split(path.sep).join('/'));
  }
  return found;
}

export async function checksums(directory) {
  const files = (await listFiles(directory)).filter(file => file !== 'manifest.json').sort(), result = {};
  for (const file of files) result[file] = await sha256File(path.join(directory, file));
  return result;
}

/** Lists every missing, altered or unexpected file; an empty list means the backup is intact. */
export async function verifyBackup(directory) {
  const manifest = JSON.parse(await fs.readFile(path.join(directory, 'manifest.json'), 'utf8')), actual = await checksums(directory), problems = [];
  for (const [file, hash] of Object.entries(manifest.checksums)) {
    if (!actual[file]) problems.push(`Missing: ${file}`);
    else if (actual[file] !== hash) problems.push(`Changed: ${file}`);
  }
  for (const file of Object.keys(actual)) if (!(file in manifest.checksums)) problems.push(`Unexpected: ${file}`);
  return { manifest, problems };
}

/** Stops a storage path from writing outside the folder it is being saved into. */
export function safeJoin(base, relative) {
  const target = path.resolve(base, relative), root = path.resolve(base);
  if (target !== root && !target.startsWith(root + path.sep)) throw new Error(`Unsafe path in backup: ${relative}`);
  return target;
}

export async function ask(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try { return (await rl.question(question)).trim(); } finally { rl.close(); }
}
