import { INITIAL_SHELLS, PITS_PER_ROW, TOTAL_SHELLS, WIN_THRESHOLD } from '../engine/types';

export function Rules() {
  return (
    <div className="rules">
      <p>
        Pallanguzhi is a traditional mancala game from South India. This version uses a simplified set of
        rules.
      </p>

      <h3>Setup</h3>
      <p>
        The board has two rows of {PITS_PER_ROW} pits with {INITIAL_SHELLS} shells in each ({TOTAL_SHELLS} in total).
        The bottom row is yours and the top row belongs to the AI. You move first.
      </p>

      <h3>Your turn</h3>
      <ol>
        <li>Pick any pit on your side that has shells.</li>
        <li>
          Take all its shells and drop them one at a time into the following pits, going anticlockwise: left to right
          along your row, then right to left along the AI&rsquo;s row.
        </li>
        <li>
          Look at the pit after the one where your last shell landed. If it has shells, pick them all up and keep
          sowing.
        </li>
        <li>
          If that pit is empty, your turn ends and you <strong>capture</strong> every shell in the pit just after the
          empty one.
        </li>
      </ol>

      <h3>Winning</h3>
      <ul>
        <li>
          The first player to capture more than {WIN_THRESHOLD} of the {TOTAL_SHELLS} shells wins straight away.
        </li>
        <li>
          Otherwise, the game ends when the player whose turn it is has no shells on their side. Each player then
          keeps the shells left on their own side, and the higher total wins.
        </li>
      </ul>
    </div>
  );
}
