/**
 * Web Worker entry point: this file runs on its own background thread, separate from the page.
 *
 * AiClient (aiClient.ts) starts it with `new Worker(...)` and talks to it only through messages:
 * 1. The page posts an AiRequest: { id, state, difficulty }. The browser copies the data across
 *    threads (structured clone), so the worker gets its own copy of the game state.
 * 2. onmessage below runs the alpha-beta search with chooseMove().
 * 3. The worker posts back an AiResponse: the chosen move and search stats, plus the same id so
 *    AiClient can match the answer to the request that asked for it.
 *
 * The worker has no access to the DOM or React state. While it searches, the main thread keeps
 * rendering and animating.
 */
import { chooseMove } from './ai';
import type { AiRequest, AiResponse } from './aiClient';

self.onmessage = (event: MessageEvent<AiRequest>) => {
  const { id, state, difficulty } = event.data;
  const response: AiResponse = { id, ...chooseMove(state, difficulty) };
  self.postMessage(response);
};
