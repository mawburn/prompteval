// src/config/config.ts
import fs from 'fs'
import path from 'path'
import yaml from 'js-yaml'
import { AppConfig } from './types'
import dotenv from 'dotenv'

dotenv.config()

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

    // Apply environment variables to all model configs
    config.models = config.models.map(model => {
      const updatedModel = { ...model }

      // Apply API key from environment variable
      if (process.env.API_KEY) {
        updatedModel.apiKey = process.env.API_KEY
        console.log(`Applied API key from environment variable`)
      }

      // Apply proxy URL from environment variable
      if (process.env.PROXY) {
        updatedModel.proxyUrl = process.env.PROXY
        console.log(`Applied proxy URL from environment: ${process.env.PROXY}`)
      }

      return updatedModel
    })

    return config
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to load config: ${error.message}`)
    }
    throw new Error('Failed to load config')
  }
}
