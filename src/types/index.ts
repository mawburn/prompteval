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
}

export interface Prompt {
  id: string
  content: string
  filePath: string
}

export interface EvaluationResult {
  promptId: string
  modelName: string
  response: string
  latencyMs: number
  tokenUsage?: {
    prompt: number
    completion: number
    total: number
  }
  timestamp: string
}
