/**
 * Compares the lazy alpha-beta search with the eager "build the whole tree first" approach.
 * Run with: npm run bench
 */
import { alphaBeta, DIFFICULTIES } from '../src/engine/ai';
import { alphaBetaTree, buildTree, countNodes } from '../src/engine/eager';
import { isGameOver } from '../src/engine/rules';
import { randomPosition, seededRandom } from '../src/engine/testing';
import type { GameState } from '../src/engine/types';

const POSITIONS = 200;
const random = seededRandom(42);
const positions: GameState[] = [];
while (positions.length < POSITIONS) {
  const state = randomPosition(random, Math.floor(random() * 40));
  if (!isGameOver(state)) positions.push(state);
}

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
};
const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;

console.log(`${POSITIONS} random positions\n`);
console.log('depth | eager nodes (avg) | lazy nodes (avg) | reduction | eager ms (median) | lazy ms (median) | lazy ms (max)');

for (const depth of [1, 3, 5, 6]) {
  const eagerNodes: number[] = [];
  const lazyNodes: number[] = [];
  const eagerMs: number[] = [];
  const lazyMs: number[] = [];

  for (const state of positions) {
    let start = performance.now();
    const tree = buildTree(state, depth);
    alphaBetaTree(tree, -Infinity, Infinity);
    eagerMs.push(performance.now() - start);
    eagerNodes.push(countNodes(tree));

    const stats = { nodes: 0 };
    start = performance.now();
    alphaBeta(state, depth, -Infinity, Infinity, stats);
    lazyMs.push(performance.now() - start);
    lazyNodes.push(stats.nodes);
  }

  const reduction = (1 - mean(lazyNodes) / mean(eagerNodes)) * 100;
  console.log(
    [
      String(depth).padStart(5),
      mean(eagerNodes).toFixed(0).padStart(17),
      mean(lazyNodes).toFixed(0).padStart(16),
      `${reduction.toFixed(1)}%`.padStart(9),
      median(eagerMs).toFixed(2).padStart(17),
      median(lazyMs).toFixed(2).padStart(16),
      Math.max(...lazyMs).toFixed(2).padStart(13),
    ].join(' | '),
  );
}

console.log(`\nDifficulty depths: ${Object.entries(DIFFICULTIES).map(([k, v]) => `${k}=${v.depth}`).join(', ')}`);
