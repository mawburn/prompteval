import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CustomLLMClient } from '../src/llm'
import { ModelConfig } from '../src/types'

vi.mock('openai', () => {
  return {
    OpenAI: vi.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: vi.fn().mockResolvedValue({
            choices: [
              {
                message: {
                  content: 'This is a mock response',
                },
              },
            ],
          }),
        },
      },
    })),
  }
})

vi.mock('js-tiktoken', () => {
  return {
    getEncoding: vi.fn().mockImplementation(() => ({
      encode: (text: string) => Array(Math.ceil(text.length / 4)).fill(0),
    })),
  }
})

describe('CustomLLMClient', () => {
  let modelConfig: ModelConfig
  let llmClient: CustomLLMClient

  beforeEach(() => {
    modelConfig = {
      name: 'test-model',
      provider: 'openai',
      modelName: 'gpt-4',
      temperature: 0.7,
      maxTokens: 1000,
      apiKey: 'test-api-key',
    }

    llmClient = new CustomLLMClient(modelConfig)
  })

  it('should create a client with the provided config', () => {
    expect(llmClient).toBeDefined()
  })

  it('should invoke the model and return a response with token usage', async () => {
    const messages = [{ content: 'Hello, world! This is a test prompt.' }]
    
    const response = await llmClient.invoke(messages)
    
    expect(response).toHaveProperty('content')
    expect(response).toHaveProperty('tokenUsage')
    expect(response.tokenUsage).toHaveProperty('prompt')
    expect(response.tokenUsage).toHaveProperty('response')
    
    expect(response.tokenUsage.prompt).toBeGreaterThan(0)
    expect(response.tokenUsage.response).toBeGreaterThan(0)
    
    expect(response.content).toBe('This is a mock response')
  })
})