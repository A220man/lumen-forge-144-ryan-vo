import '@testing-library/jest-dom'

// Mock Vite env
Object.defineProperty(import.meta, 'env', {
  value: { VITE_API_BASE: '/api' },
  writable: true,
})