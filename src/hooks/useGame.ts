import { useCallback, useEffect, useRef, useState } from 'react';
import { chooseMove } from '../engine/ai';
import { AiClient } from '../engine/aiClient';
import { applyMove, finalize, initialState, isGameOver } from '../engine/rules';
import { HUMAN, type Difficulty, type GameState, type Pits, type Player, type Step } from '../engine/types';
import { usePersistentState } from './usePersistentState';

export type Phase = 'human' | 'animating' | 'thinking' | 'over';
export type Speed = 'slow' | 'normal' | 'fast' | 'off';

export const SPEEDS: Record<Speed, { label: string; stepMs: number }> = {
  slow: { label: 'Slow', stepMs: 480 },
  normal: { label: 'Normal', stepMs: 300 },
  fast: { label: 'Fast', stepMs: 170 },
  off: { label: 'Off', stepMs: 0 },
};

const DIFFICULTY_KEYS = ['easy', 'medium', 'hard'] as const;
const SPEED_KEYS = ['slow', 'normal', 'fast', 'off'] as const;

/** Minimum delay between the end of the human's move and the start of the AI's reply. */
const AI_PAUSE_MS = 1000;

/** What the board shows while a move is being animated. */
export interface Frame {
  pits: Pits;
  wallets: [number, number];
  hand: number;
  focus: { row: number; col: number; kind: Step['kind'] } | null;
}

export interface LastMove {
  player: Player;
  hole: number;
  captured: number;
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const stepWeight: Record<Step['kind'], number> = { pickup: 2, sow: 1, stop: 1.5, capture: 3 };

export function useGame() {
  const [game, setGame] = useState<GameState>(initialState);
  const [frame, setFrame] = useState<Frame | null>(null);
  const [phase, setPhase] = useState<Phase>('human');
  const [history, setHistory] = useState<GameState[]>([]);
  const [lastMove, setLastMove] = useState<LastMove | null>(null);
  const [difficulty, setDifficulty] = usePersistentState<Difficulty>('pallanguzhi:difficulty', 'easy', DIFFICULTY_KEYS);
  const [speed, setSpeed] = usePersistentState<Speed>('pallanguzhi:speed', 'slow', SPEED_KEYS);

  // Async move sequences check this to stop as soon as the player undoes or restarts.
  const runId = useRef(0);
  const ai = useRef<AiClient | null>(null);
  const speedRef = useRef(speed);
  const difficultyRef = useRef(difficulty);

  useEffect(() => {
    speedRef.current = speed;
    difficultyRef.current = difficulty;
  }, [speed, difficulty]);

  // One AiClient (and so one background worker thread) per mounted game. It is created when the
  // component mounts and the worker is terminated when it unmounts.
  useEffect(() => {
    ai.current = new AiClient();
    return () => {
      ai.current?.dispose();
      ai.current = null;
    };
  }, []);

  /** Plays a move with animation. Returns the new state, or null if the sequence was cancelled. */
  const playAnimated = useCallback(async (state: GameState, hole: number, run: number) => {
    const result = applyMove(state, hole, true);

    for (const step of result.steps) {
      const stepMs = SPEEDS[speedRef.current].stepMs;
      if (stepMs === 0) break;
      setFrame({
        pits: step.pits,
        wallets: step.wallets,
        hand: step.hand,
        focus: { row: step.row, col: step.col, kind: step.kind },
      });
      await sleep(stepMs * stepWeight[step.kind]);
      if (run !== runId.current) return null;
    }

    setFrame(null);
    setGame(result.state);
    setLastMove({ player: state.turn, hole, captured: result.captured });
    return result.state;
  }, []);

  /** Ends the game if it's over. Returns true if it ended. */
  const endIfOver = useCallback((state: GameState) => {
    if (!isGameOver(state)) return false;
    setGame(finalize(state));
    setPhase('over');
    return true;
  }, []);

  const playHuman = useCallback(
    async (hole: number) => {
      if (phase !== 'human' || game.turn !== HUMAN || game.pits[HUMAN][hole] === 0) return;

      const run = ++runId.current;
      setHistory((h) => [...h, game]);
      setPhase('animating');

      let state = await playAnimated(game, hole, run);
      if (!state || endIfOver(state)) return;

      // Ask the worker for the AI's move. The search runs on the worker thread, so this await does not
      // block rendering. Waiting on the pause as well means the reply never starts sooner than
      // AI_PAUSE_MS, however quickly the search finishes. Without a client (it is created in an
      // effect), the search runs here on the main thread instead.
      setPhase('thinking');
      const [decision] = await Promise.all([
        ai.current ? ai.current.request(state, difficultyRef.current) : Promise.resolve(chooseMove(state, difficultyRef.current)),
        sleep(AI_PAUSE_MS),
      ]);
      // The player may have undone or restarted while the AI was searching; drop the stale answer.
      if (run !== runId.current) return;

      setPhase('animating');
      state = await playAnimated(state, decision.move, run);
      if (!state || endIfOver(state)) return;

      setPhase('human');
    },
    [phase, game, playAnimated, endIfOver],
  );

  const reset = useCallback((state: GameState, nextHistory: GameState[]) => {
    runId.current++;
    setGame(state);
    setHistory(nextHistory);
    setFrame(null);
    setLastMove(null);
    setPhase('human');
  }, []);

  /** Rewinds to just before your last move (taking back the AI's reply too). */
  const undo = useCallback(() => {
    if (history.length === 0) return;
    reset(history[history.length - 1], history.slice(0, -1));
  }, [history, reset]);

  const restart = useCallback(() => {
    reset(initialState(), []);
  }, [reset]);

  const display = frame ?? { pits: game.pits, wallets: game.wallets, hand: 0, focus: null };

  return {
    game,
    display,
    phase,
    lastMove,
    canUndo: history.length > 0,
    difficulty,
    setDifficulty,
    speed,
    setSpeed,
    playHuman,
    undo,
    restart,
  };
}
