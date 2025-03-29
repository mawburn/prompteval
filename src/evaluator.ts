import fs from 'fs'
import path from 'path'
import { nanoid } from 'nanoid'
import { format } from 'date-fns'
import {
  Prompt,
  EvaluationResult,
  ModelConfig,
  EvaluationParams,
  SimilarityMatrix,
} from './types'
import { createLLMClient, CustomLLMClient } from './llm'
import {
  calculateTextSimilarity,
  SimilarityMethod,
} from './utils/textSimilarity'

export class PromptEvaluator {
  private models: Map<string, CustomLLMClient> = new Map()
  private allResults: Map<string, {results: EvaluationResult[], similarityMatrix: SimilarityMatrix | null}> = new Map()
  private evaluationStartTime = new Date()

  constructor(
    private modelConfigs: ModelConfig[],
    private evaluationParams: EvaluationParams,
    private outputDir: string
  ) {
    for (const config of modelConfigs) {
      this.models.set(config.name, createLLMClient(config))
    }

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
            id: nanoid(),
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

          results.push({
            id: nanoid(),
            promptId: prompt.id,
            modelName,
            response: `ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`,
            latencyMs: Date.now() - startTime,
            timestamp: new Date().toISOString(),
          })
        }
      }
    }

    const compareSimilarity = this.evaluationParams.compareSimilarity !== false
    let similarityMatrix = null
    if (compareSimilarity) {
      similarityMatrix = this.calculateSimilarities(results)
    }

    this.allResults.set(prompt.id, {
      results,
      similarityMatrix
    })

    return results
  }

  private calculateSimilarities(
    results: EvaluationResult[]
  ): SimilarityMatrix | null {
    const successfulResults = results.filter(
      r => !r.response.startsWith('ERROR:')
    )
    if (successfulResults.length < 2) {
      console.log('Not enough successful responses to compare similarity')
      return null
    }

    const method = this.evaluationParams.similarityMethod || 'cosine'
    console.log(`Calculating ${method} similarity between responses...`)

    const reference = successfulResults[0]

    const similarityMatrix: SimilarityMatrix = {
      method: method,
      referenceId: reference.id,
      comparisons: {},
    }

    for (let i = 0; i < results.length; i++) {
      const result = results[i]

      if (result.response.startsWith('ERROR:')) continue

      if (result.id === reference.id) {
        similarityMatrix.comparisons[result.id] = 1.0
        continue
      }

      const similarityScore = calculateTextSimilarity(
        reference.response,
        result.response,
        method as SimilarityMethod
      )

      similarityMatrix.comparisons[result.id] = similarityScore

      console.log(
        `Similarity between "${reference.modelName}" and "${result.modelName}": ${similarityScore.toFixed(4)}`
      )
    }

    return similarityMatrix
  }

  async evaluateAllPrompts(prompts: Prompt[]): Promise<void> {
    const concurrency = this.evaluationParams.concurrency

    for (let i = 0; i < prompts.length; i += concurrency) {
      const batch = prompts.slice(i, i + concurrency)
      await Promise.all(batch.map(prompt => this.evaluatePrompt(prompt)))
    }
    
    this.saveAllResults()
  }

  private saveAllResults(): void {
    const evaluationResults: Record<string, {results: EvaluationResult[], similarityMatrix: SimilarityMatrix | null}> = {}
    
    for (const [promptId, data] of this.allResults.entries()) {
      evaluationResults[promptId] = data
    }
    
    const timestamp = format(this.evaluationStartTime, "yyyyMMdd'T'HHmmss")
    const filename = `results-${timestamp}.json`
    const outputPath = path.join(this.outputDir, filename)
    
    const outputData = {
      prompts: evaluationResults,
      metadata: {
        evaluatedAt: new Date().toISOString(),
        startedAt: this.evaluationStartTime.toISOString(),
        promptCount: this.allResults.size,
        modelCount: this.modelConfigs.length,
        repeatCount: this.evaluationParams.repeatCount
      }
    }
    
    console.log(`Saving all results to ${outputPath}`)
    fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2))
  }
}
