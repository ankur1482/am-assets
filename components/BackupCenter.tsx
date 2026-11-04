"use client";

import { CheckCircle2, Download, FolderOpen, HardDrive, TriangleAlert } from 'lucide-react';
import { formatDateTime } from '@/lib/calculations';

export type BackupTarget = { at: string; error: string };
type Props = {
  driveConnected: boolean; drive: BackupTarget;
  folderName: string; folderNeedsPermission: boolean; folderSupported: boolean; folder: BackupTarget;
  busy: boolean; contents: string;
  onConnectDrive: () => void; onChooseFolder: () => void; onAllowFolder: () => void; onForgetFolder: () => void; onBackupNow: () => void; onDownload: () => void;
};

function Status({ target, idle }: { target: BackupTarget; idle: string }) {
  if (target.error) return <p className="backup-status backup-bad"><TriangleAlert size={14} /> {target.error}</p>;
  if (target.at) return <p className="backup-status backup-good"><CheckCircle2 size={14} /> Last backup: {formatDateTime(target.at)}</p>;
  return <p className="backup-status">{idle}</p>;
}

export default function BackupCenter(props: Props) {
  const { driveConnected, drive, folderName, folderNeedsPermission, folderSupported, folder, busy, contents } = props;
  return <section className="backup-center" aria-label="Automatic backups">
    <p>Every time data is added, changed or deleted, a new backup file is saved within about 10 seconds to each place you connect here. Price refreshes alone do not create a backup. The app must be open for this to happen.</p>
    <div className="backup-cards">
      <article>
        <h4><HardDrive size={17} /> Google Drive</h4>
        <p>Saved in <strong>Important Documents / Backups</strong> in your Drive. Stays connected after you sign out, until you disconnect it in Settings.</p>
        <Status target={drive} idle={driveConnected ? 'Connected. Waiting for the next change.' : 'Not connected.'} />
        {!driveConnected && <button type="button" className="btn-primary" onClick={props.onConnectDrive}>Connect Google Drive</button>}
      </article>
      <article>
        <h4><FolderOpen size={17} /> Folder on this PC</h4>
        {folderSupported ? <>
          <p>{folderName ? <>Saving to <strong>{folderName}</strong>.</> : 'Choose where on this PC backups should be saved.'}</p>
          <Status target={folder} idle={folderName ? 'Ready. Waiting for the next change.' : 'No folder chosen.'} />
          <div className="backup-actions">
            {folderNeedsPermission && <button type="button" className="btn-primary" onClick={props.onAllowFolder}>Allow saving to this folder</button>}
            <button type="button" className={folderName ? 'btn' : 'btn-primary'} onClick={props.onChooseFolder}>{folderName ? 'Change folder' : 'Choose folder'}</button>
            {folderName && <button type="button" className="btn" onClick={props.onForgetFolder}>Stop saving here</button>}
          </div>
        </> : <p>This browser cannot save to a chosen folder automatically. Use Chrome or Edge on your PC, or download a backup below.</p>}
      </article>
    </div>
    <div className="backup-actions">
      <button type="button" className="btn" disabled={busy || (!driveConnected && !folderName)} onClick={props.onBackupNow}>{busy ? 'Backing up…' : 'Back up now'}</button>
      <button type="button" className="btn" onClick={props.onDownload}><Download size={15} /> Download a copy</button>
    </div>
    <p className="backup-note"><strong>Each backup holds:</strong> {contents}. It is a readable JSON file without encryption, so keep it somewhere private. Older backups are never deleted automatically. To restore, use the reinstate option in Settings → Backup.</p>
    <p className="backup-note"><strong>Not in this file:</strong> attached document files (only their names and links), household members and permissions, logins, and the app itself. To cover those as well, run the full backup on your PC: <code>npm run backup:full</code>.</p>
  </section>;
}
