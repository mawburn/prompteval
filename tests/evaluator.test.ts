import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { PromptEvaluator } from '@src/evaluator'
import { Prompt, ModelConfig, EvaluationParams } from '@src/types'
import fs from 'fs'
import path from 'path'
import { mockConsole, getStandardModelConfig, getStandardEvaluationParams } from './__mocks__/testHelpers'

const { consoleLogSpy, consoleErrorSpy } = mockConsole()

const invokeMock = vi.fn().mockResolvedValue({
  content: 'Test response',
  tokenUsage: {
    prompt: 10, 
    response: 15
  }
})

vi.mock('fs')
vi.mock('path')
vi.mock('@src/utils/id', () => ({
  generateId: vi.fn().mockReturnValue('test-id'),
}))
vi.mock('@src/llm', () => ({
  createLLMClient: vi.fn().mockImplementation(() => ({
    invoke: invokeMock,
  })),
}))
vi.mock('date-fns', () => ({
  format: vi.fn().mockReturnValue('20250101T000000'),
}))

describe('PromptEvaluator', () => {
  let modelConfigs: ModelConfig[];
  let evaluationParams: EvaluationParams;
  let outputDir: string;
  let evaluator: PromptEvaluator;
  
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-01-01'))
    
    modelConfigs = [getStandardModelConfig()]
    evaluationParams = getStandardEvaluationParams()
    outputDir = './results'
    
    fs.existsSync = vi.fn().mockReturnValue(false)
    fs.mkdirSync = vi.fn()
    path.join = vi.fn().mockReturnValue('results/output.json')
    fs.writeFileSync = vi.fn()
    
    invokeMock.mockClear()
    consoleLogSpy.mockClear()
    consoleErrorSpy.mockClear()
    
    evaluator = new PromptEvaluator(modelConfigs, evaluationParams, outputDir)
  })
  
  afterEach(() => {
    vi.clearAllMocks()
  })
  
  it.each([
    { exists: false, shouldCall: true },
    { exists: true, shouldCall: false }
  ])('should create output directory if it does not exist (exists: $exists)', 
    ({ exists, shouldCall }) => {
      fs.existsSync = vi.fn().mockReturnValue(exists)
      const mkdirSyncMock = fs.mkdirSync as unknown as ReturnType<typeof vi.fn>
      mkdirSyncMock.mockClear()
      
      evaluator = new PromptEvaluator(modelConfigs, evaluationParams, outputDir)
      
      expect(fs.existsSync).toHaveBeenCalledWith(outputDir)
      if (shouldCall) {
        expect(fs.mkdirSync).toHaveBeenCalledWith(outputDir, { recursive: true })
      } else {
        expect(fs.mkdirSync).not.toHaveBeenCalled()
      }
    }
  )
  
  it('should evaluate a prompt and store results', async () => {
    const prompt: Prompt = {
      id: 'test-prompt',
      content: 'This is a test prompt',
      filePath: './prompts/test.md',
    }
    
    const results = await evaluator.evaluatePrompt(prompt)
    
    expect(results.length).toBe(1)
    expect(results[0]).toHaveProperty('id')
    expect(results[0]).toHaveProperty('promptId', 'test-prompt')
    expect(results[0]).toHaveProperty('modelName', modelConfigs[0].name)
    expect(results[0]).toHaveProperty('response', 'Test response')
    expect(results[0]).toHaveProperty('latencyMs')
    expect(results[0]).toHaveProperty('tokenUsage')
    expect(results[0].tokenUsage).toHaveProperty('prompt', 10)
    expect(results[0].tokenUsage).toHaveProperty('response', 15)
  })
  
  it.each([
    { errorType: 'Error', errorValue: new Error('API Error'), expectedResponse: /ERROR: API Error/ },
    { errorType: 'non-Error', errorValue: 'String error', expectedResponse: /ERROR: Unknown error/ }
  ])('should handle $errorType when evaluating a prompt', async ({ errorType, errorValue, expectedResponse }) => {
    invokeMock.mockRejectedValueOnce(errorValue)
    
    const prompt: Prompt = {
      id: 'error-prompt',
      content: 'This prompt will cause an error',
      filePath: './prompts/error.md',
    }
    
    const results = await evaluator.evaluatePrompt(prompt)
    
    expect(results.length).toBe(1)
    expect(results[0]).toHaveProperty('id')
    expect(results[0]).toHaveProperty('promptId', 'error-prompt')
    expect(results[0]).toHaveProperty('modelName', modelConfigs[0].name)
    expect(results[0].response).toMatch(expectedResponse)
    expect(results[0]).toHaveProperty('latencyMs')
    
    if (errorType === 'Error') {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error evaluating prompt error-prompt with model'),
        expect.any(Error)
      )
    } else {
      expect(consoleErrorSpy).toHaveBeenCalled()
    }
  })
  
  it.each([
    { compareSimilarity: true, shouldLog: true },
    { compareSimilarity: false, shouldLog: false }
  ])('should handle similarity calculation based on config (compareSimilarity: $compareSimilarity)', 
    async ({ compareSimilarity, shouldLog }) => {
      evaluationParams.compareSimilarity = compareSimilarity
      evaluator = new PromptEvaluator(modelConfigs, evaluationParams, outputDir)
      
      const prompts: Prompt[] = [
        { id: 'prompt-1', content: 'Prompt 1', filePath: './prompts/1.md' },
        { id: 'prompt-2', content: 'Prompt 2', filePath: './prompts/2.md' },
      ]
      
      await evaluator.evaluateAllPrompts(prompts)
      
      expect(fs.writeFileSync).toHaveBeenCalled()
      
      if (shouldLog) {
        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Calculating similarities'))
      } else {
        expect(consoleLogSpy).not.toHaveBeenCalledWith(expect.stringContaining('Calculating similarities'))
      }
    }
  )
})