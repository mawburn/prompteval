import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest'
import { CustomLLMClient, createLLMClient } from '@src/llm'
import { ModelConfig } from '@src/types'
import { mockConsole, mockTiktokenModule, getStandardModelConfig } from './__mocks__/testHelpers'

const createCompletionMock = vi.fn()

beforeAll(() => {
  vi.mock('openai', () => {
    return {
      OpenAI: vi.fn().mockImplementation(() => ({
        chat: {
          completions: {
            create: createCompletionMock,
          },
        },
      })),
    }
  })

  mockTiktokenModule()
})

describe('CustomLLMClient', () => {
  const { consoleLogSpy, consoleErrorSpy } = mockConsole()
  const defaultModelConfig = getStandardModelConfig()
  let modelConfig: ModelConfig
  let llmClient: CustomLLMClient
  
  beforeEach(() => {
    createCompletionMock.mockImplementation(() => {
      return Promise.resolve({
        choices: [
          {
            message: {
              content: 'This is a mock response',
            },
          },
        ],
      })
    })
    
    modelConfig = getStandardModelConfig()
    llmClient = new CustomLLMClient(modelConfig)
    createCompletionMock.mockClear()
    consoleErrorSpy.mockClear()
    consoleLogSpy.mockClear()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should create a client with the provided config', () => {
    const client = new CustomLLMClient(modelConfig)
    expect(client).toBeInstanceOf(CustomLLMClient)
  })

  it('should handle URL path cleanup correctly', () => {
    const configWithChatPath: ModelConfig = {
      ...defaultModelConfig,
      proxyUrl: 'https://example.com/chat/completions'
    }
    
    new CustomLLMClient(configWithChatPath)
    expect(consoleLogSpy).toHaveBeenCalledWith('Adjusted base URL: https://example.com')
  })

  it.each([
    { 
      config: { ...defaultModelConfig, proxyUrl: 'https://proxy.example.com' },
      expectedBaseURL: 'https://proxy.example.com'
    },
    { 
      config: { ...defaultModelConfig, proxyUrl: undefined },
      expectedBaseURL: undefined
    },
    { 
      config: { ...defaultModelConfig, proxyUrl: '' },
      expectedBaseURL: undefined
    }
  ])('should handle different proxy URL scenarios', ({ config, expectedBaseURL }) => {
    new CustomLLMClient(config)
    
    if (config.proxyUrl) {
      expect(consoleLogSpy).toHaveBeenCalledWith(`Adjusted base URL: ${expectedBaseURL}`)
    }
    
    consoleLogSpy.mockClear()
  })

  it('should invoke the model and return a response with token usage', async () => {
    const messages = [{ content: 'Hello, world! This is a test prompt.' }]
    
    const response = await llmClient.invoke(messages)
    
    expect(createCompletionMock).toHaveBeenCalledWith({
      model: 'gpt-4',
      messages: [{ role: 'user', content: 'Hello, world! This is a test prompt.' }],
      temperature: 0.7,
      max_tokens: 1000,
      user: expect.stringContaining('bypass_cache_'),
    })
    
    expect(response.content).toBe('This is a mock response')
    expect(response.tokenUsage).toEqual({
      prompt: expect.any(Number),
      response: expect.any(Number),
    })
    expect(response.tokenUsage.prompt).toBeGreaterThan(0)
    expect(response.tokenUsage.response).toBeGreaterThan(0)
  })
  
  it('should handle undefined response content gracefully', async () => {
    createCompletionMock.mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: undefined,
          },
        },
      ],
    })
    
    const messages = [{ content: 'Test prompt with undefined response' }]
    const response = await llmClient.invoke(messages)
    
    expect(response.content).toBe('')
    expect(response.tokenUsage.response).toBe(0)
  })

  describe('Error handling', () => {
    it.each([
      { name: 'RateLimitError', message: 'Rate limit exceeded' },
      { name: 'AuthenticationError', message: 'Invalid API key' },
      { name: 'APIConnectionError', message: 'Network error' },
    ])('should handle $name API error', async ({ message }) => {
      createCompletionMock.mockRejectedValueOnce(new Error(message))
  
      await expect(llmClient.invoke([{ content: 'Test prompt' }]))
        .rejects.toThrow(message)
  
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error in custom LLM client:',
        expect.any(Error)
      )
  
      consoleErrorSpy.mockClear()
      createCompletionMock.mockClear()
    })
  })
  
  describe('Edge cases', () => {
    it.each([
      { content: '' },
      { content: 'a'.repeat(100) },
      { content: '!@#$%^&*()_+{}|:"<>?' },
    ])('should handle edge case message: "$content"', async ({ content }) => {
      createCompletionMock.mockClear()
      const response = await llmClient.invoke([{ content }])
      
      expect(createCompletionMock).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [{ role: 'user', content }],
          user: expect.stringContaining('bypass_cache_')
        })
      )
      
      expect(response).toHaveProperty('content')
      expect(response).toHaveProperty('tokenUsage')
      expect(response.tokenUsage).toHaveProperty('prompt')
      expect(response.tokenUsage).toHaveProperty('response')
    })
  })
  
  it.each([
    { config: { ...defaultModelConfig, temperature: 0 }, property: 'temperature' },
    { config: { ...defaultModelConfig, maxTokens: 100 }, property: 'max_tokens' },
  ])('should respect $property configuration option', ({ config, property }) => {
    createCompletionMock.mockClear()
    
    const client = new CustomLLMClient(config)
    client.invoke([{ content: 'Test with different config' }])
    
    const expectedProperty = property === 'max_tokens' ? 'max_tokens' : property
    const expectedValue = property === 'max_tokens' ? config.maxTokens : config.temperature
    
    expect(createCompletionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        [expectedProperty]: expectedValue,
        user: expect.stringContaining('bypass_cache_')
      })
    )
  })
  
  it.each([
    { content: 'Short message' },
    { content: 'Medium length message with content' },
    { content: 'a'.repeat(100) },
  ])('should track token usage for "$content"', async ({ content }) => {
    const response = await llmClient.invoke([{ content }])
    
    expect(response.tokenUsage.prompt).toBeGreaterThan(0)
    expect(response.tokenUsage.response).toBeGreaterThan(0)
  })
  
  it('should add unique timestamp to user field to bypass caching', async () => {
    const dateSpy = vi.spyOn(Date, 'now').mockReturnValue(12345678)
    
    await llmClient.invoke([{ content: 'Test cache bypass' }])
    
    expect(createCompletionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        user: 'bypass_cache_12345678'
      })
    )
    
    dateSpy.mockRestore()
  })
})

describe('createLLMClient', () => {
  it.each([
    { 
      config: getStandardModelConfig(), 
      description: 'standard config' 
    },
    { 
      config: {
        name: 'minimal-model',
        provider: 'openai' as const,
        modelName: 'gpt-3.5-turbo',
        temperature: 0.5,
      }, 
      description: 'minimal config' 
    }
  ])('should create client with $description', ({ config }) => {
    const client = createLLMClient(config)
    expect(client).toBeInstanceOf(CustomLLMClient)
  })
})