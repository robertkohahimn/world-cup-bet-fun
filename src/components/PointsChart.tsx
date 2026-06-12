/** Server-rendered SVG: cumulative points across settled bets. */
export function PointsChart({ deltas }: { deltas: number[] }) {
  const cumulative: number[] = [0];
  for (const d of deltas) cumulative.push(cumulative[cumulative.length - 1] + d);

  const W = 560;
  const H = 160;
  const PAD = 24;
  const min = Math.min(0, ...cumulative);
  const max = Math.max(1, ...cumulative);
  const x = (i: number) => PAD + (i * (W - PAD * 2)) / Math.max(1, cumulative.length - 1);
  const y = (v: number) => H - PAD - ((v - min) * (H - PAD * 2)) / (max - min);

  const path = cumulative.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const final = cumulative[cumulative.length - 1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`Cumulative points over ${deltas.length} settled bets, ending at ${final}`}>
      {/* zero line */}
      <line x1={PAD} x2={W - PAD} y1={y(0)} y2={y(0)} stroke="var(--color-line)" strokeWidth="1" strokeDasharray="4 4" />
      <text x={PAD - 4} y={y(0) + 3} textAnchor="end" fontSize="10" fill="var(--color-ink-faint)">0</text>
      <text x={PAD - 4} y={y(max) + 3} textAnchor="end" fontSize="10" fill="var(--color-ink-faint)">{max}</text>
      {min < 0 && (
        <text x={PAD - 4} y={y(min) + 3} textAnchor="end" fontSize="10" fill="var(--color-ink-faint)">{min}</text>
      )}
      <path d={path} fill="none" stroke="var(--color-pitch)" strokeWidth="2.5" strokeLinejoin="round" />
      {cumulative.map((v, i) => (
        <circle key={i} cx={x(i)} cy={y(v)} r="2.5" fill="var(--color-pitch)" />
      ))}
      <text
        x={x(cumulative.length - 1) + 6}
        y={y(final) + 4}
        fontSize="13"
        fontWeight="bold"
        fill={final >= 0 ? "var(--color-pitch)" : "var(--color-signal)"}
      >
        {final > 0 ? `+${final}` : final}
      </text>
    </svg>
  );
}
