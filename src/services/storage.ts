import { get, set, del } from 'idb-keyval';
import { UserProgress, PatchType, GameStage } from '../types';

const STORAGE_KEY = 'refined_platinum_dex_progress_v1';
const CURRENT_SCHEMA_VERSION = 1;

export const DEFAULT_PROGRESS: UserProgress = {
  schemaVersion: CURRENT_SCHEMA_VERSION,
  seen: {},
  caught: {},
  notes: {},
  lastBackupDate: new Date().toISOString(),
  patch: 'trainer',
  gameStage: 'badge_0'
};

// Request persistent storage on launch
export async function requestPersistence(): Promise<boolean> {
  if (navigator.storage && navigator.storage.persist) {
    try {
      const isPersisted = await navigator.storage.persist();
      console.log(`Storage persistent: ${isPersisted}`);
      return isPersisted;
    } catch (e) {
      console.warn('Could not request persistent storage:', e);
    }
  }
  return false;
}

// Migrate stored data across versions
function migrate(data: any): UserProgress {
  if (!data || typeof data !== 'object') {
    return { ...DEFAULT_PROGRESS };
  }

  // Version 1 migration
  const seen = data.seen && typeof data.seen === 'object' ? data.seen : {};
  const caught = data.caught && typeof data.caught === 'object' ? data.caught : {};
  const notes = data.notes && typeof data.notes === 'object' ? data.notes : {};
  const patch: PatchType = data.patch === 'base' ? 'base' : 'trainer';
  const gameStage: GameStage = data.gameStage || 'badge_0';
  const lastBackupDate = data.lastBackupDate || new Date().toISOString();

  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    seen,
    caught,
    notes,
    lastBackupDate,
    patch,
    gameStage
  };
}

// Load progress from IndexedDB
export async function loadProgress(): Promise<UserProgress> {
  try {
    const raw = await get(STORAGE_KEY);
    if (!raw) {
      await saveProgress(DEFAULT_PROGRESS);
      return { ...DEFAULT_PROGRESS };
    }
    return migrate(raw);
  } catch (err) {
    console.error('Failed to load progress from IndexedDB:', err);
    return { ...DEFAULT_PROGRESS };
  }
}

// Save progress immediately to IndexedDB without blocking UI
export function saveProgress(progress: UserProgress): Promise<void> {
  return set(STORAGE_KEY, progress).catch(err => {
    console.error('Failed to save progress to IndexedDB:', err);
  });
}

// Export progress via iOS Share Sheet or JSON file download
export async function exportProgress(progress: UserProgress): Promise<boolean> {
  const exportData = {
    ...progress,
    lastBackupDate: new Date().toISOString()
  };

  // Update backup date in local state
  await saveProgress(exportData);

  const jsonStr = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const filename = `refined-platinum-dex-backup-${new Date().toISOString().slice(0, 10)}.json`;

  // Try Web Share API (native iOS share sheet)
  if (navigator.share && navigator.canShare) {
    const file = new File([blob], filename, { type: 'application/json' });
    if (navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          title: 'Refined Platinum Dex Backup',
          files: [file]
        });
        return true;
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.warn('Web Share failed, falling back to download:', err);
        } else {
          return true; // user cancelled share
        }
      }
    }
  }

  // Fallback download link
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return true;
}

// Import progress from JSON string
export async function importProgress(jsonString: string): Promise<UserProgress> {
  const parsed = JSON.parse(jsonString);
  const migrated = migrate(parsed);
  await saveProgress(migrated);
  return migrated;
}

// Clear all progress with fresh state
export async function resetProgress(): Promise<UserProgress> {
  await del(STORAGE_KEY);
  const fresh = { ...DEFAULT_PROGRESS, lastBackupDate: new Date().toISOString() };
  await saveProgress(fresh);
  return fresh;
}

// Calculate days since last backup
export function getBackupAgeDays(lastBackupDateStr: string): number {
  if (!lastBackupDateStr) return 999;
  const last = new Date(lastBackupDateStr).getTime();
  const now = Date.now();
  const diffMs = now - last;
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}
