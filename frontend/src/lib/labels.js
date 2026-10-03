export const OBJECTION_LABELS = {
  income: 'Income',
  employment: 'Career viability',
  safety: 'Safety',
  social_status: 'Social status',
  distance: 'Distance',
  placement: 'Placement',
}

export const BAND_LABELS = {
  high: 'High resistance',
  medium: 'Medium — open to counselling',
  low: 'Low resistance',
}

export const BAND_STYLES = {
  high: 'bg-red-100 text-red-800 border-red-200',
  medium: 'bg-amber-100 text-amber-800 border-amber-200',
  low: 'bg-emerald-100 text-emerald-800 border-emerald-200',
}

export const PRIORITY_STYLES = {
  high: 'bg-red-600 text-white',
  medium: 'bg-amber-100 text-amber-900',
}

export const STATUS_LABELS = { open: 'Open', in_progress: 'In progress', closed: 'Closed' }

export const PERSONA_LABELS = { learner: 'Learner', parent: 'Parent', assistant: 'ParivaarSaathi' }

export const LANGUAGE_LABELS = { hinglish: 'Hinglish', hindi: 'हिन्दी (Hindi)', english: 'English' }

export function capitalize(s) {
  return s ? s[0].toUpperCase() + s.slice(1) : s
}

export function bandOf(score) {
  return score >= 70 ? 'high' : score >= 40 ? 'medium' : 'low'
}

export function timeOf(ts) {
  const d = new Date(ts)
  return isNaN(d) ? '' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

/** Avatar variant for a learner of the given gender. */
export function learnerVariant(gender) {
  return gender === 'female' ? 'learner-female' : gender === 'male' ? 'learner-male' : 'learner-other'
}
