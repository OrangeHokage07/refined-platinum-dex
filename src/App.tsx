import { h } from 'preact';
import { useState, useEffect, useMemo, useCallback } from 'preact/hooks';
import { IndexPokemon, UserProgress, FilterOptions } from './types';
import { loadProgress, saveProgress, requestPersistence, getBackupAgeDays, DEFAULT_PROGRESS } from './services/storage';
import { Header } from './components/Header';
import { VirtualList } from './components/VirtualList';
import { PokemonCard } from './components/PokemonCard';
import { DetailView } from './components/DetailView';
import { SettingsModal } from './components/SettingsModal';
import { BossesModal } from './components/BossesModal';

const GEN4_TYPES = [
  'Normal', 'Fire', 'Water', 'Electric', 'Grass', 'Ice',
  'Fighting', 'Poison', 'Ground', 'Flying', 'Psychic', 'Bug',
  'Rock', 'Ghost', 'Dragon', 'Steel', 'Dark'
];

export function App() {
  const [pokemonList, setPokemonList] = useState<IndexPokemon[]>([]);
  const [areasData, setAreasData] = useState<{ [area: string]: any[] }>({});
  const [progress, setProgress] = useState<UserProgress>(DEFAULT_PROGRESS);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [filters, setFilters] = useState<FilterOptions>({
    query: '',
    type: null,
    status: 'all',
    preE4Only: false,
    obtainableNow: false,
    gen: null,
    orderMode: 'sinnoh'
  });

  // Selected Pokemon for detail page
  const [selectedMonId, setSelectedMonId] = useState<number | null>(null);

  // Modals
  const [showSettings, setShowSettings] = useState(false);
  const [showBosses, setShowBosses] = useState(false);

  // Initial load
  useEffect(() => {
    // 1. Request persistent storage
    requestPersistence();

    // 2. Load IndexedDB progress
    loadProgress().then(saved => {
      setProgress(saved);
    });

    // 3. Load precomputed index.json
    fetch('data/index.json')
      .then(r => r.json())
      .then(data => {
        setPokemonList(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load index.json:', err);
        setLoading(false);
      });

    // 4. Load reverse index areas.json
    fetch('data/areas.json')
      .then(r => r.json())
      .then(data => setAreasData(data))
      .catch(err => console.warn('Failed to load areas.json:', err));
  }, []);

  // Update progress helper (saves immediately without blocking UI)
  const updateProgress = useCallback((newProgress: UserProgress) => {
    setProgress(newProgress);
    saveProgress(newProgress);
  }, []);

  // Toggle caught for a pokemon
  const toggleCaught = useCallback((e: MouseEvent, id: number) => {
    e.stopPropagation();
    setProgress(prev => {
      const nextCaught = { ...prev.caught, [id]: !prev.caught[id] };
      const nextSeen = { ...prev.seen, [id]: nextCaught[id] ? true : prev.seen[id] };
      const updated = { ...prev, caught: nextCaught, seen: nextSeen };
      saveProgress(updated);
      return updated;
    });
  }, []);

  // Toggle seen
  const toggleSeen = useCallback((id: number) => {
    setProgress(prev => {
      const nextSeen = { ...prev.seen, [id]: !prev.seen[id] };
      const nextCaught = nextSeen[id] ? prev.caught : { ...prev.caught, [id]: false };
      const updated = { ...prev, seen: nextSeen, caught: nextCaught };
      saveProgress(updated);
      return updated;
    });
  }, []);

  // Update personal note
  const updateNote = useCallback((id: number, note: string) => {
    setProgress(prev => {
      const nextNotes = { ...prev.notes, [id]: note };
      const updated = { ...prev, notes: nextNotes };
      saveProgress(updated);
      return updated;
    });
  }, []);

  // Calculate counters
  const counters = useMemo(() => {
    let seen = 0;
    let caught = 0;
    let sinnohSeen = 0;
    let sinnohCaught = 0;

    for (const mon of pokemonList) {
      if (progress.caught[mon.id]) {
        caught++;
        seen++;
        if (mon.sinnohId) {
          sinnohCaught++;
          sinnohSeen++;
        }
      } else if (progress.seen[mon.id]) {
        seen++;
        if (mon.sinnohId) {
          sinnohSeen++;
        }
      }
    }

    return { seen, caught, sinnohSeen, sinnohCaught };
  }, [pokemonList, progress.caught, progress.seen]);

  // Stage order weights for "Obtainable Now" filtering
  const stageWeights: { [stage: string]: number } = {
    'badge_0': 0,
    'badge_1': 1,
    'badge_2': 2,
    'badge_3': 3,
    'badge_4': 4,
    'badge_5': 5,
    'badge_6': 6,
    'badge_7': 7,
    'badge_8': 8,
    'post_e4': 9,
    'post_dex': 10,
    'post_stark': 11
  };

  // Filtered and sorted Pokemon list
  const filteredList = useMemo(() => {
    let result = [...pokemonList];

    // Order mode
    if (filters.orderMode === 'sinnoh') {
      result.sort((a, b) => {
        if (a.sinnohId && b.sinnohId) return a.sinnohId - b.sinnohId;
        if (a.sinnohId) return -1;
        if (b.sinnohId) return 1;
        return a.id - b.id;
      });
    } else {
      result.sort((a, b) => a.id - b.id);
    }

    // Search query: match Pokemon name, Dex IDs, or Area Name in areasData
    if (filters.query.trim()) {
      const q = filters.query.toLowerCase().trim();

      // Collect Pokemon IDs found in any matching area
      const matchingAreaMonIds = new Set<number>();
      for (const [area, mons] of Object.entries(areasData)) {
        if (area.toLowerCase().includes(q)) {
          for (const m of mons) {
            matchingAreaMonIds.add(m.id);
          }
        }
      }

      result = result.filter(m => {
        const nameMatch = m.name.toLowerCase().includes(q);
        const idMatch = String(m.id).includes(q) || `#${String(m.id).padStart(3, '0')}`.includes(q);
        const sinnohMatch = m.sinnohId ? String(m.sinnohId).includes(q) : false;
        const areaMatch = matchingAreaMonIds.has(m.id);
        return nameMatch || idMatch || sinnohMatch || areaMatch;
      });
    }

    // Type filter
    if (filters.type) {
      result = result.filter(m => m.types.includes(filters.type!));
    }

    // Status filter
    if (filters.status === 'caught') {
      result = result.filter(m => !!progress.caught[m.id]);
    } else if (filters.status === 'seen') {
      result = result.filter(m => !!progress.seen[m.id] && !progress.caught[m.id]);
    } else if (filters.status === 'uncaught') {
      result = result.filter(m => !progress.caught[m.id]);
    }

    // Pre-E4 filter
    if (filters.preE4Only) {
      result = result.filter(m => m.preE4);
    }

    // Obtainable Now filter (based on current game stage setting)
    if (filters.obtainableNow) {
      const currentWeight = stageWeights[progress.gameStage] || 0;
      result = result.filter(m => {
        if (m.preE4) {
          if (m.sinnohId) {
            if (m.sinnohId <= 40) return currentWeight >= 1;
            if (m.sinnohId <= 80) return currentWeight >= 3;
            if (m.sinnohId <= 150) return currentWeight >= 5;
            return currentWeight >= 7;
          }
          return currentWeight >= 2;
        }
        return currentWeight >= 10;
      });
    }

    // Generation filter
    if (filters.gen) {
      result = result.filter(m => m.generation === filters.gen);
    }

    return result;
  }, [pokemonList, filters, progress.caught, progress.seen, progress.gameStage, areasData]);

  // Check if current search query matches a known area name
  const matchedArea = useMemo(() => {
    if (!filters.query.trim()) return null;
    const q = filters.query.toLowerCase().trim();
    for (const area of Object.keys(areasData)) {
      if (area.toLowerCase().includes(q)) return area;
    }
    return null;
  }, [filters.query, areasData]);

  const backupWarning = getBackupAgeDays(progress.lastBackupDate) > 14;

  return (
    <div className="pokedex-shell">
      {/* Landscape Warning overlay on small landscape screens */}
      <div className="landscape-warning">
        <svg className="landscape-phone-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="5" y="2" width="14" height="20" rx="3" />
          <path d="M12 18h.01" />
        </svg>
        <div>PORTRAIT MODE ONLY</div>
        <div style={{ fontSize: '11px', color: '#aaa', marginTop: '6px' }}>
          Please rotate your iPhone to portrait orientation to use the Pokédex.
        </div>
      </div>

      {/* Pokédex Header Bar */}
      <Header
        seenCount={counters.seen}
        caughtCount={counters.caught}
        sinnohSeenCount={counters.sinnohSeen}
        sinnohCaughtCount={counters.sinnohCaught}
        orderMode={filters.orderMode}
        onToggleOrder={() =>
          setFilters(f => ({ ...f, orderMode: f.orderMode === 'sinnoh' ? 'national' : 'sinnoh' }))
        }
        onOpenSettings={() => setShowSettings(true)}
        onOpenBosses={() => setShowBosses(true)}
        backupWarning={backupWarning}
      />

      {/* Screen Viewport */}
      <main className="screen-viewport">
        {selectedMonId !== null ? (
          <DetailView
            pokemonId={selectedMonId}
            isSeen={!!progress.seen[selectedMonId]}
            isCaught={!!progress.caught[selectedMonId]}
            userNote={progress.notes[selectedMonId] || ''}
            patchType={progress.patch}
            onBack={() => setSelectedMonId(null)}
            onNavigate={newId => setSelectedMonId(newId)}
            onToggleSeen={toggleSeen}
            onToggleCaught={id => toggleCaught(new MouseEvent('click'), id)}
            onUpdateNote={updateNote}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Top Info status bar */}
            <div className="screen-top-info">
              <div className="counter-tag">
                <span>SEEN:</span>
                <span className="counter-val">{counters.seen}</span>
                <span>/ CAUGHT:</span>
                <span className="counter-val">{counters.caught}</span>
                <span style={{ color: 'var(--screen-text-muted)' }}>/ 493</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="counter-tag">
                  <span>SINNOH:</span>
                  <span className="counter-val">{counters.sinnohCaught}</span>
                  <span style={{ color: 'var(--screen-text-muted)' }}>/ 210</span>
                </span>
                <button
                  className="dex-mode-toggle"
                  onClick={() =>
                    setFilters(f => ({
                      ...f,
                      orderMode: f.orderMode === 'sinnoh' ? 'national' : 'sinnoh'
                    }))
                  }
                >
                  {filters.orderMode === 'sinnoh' ? 'SINNOH' : 'NATIONAL'}
                </button>
              </div>
            </div>

            {/* Search & Filter Bar */}
            <div className="search-filter-section">
              <div className="search-bar">
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search Pokémon or Area (e.g. Route 210)..."
                  value={filters.query}
                  onInput={e => setFilters(f => ({ ...f, query: (e.target as HTMLInputElement).value }))}
                />
                {filters.query && (
                  <button
                    className="clear-search-btn"
                    onClick={() => setFilters(f => ({ ...f, query: '' }))}
                  >
                    ✕
                  </button>
                )}
              </div>

              {matchedArea && (
                <div className="area-search-pill">
                  <span>📍 Pokémon found in <strong>{matchedArea}</strong></span>
                  <span style={{ fontSize: '10px', opacity: 0.85 }}>({filteredList.length} species)</span>
                </div>
              )}

              {/* Filter Pills scroll */}
              <div className="filters-scroll">
                {/* Status Filters */}
                <button
                  className={`filter-pill ${filters.status === 'caught' ? 'active' : ''}`}
                  onClick={() => setFilters(f => ({ ...f, status: f.status === 'caught' ? 'all' : 'caught' }))}
                >
                  ⚪ Caught
                </button>
                <button
                  className={`filter-pill ${filters.status === 'seen' ? 'active' : ''}`}
                  onClick={() => setFilters(f => ({ ...f, status: f.status === 'seen' ? 'all' : 'seen' }))}
                >
                  👁 Seen
                </button>
                <button
                  className={`filter-pill ${filters.status === 'uncaught' ? 'active' : ''}`}
                  onClick={() => setFilters(f => ({ ...f, status: f.status === 'uncaught' ? 'all' : 'uncaught' }))}
                >
                  Uncaught
                </button>

                {/* Pre-E4 filter */}
                <button
                  className={`filter-pill ${filters.preE4Only ? 'active' : ''}`}
                  onClick={() => setFilters(f => ({ ...f, preE4Only: !f.preE4Only }))}
                >
                  ⭐ Pre-E4 Only
                </button>

                {/* Obtainable Now filter */}
                <button
                  className={`filter-pill ${filters.obtainableNow ? 'active' : ''}`}
                  onClick={() => setFilters(f => ({ ...f, obtainableNow: !f.obtainableNow }))}
                >
                  📍 Obtainable Now
                </button>

                {/* Generation Pills */}
                {[1, 2, 3, 4].map(g => (
                  <button
                    key={g}
                    className={`filter-pill ${filters.gen === g ? 'active' : ''}`}
                    onClick={() => setFilters(f => ({ ...f, gen: f.gen === g ? null : g }))}
                  >
                    Gen {g}
                  </button>
                ))}

                {/* Type Pills */}
                {GEN4_TYPES.map(t => (
                  <button
                    key={t}
                    className={`filter-pill ${filters.type === t ? 'active' : ''}`}
                    onClick={() => setFilters(f => ({ ...f, type: f.type === t ? null : t }))}
                    style={
                      filters.type === t
                        ? { backgroundColor: `var(--type-${t.toLowerCase()})`, borderColor: `var(--type-${t.toLowerCase()})` }
                        : {}
                    }
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Virtualized List Container */}
            <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
              {loading ? (
                <div style={{ padding: '30px', textAlign: 'center', fontFamily: 'PixelFont', fontSize: '10px' }}>
                  INITIALIZING POKÉDEX...
                </div>
              ) : filteredList.length === 0 ? (
                <div style={{ padding: '30px', textAlign: 'center', color: 'var(--screen-text-muted)', fontSize: '13px' }}>
                  No Pokémon matched your search and filters.
                </div>
              ) : (
                <VirtualList<IndexPokemon>
                  items={filteredList}
                  rowHeight={70}
                  renderItem={mon => (
                    <PokemonCard
                      key={mon.id}
                      pokemon={mon}
                      isSeen={!!progress.seen[mon.id]}
                      isCaught={!!progress.caught[mon.id]}
                      orderMode={filters.orderMode}
                      onSelect={m => setSelectedMonId(m.id)}
                      onToggleCaught={(e, id) => toggleCaught(e, id)}
                    />
                  )}
                />
              )}
            </div>
          </div>
        )}
      </main>

      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal
          progress={progress}
          onClose={() => setShowSettings(false)}
          onUpdateProgress={updateProgress}
        />
      )}

      {/* Bosses Modal */}
      {showBosses && <BossesModal onClose={() => setShowBosses(false)} />}
    </div>
  );
}

