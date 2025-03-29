import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PromptEvaluator } from '../src/evaluator'
import { ModelConfig, Prompt, EvaluationParams } from '../src/types'
import fs from 'fs'
import path from 'path'

vi.mock('fs')
vi.mock('path')
vi.mock('../src/utils/id', () => ({
  generateId: vi.fn().mockReturnValue('test-id'),
}))
vi.mock('../src/llm', () => ({
  createLLMClient: vi.fn().mockImplementation(() => ({
    invoke: vi.fn().mockResolvedValue({
      content: 'Test response',
      tokenUsage: {
        prompt: 10, 
        response: 15
      }
    }),
  })),
}))

describe('PromptEvaluator', () => {
  let modelConfigs: ModelConfig[]
  let evaluationParams: EvaluationParams
  let outputDir: string
  let evaluator: PromptEvaluator
  
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-01-01'))
    
    modelConfigs = [
      {
        name: 'model-1',
        provider: 'openai',
        modelName: 'gpt-4',
        temperature: 0.5,
      },
    ]
    
    evaluationParams = {
      repeatCount: 1,
      concurrency: 1,
      timeoutSeconds: 30,
      compareSimilarity: true,
    }
    
    outputDir = './results'
    
    fs.existsSync = vi.fn().mockReturnValue(false)
    fs.mkdirSync = vi.fn()
    path.join = vi.fn().mockReturnValue('results/output.json')
    fs.writeFileSync = vi.fn()
    
    evaluator = new PromptEvaluator(modelConfigs, evaluationParams, outputDir)
  })
  
  it('should create output directory if it does not exist', () => {
    expect(fs.existsSync).toHaveBeenCalledWith(outputDir)
    expect(fs.mkdirSync).toHaveBeenCalledWith(outputDir, { recursive: true })
  })
  
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
    expect(results[0]).toHaveProperty('modelName', 'model-1')
    expect(results[0]).toHaveProperty('response', 'Test response')
    expect(results[0]).toHaveProperty('latencyMs')
    expect(results[0]).toHaveProperty('tokenUsage')
    expect(results[0].tokenUsage).toHaveProperty('prompt', 10)
    expect(results[0].tokenUsage).toHaveProperty('response', 15)
  })
  
  it('should evaluate multiple prompts in batches', async () => {
    const prompts: Prompt[] = [
      {
        id: 'prompt-1',
        content: 'Prompt 1',
        filePath: './prompts/1.md',
      },
      {
        id: 'prompt-2',
        content: 'Prompt 2',
        filePath: './prompts/2.md',
      },
    ]
    
    await evaluator.evaluateAllPrompts(prompts)
    
    expect(fs.writeFileSync).toHaveBeenCalled()
  })
})