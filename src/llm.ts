import { ChatOpenAI } from '@langchain/openai'
import { ChatAnthropic } from '@langchain/anthropic'
import { BaseChatModel } from '@langchain/core/language_models/chat_models'
import { ModelConfig } from './types'

export function createLLMClient(modelConfig: ModelConfig): BaseChatModel {
  const commonConfig = {
    temperature: modelConfig.temperature,
    maxTokens: modelConfig.maxTokens,
    modelName: modelConfig.modelName,
  }

  // If proxy URL is provided, use it for all providers
  const clientOptions = modelConfig.proxyUrl
    ? {
        basePath: modelConfig.proxyUrl,
        apiKey: modelConfig.apiKey || 'dummy-key',
      }
    : { apiKey: modelConfig.apiKey }

  switch (modelConfig.provider) {
    case 'openai':
      return new ChatOpenAI({
        ...commonConfig,
        ...clientOptions,
      })

    case 'anthropic':
      return new ChatAnthropic({
        ...commonConfig,
        ...clientOptions,
      })

    default:
      throw new Error(`Unsupported model provider: ${modelConfig.provider}`)
  }
}
