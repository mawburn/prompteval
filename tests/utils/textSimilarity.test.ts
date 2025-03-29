import { describe, it, expect } from 'vitest'
import { calculateTextSimilarity } from '../../src/utils/textSimilarity'

describe('TextSimilarity', () => {
  const textA = 'The quick brown fox jumps over the lazy dog'
  const textB = 'The fast brown fox leaps over the sleepy dog'
  const textC = 'Something completely different'

  it('should calculate cosine similarity', () => {
    const similarity = calculateTextSimilarity(textA, textB, 'cosine')
    expect(similarity).toBeGreaterThan(0.7)
    expect(similarity).toBeLessThan(1)
    
    const differentSimilarity = calculateTextSimilarity(textA, textC, 'cosine')
    expect(differentSimilarity).toBeLessThan(0.3)
  })

  it('should calculate jaccard similarity', () => {
    const similarity = calculateTextSimilarity(textA, textB, 'jaccard')
    expect(similarity).toBeGreaterThan(0.4)
    expect(similarity).toBeLessThan(1)
    
    const differentSimilarity = calculateTextSimilarity(textA, textC, 'jaccard')
    expect(differentSimilarity).toBeLessThan(0.3)
  })

  it('should calculate levenshtein similarity', () => {
    const similarity = calculateTextSimilarity(textA, textB, 'levenshtein')
    expect(similarity).toBeGreaterThan(0.5)
    expect(similarity).toBeLessThan(1)
    
    const differentSimilarity = calculateTextSimilarity(textA, textC, 'levenshtein')
    expect(differentSimilarity).toBeLessThan(0.3)
  })

  it('should return 1 for identical texts', () => {
    const cosineSimilarity = calculateTextSimilarity(textA, textA, 'cosine')
    const jaccardSimilarity = calculateTextSimilarity(textA, textA, 'jaccard')
    const levenshteinSimilarity = calculateTextSimilarity(textA, textA, 'levenshtein')
    
    expect(cosineSimilarity).toBe(1)
    expect(jaccardSimilarity).toBe(1)
    expect(levenshteinSimilarity).toBe(1)
  })

  it('should handle empty texts', () => {
    const cosineSimilarity = calculateTextSimilarity('', '', 'cosine')
    const jaccardSimilarity = calculateTextSimilarity('', '', 'jaccard')
    const levenshteinSimilarity = calculateTextSimilarity('', '', 'levenshtein')
    
    expect(cosineSimilarity).toBe(1)
    expect(jaccardSimilarity).toBe(1)
    expect(levenshteinSimilarity).toBe(1)
  })
})