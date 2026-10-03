// ParivaarSaathi mark: three family members inside a leaf-shaped embrace.
export function LogoMark({ size = 44, className = '' }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} className={className} aria-hidden="true">
      <defs>
        <linearGradient id="ps-logo-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1f9460" />
          <stop offset="1" stopColor="#0d4d34" />
        </linearGradient>
      </defs>
      <path d="M24 3c8 6 17 9 19 18 2 11-7 23-19 24C12 44 3 32 5 21 7 12 16 9 24 3Z" fill="url(#ps-logo-g)" />
      <circle cx="24" cy="15" r="4.2" fill="#ffffff" />
      <circle cx="14.5" cy="20" r="3.4" fill="#d6f2e1" />
      <circle cx="33.5" cy="20" r="3.4" fill="#d6f2e1" />
      <path d="M17 36c0-6 3-11 7-11s7 5 7 11" fill="none" stroke="#ffffff" strokeWidth="3.2" strokeLinecap="round" />
      <path d="M9.5 33c0-4.4 2.2-8 5-8 1.6 0 3 1 4 2.6M38.5 33c0-4.4-2.2-8-5-8-1.6 0-3 1-4 2.6" fill="none" stroke="#d6f2e1" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  )
}

export default function Logo({ compact = false }) {
  return (
    <a href="#session" className="flex items-center gap-2.5" aria-label="ParivaarSaathi home">
      <LogoMark size={compact ? 36 : 44} />
      <span className="leading-none">
        <span className="block text-xl font-extrabold tracking-tight text-brand-700 sm:text-[22px]">ParivaarSaathi</span>
        <span className="mt-0.5 block text-sm font-semibold text-brand-500">परिवार साथी</span>
      </span>
    </a>
  )
}
