// npm run backup:full -- [--out <folder>]
// Saves everything needed to rebuild the app: code and history, database, logins, stored
// documents and encrypted settings. Only reads from Supabase; it changes nothing there.
import { execFileSync } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { ask, checksums, DOCUMENT_BUCKET, encryptText, parseArgs, parseEnv, safeJoin, SCHEMA_FILES, TABLES, verifyBackup } from './recovery-lib.mjs';

const { flags } = parseArgs(process.argv.slice(2));
const root = process.cwd(), stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
const out = path.resolve(typeof flags.out === 'string' ? flags.out : path.join(root, '..', 'asset-manager-backups', `full-backup-${stamp}`));
const step = message => console.log(`\n- ${message}`);
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();

const envText = await fs.readFile(path.join(root, '.env.local'), 'utf8').catch(() => { throw new Error('.env.local was not found. Run this from the project folder.'); });
const env = parseEnv(envText), url = env.NEXT_PUBLIC_SUPABASE_URL, serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) throw new Error('.env.local needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
const passphrase = process.env.BACKUP_PASSPHRASE || await ask('Choose a passphrase to protect your settings and keys (you will need it to restore): ');
if (passphrase.length < 8) throw new Error('Use a passphrase of at least 8 characters.');
if ((await fs.readdir(out).catch(() => [])).length) throw new Error(`${out} already has files in it. Choose an empty folder.`);
const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
await fs.mkdir(out, { recursive: true });
const warnings = [], counts = {};

step('Code and full history');
await fs.mkdir(path.join(out, 'code'));
execFileSync('git', ['bundle', 'create', path.join(out, 'code', 'app.bundle'), '--all'], { cwd: root, stdio: 'ignore' });
const uncommitted = git('status', '--porcelain');
if (uncommitted) warnings.push('Some code changes are not committed, so they are NOT in this backup. Commit them and back up again.');
const commit = git('rev-parse', 'HEAD'), branch = git('rev-parse', '--abbrev-ref', 'HEAD');

step('Database structure');
await fs.mkdir(path.join(out, 'database', 'schema'), { recursive: true });
for (const file of SCHEMA_FILES) await fs.copyFile(path.join(root, 'supabase', file), path.join(out, 'database', 'schema', file));

step('Database rows');
for (const [table] of TABLES) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from(table).select('*').range(from, from + 999);
    if (error) throw new Error(`Could not read ${table}: ${error.message}`);
    rows.push(...data);
    if (data.length < 1000) break;
  }
  await fs.writeFile(path.join(out, 'database', `${table}.json`), JSON.stringify(rows, null, 2));
  counts[table] = rows.length;
  console.log(`  ${table}: ${rows.length}`);
}

step('Logins');
const users = [];
for (let page = 1; ; page++) {
  const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
  if (error) throw new Error(`Could not read logins: ${error.message}`);
  users.push(...data.users.map(({ id, email, phone, user_metadata, app_metadata, email_confirmed_at, created_at }) => ({ id, email, phone, user_metadata, app_metadata, email_confirmed_at, created_at })));
  if (data.users.length < 1000) break;
}
await fs.mkdir(path.join(out, 'auth'));
await fs.writeFile(path.join(out, 'auth', 'users.json'), JSON.stringify(users, null, 2));
counts.users = users.length;
console.log(`  users: ${users.length}`);

step('Documents stored in the app');
async function listStorage(prefix = '') {
  const found = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase.storage.from(DOCUMENT_BUCKET).list(prefix, { limit: 1000, offset });
    if (error) { if (/not found/i.test(error.message)) return found; throw new Error(`Could not list documents: ${error.message}`); }
    for (const item of data) {
      const full = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.id) found.push(full); else found.push(...await listStorage(full));
    }
    if (data.length < 1000) break;
  }
  return found;
}
const stored = await listStorage();
for (const file of stored) {
  const { data, error } = await supabase.storage.from(DOCUMENT_BUCKET).download(file);
  if (error) { warnings.push(`Could not download document ${file}: ${error.message}`); continue; }
  const target = safeJoin(path.join(out, 'storage'), file);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, Buffer.from(await data.arrayBuffer()));
}
counts.stored_documents = stored.length;
console.log(`  files: ${stored.length}`);
const documents = JSON.parse(await fs.readFile(path.join(out, 'database', 'asset_documents.json'), 'utf8'));
const driveDocuments = documents.filter(row => String(row.file_path).startsWith('gdrive:')).length;
if (driveDocuments) warnings.push(`${driveDocuments} documents live in Google Drive. Their links are saved, but the files stay in Drive and are not copied here.`);
counts.google_drive_documents = driveDocuments;

step('Settings and keys (encrypted)');
await fs.mkdir(path.join(out, 'settings'));
await fs.writeFile(path.join(out, 'settings', 'env.local.enc'), encryptText(envText, passphrase));
const vercel = await fs.readFile(path.join(root, '.vercel', 'project.json'), 'utf8').catch(() => '');
if (vercel) await fs.writeFile(path.join(out, 'settings', 'vercel-project.json'), vercel);

// A new PC has no copy of the project yet, so the backup carries its own restore tools.
step('Restore tools');
await fs.mkdir(path.join(out, 'restore-tools'));
for (const file of ['full-restore.mjs', 'recovery-lib.mjs']) await fs.copyFile(path.join(root, 'scripts', file), path.join(out, 'restore-tools', file));

step('Checking the backup');
const manifest = { format: 'asset-manager-full-backup', version: 1, created_at: new Date().toISOString(), supabase_url: url, commit, branch, uncommitted_changes: Boolean(uncommitted), counts, warnings, checksums: await checksums(out) };
await fs.writeFile(path.join(out, 'manifest.json'), JSON.stringify(manifest, null, 2));
const { problems } = await verifyBackup(out);
if (problems.length) throw new Error(`The backup failed its own check:\n${problems.join('\n')}`);
execFileSync('git', ['bundle', 'verify', path.join(out, 'code', 'app.bundle')], { cwd: root, stdio: 'ignore' });

console.log(`\nDone. Backup saved to:\n${out}\n\nContains ${counts.records} records, ${counts.accounts} accounts, ${counts.users} logins and ${stored.length} stored documents.`);
if (warnings.length) console.log(`\nPlease note:\n${warnings.map(warning => `  * ${warning}`).join('\n')}`);
console.log(`\nTo rebuild on any PC with Node.js and Git:\n  node "${path.join(out, 'restore-tools', 'full-restore.mjs')}" "${out}" --code <new folder> --data`);
console.log('\nThis folder holds your financial data unencrypted. Keep it on a private drive and copy it somewhere safe.');
