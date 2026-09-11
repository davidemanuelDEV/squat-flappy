/** Original lime-mint geometric bird — not Flappy Bird sprites. */

export function GeometricBird({
  width = 96,
  height = 78,
  idPrefix = "sf",
}: {
  width?: number;
  height?: number;
  idPrefix?: string;
}) {
  const body = `${idPrefix}-body`;
  const belly = `${idPrefix}-belly`;
  const wing = `${idPrefix}-wing`;
  const beak = `${idPrefix}-beak`;
  return (
    <svg width={width} height={height} viewBox="0 0 80 64" aria-hidden>
      <defs>
        <radialGradient id={body} cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#ecfccb" />
          <stop offset="40%" stopColor="#a3e635" />
          <stop offset="100%" stopColor="#365314" />
        </radialGradient>
        <radialGradient id={belly} cx="40%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#f0fdfa" />
          <stop offset="100%" stopColor="#99f6e4" />
        </radialGradient>
        <radialGradient id={wing} cx="30%" cy="25%" r="70%">
          <stop offset="0%" stopColor="#ecfdf5" />
          <stop offset="55%" stopColor="#5eead4" />
          <stop offset="100%" stopColor="#0f766e" />
        </radialGradient>
        <linearGradient id={beak} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fde047" />
          <stop offset="100%" stopColor="#ca8a04" />
        </linearGradient>
      </defs>
      <ellipse cx="38" cy="52" rx="22" ry="6" fill="rgba(0,0,0,0.28)" />
      <ellipse
        cx="34"
        cy="32"
        rx="24"
        ry="20"
        fill={`url(#${body})`}
        stroke="#1a2e05"
        strokeWidth="2.5"
      />
      <ellipse cx="38" cy="40" rx="11" ry="9" fill={`url(#${belly})`} />
      <ellipse
        cx="26"
        cy="30"
        rx="11"
        ry="8"
        fill={`url(#${wing})`}
        stroke="#115e59"
        strokeWidth="1.8"
        transform="rotate(-22 26 30)"
      />
      <circle cx="48" cy="24" r="9" fill="#fff" stroke="#052e16" strokeWidth="1.8" />
      <circle cx="51" cy="25" r="4" fill="#14532d" />
      <circle cx="46" cy="21" r="2.2" fill="#fff" />
      <path
        d="M54 30 L74 34 L54 42 Z"
        fill={`url(#${beak})`}
        stroke="#854d0e"
        strokeWidth="1.4"
      />
    </svg>
  );
}

export function SteelBar({ h }: { h: number }) {
  return (
    <div
      className="w-11 rounded-sm shadow-inner ring-1 ring-teal-900/50"
      style={{
        height: h,
        background:
          "linear-gradient(90deg,#0f2a32 0%,#1f6f78 20%,#5eead4 40%,#99f6e4 52%,#2dd4bf 70%,#115e59 100%)",
      }}
    />
  );
}
