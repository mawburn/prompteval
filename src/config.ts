import fs from 'fs'
import path from 'path'
import yaml from 'js-yaml'
import { AppConfig } from './types'

export function loadConfig(configPath: string): AppConfig {
  try {
    const configFile = fs.readFileSync(path.resolve(configPath), 'utf8')
    const config = yaml.load(configFile) as AppConfig

    // Validate config
    if (!config.promptsDir) {
      throw new Error('promptsDir is required in config')
    }

    if (!config.models || config.models.length === 0) {
      throw new Error('At least one model configuration is required')
    }

    return config
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to load config: ${error.message}`)
    }
    throw new Error('Failed to load config')
  }
}
