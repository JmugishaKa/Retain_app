export default function Stat({ label, value, tone }: { label: string; value: string | number; tone?: string }) {
  return <div className={`stat ${tone || ''}`}><span>{label}</span><strong>{value}</strong></div>;
}
