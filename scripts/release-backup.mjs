// Saves the current commit as a timestamped code backup: a zip in D:\asset-manager-backups and a
// matching tag on GitHub. Run it before pushing a release. It covers code only, not financial data.
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const parts = Object.fromEntries(
  new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    .formatToParts(new Date())
    .map(({ type, value }) => [type, value]),
);
const name = `backup-${parts.year}-${parts.month}-${parts.day}-${parts.hour}${parts.minute}-IST`;
const folder = 'D:/asset-manager-backups';
const git = (...args) => execFileSync('git', args, { stdio: ['ignore', 'pipe', 'inherit'] }).toString().trim();

mkdirSync(folder, { recursive: true });
git('archive', '--format=zip', '-o', `${folder}/${name}.zip`, 'HEAD');
git('tag', name);
git('push', 'origin', `refs/tags/${name}`);
console.log(`${name} (${git('rev-parse', '--short', 'HEAD')})`);
