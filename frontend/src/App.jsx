import { useEffect, useState } from 'react'

import { getHealthStatus } from './services/api'

function App() {
  const [backendStatus, setBackendStatus] = useState('checking')

  useEffect(() => {
    let isActive = true

    async function checkBackend() {
      try {
        const result = await getHealthStatus()

        if (isActive) {
          setBackendStatus(result.status === 'healthy' ? 'connected' : 'unavailable')
        }
      } catch {
        if (isActive) {
          setBackendStatus('unavailable')
        }
      }
    }

    checkBackend()

    return () => {
      isActive = false
    }
  }, [])

  const statusStyles = {
    checking: 'bg-amber-50 text-amber-700 ring-amber-200',
    connected: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    unavailable: 'bg-red-50 text-red-700 ring-red-200',
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#dff7e9,_transparent_38%),linear-gradient(180deg,_#f8fbf9_0%,_#eef4f0_100%)] px-5 py-10 sm:px-8">
      <section className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-5xl items-center">
        <div className="w-full overflow-hidden rounded-3xl border border-emerald-900/10 bg-white/90 shadow-2xl shadow-emerald-950/10 backdrop-blur">
          <div className="grid lg:grid-cols-[1.15fr_0.85fr]">
            <div className="p-8 sm:p-12">
              <div className="mb-8 flex items-center gap-3">
                <div className="grid size-11 place-items-center rounded-2xl bg-emerald-700 text-lg font-bold text-white shadow-lg shadow-emerald-700/20">
                  SR
                </div>
                <div>
                  <p className="font-semibold text-emerald-950">Technohaven Assignment</p>
                  <p className="text-sm text-slate-500">Implementation · Phase 3</p>
                </div>
              </div>

              <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
                Step 1 scaffold is running
              </span>

              <h1 className="mt-6 max-w-2xl text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
                Real-Time Service Request Management System
              </h1>

              <p className="mt-5 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
                The React frontend and FastAPI backend are configured and ready for the database implementation step.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  className="rounded-xl bg-emerald-700 px-5 py-3 font-semibold text-white shadow-lg shadow-emerald-700/20 transition duration-150 hover:bg-emerald-800"
                  href="http://127.0.0.1:8000/docs"
                  target="_blank"
                  rel="noreferrer"
                >
                  Open API documentation
                </a>
                <span
                  className={`inline-flex items-center rounded-xl px-4 py-3 text-sm font-semibold ring-1 ring-inset ${statusStyles[backendStatus]}`}
                >
                  Backend: {backendStatus}
                </span>
              </div>
            </div>

            <aside className="border-t border-slate-200 bg-emerald-950 p-8 text-white lg:border-l lg:border-t-0 sm:p-12">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300">
                Step 1 exit criteria
              </p>
              <ul className="mt-8 space-y-5 text-sm leading-6 text-emerald-50/90">
                <li>FastAPI application starts successfully.</li>
                <li>React application starts successfully.</li>
                <li>Frontend can reach the backend health endpoint.</li>
                <li>Environment values are separated from source code.</li>
                <li>Folder structure is ready for later project phases.</li>
              </ul>
            </aside>
          </div>
        </div>
      </section>
    </main>
  )
}

export default App
