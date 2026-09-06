const API = 'http://localhost:5000/api/backup';

export interface CollectionInfo {
  name: string;
  count: number;
  storageSize: number;
  dataSize: number;
}

export interface BackupInfo {
  database: string;
  totalCollections: number;
  totalDocuments: number;
  dataSize: number;
  storageSize: number;
  collections: CollectionInfo[];
}

export async function fetchBackupInfo(): Promise<BackupInfo> {
  const res = await fetch(`${API}/info`);
  if (!res.ok) throw new Error('Failed to fetch backup info');
  return res.json();
}

export async function downloadBackup(selectedCollections: string[] | null = null): Promise<void> {
  const params = selectedCollections ? `?collections=${selectedCollections.join(',')}` : '';
  const res = await fetch(`${API}/download${params}`);
  if (!res.ok) throw new Error('Failed to generate backup');

  const disposition = res.headers.get('Content-Disposition') || '';
  const match = disposition.match(/filename="(.+?)"/);
  const filename = match?.[1] ?? 'backup.json';

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
