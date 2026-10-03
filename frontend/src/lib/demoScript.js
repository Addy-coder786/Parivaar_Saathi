// Deterministic Demo Scenario Mode script (master context §7). Runs through the real API.
export const DEMO_SESSION = {
  district: 'Sikar',
  trade: 'Electrician',
  learner_gender: 'female',
  parent_relation: 'mother',
}

export const DEMO_STEPS = [
  {
    persona: 'learner',
    text: 'Mujhe electrician course karna hai.',
    caption: 'The learner states her goal. The system records it in the learner context.',
  },
  {
    persona: 'parent',
    text: 'Electrician mein future nahi hai.',
    caption: 'Mother objects. The system detects persona = Parent, objection = Career viability, and pulls local jobs and wages.',
  },
  {
    persona: 'parent',
    text: 'Ladki ke liye safe hai?',
    caption: 'The objection changes to Safety. The Beti Suraksha card is retrieved. Watch the admin dashboard update live.',
  },
  {
    persona: 'parent',
    text: 'Phir bhi, degree nahi toh izzat nahi.',
    caption: 'Social status concern plus a refusal after evidence. Resistance stays High, so the case is escalated to a human counsellor with a warm-handoff brief.',
  },
]
