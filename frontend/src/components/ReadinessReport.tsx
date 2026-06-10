import { useState } from 'react'
import { ReadinessReport, ReadinessCheck, CheckCategory } from '../types'

// ── Status helpers ────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  pass: { color: '#4ade80', bg: 'rgba(34,197,94,0.07)',  border: 'rgba(34,197,94,0.2)',  label: 'Pass' },
  warn: { color: '#fbbf24', bg: 'rgba(245,158,11,0.07)', border: 'rgba(245,158,11,0.2)', label: 'Warn' },
  fail: { color: '#f87171', bg: 'rgba(239,68,68,0.07)',  border: 'rgba(239,68,68,0.2)',  label: 'Fail' },
  skip: { color: '#6b7280', bg: 'rgba(107,114,128,0.07)',border: 'rgba(107,114,128,0.2)',label: 'Skip' },
}

const OVERALL_CONFIG = {
  'READY':     { color: '#4ade80', bg: 'rgba(34,197,94,0.06)',  border: 'rgba(34,197,94,0.2)',  glow: 'rgba(34,197,94,0.12)' },
  'WARNINGS':  { color: '#fbbf24', bg: 'rgba(245,158,11,0.06)', border: 'rgba(245,158,11,0.2)', glow: 'rgba(245,158,11,0.1)' },
  'NOT READY': { color: '#f87171', bg: 'rgba(239,68,68,0.06)',  border: 'rgba(239,68,68,0.2)',  glow: 'rgba(239,68,68,0.1)' },
}

const CATEGORY_ORDER: CheckCategory[] = [
  'Active Layer', 'Flows', 'Solutions', 'Environment Variables', 'Connection References', 'Option Sets',
]

const CATEGORY_ICONS: Record<CheckCategory, React.ReactNode> = {
  'Active Layer': (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803 7.5 7.5 0 0016.803 15.803z" />
    </svg>
  ),
  'Flows': (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
    </svg>
  ),
  'Solutions': (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
    </svg>
  ),
  'Environment Variables': (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
    </svg>
  ),
  'Connection References': (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
    </svg>
  ),
  'Option Sets': (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  ),
}

// ── Sub-components ────────────────────────────────────────────────────────

function StatusIcon({ status }: { status: ReadinessCheck['status'] }) {
  const c = STATUS_CONFIG[status]
  if (status === 'pass') return (
    <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
      style={{ backgroundColor: c.bg, border: `1px solid ${c.border}`, color: c.color }}>✓</span>
  )
  if (status === 'fail') return (
    <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
      style={{ backgroundColor: c.bg, border: `1px solid ${c.border}`, color: c.color }}>✗</span>
  )
  if (status === 'warn') return (
    <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
      style={{ backgroundColor: c.bg, border: `1px solid ${c.border}`, color: c.color }}>!</span>
  )
  return (
    <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
      style={{ backgroundColor: c.bg, border: `1px solid ${c.border}`, color: c.color }}>–</span>
  )
}

