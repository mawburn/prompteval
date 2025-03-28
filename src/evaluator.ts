// src/evaluator/evaluator.ts
import fs from 'fs'
import path from 'path'
import {
  Prompt,
  EvaluationResult,
  ModelConfig,
  EvaluationParams,
} from './types'
import { createLLMClient, CustomLLMClient } from './llm'

export class PromptEvaluator {
  private models: Map<string, CustomLLMClient> = new Map()

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
          console.log(
            `Evaluating prompt "${prompt.id}" with model "${modelName}" (attempt ${i + 1}/${this.evaluationParams.repeatCount})`
          )

          const response = await Promise.race([
            model.invoke([{ content: prompt.content }]),
            new Promise<never>((_, reject) =>
              setTimeout(
                () => reject(new Error('Timeout')),
                this.evaluationParams.timeoutSeconds * 1000
              )
            ),
          ])

          const latencyMs = Date.now() - startTime

          console.log(`Successfully received response (${latencyMs}ms)`)

          results.push({
            promptId: prompt.id,
            modelName,
            response: response.content.toString(),
            latencyMs,
            timestamp: new Date().toISOString(),
          })
        } catch (error) {
          console.error(
            `Error evaluating prompt ${prompt.id} with model ${modelName}:`,
            error
          )

          // Add a failed result to the output
          results.push({
            promptId: prompt.id,
            modelName,
            response: `ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`,
            latencyMs: Date.now() - startTime,
            timestamp: new Date().toISOString(),
          })
        }
      }
    }

    // Save results to file even if some evaluations failed
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
