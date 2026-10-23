import { useEffect, useState } from 'react'
import { apiClient } from './api/client'

interface HealthResponse {
  status: string
  service: string
}

function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchHealth() {
      try {
        const data = await apiClient.get<HealthResponse>('/api/health')
        setHealth(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }
    fetchHealth()
  }, [])

  if (loading) {
    return <div style={styles.container}>Loading...</div>
  }

  if (error) {
    return (
      <div style={styles.container}>
        <h1>Lumen Forge</h1>
        <p style={styles.error}>Error: {error}</p>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1>Lumen Forge</h1>
        <p>AI/ML Developer Tools - Video Source Management</p>
      </header>
      <main style={styles.main}>
        <section style={styles.card}>
          <h2>System Health</h2>
          {health && (
            <dl style={styles.dl}>
              <dt>Status</dt>
              <dd style={health.status === 'ok' ? styles.ok : styles.error}>{health.status}</dd>
              <dt>Service</dt>
              <dd>{health.service}</dd>
            </dl>
          )}
        </section>
      </main>
      <footer style={styles.footer}>
        <p>Ryan Vo | AI & Machine Learning</p>
      </footer>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    padding: '2rem 1rem',
    textAlign: 'center',
    backgroundColor: '#fff',
    borderBottom: '1px solid #e0e0e0',
  },
  main: {
    flex: 1,
    padding: '2rem 1rem',
    maxWidth: '800px',
    width: '100%',
    margin: '0 auto',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '1.5rem',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  dl: {
    display: 'grid',
    gridTemplateColumns: 'auto 1fr',
    gap: '0.5rem 1rem',
    marginTop: '1rem',
  },
  ok: { color: '#2e7d32', fontWeight: 500 },
  error: { color: '#c62828', fontWeight: 500 },
  footer: {
    padding: '1.5rem',
    textAlign: 'center',
    color: '#666',
    borderTop: '1px solid #e0e0e0',
    marginTop: 'auto',
  },
}

export default App