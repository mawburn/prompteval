import { describe, it, expect } from 'vitest'
import { generateId } from '@src/utils/id'

describe('ID Generator', () => {
  it('should generate a string ID', () => {
    const id = generateId()
    expect(typeof id).toBe('string')
  })

  it.each([
    { count: 3, description: 'a few' },
    { count: 10, description: 'several' },
    { count: 20, description: 'many' }
  ])('should generate $description IDs of consistent length and uniqueness', ({ count }) => {
    const ids = Array(count).fill(0).map(() => generateId())
    
    const length = ids[0].length
    ids.forEach(id => {
      expect(id.length).toBe(length)
    })
    
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(count)
  })

  it('should generate IDs with good distribution properties', () => {
    const sampleSize = 50
    const ids = Array(sampleSize).fill(0).map(() => generateId())
    
    const positions = Array(ids[0].length).fill(0).map(() => new Set())
    
    for (const id of ids) {
      for (let i = 0; i < id.length; i++) {
        positions[i].add(id[i])
      }
    }
    
    for (const positionChars of positions) {
      expect(positionChars.size).toBeGreaterThan(3)
    }
    
    const uniqueCount = new Set(ids).size
    expect(uniqueCount / sampleSize).toBeGreaterThan(0.95)
  })
  
  it('should handle edge cases gracefully', () => {
    expect(() => generateId()).not.toThrow()
    
    const repeatedGeneration = () => {
      for (let i = 0; i < 100; i++) {
        generateId()
      }
    }
    
    expect(repeatedGeneration).not.toThrow()
  })
  
  it('should not generate IDs with invalid characters', () => {
    const sampleSize = 50
    const invalidChars = /[^a-zA-Z0-9]/
    
    for (let i = 0; i < sampleSize; i++) {
      const id = generateId()
      expect(id).not.toMatch(invalidChars)
    }
  })
})