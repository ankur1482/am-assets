// node scripts/full-restore.mjs <backup folder> [--code <new folder>] [--skip-install] [--data] [--dry-run] [--overwrite]
//   --code   rebuilds the app into a new, empty folder
//   --data   loads logins, rows and documents into the Supabase project named in the settings
// Does nothing to any database unless --data is given and the project name is typed to confirm.
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ask, decryptText, DOCUMENT_BUCKET, listFiles, parseArgs, parseEnv, SCHEMA_FILES, TABLES, verifyBackup } from './recovery-lib.mjs';

const { flags, positional } = parseArgs(process.argv.slice(2));
const backup = positional[0] && path.resolve(positional[0]);
if (!backup) throw new Error('Tell me which backup folder to restore: node scripts/full-restore.mjs <backup folder> --code <new folder> --data');

const { manifest, problems } = await verifyBackup(backup);
if (manifest.format !== 'asset-manager-full-backup') throw new Error('This is not a full backup folder.');
if (problems.length) throw new Error(`This backup is damaged, so nothing was restored:\n${problems.join('\n')}`);
console.log(`Backup from ${manifest.created_at} passed its integrity check (${Object.keys(manifest.checksums).length} files).`);
const readJson = async file => JSON.parse(await fs.readFile(path.join(backup, file), 'utf8'));

async function settings() {
  const passphrase = process.env.BACKUP_PASSPHRASE || await ask('Backup passphrase: ');
  try { return decryptText(await fs.readFile(path.join(backup, 'settings', 'env.local.enc'), 'utf8'), passphrase); }
  catch { throw new Error('That passphrase did not open the settings file.'); }
}

let codeFolder = '';
if (typeof flags.code === 'string') {
  codeFolder = path.resolve(flags.code);
  if ((await fs.readdir(codeFolder).catch(() => [])).length) throw new Error(`${codeFolder} is not empty. Choose a new folder.`);
  console.log(`\n- Rebuilding the app in ${codeFolder}`);
  execFileSync('git', ['clone', '--branch', manifest.branch, path.join(backup, 'code', 'app.bundle'), codeFolder], { stdio: 'ignore' });
  await fs.writeFile(path.join(codeFolder, '.env.local'), await settings());
  const vercel = await fs.readFile(path.join(backup, 'settings', 'vercel-project.json'), 'utf8').catch(() => '');
  if (vercel) { await fs.mkdir(path.join(codeFolder, '.vercel'), { recursive: true }); await fs.writeFile(path.join(codeFolder, '.vercel', 'project.json'), vercel); }
  if (flags['skip-install']) console.log('  Skipped installing packages. Run npm ci in that folder.');
  else { console.log('  Installing packages...'); execFileSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['ci'], { cwd: codeFolder, stdio: 'inherit', shell: process.platform === 'win32' }); }
  console.log(`  Code restored at commit ${manifest.commit.slice(0, 7)}.`);
}

if (flags.data) {
  const env = parseEnv(await settings()), url = env.NEXT_PUBLIC_SUPABASE_URL, serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  const host = new URL(url).host, sameProject = url === manifest.supabase_url;
  console.log(`\n- Loading data into ${host}${sameProject ? ' (the project this backup came from)' : ''}`);
  // The client comes from the project's own packages, which exist once the code is in place.
  const { createClient } = await import(pathToFileURL(path.join(codeFolder || process.cwd(), 'node_modules', '@supabase', 'supabase-js', 'dist', 'index.mjs')).href)
    .catch(async () => import('@supabase/supabase-js'));
  const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  for (const [table] of TABLES) {
    const { error } = await supabase.from(table).select('*', { count: 'exact', head: true });
    if (error) throw new Error(`Table ${table} is not ready: ${error.message}\nOpen the Supabase SQL editor for ${host} and run these files in order from the backup's database/schema folder:\n  ${SCHEMA_FILES.join('\n  ')}\nThen run this command again.`);
  }
  const { count } = await supabase.from('records').select('*', { count: 'exact', head: true });
  if (count && !flags.overwrite && !flags['dry-run']) throw new Error(`${host} already has ${count} records. Nothing was changed. Add --overwrite only if you want the backup's rows to replace matching rows there.`);
  if (flags['dry-run']) {
    console.log(`  Dry run: would restore ${manifest.counts.users} logins, ${TABLES.map(([table]) => `${manifest.counts[table]} ${table}`).join(', ')} and ${manifest.counts.stored_documents} documents. Target currently has ${count ?? 0} records. Nothing was changed.`);
  } else {
    const typed = typeof flags.confirm === 'string' ? flags.confirm : await ask(`Type ${host} to load this backup into it: `);
    if (typed !== host) throw new Error('That did not match, so nothing was changed.');
    const users = await readJson('auth/users.json');
    for (const user of users) {
      const { error } = await supabase.auth.admin.createUser({ id: user.id, email: user.email, phone: user.phone || undefined, password: randomBytes(24).toString('base64url'), email_confirm: true, user_metadata: user.user_metadata, app_metadata: user.app_metadata });
      if (error && !/already|exists|registered/i.test(error.message)) throw new Error(`Could not create login ${user.email}: ${error.message}`);
    }
    console.log(`  Logins ready: ${users.length}`);
    // A new login can make its own workspace; the backup's workspace must take its place.
    const workspaces = await readJson('database/workspaces.json'), keep = new Set(workspaces.map(row => row.id));
    for (const row of workspaces) {
      const { data } = await supabase.from('workspaces').select('id').eq('owner_user_id', row.owner_user_id);
      for (const existing of data || []) if (!keep.has(existing.id)) await supabase.from('workspaces').delete().eq('id', existing.id);
    }
    for (const [table, key] of TABLES) {
      const rows = await readJson(`database/${table}.json`);
      for (let i = 0; i < rows.length; i += 500) {
        const { error } = await supabase.from(table).upsert(rows.slice(i, i + 500), { onConflict: key });
        if (error) throw new Error(`Could not restore ${table}: ${error.message}`);
      }
      const { count: restored } = await supabase.from(table).select('*', { count: 'exact', head: true });
      if ((restored ?? 0) < rows.length) throw new Error(`${table} has ${restored} rows after restoring, but the backup has ${rows.length}.`);
      console.log(`  ${table}: ${rows.length}`);
    }
    const storageFolder = path.join(backup, 'storage'), files = await listFiles(storageFolder).catch(() => []);
    if (files.length) {
      const bucket = await supabase.storage.getBucket(DOCUMENT_BUCKET);
      if (!bucket.data) await supabase.storage.createBucket(DOCUMENT_BUCKET, { public: false, fileSizeLimit: 52428800 });
      for (const file of files) {
        const { error } = await supabase.storage.from(DOCUMENT_BUCKET).upload(file, await fs.readFile(path.join(storageFolder, file)), { upsert: true });
        if (error) throw new Error(`Could not restore document ${file}: ${error.message}`);
      }
    }
    console.log(`  Documents: ${files.length}`);
    console.log('\nData restored. Logins were not given their old passwords, which Supabase does not export, so use "Forgot password" on the sign-in page unless the login already existed there.');
  }
}

if (!codeFolder && !flags.data) console.log('Nothing else to do. Add --code <new folder> to rebuild the app, or --data to load the data.');
if (manifest.warnings?.length) console.log(`\nNotes saved with this backup:\n${manifest.warnings.map(warning => `  * ${warning}`).join('\n')}`);
if (codeFolder) console.log(`\nTo start the app:\n  cd "${codeFolder}"\n  npm run dev`);
