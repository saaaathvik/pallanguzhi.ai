import { memo } from 'react';

const MAX_DRAWN = 14;
const GOLDEN_ANGLE = 137.508;

interface ShellsProps {
  count: number;
  /** Varies the arrangement between pits so they don't all look identical. */
  seed: number;
}

/**
 * Cowrie shells laid out on a sunflower spiral. Positions are deterministic for a given
 * count and seed, so shells don't jump around between renders.
 */
export const Shells = memo(function Shells({ count, seed }: ShellsProps) {
  const drawn = Math.min(count, MAX_DRAWN);
  const scale = drawn <= 4 ? 1 : drawn <= 8 ? 0.86 : 0.74;
  const spread = drawn <= 1 ? 0 : 30;

  return (
    <svg className="shells" viewBox="0 0 100 100" aria-hidden="true">
      {Array.from({ length: drawn }, (_, i) => {
        const r = spread * Math.sqrt((i + 0.5) / drawn);
        const angle = ((i * GOLDEN_ANGLE + seed * 53) * Math.PI) / 180;
        const x = 50 + r * Math.cos(angle);
        const y = 50 + r * Math.sin(angle);
        const rotation = (seed * 97 + i * 71) % 180;
        return (
          <g key={i} transform={`translate(${x} ${y}) rotate(${rotation}) scale(${scale})`}>
            <ellipse rx="11" ry="7.5" fill="url(#shell-fill)" stroke="#7a5f43" strokeWidth="0.8" />
            <path d="M-7 0 Q0 1.6 7 0" fill="none" stroke="#6b4f36" strokeWidth="1.3" strokeLinecap="round" />
          </g>
        );
      })}
    </svg>
  );
});

/** Shared gradient used by every shell; rendered once in the app. */
export function ShellDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
      <defs>
        <radialGradient id="shell-fill" cx="40%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#fffaf0" />
          <stop offset="60%" stopColor="#efe2c8" />
          <stop offset="100%" stopColor="#c9b28e" />
        </radialGradient>
      </defs>
    </svg>
  );
}
