import { OpenAI } from 'openai'
import { ModelConfig } from './types'
import { getEncoding } from 'js-tiktoken'

export class CustomLLMClient {
  private client: OpenAI
  private modelName: string
  private temperature: number
  private maxTokens?: number

  constructor(modelConfig: ModelConfig) {
    let baseURL = modelConfig.proxyUrl || ''
    if (baseURL.endsWith('/chat/completions')) {
      baseURL = baseURL.replace('/chat/completions', '')
    }

    console.log(`Creating custom LLM client for ${modelConfig.name}`)
    console.log(`Original proxy URL: ${modelConfig.proxyUrl || 'none'}`)
    console.log(`Adjusted base URL: ${baseURL}`)

    this.client = new OpenAI({
      apiKey: modelConfig.apiKey || 'dummy-key',
      baseURL: baseURL || undefined,
      defaultHeaders: {
        'Cache-Control': 'no-cache',
      },
    })

    this.modelName = modelConfig.modelName
    this.temperature = modelConfig.temperature
    this.maxTokens = modelConfig.maxTokens
  }

  async invoke(messages: { content: string }[]) {
    try {
      const formattedMessages = messages.map(msg => ({
        role: 'user' as const,
        content: msg.content,
      }))

      console.log(`Sending request to ${this.modelName}`)

      const encoder = getEncoding('cl100k_base')

      const promptTokens = formattedMessages.reduce((sum, msg) => {
        return sum + encoder.encode(msg.content).length
      }, 0)

      const timestamp = Date.now()

      const response = await this.client.chat.completions.create({
        model: this.modelName,
        messages: formattedMessages,
        temperature: this.temperature,
        max_tokens: this.maxTokens,
        user: `bypass_cache_${timestamp}`,
      })

      const responseText = response.choices[0].message.content || ''
      const responseTokens = encoder.encode(responseText).length

      return {
        content: responseText,
        tokenUsage: {
          prompt: promptTokens,
          response: responseTokens,
        },
      }
    } catch (error) {
      console.error('Error in custom LLM client:', error)
      throw error
    }
  }
}

export function createLLMClient(modelConfig: ModelConfig): CustomLLMClient {
  return new CustomLLMClient(modelConfig)
}
