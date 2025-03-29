export interface AppConfig {
  promptsDir: string
  outputDir: string
  models: ModelConfig[]
  evaluationParams: EvaluationParams
}

export interface ModelConfig {
  name: string
  provider: 'openai' | 'anthropic' | 'other'
  modelName: string
  temperature: number
  maxTokens?: number
  apiKey?: string
  proxyUrl?: string
}

export interface EvaluationParams {
  repeatCount: number
  concurrency: number
  timeoutSeconds: number
  compareSimilarity?: boolean
  similarityMethod?: 'jaccard' | 'cosine' | 'levenshtein'
}

export interface Prompt {
  id: string
  content: string
  filePath: string
}

export interface EvaluationResult {
  id: string
  promptId: string
  modelName: string
  response: string
  latencyMs: number
  temperature?: number
  tokenUsage?: {
    prompt: number
    response: number
  }
  timestamp: string
}

export interface SimilarityScore {
  cosine: number
  jaccard: number
  levenshtein: number
  average: number
  [key: string]: number // Allow indexing with a string key
}

export interface SimilarityMatrix {
  comparisons: {
    [resultId: string]: SimilarityScore
  }
}
