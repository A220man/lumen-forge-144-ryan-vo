import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import App from '../App'

// Mock the API client
vi.mock('../api/client', () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue({ status: 'ok', service: 'lumen-forge' }),
  },
}))

// Mock the auth API
vi.mock('../api/auth', () => ({
  authApi: {
    getMe: vi.fn().mockRejectedValue(new Error('Not authenticated')),
  },
}))

describe('App', () => {
  it('renders health status', async () => {
    render(<App />)
    // Initially shows loading
    expect(screen.getByText('Loading...')).toBeInTheDocument()
    // After async resolve, shows health
    await screen.findByText('ok')
    expect(screen.getByText('lumen-forge')).toBeInTheDocument()
  })

  it('shows not authenticated state', async () => {
    render(<App />)
    await waitFor(() => {
      expect(screen.getByText('Not authenticated')).toBeInTheDocument()
    })
    expect(screen.getByText('Login with Keycloak')).toBeInTheDocument()
  })
})

