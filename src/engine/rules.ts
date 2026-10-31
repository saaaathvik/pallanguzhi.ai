import {
  AI,
  HUMAN,
  INITIAL_SHELLS,
  PITS_PER_ROW,
  WIN_THRESHOLD,
  type GameState,
  type Player,
  type Step,
} from './types';

/**
 * Maximum number of pickups in a single move. The rules do not rule out a sowing loop that
 * never reaches an empty pit, so this cap makes every move (and therefore the search) finish.
 * A move that hits the cap ends without a capture.
 */
export const MAX_SOW_STEPS = 10_000;

export function initialState(): GameState {
  return {
    pits: [Array(PITS_PER_ROW).fill(INITIAL_SHELLS), Array(PITS_PER_ROW).fill(INITIAL_SHELLS)],
    wallets: [0, 0],
    turn: HUMAN,
  };
}

/**
 * The next pit counter-clockwise: the human's row runs left to right,
 * the AI's row runs right to left, and the two ends connect.
 */
export function nextPit(row: number, col: number): [number, number] {
  if (row === 0 && col === 0) return [1, 0];
  if (row === 1 && col === PITS_PER_ROW - 1) return [0, PITS_PER_ROW - 1];
  return row === 0 ? [0, col - 1] : [1, col + 1];
}

export function legalMoves(state: GameState): number[] {
  const moves: number[] = [];
  const row = state.pits[state.turn];
  for (let col = 0; col < PITS_PER_ROW; col++) {
    if (row[col] > 0) moves.push(col);
  }
  return moves;
}

export interface MoveResult {
  state: GameState;
  captured: number;
  /** Only filled in when `record` is true; the search skips it for speed. */
  steps: Step[];
}

/**
 * Plays `hole` for the player to move:
 * 1. Pick up every shell in the pit and sow one per pit counter-clockwise.
 * 2. If the pit after the last shell has shells, pick those up and keep sowing.
 * 3. If it is empty, the move ends and the player captures the pit after the empty one.
 */
export function applyMove(state: GameState, hole: number, record = false): MoveResult {
  const player = state.turn;
  if (hole < 0 || hole >= PITS_PER_ROW || state.pits[player][hole] === 0) {
    throw new Error(`Illegal move: player ${player} cannot play pit ${hole}`);
  }

  const pits = state.pits.map((row) => row.slice());
  const wallets: [number, number] = [state.wallets[0], state.wallets[1]];
  const steps: Step[] = [];
  const snap = (kind: Step['kind'], row: number, col: number, hand: number) => {
    if (record) {
      steps.push({ kind, row, col, hand, pits: pits.map((r) => r.slice()), wallets: [wallets[0], wallets[1]] });
    }
  };

  let row: number = player;
  let col = hole;
  let hand = pits[row][col];
  pits[row][col] = 0;
  snap('pickup', row, col, hand);

  let budget = MAX_SOW_STEPS;
  for (;;) {
    while (hand > 0) {
      [row, col] = nextPit(row, col);
      pits[row][col]++;
      hand--;
      snap('sow', row, col, hand);
    }

    [row, col] = nextPit(row, col);
    if (pits[row][col] > 0 && --budget > 0) {
      hand = pits[row][col];
      pits[row][col] = 0;
      snap('pickup', row, col, hand);
      continue;
    }

    snap('stop', row, col, 0);
    break;
  }

  // Capture the pit after the one where the move stopped.
  let captured = 0;
  if (budget > 0) {
    const [captureRow, captureCol] = nextPit(row, col);
    captured = pits[captureRow][captureCol];
    pits[captureRow][captureCol] = 0;
    wallets[player] += captured;
    snap('capture', captureRow, captureCol, 0);
  }

  return {
    state: { pits, wallets, turn: (1 - player) as Player },
    captured,
    steps,
  };
}

function rowSum(row: number[]): number {
  return row.reduce((sum, n) => sum + n, 0);
}

/** The game ends when someone holds a majority, or the player to move has no shells on their side. */
export function isGameOver(state: GameState): boolean {
  return (
    state.wallets[AI] > WIN_THRESHOLD ||
    state.wallets[HUMAN] > WIN_THRESHOLD ||
    rowSum(state.pits[state.turn]) === 0
  );
}

/** When the game ends with shells left on the board, each player keeps the shells on their own side. */
export function finalize(state: GameState): GameState {
  return {
    pits: state.pits.map((row) => row.map(() => 0)),
    wallets: [state.wallets[AI] + rowSum(state.pits[AI]), state.wallets[HUMAN] + rowSum(state.pits[HUMAN])],
    turn: state.turn,
  };
}

export function winner(state: GameState): Player | 'draw' {
  const [ai, human] = state.wallets;
  if (ai === human) return 'draw';
  return ai > human ? AI : HUMAN;
}
