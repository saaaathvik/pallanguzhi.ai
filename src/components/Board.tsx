import type { Frame } from '../hooks/useGame';
import { AI, HUMAN, PITS_PER_ROW, type Player } from '../engine/types';
import { Shells } from './Shells';

interface BoardProps {
  frame: Frame;
  /** Whether the human can play a pit right now. */
  selectable: boolean;
  lastMove: { player: Player; hole: number } | null;
  onPlay: (hole: number) => void;
}

const COLS = Array.from({ length: PITS_PER_ROW }, (_, i) => i);

export function Board({ frame, selectable, lastMove, onPlay }: BoardProps) {
  const renderRow = (row: Player) => (
    <div className="board-row" role="group" aria-label={row === AI ? 'AI side' : 'Your side'}>
      {COLS.map((col) => {
        const count = frame.pits[row][col];
        const playable = selectable && row === HUMAN && count > 0;
        const focus = frame.focus && frame.focus.row === row && frame.focus.col === col ? frame.focus.kind : null;
        const isLast = !frame.focus && lastMove?.player === row && lastMove.hole === col;
        const owner = row === AI ? 'AI' : 'Your';

        return (
          <button
            key={col}
            type="button"
            className={['pit', playable && 'pit--playable', focus && `pit--${focus}`, isLast && 'pit--last']
              .filter(Boolean)
              .join(' ')}
            disabled={!playable}
            onClick={() => onPlay(col)}
            aria-label={`${owner} pit ${col + 1}, ${count} ${count === 1 ? 'shell' : 'shells'}`}
          >
            <Shells count={count} seed={row * PITS_PER_ROW + col} />
            <span className="pit-count">{count}</span>
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="board-wrap">
      <div className="pit-numbers" aria-hidden="true">
        {COLS.map((col) => (
          <span key={col}>{col + 1}</span>
        ))}
      </div>
      <div className="board">
        <span className="row-label">AI</span>
        {renderRow(AI)}
        <div className="board-middle">
          <span className="board-title">
            Pallangu
            <span className="board-title-tamil" lang="ta">
              ழி
            </span>
          </span>
        </div>
        {renderRow(HUMAN)}
        <span className="row-label">You</span>
      </div>
      <div className="pit-numbers" aria-hidden="true">
        {COLS.map((col) => (
          <span key={col}>{col + 1}</span>
        ))}
      </div>
    </div>
  );
}
