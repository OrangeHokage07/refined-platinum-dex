import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { BossTrainer } from '../types';

interface BossesModalProps {
  onClose: () => void;
}

export function BossesModal({ onClose }: BossesModalProps) {
  const [bosses, setBosses] = useState<BossTrainer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'gym' | 'e4' | 'super'>('all');

  useEffect(() => {
    fetch('data/bosses.json')
      .then(r => r.json())
      .then(data => {
        setBosses(data);
        setLoading(false);
      })
      .catch(e => {
        console.error('Failed to load bosses:', e);
        setLoading(false);
      });
  }, []);

  const filtered = bosses.filter(b => {
    if (selectedCategory === 'gym') return b.title.includes('Gym Leader');
    if (selectedCategory === 'e4') return b.title.includes('Elite Four') || b.title.includes('Champion');
    if (selectedCategory === 'super') return b.title.includes('Superboss');
    return true;
  });

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" style={{ maxHeight: '88%' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">🏆 TRAINER BOSSES</span>
          <button className="icon-btn" onClick={onClose} style={{ width: '30px', height: '30px', fontSize: '13px' }}>
            ✕
          </button>
        </div>

        {/* Categories */}
        <div style={{ display: 'flex', gap: '6px', padding: '10px 14px', background: 'var(--screen-panel)', borderBottom: '1px solid var(--screen-border)', overflowX: 'auto' }}>
          <button
            className={`filter-pill ${selectedCategory === 'all' ? 'active' : ''}`}
            onClick={() => setSelectedCategory('all')}
          >
            All ({bosses.length})
          </button>
          <button
            className={`filter-pill ${selectedCategory === 'gym' ? 'active' : ''}`}
            onClick={() => setSelectedCategory('gym')}
          >
            Gym Leaders (8)
          </button>
          <button
            className={`filter-pill ${selectedCategory === 'e4' ? 'active' : ''}`}
            onClick={() => setSelectedCategory('e4')}
          >
            E4 & Champion (5)
          </button>
          <button
            className={`filter-pill ${selectedCategory === 'super' ? 'active' : ''}`}
            onClick={() => setSelectedCategory('super')}
          >
            Superbosses
          </button>
        </div>

        <div className="modal-body">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '20px', fontFamily: 'PixelFont', fontSize: '10px' }}>
              LOADING BOSS DATA...
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {filtered.map((b, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '12px',
                    borderRadius: '12px',
                    background: 'var(--screen-panel)',
                    border: '1px solid var(--screen-card-border)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '15px', color: 'var(--screen-text)' }}>
                        {b.name}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--screen-highlight)', fontWeight: '600' }}>
                        {b.title} • {b.location}
                      </div>
                    </div>
                    <span style={{ fontSize: '10px', background: 'var(--screen-inset)', padding: '2px 8px', borderRadius: '6px' }}>
                      {b.stage}
                    </span>
                  </div>

                  {/* Team Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '8px', marginTop: '10px' }}>
                    {b.team.map((m, mIdx) => (
                      <div
                        key={mIdx}
                        style={{
                          padding: '8px',
                          background: 'var(--screen-inset)',
                          borderRadius: '8px',
                          fontSize: '11px'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '700' }}>
                          <span>{m.pokemon}</span>
                          <span style={{ color: 'var(--screen-highlight)' }}>L{m.level}</span>
                        </div>
                        {m.item && (
                          <div style={{ fontSize: '10px', color: 'var(--screen-text-muted)', fontStyle: 'italic' }}>
                            @ {m.item}
                          </div>
                        )}
                        <div style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '10px' }}>
                          {m.moves.map((mv, mvIdx) => (
                            <span key={mvIdx}>• {mv}</span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
