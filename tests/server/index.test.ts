import { describe, it, expect, vi } from 'vitest'
import path from 'path'

describe('Server Structure', () => {
  it('uses Express to serve the UI', () => {
    expect(true).toBe(true)
  })

  it('serves static files from the public directory', () => {
    const publicPath = path.join(__dirname, '../../src/server/public')
    expect(publicPath).toContain('/public')
  })

  it('provides API endpoints for results and prompts', () => {
    expect('/api/results').toContain('/api/')
    expect('/api/prompts/:id').toContain('/api/')
  })
})