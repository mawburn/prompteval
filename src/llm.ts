import { OpenAI } from 'openai'
import { ModelConfig } from './types'

export class CustomLLMClient {
  private client: OpenAI
  private modelName: string
  private temperature: number
  private maxTokens?: number

  constructor(modelConfig: ModelConfig) {
    // Extract the base URL without the endpoint path
    let baseURL = modelConfig.proxyUrl || ''
    if (baseURL.endsWith('/chat/completions')) {
      baseURL = baseURL.replace('/chat/completions', '')
    }

    console.log(`Creating custom LLM client for ${modelConfig.name}`)
    console.log(`Original proxy URL: ${modelConfig.proxyUrl || 'none'}`)
    console.log(`Adjusted base URL: ${baseURL}`)

    // Create a direct OpenAI client with custom configuration
    this.client = new OpenAI({
      apiKey: modelConfig.apiKey || 'dummy-key',
      baseURL: baseURL || undefined, // Use undefined if empty string
      defaultHeaders: {
        Authorization: `Bearer ${modelConfig.apiKey || 'dummy-key'}`,
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

      const response = await this.client.chat.completions.create({
        model: this.modelName,
        messages: formattedMessages,
        temperature: this.temperature,
        max_tokens: this.maxTokens,
      })

      return {
        content: response.choices[0].message.content || '',
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
