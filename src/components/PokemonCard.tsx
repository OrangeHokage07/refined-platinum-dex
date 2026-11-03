import { h } from 'preact';
import { IndexPokemon } from '../types';

interface PokemonCardProps {
  pokemon: IndexPokemon;
  isSeen: boolean;
  isCaught: boolean;
  orderMode: 'sinnoh' | 'national';
  onSelect: (pokemon: IndexPokemon) => void;
  onToggleCaught: (e: MouseEvent, id: number) => void;
}

export function PokemonCard({
  pokemon,
  isSeen,
  isCaught,
  orderMode,
  onSelect,
  onToggleCaught
}: PokemonCardProps) {
  // Format numbers
  const natNum = `#${String(pokemon.id).padStart(3, '0')}`;
  const sinnohNum = pokemon.sinnohId ? `S#${String(pokemon.sinnohId).padStart(3, '0')}` : null;
  const numDisplay = orderMode === 'sinnoh' && sinnohNum ? sinnohNum : natNum;

  return (
    <div className="mon-row-card" onClick={() => onSelect(pokemon)}>
      <div className="mon-row-left">
        <span className="mon-row-number">{numDisplay}</span>
        <img
          src={pokemon.sprite}
          alt={pokemon.name}
          className="mon-sprite-thumb"
          loading="lazy"
          width="48"
          height="48"
        />
      </div>

      <div className="mon-row-info">
        <div className="mon-row-name">{pokemon.name}</div>
        <div className="mon-row-types">
          {pokemon.types.map(t => (
            <span
              key={t}
              className="type-badge"
              style={{ backgroundColor: `var(--type-${t.toLowerCase()})` }}
            >
              {t}
            </span>
          ))}
        </div>
      </div>

      <div className="mon-row-status">
        <div
          className={`status-pokeball ${isCaught ? 'caught' : isSeen ? 'seen' : 'uncaught'}`}
          onClick={e => onToggleCaught(e, pokemon.id)}
          title={isCaught ? 'Caught' : isSeen ? 'Seen (Tap to mark caught)' : 'Uncaught (Tap to mark caught)'}
        />
      </div>
    </div>
  );
}

