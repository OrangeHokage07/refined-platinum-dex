import { h } from 'preact';

interface HeaderProps {
  seenCount: number;
  caughtCount: number;
  sinnohSeenCount: number;
  sinnohCaughtCount: number;
  orderMode: 'sinnoh' | 'national';
  onToggleOrder: () => void;
  onOpenSettings: () => void;
  onOpenBosses: () => void;
  backupWarning: boolean;
}

export function Header({
  seenCount,
  caughtCount,
  sinnohSeenCount,
  sinnohCaughtCount,
  orderMode,
  onToggleOrder,
  onOpenSettings,
  onOpenBosses,
  backupWarning
}: HeaderProps) {
  return (
    <header className="pokedex-top-bar">
      {/* Pokédex Lights & Sensor */}
      <div className="pokedex-lights">
        <div className="big-lens" title="Sinnoh Camera Lens" />
        <div className="small-leds">
          <div className="small-led red" />
          <div className="small-led yellow" />
          <div className="small-led green" />
        </div>
        <div className="speaker-holes">
          <div className="speaker-hole" />
          <div className="speaker-hole" />
          <div className="speaker-hole" />
          <div className="speaker-hole" />
          <div className="speaker-hole" />
          <div className="speaker-hole" />
        </div>
      </div>

      {/* Action buttons */}
      <div className="header-actions">
        <button
          className="icon-btn"
          onClick={onOpenBosses}
          title="Trainer Bosses & Superbosses"
          aria-label="Trainer Bosses"
        >
          🏆
        </button>
        <button
          className="icon-btn"
          onClick={onOpenSettings}
          title="Settings & Backup"
          aria-label="Settings"
          style={{ position: 'relative' }}
        >
          ⚙️
          {backupWarning && (
            <span
              style={{
                position: 'absolute',
                top: '-3px',
                right: '-3px',
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: '#f39c12',
                border: '2px solid #fff'
              }}
            />
          )}
        </button>
      </div>
    </header>
  );
}

