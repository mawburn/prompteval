import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { loadConfig } from '../src/config'
import fs from 'fs'
import path from 'path'
import yaml from 'js-yaml'

const mockConfig = {
  promptsDir: './prompts',
  outputDir: './results',
  models: [
    {
      name: 'model-1',
      provider: 'openai',
      modelName: 'gpt-4',
      temperature: 0.5,
    },
  ],
  evaluationParams: {
    repeatCount: 1,
    concurrency: 2,
    timeoutSeconds: 30,
  },
}

vi.mock('fs', () => {
  return {
    readFileSync: vi.fn().mockReturnValue('config-content'),
    default: {
      readFileSync: vi.fn().mockReturnValue('config-content'),
    },
  }
})
vi.mock('path', () => {
  return {
    resolve: vi.fn(p => p),
    default: {
      resolve: vi.fn(p => p),
    },
  }
})
vi.mock('js-yaml', () => {
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
vi.mock('dotenv', () => {
  return {
    config: vi.fn(),
    default: { config: vi.fn() },
  }
})

describe('Config Loader', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    process.env = {}

    fs.readFileSync = vi.fn().mockReturnValue('config-content')
    yaml.load = vi.fn().mockReturnValue({ ...mockConfig })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should load and parse config file', () => {
    const configPath = 'config.yaml'
    const config = loadConfig(configPath)

    expect(fs.readFileSync).toHaveBeenCalledWith(configPath, 'utf8')
    expect(yaml.load).toHaveBeenCalledWith('config-content')
    expect(config).toEqual(mockConfig)
  })

  it('should apply API key from environment', () => {
    process.env.API_KEY = 'test-api-key'

    const config = loadConfig('config.yaml')

    expect(config.models[0].apiKey).toBe('test-api-key')
  })

  it('should apply proxy URL from environment', () => {
    process.env.PROXY = 'https://proxy-url.com'

    const config = loadConfig('config.yaml')

    expect(config.models[0].proxyUrl).toBe('https://proxy-url.com')
  })

  it('should throw error for missing promptsDir', () => {
    const mockLoad = vi.fn().mockReturnValue({
      models: [
        {
          name: 'model',
          provider: 'openai',
          modelName: 'gpt-4',
          temperature: 0.5,
        },
      ],
    });
    yaml.load = mockLoad;

    expect(() => loadConfig('config.yaml')).toThrow(/promptsDir is required/);
  })

  it('should throw error for missing models', () => {
    const mockLoad = vi.fn().mockReturnValue({
      promptsDir: './prompts',
      models: [],
    });
    yaml.load = mockLoad;

    expect(() => loadConfig('config.yaml')).toThrow(
      /At least one model configuration is required/
    );
  })
})
