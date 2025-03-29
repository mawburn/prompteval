import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { loadConfig } from '@src/config'
import { loadPrompts } from '@src/promptLoader'
import { PromptEvaluator } from '@src/evaluator'
import { mockConsole } from './__mocks__/testHelpers'

const { consoleLogSpy, consoleErrorSpy } = mockConsole()
const evaluateAllPromptsMock = vi.fn().mockResolvedValue([])
const processExitSpy = vi.spyOn(process, 'exit').mockImplementation((_code) => {
  return undefined as never
})

vi.mock('commander', () => {
  const commandInstance = {
    name: vi.fn().mockReturnThis(),
    description: vi.fn().mockReturnThis(),
    version: vi.fn().mockReturnThis(),
    requiredOption: vi.fn().mockReturnThis(),
    parse: vi.fn().mockReturnThis(),
    opts: vi.fn().mockReturnValue({ config: 'config.yaml' }),
  }

  return {
    Command: vi.fn(() => commandInstance),
  }
})

vi.mock('@src/config', () => ({
  loadConfig: vi.fn().mockReturnValue({
    models: [{ name: 'test-model' }],
    promptsDir: './prompts',
    outputDir: './results',
    evaluationParams: {
      repeatCount: 1,
      concurrency: 1,
      timeoutSeconds: 30,
      compareSimilarity: true,
    },
  }),
}))

vi.mock('@src/promptLoader', () => ({
  loadPrompts: vi.fn().mockResolvedValue([
    { id: 'test-prompt', content: 'Test content', filePath: './prompts/test.md' },
  ]),
}))

vi.mock('@src/evaluator', () => ({
  PromptEvaluator: vi.fn().mockImplementation(() => ({
    evaluateAllPrompts: evaluateAllPromptsMock,
  })),
}))

describe('CLI Tool', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should run successfully with valid configuration', async () => {
    await import('@src/index')
    
    expect(loadConfig).toHaveBeenCalledWith('config.yaml')
    expect(loadPrompts).toHaveBeenCalledWith('./prompts')
    expect(PromptEvaluator).toHaveBeenCalledWith(
      [{ name: 'test-model' }],
      {
        repeatCount: 1,
        concurrency: 1,
        timeoutSeconds: 30,
        compareSimilarity: true,
      },
      './results'
    )
    expect(evaluateAllPromptsMock).toHaveBeenCalled()
    
    expect(consoleLogSpy).toHaveBeenCalledWith('Loaded configuration with 1 models')
    expect(consoleLogSpy).toHaveBeenCalledWith('Loaded 1 prompts from ./prompts')
    expect(consoleLogSpy).toHaveBeenCalledWith('Starting evaluation...')
    expect(consoleLogSpy).toHaveBeenCalledWith('Evaluation complete. Results saved to ./results')
    
    expect(processExitSpy).toHaveBeenCalledWith(0)
  })

  it.each([
    { 
      errorSource: 'loadConfig',
      errorType: 'Error',
      errorValue: new Error('Config error'),
      expectedLog: 'Error: Config error'
    },
    { 
      errorSource: 'loadConfig',
      errorType: 'non-Error',
      errorValue: 'String error',
      expectedLog: 'An unknown error occurred'
    },
    { 
      errorSource: 'loadPrompts',
      errorType: 'Error',
      errorValue: new Error('Prompts loading error'),
      expectedLog: 'Error: Prompts loading error'
    },
    { 
      errorSource: 'evaluateAllPrompts',
      errorType: 'Error',
      errorValue: new Error('Evaluation error'),
      expectedLog: 'Error: Evaluation error'
    }
  ])('should handle $errorType from $errorSource', async ({ errorSource, errorType, errorValue, expectedLog }) => {
    if (errorSource === 'loadConfig') {
      const mockedLoadConfig = loadConfig as unknown as ReturnType<typeof vi.fn>
      if (errorType === 'Error') {
        mockedLoadConfig.mockImplementationOnce(() => { throw errorValue })
      } else {
        mockedLoadConfig.mockImplementationOnce(() => { throw errorValue })
      }
    } else if (errorSource === 'loadPrompts') {
      const mockedLoadPrompts = loadPrompts as unknown as ReturnType<typeof vi.fn>
      mockedLoadPrompts.mockRejectedValueOnce(errorValue)
    } else if (errorSource === 'evaluateAllPrompts') {
      evaluateAllPromptsMock.mockRejectedValueOnce(errorValue)
    }
    
    await import('@src/index')
    
    expect(consoleErrorSpy).toHaveBeenCalledWith(expectedLog)
    expect(processExitSpy).toHaveBeenCalledWith(1)
  })
})