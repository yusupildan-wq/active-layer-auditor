import { useState } from 'react'
import { ReadinessReport } from '../types'
import ReadinessReportView from '../components/ReadinessReport'

type RunState = 'idle' | 'running' | 'done' | 'error'

const CHECKS_MANIFEST = [
  { label: 'Active layer components',   category: 'Active Layer' },
  { label: 'Unmanaged customizations',  category: 'Active Layer' },
  { label: 'Cloud flows',               category: 'Flows' },
  { label: 'Greymatter solutions',       category: 'Solutions' },
  { label: 'Environment variables',     category: 'Environment Variables' },
  { label: 'Connection references',     category: 'Connection References' },
  { label: 'Option set values',         category: 'Option Sets' },
]

export default function ReadinessPage() {
  const [inputUrl, setInputUrl]   = useState('')
  const [runState, setRunState]   = useState<RunState>('idle')
  const [report, setReport]       = useState<ReadinessReport | null>(null)
  const [error, setError]         = useState<string | null>(null)
  const [currentCheck, setCurrentCheck] = useState(0)

  async function handleRun(e: React.FormEvent) {
    e.preventDefault()
    setRunState('running')
    setReport(null)
    setError(null)
    setCurrentCheck(0)

    // Animate through checks while waiting for the response
    const interval = setInterval(() => {
      setCurrentCheck(v => Math.min(v + 1, CHECKS_MANIFEST.length - 1))
    }, 600)

    try {
      const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'
      const resp = await fetch(`${apiUrl}/api/readiness/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ environmentUrl: inputUrl.trim() }),
      })
      if (!resp.ok) {
        const data = await resp.json()
        throw new Error(data.error ?? 'Readiness check failed')
      }
      const data: ReadinessReport = await resp.json()
      setReport(data)
      setRunState('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not connect to backend')
      setRunState('error')
    } finally {
      clearInterval(interval)
    }
  }

  return (
    <>
      {/* Page hero */}
      <section className="relative overflow-hidden" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[350px] rounded-full"
            style={{ background: 'radial-gradient(ellipse, rgba(34,197,94,0.05) 0%, transparent 70%)' }}
          />
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-px"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(74,222,128,0.4), transparent)' }}
          />
        </div>
        <div className="relative max-w-7xl mx-auto px-6 py-16 animate-fade-in">
          <p className="text-xs font-semibold tracking-[0.28em] uppercase mb-4" style={{ color: '#4ade80' }}>
            Feature 03
          </p>
          <h1
            className="font-display font-semibold leading-tight"
            style={{ fontSize: 'clamp(2rem, 4vw, 3.2rem)', color: 'var(--text-primary)' }}
          >
            Deployment Readiness<br />Checker
          </h1>
          <p className="text-sm mt-3 max-w-xl" style={{ color: 'var(--text-secondary)' }}>
            Run a full pre-deployment validation across active layers, solutions, environment variables,
            connection references, and option sets to confirm the environment is ready for a Greymatter deployment.
          </p>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-6 py-10 space-y-5 animate-slide-up">

        {/* URL form */}
        <form
          onSubmit={handleRun}
          className="relative rounded-xl overflow-hidden"
          style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}
        >
          <div className="absolute top-0 left-0 right-0 h-px"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(74,222,128,0.45), transparent)' }} />

          <div className="px-6 py-6">
            <p className="text-xs font-semibold tracking-[0.22em] uppercase mb-5" style={{ color: 'var(--text-muted)' }}>
              Target Environment
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label htmlFor="readiness-url" className="block text-xs font-medium tracking-wider uppercase mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Environment URL
                </label>
                <input
                  id="readiness-url"
                  type="url"
                  placeholder="https://yourorg.crm.dynamics.com"
                  value={inputUrl}
                  onChange={e => setInputUrl(e.target.value)}
                  required
                  disabled={runState === 'running'}
                  className="w-full rounded-lg px-4 py-3 text-sm transition-all duration-200 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: 'var(--bg-elevated)',
                    border: '1px solid var(--border-mid)',
                    color: 'var(--text-primary)',
                    caretColor: '#4ade80',
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = 'rgba(74,222,128,0.4)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(34,197,94,0.08)' }}
                  onBlur={e =>  { e.currentTarget.style.borderColor = 'var(--border-mid)';    e.currentTarget.style.boxShadow = 'none' }}
                />
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={runState === 'running' || inputUrl.trim() === ''}
                  className="inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold text-white transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
                  style={{ backgroundColor: '#16a34a', boxShadow: '0 0 20px rgba(22,163,74,0.2)' }}
                  onMouseEnter={e => { if (!e.currentTarget.disabled) e.currentTarget.style.backgroundColor = '#15803d' }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#16a34a' }}
                >
                  {runState === 'running' ? (
                    <>
                      <svg className="animate-spin h-4 w-4 flex-shrink-0" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                      </svg>
                      Running Checks
                    </>
                  ) : 'Run Readiness Check'}
                </button>
              </div>
            </div>
          </div>
        </form>

        {/* Loading state — animated checklist */}
        {runState === 'running' && (
          <div
            className="rounded-xl p-6 space-y-4 animate-fade-in"
            style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}
          >
            <p className="font-display text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Running validation checks…
            </p>
            <div className="space-y-2.5">
              {CHECKS_MANIFEST.map((check, i) => {
                const done    = i < currentCheck
                const current = i === currentCheck
                return (
                  <div key={i} className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300"
                      style={done
                        ? { backgroundColor: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)' }
                        : current
                          ? { backgroundColor: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)' }
                          : { backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-mid)' }
                      }
                    >
                      {done && <span className="text-green-400 text-xs leading-none">✓</span>}
                      {current && <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: 'var(--accent-bright)' }} />}
                    </div>
                    <span
                      className="text-xs transition-colors duration-300"
                      style={{ color: done ? '#4ade80' : current ? 'var(--text-primary)' : 'var(--text-muted)' }}
                    >
                      {check.label}
                    </span>
                    <span className="text-xs ml-auto" style={{ color: 'var(--text-muted)' }}>
                      {check.category}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Error state */}
        {runState === 'error' && error && (
          <div
            className="rounded-xl px-5 py-4 text-sm animate-fade-in"
            style={{ backgroundColor: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.18)', color: '#f87171' }}
          >
            {error}
          </div>
        )}

        {/* Report */}
        {runState === 'done' && report && (
          <ReadinessReportView report={report} />
        )}

        {/* Idle state */}
        {runState === 'idle' && (
          <div
            className="rounded-xl py-16 flex flex-col items-center gap-4"
            style={{ backgroundColor: 'var(--bg-surface)', border: '1px dashed var(--border-mid)' }}
          >
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center mb-1"
              style={{ background: 'linear-gradient(135deg, var(--bg-elevated), var(--bg-surface))', border: '1px solid var(--border-mid)' }}
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.3} stroke="currentColor" style={{ color: 'var(--text-muted)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="font-display font-medium text-sm" style={{ color: 'var(--text-secondary)' }}>
              No report yet
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Enter an environment URL above and run a readiness check.
            </p>
          </div>
        )}
      </main>
    </>
  )
}
