import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { loadConfig } from '@src/config'
import fs from 'fs'
import yaml from 'js-yaml'
import { getMockConfig, mockFsModule, mockPathModule, mockYamlModule } from './__mocks__/testHelpers'
import { ModelConfig } from '@src/types'

mockFsModule()
mockPathModule()
mockYamlModule()
vi.mock('dotenv', () => ({
  config: vi.fn(),
  default: { config: vi.fn() },
}))

describe('Config Loader', () => {
  const mockConfig = getMockConfig()

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

    expect(fs.readFileSync).toHaveBeenCalledWith(expect.stringContaining(configPath), 'utf8')
    expect(yaml.load).toHaveBeenCalledWith('config-content')
    expect(config).toEqual(mockConfig)
  })

  it.each([
    { envVar: 'API_KEY', value: 'test-api-key', expectedProp: 'apiKey' },
    { envVar: 'PROXY', value: 'https://proxy-url.com', expectedProp: 'proxyUrl' }
  ])('should apply $envVar from environment', ({ envVar, value, expectedProp }) => {
    process.env[envVar] = value
    const config = loadConfig('config.yaml')
    expect(config.models[0][expectedProp as keyof ModelConfig]).toBe(value)
  })

  it.each([
    { 
      scenario: 'missing promptsDir', 
      mockData: { models: [{ name: 'model', provider: 'openai', modelName: 'gpt-4', temperature: 0.5 }] },
      expectedError: /promptsDir is required/
    },
    { 
      scenario: 'missing models', 
      mockData: { promptsDir: './prompts', models: [] },
      expectedError: /At least one model configuration is required/
    }
  ])('should throw error for $scenario', ({ mockData, expectedError }) => {
    yaml.load = vi.fn().mockReturnValue(mockData)
    expect(() => loadConfig('config.yaml')).toThrow(expectedError)
  })
  
  it('should handle non-Error exceptions when loading config', () => {
    fs.readFileSync = vi.fn().mockImplementation(() => {
      throw 'Non-error exception'
    })
    
    expect(() => loadConfig('config.yaml')).toThrow('Failed to load config')
  })
})