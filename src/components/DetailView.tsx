import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { PokemonDetail, PatchType } from '../types';

interface DetailViewProps {
  pokemonId: number;
  isSeen: boolean;
  isCaught: boolean;
  userNote: string;
  patchType: PatchType;
  onBack: () => void;
  onNavigate: (newId: number) => void;
  onToggleSeen: (id: number) => void;
  onToggleCaught: (id: number) => void;
  onUpdateNote: (id: number, note: string) => void;
}

type TabType = 'stats' | 'matchups' | 'evolution' | 'locations' | 'moves' | 'notes';
type MoveTabType = 'levelUp' | 'tmHm' | 'tutor';

export function DetailView({
  pokemonId,
  isSeen,
  isCaught,
  userNote,
  patchType,
  onBack,
  onNavigate,
  onToggleSeen,
  onToggleCaught,
  onUpdateNote
}: DetailViewProps) {
  const [detail, setDetail] = useState<PokemonDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showShiny, setShowShiny] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('stats');
  const [moveTab, setMoveTab] = useState<MoveTabType>('levelUp');
  const [expandedMove, setExpandedMove] = useState<string | null>(null);
  const [noteText, setNoteText] = useState(userNote);

  // Sync noteText when userNote prop updates
  useEffect(() => {
    setNoteText(userNote);
  }, [userNote]);

  // Load detailed JSON lazily per entry
  useEffect(() => {
    let isCancelled = false;
    setLoading(true);

    fetch(`data/pokemon/${pokemonId}.json`)
      .then(r => r.json())
      .then(data => {
        if (!isCancelled) {
          setDetail(data);
          setLoading(false);
        }
      })
      .catch(err => {
        console.error(`Failed to load details for #${pokemonId}:`, err);
        if (!isCancelled) setLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [pokemonId]);

  if (loading || !detail) {
    return (
      <div className="detail-view" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ fontFamily: 'PixelFont', fontSize: '11px', color: 'var(--screen-highlight)' }}>
          LOADING DATA...
        </div>
      </div>
    );
  }

  const spriteSrc = showShiny ? `sprites/pokemon/shiny/${detail.id}.png` : `sprites/pokemon/${detail.id}.png`;

  const natDisplay = `#${String(detail.id).padStart(3, '0')}`;
  const sinnohDisplay = detail.sinnohId ? `Sinnoh #${String(detail.sinnohId).padStart(3, '0')}` : 'National Only';

  // Moves list based on patchType
  const currentMoveset = patchType === 'trainer' ? detail.moves.trainer : detail.moves.base;
  const movesList = currentMoveset[moveTab] || [];

  const statColors: { [key: string]: string } = {
    hp: '#ff5959',
    attack: '#f5ac78',
    defense: '#fae078',
    specialAttack: '#9db7f5',
    specialDefense: '#a7db8d',
    speed: '#fa92b2'
  };

  const maxStat = 180;

  return (
    <div className="detail-view">
      {/* Top Nav Bar */}
      <div className="detail-nav-bar">
        <button className="back-btn" onClick={onBack}>
          ‹ Pokédex
        </button>

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'PixelFont', fontSize: '9px', color: 'var(--screen-highlight)' }}>
            {natDisplay}
          </div>
          <div style={{ fontWeight: '700', fontSize: '15px' }}>{detail.name}</div>
        </div>

        {/* D-Pad Prev / Next */}
        <div className="dpad-nav">
          <button
            className="dpad-btn"
            onClick={() => onNavigate(detail.id > 1 ? detail.id - 1 : 493)}
            title="Previous Pokémon"
          >
            ◀
          </button>
          <button
            className="dpad-btn"
            onClick={() => onNavigate(detail.id < 493 ? detail.id + 1 : 1)}
            title="Next Pokémon"
          >
            ▶
          </button>
        </div>
      </div>

      {/* Main Hero Card */}
      <div className="detail-hero-card">
        {/* Shiny toggle badge */}
        <button
          className={`shiny-toggle-badge ${showShiny ? 'active' : ''}`}
          onClick={() => setShowShiny(!showShiny)}
          title="Toggle Shiny"
        >
          ★ {showShiny ? 'Shiny' : 'Normal'}
        </button>

        {/* Sprite */}
        <div className="sprite-container" onClick={() => setShowShiny(!showShiny)}>
          <img
            src={spriteSrc}
            alt={detail.name}
            className="large-sprite"
            width="120"
            height="120"
          />
        </div>

        <div className="detail-name-row">
          <div className="detail-dex-number">{sinnohDisplay} • {natDisplay}</div>
          <div className="detail-mon-name">{detail.name}</div>
          <div className="detail-genus">{detail.genus}</div>
        </div>

        {/* Type Badges */}
        <div className="detail-types-row">
          {detail.types.map(t => (
            <span
              key={t}
              className="type-badge"
              style={{
                backgroundColor: `var(--type-${t.toLowerCase()})`,
                fontSize: '11px',
                padding: '4px 10px'
              }}
            >
              {t}
            </span>
          ))}
        </div>

        {/* Flavor text */}
        {detail.flavorText && (
          <div className="detail-flavor-text">"{detail.flavorText}"</div>
        )}

        {/* Quick Seen & Caught Progress buttons */}
        <div className="progress-actions-card">
          <button
            className={`progress-btn ${isSeen ? 'seen-active' : ''}`}
            onClick={() => onToggleSeen(detail.id)}
          >
            👁 {isSeen ? 'Seen ✓' : 'Mark Seen'}
          </button>
          <button
            className={`progress-btn ${isCaught ? 'caught-active' : ''}`}
            onClick={() => onToggleCaught(detail.id)}
          >
            ⚪ {isCaught ? 'Caught ✓' : 'Mark Caught'}
          </button>
        </div>
      </div>

      {/* Detail Section Tabs */}
      <div className="detail-tabs-bar">
        <button
          className={`detail-tab ${activeTab === 'stats' ? 'active' : ''}`}
          onClick={() => setActiveTab('stats')}
        >
          Stats
        </button>
        <button
          className={`detail-tab ${activeTab === 'matchups' ? 'active' : ''}`}
          onClick={() => setActiveTab('matchups')}
        >
          Matchups
        </button>
        <button
          className={`detail-tab ${activeTab === 'evolution' ? 'active' : ''}`}
          onClick={() => setActiveTab('evolution')}
        >
          Evolution
        </button>
        <button
          className={`detail-tab ${activeTab === 'locations' ? 'active' : ''}`}
          onClick={() => setActiveTab('locations')}
        >
          Find ({detail.whereToFind.encounters.length + (detail.whereToFind.legendary ? 1 : 0)})
        </button>
        <button
          className={`detail-tab ${activeTab === 'moves' ? 'active' : ''}`}
          onClick={() => setActiveTab('moves')}
        >
          Moves
        </button>
        <button
          className={`detail-tab ${activeTab === 'notes' ? 'active' : ''}`}
          onClick={() => setActiveTab('notes')}
        >
          Notes {userNote ? '•' : ''}
        </button>
      </div>

      {/* Tab Contents */}
      <div className="tab-content">
        {/* STATS TAB */}
        {activeTab === 'stats' && (
          <div>
            <div style={{ marginBottom: '14px', fontSize: '12px', color: 'var(--screen-text-muted)' }}>
              Generation 4 Authentic Base Stats
            </div>

            <div className="stat-row">
              <span className="stat-label">HP</span>
              <span className="stat-val">{detail.baseStats.hp}</span>
              <div className="stat-bar-track">
                <div
                  className="stat-bar-fill"
                  style={{
                    width: `${Math.min(100, (detail.baseStats.hp / maxStat) * 100)}%`,
                    backgroundColor: statColors.hp
                  }}
                />
              </div>
            </div>

            <div className="stat-row">
              <span className="stat-label">Attack</span>
              <span className="stat-val">{detail.baseStats.attack}</span>
              <div className="stat-bar-track">
                <div
                  className="stat-bar-fill"
                  style={{
                    width: `${Math.min(100, (detail.baseStats.attack / maxStat) * 100)}%`,
                    backgroundColor: statColors.attack
                  }}
                />
              </div>
            </div>

            <div className="stat-row">
              <span className="stat-label">Defense</span>
              <span className="stat-val">{detail.baseStats.defense}</span>
              <div className="stat-bar-track">
                <div
                  className="stat-bar-fill"
                  style={{
                    width: `${Math.min(100, (detail.baseStats.defense / maxStat) * 100)}%`,
                    backgroundColor: statColors.defense
                  }}
                />
              </div>
            </div>

            <div className="stat-row">
              <span className="stat-label">Sp. Atk</span>
              <span className="stat-val">{detail.baseStats.specialAttack}</span>
              <div className="stat-bar-track">
                <div
                  className="stat-bar-fill"
                  style={{
                    width: `${Math.min(100, (detail.baseStats.specialAttack / maxStat) * 100)}%`,
                    backgroundColor: statColors.specialAttack
                  }}
                />
              </div>
            </div>

            <div className="stat-row">
              <span className="stat-label">Sp. Def</span>
              <span className="stat-val">{detail.baseStats.specialDefense}</span>
              <div className="stat-bar-track">
                <div
                  className="stat-bar-fill"
                  style={{
                    width: `${Math.min(100, (detail.baseStats.specialDefense / maxStat) * 100)}%`,
                    backgroundColor: statColors.specialDefense
                  }}
                />
              </div>
            </div>

            <div className="stat-row">
              <span className="stat-label">Speed</span>
              <span className="stat-val">{detail.baseStats.speed}</span>
              <div className="stat-bar-track">
                <div
                  className="stat-bar-fill"
                  style={{
                    width: `${Math.min(100, (detail.baseStats.speed / maxStat) * 100)}%`,
                    backgroundColor: statColors.speed
                  }}
                />
              </div>
            </div>

            <div className="bst-total-box">
              <span>Total BST:</span>
              <span style={{ fontFamily: 'PixelFont', color: 'var(--screen-highlight)' }}>
                {detail.baseStats.bst}
              </span>
            </div>

            {/* Biology & Abilities Info Card */}
            <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ padding: '10px', background: 'var(--screen-panel)', borderRadius: '10px', border: '1px solid var(--screen-card-border)', fontSize: '12px' }}>
                <div style={{ fontWeight: '700', marginBottom: '4px' }}>Abilities</div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {detail.abilities.map(a => (
                    <span key={a} style={{ padding: '3px 8px', background: 'var(--screen-inset)', borderRadius: '6px', fontWeight: '600' }}>
                      {a}
                    </span>
                  ))}
                </div>
                {detail.trainerAbilityNote && (
                  <div style={{ marginTop: '6px', fontSize: '11px', color: '#d35400', fontStyle: 'italic' }}>
                    ★ Trainer Patch: Trainers use <strong>{detail.trainerAbilityNote}</strong>
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11px' }}>
                <div style={{ padding: '8px', background: 'var(--screen-panel)', borderRadius: '8px', border: '1px solid var(--screen-card-border)' }}>
                  <span style={{ color: 'var(--screen-text-muted)' }}>Height: </span>
                  <strong>{detail.height.meters} m</strong> ({Math.floor(detail.height.inches / 12)}'{detail.height.inches % 12}")
                </div>
                <div style={{ padding: '8px', background: 'var(--screen-panel)', borderRadius: '8px', border: '1px solid var(--screen-card-border)' }}>
                  <span style={{ color: 'var(--screen-text-muted)' }}>Weight: </span>
                  <strong>{detail.weight.kg} kg</strong> ({detail.weight.lbs} lbs)
                </div>
                <div style={{ padding: '8px', background: 'var(--screen-panel)', borderRadius: '8px', border: '1px solid var(--screen-card-border)' }}>
                  <span style={{ color: 'var(--screen-text-muted)' }}>Catch Rate: </span>
                  <strong>{detail.catchRate}</strong>
                </div>
                <div style={{ padding: '8px', background: 'var(--screen-panel)', borderRadius: '8px', border: '1px solid var(--screen-card-border)' }}>
                  <span style={{ color: 'var(--screen-text-muted)' }}>Egg Groups: </span>
                  <strong style={{ textTransform: 'capitalize' }}>{detail.eggGroups.join(', ') || 'None'}</strong>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MATCHUPS TAB */}
        {activeTab === 'matchups' && (
          <div>
            <div style={{ marginBottom: '10px', fontSize: '12px', color: 'var(--screen-text-muted)' }}>
              Gen 4 Defensive Effectiveness (Steel resists Ghost & Dark • No Fairy)
            </div>

            <div className="matchup-grid">
              {Object.entries(detail.typeMatchups).map(([t, mult]) => {
                let multClass = 'mult-1x';
                let multLabel = '1×';
                if (mult === 4) { multClass = 'mult-4x'; multLabel = '4×'; }
                else if (mult === 2) { multClass = 'mult-2x'; multLabel = '2×'; }
                else if (mult === 0.5) { multClass = 'mult-half'; multLabel = '½×'; }
                else if (mult === 0.25) { multClass = 'mult-quarter'; multLabel = '¼×'; }
                else if (mult === 0) { multClass = 'mult-0x'; multLabel = '0×'; }

                return (
                  <div key={t} className="matchup-card">
                    <span
                      className="type-badge"
                      style={{ backgroundColor: `var(--type-${t.toLowerCase()})` }}
                    >
                      {t}
                    </span>
                    <span className={`matchup-multiplier ${multClass}`}>{multLabel}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* EVOLUTION TAB */}
        {activeTab === 'evolution' && (
          <div>
            <div style={{ marginBottom: '10px', fontSize: '12px', color: 'var(--screen-text-muted)' }}>
              Refined Platinum Evolution Methods
            </div>

            {detail.evolutions.length === 0 ? (
              <div style={{ padding: '16px', background: 'var(--screen-panel)', borderRadius: '12px', textAlign: 'center', color: 'var(--screen-text-muted)', fontSize: '12px' }}>
                Does not evolve.
              </div>
            ) : (
              <div className="evo-card">
                {detail.evolutions.map((step, idx) => (
                  <div key={idx} className="evo-step-row">
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '13px' }}>
                        → {step.target}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--screen-text-muted)', marginTop: '2px' }}>
                        {step.notes || (step.level ? `Level ${step.level}` : step.item ? `Use ${step.item}` : step.method)}
                      </div>
                    </div>
                    <span className="evo-arrow">›</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* LOCATIONS TAB */}
        {activeTab === 'locations' && (
          <div>
            {/* Wild Held Items */}
            {detail.heldItems.length > 0 && (
              <div style={{ marginBottom: '12px', padding: '10px 12px', background: 'var(--screen-panel)', borderRadius: '10px', border: '1px solid var(--screen-card-border)' }}>
                <div style={{ fontWeight: '700', fontSize: '12px', marginBottom: '6px' }}>
                  Wild Held Items
                </div>
                {detail.heldItems.map((h, i) => (
                  <div key={i} style={{ fontSize: '12px', display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                    <span>{h.item}</span>
                    <span style={{ fontWeight: '700', color: 'var(--screen-highlight)' }}>
                      {h.chance}% {h.notes ? `(${h.notes})` : ''}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Legendary Encounter */}
            {detail.whereToFind.legendary && (
              <div style={{ marginBottom: '14px', padding: '12px', background: '#fff9e6', borderRadius: '12px', border: '1px solid #ffe082', color: '#5d4037' }}>
                <div style={{ fontWeight: '700', fontSize: '13px', color: '#e65100', marginBottom: '4px' }}>
                  ★ Static / Event Legendary Encounter
                </div>
                <div style={{ fontSize: '12px', marginBottom: '4px' }}>
                  <strong>Location:</strong> {detail.whereToFind.legendary.location} (Level {detail.whereToFind.legendary.level})
                </div>
                {detail.whereToFind.legendary.npc && (
                  <div style={{ fontSize: '12px', marginBottom: '4px' }}>
                    <strong>NPC:</strong> {detail.whereToFind.legendary.npc}
                  </div>
                )}
                <div style={{ fontSize: '12px', marginBottom: '4px' }}>
                  <strong>Requirement:</strong> {detail.whereToFind.legendary.requirement}
                </div>
                {detail.whereToFind.legendary.heldItem && (
                  <div style={{ fontSize: '12px', marginBottom: '4px' }}>
                    <strong>Held Item:</strong> {detail.whereToFind.legendary.heldItem}
                  </div>
                )}
                {detail.whereToFind.legendary.rematch && (
                  <div style={{ fontSize: '11px', marginTop: '6px', paddingTop: '6px', borderTop: '1px dashed #ffd54f' }}>
                    <strong>Rematch:</strong> {detail.whereToFind.legendary.rematch.npc} at {detail.whereToFind.legendary.rematch.location} ({detail.whereToFind.legendary.rematch.requirement})
                  </div>
                )}
              </div>
            )}

            {/* Wild Encounters */}
            {detail.whereToFind.encounters.length === 0 && !detail.whereToFind.legendary ? (
              <div style={{ padding: '20px', background: 'var(--screen-panel)', borderRadius: '12px', textAlign: 'center', fontSize: '12px', color: 'var(--screen-text-muted)' }}>
                Not found wild in Refined Platinum. Obtainable via evolution, in-game trade, or fossil restoration in Canalave City.
              </div>
            ) : (
              <div>
                {detail.whereToFind.encounters.map((enc, idx) => (
                  <div key={idx} className="encounter-group-card">
                    <div className="location-title">
                      {enc.location}
                      {enc.source === 'refined' && (
                        <span className="refined-badge">★ Refined Platinum</span>
                      )}
                    </div>
                    <div className="encounter-row">
                      <span className="encounter-method-badge">{enc.method}</span>
                      <span style={{ color: 'var(--screen-text-muted)' }}>
                        {enc.timeOfDay ? `Time: ${enc.timeOfDay} • ` : ''}
                        {enc.minLevel ? `Lvl ${enc.minLevel}${enc.maxLevel && enc.maxLevel !== enc.minLevel ? `-${enc.maxLevel}` : ''}` : ''}
                      </span>
                      <span style={{ fontWeight: '700', color: 'var(--screen-highlight)' }}>
                        {enc.rate}%
                      </span>
                    </div>
                    {enc.notes && (
                      <div style={{ fontSize: '11px', color: 'var(--screen-text-muted)', marginTop: '4px', fontStyle: 'italic' }}>
                        Note: {enc.notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* MOVES TAB */}
        {activeTab === 'moves' && (
          <div>
            {/* Sub tabs: Level-Up, TM/HM, Tutor */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
              <button
                className={`filter-pill ${moveTab === 'levelUp' ? 'active' : ''}`}
                onClick={() => setMoveTab('levelUp')}
              >
                Level-Up ({currentMoveset.levelUp?.length || 0})
              </button>
              <button
                className={`filter-pill ${moveTab === 'tmHm' ? 'active' : ''}`}
                onClick={() => setMoveTab('tmHm')}
              >
                TM / HM ({currentMoveset.tmHm?.length || 0})
              </button>
              <button
                className={`filter-pill ${moveTab === 'tutor' ? 'active' : ''}`}
                onClick={() => setMoveTab('tutor')}
              >
                Tutor ({currentMoveset.tutor?.length || 0})
              </button>
            </div>

            <div style={{ fontSize: '11px', color: 'var(--screen-text-muted)', marginBottom: '8px' }}>
              Showing {patchType === 'trainer' ? 'Trainer Patch' : 'Base Patch'} moveset (tap any move to view description)
            </div>

            {movesList.length === 0 ? (
              <div style={{ padding: '16px', background: 'var(--screen-panel)', borderRadius: '12px', textAlign: 'center', fontSize: '12px', color: 'var(--screen-text-muted)' }}>
                No moves recorded for this category.
              </div>
            ) : (
              <div>
                {movesList.map((m, idx) => {
                  const isExpanded = expandedMove === `${m.name}_${idx}`;
                  return (
                    <div
                      key={idx}
                      className="move-card-item"
                      onClick={() => setExpandedMove(isExpanded ? null : `${m.name}_${idx}`)}
                    >
                      <div className="move-header">
                        <div className="move-name-wrap">
                          {m.level !== undefined ? (
                            <span className="move-level">{m.level === 1 ? '—' : `L${m.level}`}</span>
                          ) : m.machine ? (
                            <span className="move-level">{m.machine}</span>
                          ) : null}
                          <span className="move-name">{m.name}</span>
                        </div>
                        <span
                          className="type-badge"
                          style={{ backgroundColor: `var(--type-${m.type.toLowerCase()})` }}
                        >
                          {m.type}
                        </span>
                      </div>

                      <div className="move-stats-row">
                        <span>{m.category}</span>
                        <span>• Power: <strong>{m.power !== null ? m.power : '—'}</strong></span>
                        <span>• Acc: <strong>{m.accuracy !== null ? `${m.accuracy}%` : '—'}</strong></span>
                        <span>• PP: <strong>{m.pp}</strong></span>
                      </div>

                      {isExpanded && m.description && (
                        <div className="move-desc-box">{m.description}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* NOTES TAB */}
        {activeTab === 'notes' && (
          <div>
            <div style={{ fontSize: '12px', color: 'var(--screen-text-muted)', marginBottom: '8px' }}>
              Personal notes for {detail.name} (auto-saved immediately to IndexedDB):
            </div>
            <textarea
              value={noteText}
              onInput={e => {
                const val = (e.target as HTMLTextAreaElement).value;
                setNoteText(val);
                onUpdateNote(detail.id, val);
              }}
              placeholder="e.g. Caught on Route 204 with Modest nature; planning to run Surf and Ice Beam..."
              style={{
                width: '100%',
                height: '140px',
                padding: '12px',
                borderRadius: '12px',
                background: 'var(--screen-panel)',
                border: '1px solid var(--screen-card-border)',
                color: 'var(--screen-text)',
                fontSize: '13px',
                lineHeight: '1.5',
                resize: 'none',
                outline: 'none'
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

