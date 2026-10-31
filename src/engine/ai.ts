import { applyMove, legalMoves } from './rules';
import { AI, type Difficulty, type GameState } from './types';

export interface SearchStats {
  /** Positions generated (and visited) by the search, including the root. */
  nodes: number;
}

/**
 * Scores a position from the AI's point of view: AI captures minus human captures.
 * At a terminal position (the side to move has no shells), each player is also credited
 * with the shells left on their own side, since that is how the game ends.
 */
export function evaluate(state: GameState, isTerminal: boolean): number {
  let score = state.wallets[0] - state.wallets[1];
  if (isTerminal) {
    for (const shells of state.pits[0]) score += shells;
    for (const shells of state.pits[1]) score -= shells;
  }
  return score;
}

/**
 * Minimax with alpha-beta pruning. The AI maximises evaluate(), the human minimises it.
 *
 * Children are generated lazily: a move is only simulated when the search reaches it,
 * so branches cut off by pruning are never built at all.
 *
 * Returns [score, best move]; the move is -1 at a leaf.
 */
export function alphaBeta(
  state: GameState,
  depth: number,
  alpha: number,
  beta: number,
  stats: SearchStats = { nodes: 0 },
): [number, number] {
  stats.nodes++;

  const moves = depth === 0 ? [] : legalMoves(state);
  if (moves.length === 0) {
    return [evaluate(state, depth > 0), -1];
  }

  let bestMove = -1;

  if (state.turn === AI) {
    let bestScore = -Infinity;

    for (const hole of moves) {
      const child = applyMove(state, hole).state;
      const [score] = alphaBeta(child, depth - 1, alpha, beta, stats);

      if (score > bestScore) {
        bestScore = score;
        bestMove = hole;
      }

      alpha = Math.max(alpha, bestScore);
      if (beta <= alpha) break;
    }

    return [bestScore, bestMove];
  }

  let bestScore = Infinity;

  for (const hole of moves) {
    const child = applyMove(state, hole).state;
    const [score] = alphaBeta(child, depth - 1, alpha, beta, stats);

    if (score < bestScore) {
      bestScore = score;
      bestMove = hole;
    }

    beta = Math.min(beta, bestScore);
    if (beta <= alpha) break;
  }

  return [bestScore, bestMove];
}

export interface DifficultyConfig {
  label: string;
  /** Plies (single moves by either player) the AI looks ahead. */
  depth: number;
  /** Chance the AI plays a random legal move instead of the best one. */
  blunderRate: number;
}

export const DIFFICULTIES: Record<Difficulty, DifficultyConfig> = {
  easy: { label: 'Easy', depth: 1, blunderRate: 0.3 },
  medium: { label: 'Medium', depth: 3, blunderRate: 0 },
  hard: { label: 'Hard', depth: 5, blunderRate: 0 },
};

export interface AiDecision {
  move: number;
  score: number;
  nodes: number;
  ms: number;
}

/** Picks the AI's move for the given difficulty. This is what the Web Worker runs. */
export function chooseMove(state: GameState, difficulty: Difficulty, random: () => number = Math.random): AiDecision {
  const { depth, blunderRate } = DIFFICULTIES[difficulty];
  const start = performance.now();
  const stats: SearchStats = { nodes: 0 };
  const [score, bestMove] = alphaBeta(state, depth, -Infinity, Infinity, stats);

  const moves = legalMoves(state);
  if (moves.length === 0) throw new Error('chooseMove called with no legal moves');
  const move = random() < blunderRate ? moves[Math.floor(random() * moves.length)] : bestMove;

  return { move, score, nodes: stats.nodes, ms: performance.now() - start };
}
