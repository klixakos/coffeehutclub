const COL = ['#5BB5E3', '#E8923A', '#3FA58C', '#E0636B']

export default function Mandala({ k = 0, size = 160, empty = '#E4E7EC', stroke = '#2E3540' }) {
  const outer = 'M100 100 L84 30 Q100 6 116 30 Z'
  const inner = 'M100 100 L92 62 Q100 50 108 62 Z'
  const idx = [...Array(10).keys()]
  return (
    <svg viewBox="0 0 200 200" width={size} height={size} role="img" aria-label={`${k} από 10 σφραγίδες`}>
      <g stroke={stroke} strokeWidth="4" strokeLinejoin="round">
        {idx.map((i) => (
          <path key={'o' + i} d={outer} fill={i < k ? COL[i % 4] : empty} transform={`rotate(${i * 36} 100 100)`} />
        ))}
        {idx.map((i) => (
          <path key={'i' + i} d={inner} fill={i < k ? COL[(i + 2) % 4] : empty} transform={`rotate(${i * 36 + 18} 100 100)`} />
        ))}
      </g>
    </svg>
  )
}