function CheckRow({ check }: { check: ReadinessCheck }) {
  const [open, setOpen] = useState(false)
  const hasExtra = (check.details && check.details.length > 0) || check.remediation
  const c = STATUS_CONFIG[check.status]

  return (
    <div style={{ borderBottom: '1px solid var(--border)' }}>
      <div
        className="flex items-start gap-3 px-5 py-3.5 transition-colors duration-75"
        style={{ cursor: hasExtra ? 'pointer' : 'default' }}
        onClick={() => hasExtra && setOpen(v => !v)}
        onMouseEnter={e => hasExtra && (e.currentTarget.style.backgroundColor = 'var(--bg-elevated)')}
        onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
      >
        <StatusIcon status={check.status} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {check.name}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full"
              style={{ backgroundColor: c.bg, border: `1px solid ${c.border}`, color: c.color }}>
              {c.label}
            </span>
          </div>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            {check.message}
          </p>
        </div>
        {hasExtra && (
          <svg
            className="w-4 h-4 flex-shrink-0 mt-0.5 transition-transform duration-200"
            style={{ color: 'var(--text-muted)', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
            fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        )}
      </div>

      {open && hasExtra && (
        <div className="px-5 pb-4 space-y-3" style={{ backgroundColor: 'var(--bg-elevated)' }}>
          {check.details && check.details.length > 0 && (
            <div>
              <p className="text-xs font-semibold tracking-wider uppercase mb-2" style={{ color: 'var(--text-muted)' }}>
                Details
              </p>
              <ul className="space-y-1">
                {check.details.map((d, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                    <span className="mt-1 flex-shrink-0 w-1 h-1 rounded-full" style={{ backgroundColor: c.color }} />
                    {d}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {check.remediation && (
            <div
              className="rounded-lg px-4 py-3 text-xs"
              style={{ backgroundColor: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)', color: 'var(--accent-bright)' }}
            >
              <span className="font-semibold">Remediation: </span>{check.remediation}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function CategorySection({ category, checks }: { category: CheckCategory; checks: ReadinessCheck[] }) {
  const worstStatus = checks.some(c => c.status === 'fail') ? 'fail'
    : checks.some(c => c.status === 'warn') ? 'warn'
    : checks.some(c => c.status === 'skip') ? 'skip'
    : 'pass'

  const c = STATUS_CONFIG[worstStatus]

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
      {/* Category header */}
      <div
        className="flex items-center justify-between px-5 py-3"
        style={{ backgroundColor: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-2.5">
          <span style={{ color: c.color }}>{CATEGORY_ICONS[category]}</span>
          <span className="font-display font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
            {category}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {checks.map((ch, i) => (
            <span
              key={i}
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: STATUS_CONFIG[ch.status].color, boxShadow: `0 0 4px ${STATUS_CONFIG[ch.status].color}60` }}
              title={`${ch.name}: ${ch.status}`}
            />
          ))}
        </div>
      </div>

      {/* Check rows */}
      <div style={{ backgroundColor: 'var(--bg-surface)' }}>
        {checks.map((check, i) => <CheckRow key={i} check={check} />)}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────

export default function ReadinessReportView({ report }: { report: ReadinessReport }) {
  const overall = OVERALL_CONFIG[report.overallStatus]

  const checksByCategory = CATEGORY_ORDER.reduce<Partial<Record<CheckCategory, ReadinessCheck[]>>>(
    (acc, cat) => {
      const cats = report.checks.filter(c => c.category === cat)
      if (cats.length > 0) acc[cat] = cats
      return acc
    },
    {}
  )

  return (
    <div className="space-y-5 animate-slide-up">

      {/* Overall status banner */}
      <div
        className="relative rounded-xl overflow-hidden p-6"
        style={{ backgroundColor: overall.bg, border: `1px solid ${overall.border}`, boxShadow: `0 0 40px ${overall.glow}` }}
      >
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div>
            <p className="text-xs font-semibold tracking-[0.25em] uppercase mb-2" style={{ color: overall.color, opacity: 0.7 }}>
              Deployment Readiness
            </p>
            <h2 className="font-display font-bold" style={{ fontSize: '2.2rem', color: overall.color, lineHeight: 1 }}>
              {report.overallStatus}
            </h2>
            <p className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>
              {new Date(report.timestamp).toLocaleString()} · {report.environment}
            </p>
          </div>

          {/* Stat pills */}
          <div className="flex gap-4">
            {[
              { label: 'Passed',   value: report.passed,   color: '#4ade80' },
              { label: 'Warnings', value: report.warnings, color: '#fbbf24' },
              { label: 'Failures', value: report.failures, color: '#f87171' },
              ...(report.skipped > 0 ? [{ label: 'Skipped', value: report.skipped, color: '#6b7280' }] : []),
            ].map(s => (
              <div key={s.label} className="text-center">
                <p className="font-display font-bold text-2xl leading-none" style={{ color: s.color }}>
                  {s.value}
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Category sections */}
      {CATEGORY_ORDER.map(cat =>
        checksByCategory[cat] ? (
          <CategorySection key={cat} category={cat} checks={checksByCategory[cat]!} />
        ) : null
      )}
    </div>
  )
}
