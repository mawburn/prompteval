import { vi, expect } from 'vitest'
import { ModelConfig, EvaluationParams } from '@src/types'

export const mockConsole = () => {
  const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
  const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  
  return { consoleLogSpy, consoleErrorSpy }
}

export const getMockConfig = () => ({
  promptsDir: './prompts',
  outputDir: './results',
  models: [
    {
      name: 'model-1',
      provider: 'openai' as const,
      modelName: 'gpt-4',
      temperature: 0.5,
    },
  ],
  evaluationParams: {
    repeatCount: 1,
    concurrency: 2,
    timeoutSeconds: 30,
  },
})

export const getStandardModelConfig = (): ModelConfig => ({
  name: 'test-model',
  provider: 'openai' as const,
  modelName: 'gpt-4',
  temperature: 0.7,
  maxTokens: 1000,
  apiKey: 'test-api-key',
})

export const getStandardEvaluationParams = (): EvaluationParams => ({
  repeatCount: 1,
  concurrency: 1,
  timeoutSeconds: 30,
  compareSimilarity: true,
})

export const mockFsModule = () => {
  return vi.mock('fs', () => {
    return {
      readFileSync: vi.fn().mockReturnValue('config-content'),
      default: {
        readFileSync: vi.fn().mockReturnValue('config-content'),
      },
      existsSync: vi.fn().mockReturnValue(false),
      mkdirSync: vi.fn(),
      writeFileSync: vi.fn(),
    }
  })
}

export const mockPathModule = () => {
  return vi.mock('path', () => {
    return {
      resolve: vi.fn(p => p),
      default: {
        resolve: vi.fn(p => p),
      },
      join: vi.fn().mockReturnValue('results/output.json'),
      basename: vi.fn().mockImplementation((filePath, extension) => {
        if (extension) {
          return filePath.split('/').pop()?.replace(extension, '') || ''
        }
        return filePath.split('/').pop() || ''
      }),
    }
  })
}

export const mockYamlModule = (mockConfig = getMockConfig()) => {
  return vi.mock('js-yaml', () => {
    return {
      load: vi.fn().mockImplementation(content => {
        if (content === 'config-content') return { ...mockConfig }
        return {}
      }),
      default: {
        load: vi.fn().mockImplementation(content => {
          if (content === 'config-content') return { ...mockConfig }
          return {}
        }),
      },
    }
  })
}

export const mockOpenAIModule = () => {
  const createCompletionMock = vi.fn().mockImplementation(({ model, messages }) => {
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

  return { createCompletionMock }
}

export const mockTiktokenModule = () => {
  vi.mock('js-tiktoken', () => {
    return {
      getEncoding: vi.fn().mockImplementation(() => ({
        encode: (text: string) => Array(Math.ceil(text.length / 4)).fill(0),
      })),
    }
  })
}

export const runParameterizedTests = <T>(
  testCases: Array<{ input: T; expected: any; description?: string }>,
  testFn: (input: T) => any
) => {
  for (const { input, expected, description } of testCases) {
    const result = testFn(input)
    expect(result).toEqual(expected)
  }
}

export const setupCommonMocks = () => {
  mockFsModule()
  mockPathModule()
  mockConsole()
}