import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom'
import { apiClient } from './api/client'
import { authApi, UserInfo } from './api/auth'
import Callback from './Callback'
import { SourcesPage } from './Sources'

interface HealthResponse {
  status: string
  service: string
}

function Navigation({ user, onLogout }: { user: UserInfo | null; onLogout: () => void }) {
  const location = useLocation()
  
  return (
    <nav style={styles.nav}>
      <Link to="/" style={styles.navLink}>Home</Link>
      {user && <Link to="/sources" style={styles.navLink}>Sources</Link>}
      <div style={{ marginLeft: 'auto', display: 'flex', gap: '1rem', alignItems: 'center' }}>
        {user ? (
          <span style={styles.userInfo}>{user.preferred_username}</span>
        ) : (
          ''
        )}
        {user ? (
          <button onClick={onLogout} style={styles.navButton}>Logout</button>
        ) : (
          <Link to="/login" style={styles.navButton}>Login</Link>
        )}
      </div>
    </nav>
  )
}

function AppContent() {
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
      const result = await authApi.logout()
      setUser(null)
      // Redirect to Keycloak logout
      window.location.href = result.logout_url
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
      <Navigation user={user} onLogout={handleLogout} />
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

function SourcesWrapper() {
  const [user, setUser] = useState<UserInfo | null>(null)
  const [authLoading, setAuthLoading] = useState(true)

  useEffect(() => {
    async function checkAuth() {
      try {
        const userData = await authApi.getMe()
        setUser(userData)
      } catch {
        // Not authenticated
      } finally {
        setAuthLoading(false)
      }
    }
    checkAuth()
  }, [])

  const handleLogout = async () => {
    try {
      const result = await authApi.logout()
      setUser(null)
      window.location.href = result.logout_url
    } catch (err) {
      console.error('Logout failed:', err)
    }
  }

  if (authLoading) {
    return <div style={styles.container}>Loading...</div>
  }

  if (!user) {
    return (
      <div style={styles.container}>
        <Navigation user={null} onLogout={handleLogout} />
        <div style={styles.card}>
          <h2>Authentication Required</h2>
          <p>Please log in to access video sources.</p>
          <button onClick={handleLogin} style={styles.button}>Login with Keycloak</button>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <Navigation user={user} onLogout={handleLogout} />
      <SourcesPage onBack={() => window.history.back()} />
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppContent />} />
        <Route path="/callback" element={<Callback />} />
        <Route path="/sources" element={<SourcesWrapper />} />
        <Route path="/login" element={<AppContent />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
  },
  nav: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '1rem 2rem',
    backgroundColor: '#fff',
    borderBottom: '1px solid #e0e0e0',
  },
  navLink: {
    color: '#1976d2',
    textDecoration: 'none',
    fontWeight: 500,
    padding: '0.5rem 0',
  },
  navButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#1976d2',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    textDecoration: 'none',
  },
  userInfo: {
    color: '#666',
    fontSize: '0.9rem',
  },
  main: {
    flex: 1,
    padding: '2rem 1rem',
    maxWidth: '1200px',
    width: '100%',
    margin: '0 auto',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '1.5rem',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    marginBottom: '1.5rem',
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
