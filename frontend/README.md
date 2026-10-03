# ParivaarSaathi — frontend

React 18 + Vite + Tailwind CSS v4 + Recharts + MapLibre GL (OpenFreeMap basemap) + lucide-react icons.
All backend access goes through `src/lib/api.js`. In development, Vite proxies `/api` and `/ws` to the FastAPI backend on port 8000.

```powershell
npm install
npm run dev      # http://localhost:5173  (start the backend first, see the root README)
npm run lint     # oxlint
npm run build    # production build into dist/
```

## Layout

```
index.html              animated intro (plain HTML/CSS, shows before the bundle loads)
public/                 intro artwork (intro.webp + intro.jpg fallback), favicon
src/
  App.jsx               shell + hash routing (#session #career #evidence #safety #jobs #whatsapp #survey #feeds #dashboard)
  components/
    shell/              AppHeader · Sidebar · Logo · Avatar (inline-SVG) · PromoColumn
    insights/           InsightsColumn (gauge, dialogue state, WhatsApp invite, evidence highlights, next steps)
    cards/              evidence card bodies: Job Radar, Paisa-Map, Beti Suraksha, Pragati Path, Outcomes
    FamilyChat.jsx      learner + parent chat (live WhatsApp turns over WebSocket)
    Dashboard.jsx       resistance intelligence (KPIs, charts, map, live feed, counsellor queue)
    DistrictMap.jsx     MapLibre district map with nearby opportunities
  pages/                EvidenceHub (also Career Explorer / Safety) · JobsPage · WhatsAppSim · IvrSurvey · DataFeeds
  lib/                  api · speech (browser / BHASHINI) · intro · nav · labels · districts · demoScript
```

`?intro=0` skips the intro, for example `http://localhost:5173/?intro=0#dashboard`.
