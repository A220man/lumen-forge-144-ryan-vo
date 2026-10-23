import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import App from '../App'

// Mock the API client
vi.mock('../api/client', () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue({ status: 'ok', service: 'lumen-forge' }),
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
})