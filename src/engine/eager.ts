/**
 * Alpha-beta over a game tree that is built in full before the search starts.
 * The app does not use this file: tests use it to check that the lazy search in ai.ts
 * returns the same results, and the benchmark uses it to measure how many positions
 * lazy generation saves.
 */
import { evaluate } from './ai';
import { applyMove, legalMoves } from './rules';
import { AI, type GameState } from './types';

export interface TreeNode {
  state: GameState;
  /** The move that led to this node (-1 at the root). */
  hole: number;
  /** Plies left to search below this node. */
  depth: number;
  children: TreeNode[];
}

export function buildTree(state: GameState, depth: number, hole = -1): TreeNode {
  const node: TreeNode = { state, hole, depth, children: [] };
  if (depth === 0) return node;

  for (const move of legalMoves(state)) {
    node.children.push(buildTree(applyMove(state, move).state, depth - 1, move));
  }
  return node;
}

export function countNodes(node: TreeNode): number {
  let total = 1;
  for (const child of node.children) total += countNodes(child);
  return total;
}

export function alphaBetaTree(node: TreeNode, alpha: number, beta: number): [number, number] {
  if (node.children.length === 0) {
    return [evaluate(node.state, node.depth > 0), -1];
  }

  let bestMove = -1;

  if (node.state.turn === AI) {
    let bestScore = -Infinity;
    for (const child of node.children) {
      const [score] = alphaBetaTree(child, alpha, beta);
      if (score > bestScore) {
        bestScore = score;
        bestMove = child.hole;
      }
      alpha = Math.max(alpha, bestScore);
      if (beta <= alpha) break;
    }
    return [bestScore, bestMove];
  }

  let bestScore = Infinity;
  for (const child of node.children) {
    const [score] = alphaBetaTree(child, alpha, beta);
    if (score < bestScore) {
      bestScore = score;
      bestMove = child.hole;
    }
    beta = Math.min(beta, bestScore);
    if (beta <= alpha) break;
  }
  return [bestScore, bestMove];
}
