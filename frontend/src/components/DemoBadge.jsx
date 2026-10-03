export default function DemoBadge({ className = '' }) {
  return (
    <span
      className={`inline-flex items-center rounded border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800 ${className}`}
      title="Demonstration dataset — production version connects authorised government/data-provider interfaces."
    >
      Demo data
    </span>
  )
}
