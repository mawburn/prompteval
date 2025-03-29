import { describe, it, expect } from 'vitest'
import { generateId } from '../../src/utils/id'

describe('ID Generator', () => {
  it('should generate a string ID', () => {
    const id = generateId()
    expect(typeof id).toBe('string')
  })

  it('should generate unique IDs', () => {
    const id1 = generateId()
    const id2 = generateId()
    const id3 = generateId()
    
    expect(id1).not.toBe(id2)
    expect(id1).not.toBe(id3)
    expect(id2).not.toBe(id3)
  })

  it('should generate IDs of consistent length', () => {
    const ids = Array(10).fill(null).map(() => generateId())
    const lengths = new Set(ids.map(id => id.length))
    
    expect(lengths.size).toBe(1)
  })
})