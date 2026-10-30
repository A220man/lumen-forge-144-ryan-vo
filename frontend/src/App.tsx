import { useEffect, useState } from 'react'
import { apiClient } from './api/client'
import { authApi, UserInfo } from './api/auth'

interface HealthResponse {
  status: string
  service: string
}

function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [user, setUser] = useState<UserInfo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [authLoading, setAuthLoading] = useState(true)

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

  useEffect(() => {
    async function checkAuth() {
      try {
        const userData = await authApi.getMe()
        setUser(userData)
      } catch {
        // Not authenticated, that's fine
      } finally {
        setAuthLoading(false)
      }
    }
    checkAuth()
  }, [])

  const handleLogin = () => {
    authApi.login()
  }

  const handleLogout = async () => {
    try {
      await authApi.logout()
      setUser(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Logout failed')
    }
  }

  if (loading || authLoading) {
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

        <section style={styles.card}>
          <h2>Authentication</h2>
          {user ? (
            <div>
              <dl style={styles.dl}>
                <dt>User</dt>
                <dd>{user.preferred_username}</dd>
                <dt>Email</dt>
                <dd>{user.email || 'N/A'}</dd>
                <dt>Name</dt>
                <dd>{user.name || 'N/A'}</dd>
                <dt>Roles</dt>
                <dd>{user.roles.join(', ') || 'None'}</dd>
              </dl>
              <button onClick={handleLogout} style={styles.button}>Logout</button>
            </div>
          ) : (
            <div>
              <p>Not authenticated</p>
              <button onClick={handleLogin} style={styles.button}>Login with Keycloak</button>
            </div>
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
  button: {
    marginTop: '1rem',
    padding: '0.75rem 1.5rem',
    backgroundColor: '#1976d2',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '1rem',
  },
}

export default App

