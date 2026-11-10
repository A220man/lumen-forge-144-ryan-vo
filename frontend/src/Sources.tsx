import { useEffect, useState } from 'react'
import { sourcesApi, Source, SourceCreate, SourceList, SourceType } from './api/sources'

interface SourcesPageProps {
  onBack: () => void
}

const SOURCE_TYPES: SourceType[] = ['hls', 'dash', 'mp4', 'other']

export function SourcesPage({ onBack }: SourcesPageProps) {
  const [sources, setSources] = useState<Source[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingSource, setEditingSource] = useState<Source | null>(null)
  const [formData, setFormData] = useState<SourceCreate>({
    name: '',
    url: '',
    type: 'other',
    category: '',
    description: '',
    poster_url: '',
    enabled: true,
  })
  const [pagination, setPagination] = useState({ page: 1, page_size: 20, total: 0, total_pages: 0 })
  const [filters, setFilters] = useState({ category: '', search: '' })
  const [categories, setCategories] = useState<string[]>([])

  useEffect(() => {
    fetchSources()
    fetchCategories()
  }, [pagination.page, filters])

  async function fetchSources() {
    try {
      setLoading(true)
      const data = await sourcesApi.list({
        page: pagination.page,
        page_size: pagination.page_size,
        category: filters.category || undefined,
        search: filters.search || undefined,
      })
      setSources(data.items)
      setPagination(prev => ({
        ...prev,
        total: data.total,
        total_pages: data.total_pages,
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch sources')
    } finally {
      setLoading(false)
    }
  }

  async function fetchCategories() {
    try {
      const data = await sourcesApi.getCategories()
      setCategories(data)
    } catch {
      // Ignore category fetch errors
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      if (editingSource) {
        await sourcesApi.update(editingSource.id, formData)
      } else {
        await sourcesApi.create(formData)
      }
      setShowForm(false)
      setEditingSource(null)
      resetForm()
      fetchSources()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save source')
    }
  }

  async function handleEdit(source: Source) {
    setEditingSource(source)
    setFormData({
      name: source.name,
      url: source.url,
      type: source.type,
      category: source.category || '',
      description: source.description || '',
      poster_url: source.poster_url || '',
      enabled: source.enabled,
    })
    setShowForm(true)
  }

  async function handleDelete(id: number) {
    if (!confirm('Are you sure you want to delete this source?')) return
    try {
      await sourcesApi.delete(id)
      fetchSources()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete source')
    }
  }

  async function handleTest(id: number) {
    try {
      const result = await sourcesApi.test(id)
      alert(result.success ? 'Source test passed!' : `Source test failed: ${result.error}`)
      fetchSources()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to test source')
    }
  }

  function resetForm() {
    setFormData({
      name: '',
      url: '',
      type: 'other',
      category: '',
      description: '',
      poster_url: '',
      enabled: true,
    })
  }

  function handleNewSource() {
    setEditingSource(null)
    resetForm()
    setShowForm(true)
  }

  if (loading && sources.length === 0) {
    return <div style={styles.container}>Loading...</div>
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <button onClick={onBack} style={styles.backButton}>← Back</button>
        <h1>Video Sources</h1>
        <button onClick={handleNewSource} style={styles.primaryButton}>Add Source</button>
      </header>

      {error && <div style={styles.error}>{error}</div>}

      {!showForm ? (
        <div>
          <div style={styles.filters}>
            <input
              type="text"
              placeholder="Search sources..."
              value={filters.search}
              onChange={e => setFilters(prev => ({ ...prev, search: e.target.value }))}
              style={styles.searchInput}
            />
            <select
              value={filters.category}
              onChange={e => setFilters(prev => ({ ...prev, category: e.target.value }))}
              style={styles.select}
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Name</th>
                <th style={styles.th}>Type</th>
                <th style={styles.th}>Category</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Last Tested</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sources.map(source => (
                <tr key={source.id} style={styles.tr}>
                  <td style={styles.td}>
                    <strong>{source.name}</strong>
                    {source.description && <br />}
                    <small style={styles.muted}>{source.url}</small>
                  </td>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.badge,
                      backgroundColor: source.type === 'hls' ? '#e3f2fd' :
                                       source.type === 'dash' ? '#f3e5f5' :
                                       source.type === 'mp4' ? '#e8f5e9' : '#fff3e0',
                    }}>
                      {source.type.toUpperCase()}
                    </span>
                  </td>
                  <td style={styles.td}>{source.category || '-'}</td>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.badge,
                      backgroundColor: source.enabled ? '#e8f5e9' : '#ffebee',
                      color: source.enabled ? '#2e7d32' : '#c62828',
                    }}>
                      {source.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                    {source.last_status && (
                      <span style={styles.muted}> (HTTP {source.last_status})</span>
                    )}
                  </td>
                  <td style={styles.td}>
                    {source.last_tested ? new Date(source.last_tested).toLocaleString() : 'Never'}
                  </td>
                  <td style={styles.td}>
                    <div style={styles.actions}>
                      <button onClick={() => handleEdit(source)} style={styles.button}>Edit</button>
                      <button onClick={() => handleTest(source.id)} style={{...styles.button, backgroundColor: '#1976d2'}}>Test</button>
                      <button onClick={() => handleDelete(source.id)} style={{...styles.button, backgroundColor: '#c62828'}}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
              {sources.length === 0 && (
                <tr>
                  <td colSpan={6} style={{...styles.td, textAlign: 'center', color: '#666'}}>
                    No sources found. Click "Add Source" to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {pagination.total_pages > 1 && (
            <div style={styles.pagination}>
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page === 1}
                style={styles.pageButton}
              >
                Previous
              </button>
              <span style={styles.pageInfo}>
                Page {pagination.page} of {pagination.total_pages} ({pagination.total} total)
              </span>
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page === pagination.total_pages}
                style={styles.pageButton}
              >
                Next
              </button>
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={styles.form}>
          <h2>{editingSource ? 'Edit Source' : 'Add Source'}</h2>
          
          <div style={styles.formGroup}>
            <label htmlFor="name" style={styles.label}>Name *</label>
            <input
              id="name"
              type="text"
              value={formData.name}
              onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
              style={styles.input}
            />
          </div>

          <div style={styles.formGroup}>
            <label htmlFor="url" style={styles.label}>URL *</label>
            <input
              id="url"
              type="url"
              value={formData.url}
              onChange={e => setFormData(prev => ({ ...prev, url: e.target.value }))}
              required
              placeholder="https://example.com/video.m3u8"
              style={styles.input}
            />
          </div>

          <div style={styles.formGroup}>
            <label htmlFor="type" style={styles.label}>Type</label>
            <select
              id="type"
              value={formData.type}
              onChange={e => setFormData(prev => ({ ...prev, type: e.target.value as SourceType }))}
              style={styles.select}
            >
              {SOURCE_TYPES.map(t => (
                <option key={t} value={t}>{t.toUpperCase()}</option>
              ))}
            </select>
          </div>

          <div style={styles.formGroup}>
            <label htmlFor="category" style={styles.label}>Category</label>
            <input
              id="category"
              type="text"
              value={formData.category}
              onChange={e => setFormData(prev => ({ ...prev, category: e.target.value }))}
              list="categories"
              placeholder="e.g., movies, sports, news"
              style={styles.input}
            />
            <datalist id="categories">
              {categories.map(cat => <option key={cat} value={cat} />)}
            </datalist>
          </div>

          <div style={styles.formGroup}>
            <label htmlFor="description" style={styles.label}>Description</label>
            <textarea
              id="description"
              value={formData.description}
              onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              style={styles.textarea}
            />
          </div>

          <div style={styles.formGroup}>
            <label htmlFor="poster_url" style={styles.label}>Poster URL</label>
            <input
              id="poster_url"
              type="url"
              value={formData.poster_url}
              onChange={e => setFormData(prev => ({ ...prev, poster_url: e.target.value }))}
              placeholder="https://example.com/poster.jpg"
              style={styles.input}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={formData.enabled}
                onChange={e => setFormData(prev => ({ ...prev, enabled: e.target.checked }))}
                style={styles.checkbox}
              />
              <span>Enabled</span>
            </label>
          </div>

          <div style={styles.formActions}>
            <button type="button" onClick={() => { setShowForm(false); setEditingSource(null); }} style={styles.secondaryButton}>Cancel</button>
            <button type="submit" style={styles.primaryButton}>{editingSource ? 'Update' : 'Create'}</button>
          </div>
        </form>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#f5f5f5',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '1.5rem 2rem',
    backgroundColor: '#fff',
    borderBottom: '1px solid #e0e0e0',
  },
  backButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#f5f5f5',
    border: '1px solid #ddd',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  primaryButton: {
    marginLeft: 'auto',
    padding: '0.5rem 1.5rem',
    backgroundColor: '#1976d2',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  secondaryButton: {
    padding: '0.5rem 1.5rem',
    backgroundColor: '#fff',
    color: '#1976d2',
    border: '1px solid #1976d2',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  error: {
    padding: '1rem',
    margin: '1rem',
    backgroundColor: '#ffebee',
    color: '#c62828',
    borderRadius: '4px',
  },
  filters: {
    display: 'flex',
    gap: '1rem',
    padding: '1rem 2rem',
    backgroundColor: '#fff',
    borderBottom: '1px solid #e0e0e0',
  },
  searchInput: {
    flex: 1,
    maxWidth: '400px',
    padding: '0.5rem',
    border: '1px solid #ddd',
    borderRadius: '4px',
  },
  select: {
    padding: '0.5rem',
    border: '1px solid #ddd',
    borderRadius: '4px',
    minWidth: '200px',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    backgroundColor: '#fff',
  },
  th: {
    padding: '1rem',
    textAlign: 'left',
    borderBottom: '2px solid #e0e0e0',
    fontWeight: 600,
    color: '#333',
  },
  td: {
    padding: '1rem',
    borderBottom: '1px solid #e0e0e0',
    color: '#333',
  },
  tr: {},
  muted: {
    color: '#999',
    fontSize: '0.85rem',
  },
  badge: {
    padding: '0.25rem 0.5rem',
    borderRadius: '4px',
    fontSize: '0.75rem',
    fontWeight: 500,
  },
  actions: {
    display: 'flex',
    gap: '0.5rem',
  },
  button: {
    padding: '0.4rem 0.8rem',
    border: 'none',
    borderRadius: '4px',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '0.85rem',
  },
  pagination: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '1rem',
    padding: '1rem',
  },
  pageButton: {
    padding: '0.5rem 1rem',
    border: '1px solid #ddd',
    backgroundColor: '#fff',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  pageInfo: {
    color: '#666',
  },
  form: {
    flex: 1,
    padding: '2rem',
    maxWidth: '600px',
    margin: '0 auto',
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  formGroup: {
    marginBottom: '1.5rem',
  },
  label: {
    display: 'block',
    marginBottom: '0.5rem',
    fontWeight: 500,
    color: '#333',
  },
  input: {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '1rem',
    boxSizing: 'border-box',
  },
  textarea: {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '1rem',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
    resize: 'vertical',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    cursor: 'pointer',
  },
  checkbox: {
    width: '18px',
    height: '18px',
  },
  formActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '1rem',
    marginTop: '2rem',
  },
}
