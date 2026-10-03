import { MapPinned } from 'lucide-react'
import { Suspense, lazy, useEffect, useState } from 'react'
import { apiGet } from '../lib/api'

const DistrictMap = lazy(() => import('../components/DistrictMap'))

export default function JobsPage({ defaults }) {
  const [rows, setRows] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    apiGet('/dashboard/summary').then((s) => setRows(s.by_district)).catch((e) => setError(`Could not load districts (${e.message})`))
  }, [])

  return (
    <div className="mx-auto max-w-[1400px]" data-view="jobs">
      <div className="card mb-5 p-5">
        <h1 className="flex items-center gap-2 text-2xl font-extrabold text-ink"><MapPinned size={24} className="text-brand-600" /> Job Opportunities</h1>
        <p className="mt-1 max-w-3xl text-sm text-ink/60">
          The Neighbourhood Job Radar on a map. Pick a district to zoom in: every opportunity within 15 km, the training centre, and the key factors a family asks about — distance and commute, openings, job type, shift, starting pay and the course that qualifies.
        </p>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <section className="card p-4">
        {rows ? (
          <Suspense fallback={<div className="flex h-[460px] items-center justify-center rounded-lg bg-slate-100 text-sm text-slate-400">Loading map…</div>}>
            <DistrictMap rows={rows} initialDistrict={defaults?.district} initialTrade={defaults?.trade} showFollow={false} />
          </Suspense>
        ) : (
          <div className="h-[460px] rounded-lg bg-slate-100" />
        )}
      </section>
    </div>
  )
}
