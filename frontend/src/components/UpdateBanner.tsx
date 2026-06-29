import { useEffect, useState } from 'react'

type UpdateStatus =
  | { type: 'checking' }
  | { type: 'downloading'; version: string }
  | { type: 'progress'; percent: number }
  | { type: 'ready'; version: string }
  | { type: 'current'; version: string }
  | { type: 'error'; message: string }

export default function UpdateBanner() {
  const [status, setStatus] = useState<UpdateStatus | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const vantage = (window as any).vantage
    if (!vantage) return
    vantage.onUpdateStatus((s: UpdateStatus) => {
      setStatus(s)
      if (s.type === 'current') setDismissed(true)
      else setDismissed(false)
    })
  }, [])

  if (!status || dismissed) return null
  if (status.type === 'checking' || status.type === 'current') return null

  const isReady = status.type === 'ready'
  const isError = status.type === 'error'
  const percent = status.type === 'progress' ? status.percent : null

  const bg = isReady
    ? 'rgba(16, 185, 129, 0.08)'
    : isError
    ? 'rgba(239, 68, 68, 0.08)'
    : 'rgba(99, 102, 241, 0.08)'

  const border = isReady
    ? 'rgba(16, 185, 129, 0.2)'
    : isError
    ? 'rgba(239, 68, 68, 0.2)'
    : 'rgba(99, 102, 241, 0.2)'

  const color = isReady ? '#34d399' : isError ? '#f87171' : '#818cf8'

  let message = ''
  if (status.type === 'downloading') message = `Downloading update v${status.version}…`
  else if (status.type === 'progress') message = `Downloading update… ${percent}%`
  else if (status.type === 'ready') message = `v${status.version} ready to install`
  else if (status.type === 'error') message = `Update check failed: ${status.message}`

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '6px 24px',
        backgroundColor: bg,
        borderBottom: `1px solid ${border}`,
        color,
        fontSize: '12px',
        fontWeight: 500,
        gap: 12,
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {!isReady && !isError && (
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              border: `2px solid ${color}`,
              borderTopColor: 'transparent',
              display: 'inline-block',
              animation: 'spin 0.8s linear infinite',
            }}
          />
        )}
        {message}
        {percent !== null && (
          <span
            style={{
              display: 'inline-block',
              width: 80,
              height: 4,
              borderRadius: 2,
              background: 'rgba(255,255,255,0.08)',
              overflow: 'hidden',
            }}
          >
            <span
              style={{
                display: 'block',
                height: '100%',
                width: `${percent}%`,
                background: color,
                borderRadius: 2,
                transition: 'width 0.3s ease',
              }}
            />
          </span>
        )}
      </span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {isReady && (
          <button
            onClick={() => (window as any).vantage?.installUpdate()}
            style={{
              padding: '2px 10px',
              borderRadius: 4,
              border: `1px solid ${color}`,
              background: 'transparent',
              color,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Restart Now
          </button>
        )}
        {(isError || isReady) && (
          <button
            onClick={() => setDismissed(true)}
            style={{
              padding: '2px 8px',
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: 12,
            }}
          >
            ✕
          </button>
        )}
      </span>
    </div>
  )
}
