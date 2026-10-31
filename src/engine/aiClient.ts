import { chooseMove, type AiDecision } from './ai';
import type { Difficulty, GameState } from './types';

/** Message the page sends to the worker. */
export interface AiRequest {
  id: number;
  state: GameState;
  difficulty: Difficulty;
}

/** Message the worker sends back; `id` matches the request it answers. */
export interface AiResponse extends AiDecision {
  id: number;
}

interface Pending {
  request: AiRequest;
  resolve: (decision: AiDecision) => void;
}

/**
 * Main-thread side of the AI worker (see ai.worker.ts). It turns the worker's message passing
 * into a Promise API: `await client.request(state, difficulty)` resolves with the AI's move.
 *
 * Each request gets an id and its Promise's resolve function is kept in `pending` under that id.
 * When the worker posts a response, onmessage looks up the id and resolves that Promise.
 *
 * If Worker is unavailable, or the worker fails to load or throws, the search runs on the main
 * thread instead, so the game still works.
 */
export class AiClient {
  private worker: Worker | null = null;
  private nextId = 1;
  private pending = new Map<number, Pending>();

  constructor() {
    if (typeof Worker === 'undefined') return;
    try {
      // `new URL(..., import.meta.url)` lets Vite find the worker file and bundle it as its own
      // script; `type: 'module'` allows it to use import statements.
      this.worker = new Worker(new URL('./ai.worker.ts', import.meta.url), { type: 'module' });

      this.worker.onmessage = (event: MessageEvent<AiResponse>) => {
        const entry = this.pending.get(event.data.id);
        this.pending.delete(event.data.id);
        entry?.resolve(event.data);
      };

      // On a worker error, stop using it and answer every outstanding request on the main thread.
      this.worker.onerror = () => {
        this.worker?.terminate();
        this.worker = null;
        for (const { request, resolve } of this.pending.values()) {
          resolve(chooseMove(request.state, request.difficulty));
        }
        this.pending.clear();
      };
    } catch {
      this.worker = null;
    }
  }

  /** Asks for the AI's move. Resolves when the worker replies (or immediately without a worker). */
  request(state: GameState, difficulty: Difficulty): Promise<AiDecision> {
    const request: AiRequest = { id: this.nextId++, state, difficulty };
    const worker = this.worker;
    if (!worker) return Promise.resolve(chooseMove(state, difficulty));

    return new Promise((resolve) => {
      this.pending.set(request.id, { request, resolve });
      worker.postMessage(request);
    });
  }

  /** Stops the worker thread. Requests still in flight are dropped and never resolve. */
  dispose(): void {
    this.worker?.terminate();
    this.worker = null;
    this.pending.clear();
  }
}
