import { describe, it, expect } from 'vitest'
import { calculateTextSimilarity, SimilarityMethod } from '@src/utils/textSimilarity'

describe('TextSimilarity', () => {
  const textA = 'The quick brown fox jumps over the lazy dog'
  const textB = 'The fast brown fox leaps over the sleepy dog'
  const textC = 'Something completely different'

  const veryLongText = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(20)
  const specialCharsText = 'Special chars: !@#$%^&*()_+{}|:"<>?~`-=[]\\;\',./ABCDEF'
  const unicodeText = 'smile smile smile smile smile'

  const similarityMethods: SimilarityMethod[] = ['cosine', 'jaccard', 'levenshtein']

  describe('Basic similarity calculations', () => {
    describe.each(similarityMethods)('%s similarity', (method) => {
      it.each([
        { text1: textA, text2: textB, expectGreaterThan: 0.4, expectLessThan: 1, description: 'similar texts' },
        { text1: textA, text2: textC, expectGreaterThan: method === 'levenshtein' ? 0 : -0.01, expectLessThan: 0.3, description: 'different texts' },
        { text1: textA, text2: textA, expectGreaterThan: 0.99, expectLessThan: 1.01, description: 'identical texts' },
        { text1: '', text2: '', expectGreaterThan: 0.99, expectLessThan: 1.01, description: 'empty texts' }
      ])('should calculate similarity between $description', 
        ({ text1, text2, expectGreaterThan, expectLessThan }) => {
          const similarity = calculateTextSimilarity(text1, text2, method)
          expect(similarity).toBeGreaterThan(expectGreaterThan)
          expect(similarity).toBeLessThan(expectLessThan)
        }
      )
    })
  })

  describe('Edge cases', () => {
    it.each(similarityMethods)('should handle very long texts with %s method', (method) => {
      const similarity = calculateTextSimilarity(veryLongText, veryLongText, method)
      expect(similarity).toBeCloseTo(1, 5)
      
      const partialSimilarity = calculateTextSimilarity(
        veryLongText, 
        veryLongText.substring(0, veryLongText.length / 2) + " modified text", 
        method
      )
      expect(partialSimilarity).toBeGreaterThan(0)
      expect(partialSimilarity).toBeLessThan(1)
    })

    it.each(similarityMethods)('should handle texts with special characters using %s method', (method) => {
      const similarity = calculateTextSimilarity(specialCharsText, specialCharsText, method)
      expect(similarity).toBeCloseTo(1, 5)
    })

    it.each(similarityMethods)('should handle texts with standard characters using %s method', (method) => {
      const similarity = calculateTextSimilarity(unicodeText, unicodeText, method)
      expect(similarity).toBeCloseTo(1, 5)
    })

    it.each(similarityMethods)('should handle extremely dissimilar strings with %s method', (method) => {
      const similarity = calculateTextSimilarity('abcdefg', '1234567', method)
      expect(similarity).toBeLessThan(0.3)
    })
  })

  describe('Method-specific edge cases', () => {
    it('should handle one empty text for Levenshtein similarity', () => {
      const onlyFirstEmpty = calculateTextSimilarity('', 'non-empty text', 'levenshtein')
      const onlySecondEmpty = calculateTextSimilarity('non-empty text', '', 'levenshtein')
      
      expect(onlyFirstEmpty).toBe(0)
      expect(onlySecondEmpty).toBe(0)
    })
    
    it('should handle zero magnitude cases in cosine similarity', () => {
      expect(calculateTextSimilarity('123 456 789', '987 654 321', 'cosine')).toBeCloseTo(0, 5)
      expect(calculateTextSimilarity('', 'some text', 'cosine')).toBe(0)
      expect(calculateTextSimilarity('some text', '', 'cosine')).toBe(0)
    })
  })

  describe('Error handling', () => {
    it('should throw error for unknown similarity method', () => {
      expect(() => {
        calculateTextSimilarity(textA, textB, 'unknown' as any)
      }).toThrow('Unknown similarity method: unknown')
    })
    
    it('should handle non-string inputs gracefully', () => {
      expect(() => calculateTextSimilarity(123 as any, 'text', 'cosine')).toThrow()
      expect(() => calculateTextSimilarity('text', null as any, 'cosine')).toThrow()
    })
  })

  describe('Performance', () => {
    it.each(similarityMethods)('should calculate %s similarity efficiently', (method) => {
      const start = performance.now()
      
      for (let i = 0; i < 10; i++) {
        calculateTextSimilarity(textA, textB, method)
      }
      
      const end = performance.now()
      const duration = end - start
      
      expect(duration).toBeLessThan(100)
    })
  })
})