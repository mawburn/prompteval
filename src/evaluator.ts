import { BaseChatModel } from '@langchain/core/language_models/chat_models'
import { HumanMessage } from '@langchain/core/messages'
import { AIMessage } from '@langchain/core/messages'
import fs from 'fs'
import path from 'path'
import {
  Prompt,
  EvaluationResult,
  ModelConfig,
  EvaluationParams,
} from './types'
import { createLLMClient } from './llm'

export class PromptEvaluator {
  private models: Map<string, BaseChatModel> = new Map()

  constructor(
    private modelConfigs: ModelConfig[],
    private evaluationParams: EvaluationParams,
    private outputDir: string
  ) {
    // Initialize models
    for (const config of modelConfigs) {
      this.models.set(config.name, createLLMClient(config))
    }

    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }
  }

  async evaluatePrompt(prompt: Prompt): Promise<EvaluationResult[]> {
    const results: EvaluationResult[] = []

    for (const [modelName, model] of this.models.entries()) {
      for (let i = 0; i < this.evaluationParams.repeatCount; i++) {
        const startTime = Date.now()

        try {
          const response = await Promise.race([
            model.invoke([new HumanMessage(prompt.content)]),
            new Promise<never>((_, reject) =>
              setTimeout(
                () => reject(new Error('Timeout')),
                this.evaluationParams.timeoutSeconds * 1000
              )
            ),
          ])

          const latencyMs = Date.now() - startTime

          // Ensure response is an AIMessage
          if (response instanceof AIMessage) {
            results.push({
              promptId: prompt.id,
              modelName,
              response: response.content.toString(),
              latencyMs,
              timestamp: new Date().toISOString(),
            })
          } else {
            console.error(
              `Unexpected response type for prompt ${prompt.id} with model ${modelName}`
            )
          }
        } catch (error) {
          console.error(
            `Error evaluating prompt ${prompt.id} with model ${modelName}:`,
            error
          )
        }
      }
    }

    // Save results to file
    this.saveResults(prompt.id, results)

    return results
  }

  async evaluateAllPrompts(prompts: Prompt[]): Promise<void> {
    const concurrency = this.evaluationParams.concurrency

    // Process prompts in batches based on concurrency
    for (let i = 0; i < prompts.length; i += concurrency) {
      const batch = prompts.slice(i, i + concurrency)
      await Promise.all(batch.map(prompt => this.evaluatePrompt(prompt)))
    }
  }

  private saveResults(promptId: string, results: EvaluationResult[]): void {
    const outputPath = path.join(this.outputDir, `${promptId}-results.json`)
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2))
  }
}
