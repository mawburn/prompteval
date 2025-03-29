export function calculateJaccardSimilarity(
  text1: string,
  text2: string
): number {
  // Normalize input and split into words
  const words1 = new Set(
    text1
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(Boolean)
  )
  const words2 = new Set(
    text2
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(Boolean)
  )

  const intersection = new Set([...words1].filter(x => words2.has(x)))
  const union = new Set([...words1, ...words2])

  return union.size === 0 ? 1 : intersection.size / union.size
}

export function calculateCosineSimilarity(
  text1: string,
  text2: string
): number {
  // Normalize and tokenize
  const tokens1 = text1
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(Boolean)
  const tokens2 = text2
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(Boolean)

  // Create term frequency vectors
  const allTokens = new Set([...tokens1, ...tokens2])
  const vector1: Record<string, number> = {}
  const vector2: Record<string, number> = {}

  // Calculate term frequencies
  for (const token of tokens1) {
    vector1[token] = (vector1[token] || 0) + 1
  }
  for (const token of tokens2) {
    vector2[token] = (vector2[token] || 0) + 1
  }

  // Calculate dot product
  let dotProduct = 0
  let magnitude1 = 0
  let magnitude2 = 0

  for (const token of allTokens) {
    const freq1 = vector1[token] || 0
    const freq2 = vector2[token] || 0

    dotProduct += freq1 * freq2
    magnitude1 += freq1 * freq1
    magnitude2 += freq2 * freq2
  }

  magnitude1 = Math.sqrt(magnitude1)
  magnitude2 = Math.sqrt(magnitude2)

  // Avoid division by zero
  if (magnitude1 === 0 || magnitude2 === 0) {
    return magnitude1 === magnitude2 ? 1 : 0
  }

  // Return cosine similarity
  return dotProduct / (magnitude1 * magnitude2)
}

function calculateLevenshteinDistance(text1: string, text2: string): number {
  const m = text1.length
  const n = text2.length

  // Create a matrix of size (m+1) x (n+1)
  const d: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0))

  // Initialize first row and column
  for (let i = 0; i <= m; i++) {
    d[i][0] = i
  }
  for (let j = 0; j <= n; j++) {
    d[0][j] = j
  }

  // Fill the matrix
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = text1[i - 1] === text2[j - 1] ? 0 : 1
      d[i][j] = Math.min(
        d[i - 1][j] + 1, // deletion
        d[i][j - 1] + 1, // insertion
        d[i - 1][j - 1] + cost // substitution
      )
    }
  }

  return d[m][n]
}

export function calculateLevenshteinSimilarity(
  text1: string,
  text2: string
): number {
  if (text1 === text2) return 1
  if (text1.length === 0 || text2.length === 0) return 0

  const distance = calculateLevenshteinDistance(text1, text2)
  const maxLength = Math.max(text1.length, text2.length)

  // Normalize to get a similarity score
  return 1 - distance / maxLength
}

export type SimilarityMethod = 'jaccard' | 'cosine' | 'levenshtein'

export function calculateTextSimilarity(
  text1: string,
  text2: string,
  method: SimilarityMethod = 'cosine'
): number {
  switch (method) {
    case 'jaccard':
      return calculateJaccardSimilarity(text1, text2)
    case 'cosine':
      return calculateCosineSimilarity(text1, text2)
    case 'levenshtein':
      return calculateLevenshteinSimilarity(text1, text2)
    default:
      throw new Error(`Unknown similarity method: ${method}`)
  }
}
