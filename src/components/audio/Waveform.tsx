export function Waveform({
  bars,
  large = false,
  compact = false,
}: {
  bars: number[];
  large?: boolean;
  compact?: boolean;
}) {
  return (
    <div className={`waveform ${large ? 'large' : ''} ${compact ? 'compact' : ''}`} aria-hidden="true">
      {bars.map((bar, index) => (
        <span key={index} style={{ height: `${bar}%` }} />
      ))}
    </div>
  );
}
