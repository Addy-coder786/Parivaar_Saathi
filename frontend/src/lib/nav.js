import { Compass, Database, FileCheck2, LayoutDashboard, MapPinned, MessageCircle, MessagesSquare, PhoneCall, ShieldCheck } from 'lucide-react'

// Sidebar navigation; every entry is a real, working view (no dead buttons).
export const NAV = [
  { view: 'session', label: 'Family Session', Icon: MessagesSquare, live: true },
  { view: 'career', label: 'Career Explorer', Icon: Compass },
  { view: 'evidence', label: 'Evidence Hub', Icon: FileCheck2 },
  { view: 'safety', label: 'Safety & Security', Icon: ShieldCheck },
  { view: 'jobs', label: 'Job Opportunities', Icon: MapPinned },
  { view: 'whatsapp', label: 'WhatsApp (Parent)', Icon: MessageCircle, group: 'Channels & data' },
  { view: 'survey', label: 'Trainee Survey (IVR)', Icon: PhoneCall },
  { view: 'feeds', label: 'Data & Integrations', Icon: Database },
  { view: 'dashboard', label: 'Admin Dashboard', Icon: LayoutDashboard, group: 'Administrator' },
]
