import { LogoMark } from './Logo'

// Flat illustrated avatars drawn in SVG (no external images). Variants:
//   learner-female · learner-male · learner-other · mother · father · guardian · assistant
const SKIN = { learner: '#c98d63', mother: '#b97a52', father: '#a96b45', guardian: '#b07250' }

function Bust({ variant }) {
  const isMother = variant === 'mother'
  const isFather = variant === 'father'
  const isGuardian = variant === 'guardian'
  const isLearnerF = variant === 'learner-female'
  const isLearnerM = variant === 'learner-male' || variant === 'learner-other'
  const skin = isMother ? SKIN.mother : isFather ? SKIN.father : isGuardian ? SKIN.guardian : SKIN.learner
  const bg = isLearnerF || isLearnerM ? '#d6f2e1' : isMother ? '#fde2e7' : '#e0e7ff'
  const shirt = isLearnerF ? '#12784c' : isLearnerM ? '#2a78d6' : isMother ? '#d6336c' : isFather ? '#c2410c' : '#6d28d9'
  const hair = '#1f1a17'
  return (
    <>
      <circle cx="32" cy="32" r="32" fill={bg} />
      {/* back hair */}
      {(isLearnerF || isMother) && <path d="M17 30c0-11 7-18 15-18s15 7 15 18v12H17Z" fill={hair} />}
      {/* shoulders */}
      <path d="M10 64c1-12 10-18 22-18s21 6 22 18Z" fill={shirt} />
      {isMother && <path d="M14 64c3-9 9-14 18-15l-6 15Z" fill="#f59f00" opacity="0.9" />}
      {/* neck + face */}
      <rect x="27.5" y="38" width="9" height="9" rx="3" fill={skin} />
      <ellipse cx="32" cy="29" rx="11" ry="12.5" fill={skin} />
      {/* front hair */}
      {isLearnerF && <path d="M21 27c1-8 6-12 11-12 6 0 10 4 11 11-5-1-9-4-11-7-2 4-6 7-11 8Z" fill={hair} />}
      {isLearnerF && <path d="M42 28c3 4 3 11 1 15l-2-1c1-4 1-9 1-14Z" fill={hair} />}
      {isMother && <path d="M21 26c1-7 5-11 11-11s10 4 11 11c-4-3-7-6-11-6s-7 3-11 6Z" fill={hair} />}
      {isMother && <circle cx="32" cy="12.5" r="4.5" fill={hair} />}
      {isMother && <circle cx="32" cy="24" r="1.2" fill="#e03131" />}
      {(isLearnerM || isFather || isGuardian) && <path d="M21 26c0-8 5-12 11-12 7 0 11 4 11 11-2-2-5-4-9-4-6 0-10 2-13 5Z" fill={isGuardian ? '#6b6b6b' : hair} />}
      {isFather && <path d="M26.5 34.5c2-1.6 3.7-1.6 5.5-.4 1.8-1.2 3.5-1.2 5.5.4-1.5 1.4-3.6 1.6-5.5.6-1.9 1-4 .8-5.5-.6Z" fill={hair} />}
      {isGuardian && <rect x="25" y="27" width="14" height="4" rx="2" fill="none" stroke="#3f3f46" strokeWidth="1.3" />}
      {/* eyes + smile */}
      <circle cx="27.8" cy="29" r="1.25" fill="#1f1a17" />
      <circle cx="36.2" cy="29" r="1.25" fill="#1f1a17" />
      <path d="M28.5 35.5c2.2 1.7 4.8 1.7 7 0" fill="none" stroke="#7c2d12" strokeWidth="1.3" strokeLinecap="round" />
    </>
  )
}

export default function Avatar({ variant, size = 44, online = false, ring = false, className = '' }) {
  if (variant === 'assistant') {
    return (
      <span className={`relative inline-flex shrink-0 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-brand-100 ${className}`} style={{ width: size, height: size }}>
        <LogoMark size={size * 0.72} />
      </span>
    )
  }
  return (
    <span className={`relative inline-flex shrink-0 ${className}`} style={{ width: size, height: size }}>
      <svg viewBox="0 0 64 64" width={size} height={size} className={`rounded-full ${ring ? 'ring-2 ring-white shadow-md' : ''}`} aria-hidden="true">
        <clipPath id={`clip-${variant}`}><circle cx="32" cy="32" r="32" /></clipPath>
        <g clipPath={`url(#clip-${variant})`}><Bust variant={variant} /></g>
      </svg>
      {online && <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-brand-500" />}
    </span>
  )
}
