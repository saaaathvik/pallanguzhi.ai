import { useState } from 'react';
import { Board } from './components/Board';
import { Dialog } from './components/Dialog';
import { Rules } from './components/Rules';
import { ShellDefs } from './components/Shells';
import { DIFFICULTIES } from './engine/ai';
import { winner } from './engine/rules';
import { AI, HUMAN, WIN_THRESHOLD, type Difficulty } from './engine/types';
import { SPEEDS, useGame, type Speed } from './hooks/useGame';

const RULES_SEEN_KEY = 'pallanguzhi:rules-seen';

const shells = (count: number) => `${count} ${count === 1 ? 'shell' : 'shells'}`;

function hasSeenRules(): boolean {
  try {
    return localStorage.getItem(RULES_SEEN_KEY) === '1';
  } catch {
    return true;
  }
}

export default function App() {
  const g = useGame();
  const [rulesOpen, setRulesOpen] = useState(() => !hasSeenRules());
  const [resultDismissed, setResultDismissed] = useState(false);

  const closeRules = () => {
    setRulesOpen(false);
    try {
      localStorage.setItem(RULES_SEEN_KEY, '1');
    } catch {
      // Storage can be blocked (for example in private browsing); the rules then show again next visit.
    }
  };

  const restart = () => {
    setResultDismissed(false);
    g.restart();
  };
  const undo = () => {
    setResultDismissed(false);
    g.undo();
  };

  const [aiScore, humanScore] = g.display.wallets;
  const result = g.phase === 'over' ? winner(g.game) : null;

  return (
    <div className="app">
      <ShellDefs />

      <header className="header">
        <div>
          <h1>
            Pallangu<span lang="ta">ழி</span>
          </h1>
          <p className="tagline">Pallanguzhi.AI is a South Indian mancala game with an AI twist!</p>
        </div>
        <button type="button" className="button button--ghost" onClick={() => setRulesOpen(true)}>
          How to play
        </button>
      </header>

      <main>
        <section className="scores" aria-label="Scores">
          <ScoreCard name="You" score={humanScore} active={g.phase === 'human' || (g.phase === 'animating' && g.game.turn === HUMAN)} />
          <ScoreCard name="AI" score={aiScore} active={g.phase === 'thinking' || (g.phase === 'animating' && g.game.turn === AI)} />
        </section>

        <p className="status" role="status">
          <StatusText phase={g.phase} lastMove={g.lastMove} result={result} hand={g.display.hand} />
        </p>

        <Board frame={g.display} selectable={g.phase === 'human'} lastMove={g.lastMove} onPlay={g.playHuman} />

        <section className="controls" aria-label="Game controls">
          <fieldset className="segmented">
            <legend>Difficulty</legend>
            {(Object.keys(DIFFICULTIES) as Difficulty[]).map((key) => (
              <label key={key} className={g.difficulty === key ? 'is-selected' : undefined}>
                <input
                  type="radio"
                  name="difficulty"
                  value={key}
                  checked={g.difficulty === key}
                  onChange={() => g.setDifficulty(key)}
                />
                {DIFFICULTIES[key].label}
              </label>
            ))}
          </fieldset>

          <fieldset className="segmented">
            <legend>Animation</legend>
            {(Object.keys(SPEEDS) as Speed[]).map((key) => (
              <label key={key} className={g.speed === key ? 'is-selected' : undefined}>
                <input type="radio" name="speed" value={key} checked={g.speed === key} onChange={() => g.setSpeed(key)} />
                {SPEEDS[key].label}
              </label>
            ))}
          </fieldset>

          <div className="actions">
            <button type="button" className="button" onClick={undo} disabled={!g.canUndo}>
              Undo
            </button>
            <button type="button" className="button button--primary" onClick={restart}>
              Restart
            </button>
          </div>
        </section>
      </main>

      <footer className="footer">
        <span>Made by Saathvik Balaji and Shwetha Suresh Nathan</span>
        <span aria-hidden="true">·</span>
        <a href="https://github.com/saaaathvik/pallanguzhi.ai" target="_blank" rel="noreferrer">
          GitHub
        </a>
      </footer>

      <Dialog open={rulesOpen} onClose={closeRules} title="How to play">
        <Rules />
        <div className="dialog-actions">
          <button type="button" className="button button--primary" onClick={closeRules}>
            Let&rsquo;s play
          </button>
        </div>
      </Dialog>

      <Dialog
        open={result !== null && !resultDismissed}
        onClose={() => setResultDismissed(true)}
        title={result === HUMAN ? 'You win!' : result === AI ? 'The AI wins' : 'It’s a draw'}
      >
        <p className="final-score">
          You <strong>{g.game.wallets[HUMAN]}</strong> vs <strong>{g.game.wallets[AI]}</strong> AI
        </p>
        <p className="muted">
          {result === HUMAN
            ? `Nicely played on ${DIFFICULTIES[g.difficulty].label}.`
            : result === AI
              ? 'Try undoing your last move, or drop the difficulty.'
              : 'Evenly matched.'}
        </p>
        <div className="dialog-actions">
          <button type="button" className="button" onClick={undo} disabled={!g.canUndo}>
            Undo last move
          </button>
          <button type="button" className="button button--primary" onClick={restart}>
            Play again
          </button>
        </div>
      </Dialog>
    </div>
  );
}

function ScoreCard({ name, score, active }: { name: string; score: number; active: boolean }) {
  const toWin = WIN_THRESHOLD + 1;
  return (
    <div className={`score-card${active ? ' is-active' : ''}`}>
      <div className="score-head">
        <span className="score-name">
          {name}
          {active && <span className="turn-dot" aria-label="to move" />}
        </span>
        <span className="score-value">{score}</span>
      </div>
      <div className="score-bar" role="progressbar" aria-label={`${name} progress to ${toWin}`} aria-valuemin={0} aria-valuemax={toWin} aria-valuenow={Math.min(score, toWin)}>
        <div style={{ width: `${Math.min(100, (score / toWin) * 100)}%` }} />
      </div>
    </div>
  );
}

function StatusText({
  phase,
  lastMove,
  result,
  hand,
}: {
  phase: ReturnType<typeof useGame>['phase'];
  lastMove: ReturnType<typeof useGame>['lastMove'];
  result: ReturnType<typeof winner> | null;
  hand: number;
}) {
  if (phase === 'over') {
    return <>{result === HUMAN ? 'Game over: you win!' : result === AI ? 'Game over: the AI wins.' : 'Game over: a draw.'}</>;
  }
  if (phase === 'thinking') {
    const capture = lastMove?.player === HUMAN && lastMove.captured > 0 ? `You captured ${shells(lastMove.captured)}. ` : '';
    return <>{capture}The AI is thinking&hellip;</>;
  }
  if (phase === 'animating') {
    return (
      <>
        Sowing&hellip;
        {hand > 0 && <span className="hand">In hand: {hand}</span>}
      </>
    );
  }

  if (lastMove?.player === AI) {
    const capture = lastMove.captured > 0 ? ` and captured ${shells(lastMove.captured)}` : '';
    return (
      <>
        The AI played pit {lastMove.hole + 1}
        {capture}. Your turn.
      </>
    );
  }
  return <>Your turn: pick a pit on your side.</>;
}
