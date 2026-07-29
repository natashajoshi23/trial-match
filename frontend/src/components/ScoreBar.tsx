interface Props {
  label: string
  value: number
  gradient: string
}

export default function ScoreBar({ label, value, gradient }: Props) {
  const pct = Math.round(value * 100)
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: 6 }}>
        <span style={{ color: '#8A9BA8' }}>{label}</span>
        <span style={{ fontWeight: 700, color: '#1B3A52', fontFamily: "'JetBrains Mono', monospace" }}>{pct}%</span>
      </div>
      <div style={{ height: 5, width: '100%', borderRadius: 999, background: '#E2D9C8', overflow: 'hidden' }}>
        <div
          style={{
            height: 5,
            borderRadius: 999,
            width: `${pct}%`,
            background: gradient,
            transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)',
          }}
        />
      </div>
    </div>
  )
}
