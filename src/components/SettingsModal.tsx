import { h } from 'preact';
import { useRef, useState } from 'preact/hooks';
import { UserProgress, PatchType, GameStage } from '../types';
import { exportProgress, importProgress, resetProgress, getBackupAgeDays } from '../services/storage';

interface SettingsModalProps {
  progress: UserProgress;
  onClose: () => void;
  onUpdateProgress: (newProgress: UserProgress) => void;
}

export function SettingsModal({ progress, onClose, onUpdateProgress }: SettingsModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const backupAge = getBackupAgeDays(progress.lastBackupDate);

  const handlePatchChange = (patch: PatchType) => {
    const updated: UserProgress = { ...progress, patch };
    onUpdateProgress(updated);
  };

  const handleStageChange = (gameStage: GameStage) => {
    const updated: UserProgress = { ...progress, gameStage };
    onUpdateProgress(updated);
  };

  const handleExport = async () => {
    const ok = await exportProgress(progress);
    if (ok) {
      setMsg('Exported successfully!');
      setTimeout(() => setMsg(null), 3000);
    }
  };

  const handleImportFile = async (e: Event) => {
    const input = e.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    try {
      const text = await file.text();
      const imported = await importProgress(text);
      onUpdateProgress(imported);
      setMsg('Progress imported successfully!');
      setTimeout(() => setMsg(null), 3000);
    } catch (err) {
      alert('Failed to import backup file: Invalid JSON format.');
    }
  };

  const handleReset = async () => {
    const fresh = await resetProgress();
    onUpdateProgress(fresh);
    setShowResetConfirm(false);
    setMsg('Progress reset.');
    setTimeout(() => setMsg(null), 3000);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">⚙ SETTINGS</span>
          <button className="icon-btn" onClick={onClose} style={{ width: '30px', height: '30px', fontSize: '13px' }}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          {msg && (
            <div style={{ padding: '8px 12px', background: '#d4edda', color: '#155724', borderRadius: '8px', fontSize: '12px' }}>
              ✓ {msg}
            </div>
          )}

          {/* Patch Toggle */}
          <div>
            <label style={{ fontWeight: '700', fontSize: '13px', display: 'block', marginBottom: '6px' }}>
              Patch Version
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className={`filter-pill ${progress.patch === 'trainer' ? 'active' : ''}`}
                style={{ flex: 1, justifyContent: 'center', height: '38px' }}
                onClick={() => handlePatchChange('trainer')}
              >
                Trainer Patch (Default)
              </button>
              <button
                className={`filter-pill ${progress.patch === 'base' ? 'active' : ''}`}
                style={{ flex: 1, justifyContent: 'center', height: '38px' }}
                onClick={() => handlePatchChange('base')}
              >
                Base Patch
              </button>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--screen-text-muted)', marginTop: '4px' }}>
              Trainer Patch includes updated non-legendary movepools and boss buffs.
            </div>
          </div>

          {/* Game Progress Stage (Used by Obtainable Now filter) */}
          <div>
            <label style={{ fontWeight: '700', fontSize: '13px', display: 'block', marginBottom: '6px' }}>
              Game Progress Stage
            </label>
            <select
              value={progress.gameStage}
              onChange={e => handleStageChange((e.target as HTMLSelectElement).value as GameStage)}
              style={{
                width: '100%',
                height: '40px',
                borderRadius: '8px',
                border: '1px solid var(--screen-border)',
                background: 'var(--screen-inset)',
                color: 'var(--screen-text)',
                padding: '0 10px',
                fontSize: '13px',
                outline: 'none'
              }}
            >
              <option value="badge_0">Beginning (0 Badges)</option>
              <option value="badge_1">Badge 1: Oreburgh (Roark)</option>
              <option value="badge_2">Badge 2: Eterna (Gardenia)</option>
              <option value="badge_3">Badge 3: Hearthome (Fantina)</option>
              <option value="badge_4">Badge 4: Veilstone (Maylene)</option>
              <option value="badge_5">Badge 5: Pastoria (Wake)</option>
              <option value="badge_6">Badge 6: Canalave (Byron)</option>
              <option value="badge_7">Badge 7: Snowpoint (Candice)</option>
              <option value="badge_8">Badge 8: Sunyshore (Volkner)</option>
              <option value="post_e4">Post-E4: Pokémon League Champion</option>
              <option value="post_dex">Post-Dex: National Dex & Fight Area</option>
              <option value="post_stark">Post-Stark: Completed Stark Mountain</option>
            </select>
            <div style={{ fontSize: '11px', color: 'var(--screen-text-muted)', marginTop: '4px' }}>
              Filters Pokémon accessible at your current game point.
            </div>
          </div>

          {/* Backup & Restore */}
          <div>
            <label style={{ fontWeight: '700', fontSize: '13px', display: 'block', marginBottom: '6px' }}>
              Progress Backup & Restore
            </label>

            {backupAge > 14 && (
              <div style={{ padding: '8px', background: '#fff3cd', color: '#856404', borderRadius: '8px', fontSize: '11px', marginBottom: '8px' }}>
                ⚠️ Last backup was {backupAge} days ago. Consider exporting a backup to iOS Files!
              </div>
            )}
            {backupAge <= 14 && (
              <div style={{ fontSize: '11px', color: 'var(--screen-text-muted)', marginBottom: '8px' }}>
                Last backup: {backupAge === 0 ? 'Today' : `${backupAge} day${backupAge > 1 ? 's' : ''} ago`}
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="modal-btn primary" style={{ flex: 1 }} onClick={handleExport}>
                📤 Export Progress
              </button>
              <button
                className="modal-btn"
                style={{ flex: 1, background: 'var(--screen-inset)', border: '1px solid var(--screen-border)', color: 'var(--screen-text)' }}
                onClick={() => fileInputRef.current?.click()}
              >
                📥 Import Backup
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                style={{ display: 'none' }}
                onChange={handleImportFile}
              />
            </div>
          </div>

          {/* Reset Progress */}
          <div style={{ paddingTop: '10px', borderTop: '1px solid var(--screen-border)' }}>
            {!showResetConfirm ? (
              <button
                className="modal-btn danger"
                style={{ width: '100%' }}
                onClick={() => setShowResetConfirm(true)}
              >
                🗑 Reset All Progress
              </button>
            ) : (
              <div style={{ padding: '12px', background: '#f8d7da', borderRadius: '8px', color: '#721c24' }}>
                <div style={{ fontWeight: '700', fontSize: '12px', marginBottom: '6px' }}>
                  Are you sure? This will clear all Seen, Caught, and Note records.
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="modal-btn danger" style={{ flex: 1 }} onClick={handleReset}>
                    Confirm Reset
                  </button>
                  <button
                    className="modal-btn"
                    style={{ flex: 1, background: '#fff', border: '1px solid #ccc', color: '#333' }}
                    onClick={() => setShowResetConfirm(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
