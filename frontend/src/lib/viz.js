// Chart colours from the validated reference palette (dataviz skill). Slots are assigned in fixed order.
export const SERIES = ['#2a78d6', '#eb6834'] // slot 1 blue, slot 2 orange — validated as a pair on white
export const INK = { primary: '#0b0b0b', secondary: '#52514e', muted: '#898781', grid: '#e1e0d9', axis: '#c3c2b7' }

// Sequential blue ramp (light → dark) for the district heat table.
const RAMP = ['#cde2fb', '#b7d3f6', '#9ec5f4', '#86b6ef', '#6da7ec', '#5598e7', '#3987e5', '#2a78d6', '#256abf', '#1c5cab', '#184f95', '#104281']

export function heatStyle(value, max) {
  if (!value) return { backgroundColor: '#f4f4f2', color: INK.muted }
  const i = Math.min(RAMP.length - 1, Math.floor((value / Math.max(max, 1)) * (RAMP.length - 1)))
  return { backgroundColor: RAMP[i], color: i >= 7 ? '#ffffff' : INK.primary }
}
