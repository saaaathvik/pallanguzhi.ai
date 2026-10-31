# Pallanguzhi.AI

Play **Pallanguzhi**, the traditional South Indian mancala game, against an AI that uses minimax search with alpha-beta pruning.

Built with React, TypeScript and Vite. The AI runs entirely in the browser, in a Web Worker, so there is no backend.

## Features

- Minimax AI with alpha-beta pruning, looking up to 5 moves ahead
- Three difficulty levels: Easy (1 move, with occasional mistakes), Medium (3) and Hard (5)
- Animated sowing and captures, with Slow, Normal, Fast or Off speeds, and a 1 second pause before the AI replies
- Undo (takes back your move and the AI's reply) and restart
- In-game rules, shown on the first visit
- Responsive layout and keyboard-accessible controls

## How to play

The board has two rows of 7 pits with 6 shells each (84 in total). The bottom row is yours and the top row is the AI's. You move first.

1. Pick a pit on your side that has shells.
2. Take all its shells and sow them one per pit anticlockwise: left to right along your row, then right to left along the AI's row.
3. If the pit after your last shell has shells, pick them up and keep sowing.
4. If it is empty, your turn ends and you capture the shells in the pit just after it.

Capturing more than 42 shells wins immediately. Otherwise the game ends when the player to move has no shells on their side; each player keeps the shells left on their own side, and the higher total wins.

## How the AI works

`src/engine/ai.ts` implements minimax with alpha-beta pruning. The AI maximises *(AI captures − your captures)* and assumes you minimise it.

Moves are generated **lazily**: a position is only simulated when the search reaches it, so branches that alpha-beta prunes are never built. The original version built the full game tree first and then searched it. Results from `npm run bench` over 200 random positions:

| Depth | Full tree (avg positions) | Lazy search (avg positions) | Reduction |
|---|---|---|---|
| 1 (Easy) | 5 | 5 | 0.0% |
| 3 (Medium) | 123 | 64 | 47.6% |
| 5 (Hard) | 2,686 | 560 | 79.2% |
| 6 | 12,612 | 1,526 | 87.9% |

Both approaches return the same move and score, which the tests check. At depth 5 every search took a few milliseconds.

### Running the AI in a Web Worker

A Web Worker is a background thread the browser gives a page. The AI search runs there, so the page's main thread is free to keep animating and responding to input while the AI decides.

1. **Start-up:** when the game mounts, `useGame` (`src/hooks/useGame.ts`) creates an `AiClient` (`src/engine/aiClient.ts`). The client starts the worker with `new Worker(new URL('./ai.worker.ts', import.meta.url), { type: 'module' })`, which Vite bundles as a separate script.
2. **Request:** after your move, `useGame` calls `await ai.request(state, difficulty)`. The client gives the request an id, stores the Promise's `resolve` under that id, and sends `{ id, state, difficulty }` to the worker with `postMessage`. The browser copies the data to the worker thread.
3. **Search:** in the worker (`src/engine/ai.worker.ts`), `onmessage` runs `chooseMove()`, which is the alpha-beta search in `ai.ts`, and posts back `{ id, move, score, nodes, ms }`.
4. **Response:** the client's `onmessage` looks up the id and resolves the matching Promise, so the `await` in `useGame` continues with the AI's move. `useGame` also waits for a 1 second pause, then animates the move.
5. **Stale answers:** if you undo or restart while the AI is searching, `useGame` sees that its run id has changed and ignores the answer.
6. **Fallback:** if workers are unavailable or the worker fails, `AiClient` runs the same search on the main thread, so the game still works.
7. **Clean-up:** when the game unmounts, `AiClient.dispose()` terminates the worker.

## Project structure

```
src/
  engine/            Game rules and AI (pure TypeScript, no React)
    rules.ts         Board, sowing, captures, game end
    ai.ts            Lazy minimax with alpha-beta pruning, difficulty levels
    eager.ts         Full-tree reference search (tests and benchmark only)
    ai.worker.ts     Web Worker entry point
    aiClient.ts      Promise-based client for the worker
    *.test.ts        Vitest tests
  hooks/useGame.ts   Turn flow, animation, undo/restart
  components/        Board, shells, dialogs, rules
scripts/
  bench.ts           Lazy vs full-tree benchmark
legacy/              Original Python/Pygame version
```

## Development

Requires Node 18.18 or later.

```bash
npm install
npm run dev        # start the dev server
npm test           # run the tests
npm run lint       # ESLint
npm run typecheck  # TypeScript
npm run build      # production build in dist/
npm run bench      # search benchmark
```

## Testing

- **Rules:** sowing, captures, turn order, game end, and a property test that all 84 shells are conserved over hundreds of random games.
- **Search:** the lazy search matches the full-tree search on random positions at depths 1 to 5, and generates fewer positions at depth 6.

GitHub Actions runs lint, type-check, tests and a production build on every push and pull request (`.github/workflows/ci.yml`).

## Deployment

The app is a static site. On Vercel, import the repository; it detects Vite and uses `npm run build` with the `dist` output directory. Every push to `main` deploys to production, and every pull request gets a preview URL.

## Original version

The first version of this project was a Python/Pygame desktop game. It lives in [`legacy/`](legacy/); run it from that folder with `python pallanguzhi.py` (requires `pygame`).
