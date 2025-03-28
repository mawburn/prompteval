import fs from 'fs'
import path from 'path'
import { generateId } from './utils/id'
import { format } from 'date-fns'
import {
  Prompt,
  EvaluationResult,
  ModelConfig,
  EvaluationParams,
  SimilarityScore,
} from './types'
import { createLLMClient, CustomLLMClient } from './llm'
import {
  calculateTextSimilarity,
  SimilarityMethod,
} from './utils/textSimilarity'

export class PromptEvaluator {
  private models: Array<{ config: ModelConfig; client: CustomLLMClient }> = []
  private allResults: Map<string, EvaluationResult[]> = new Map()
  private allSuccessfulResults: EvaluationResult[] = []
  private evaluationStartTime = new Date()

  constructor(
    private modelConfigs: ModelConfig[],
    private evaluationParams: EvaluationParams,
    private outputDir: string
  ) {
    for (const config of modelConfigs) {
      this.models.push({
        config,
        client: createLLMClient(config),
      })
    }

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }
  }

  async evaluatePrompt(prompt: Prompt): Promise<EvaluationResult[]> {
    const results: EvaluationResult[] = []

    for (const { config, client } of this.models) {
      const modelName = config.name

      for (let i = 0; i < this.evaluationParams.repeatCount; i++) {
        const startTime = Date.now()

        try {
          console.log(
            `Evaluating prompt "${prompt.id}" with model "${modelName}" (attempt ${i + 1}/${this.evaluationParams.repeatCount})`
          )

          const response = await Promise.race([
            client.invoke([{ content: prompt.content }]),
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
            id: generateId(),
            promptId: prompt.id,
            modelName,
            response: response.content.toString(),
            latencyMs,
            temperature: config.temperature,
            tokenUsage: response.tokenUsage,
            timestamp: new Date().toISOString(),
          })
        } catch (error) {
          console.error(
            `Error evaluating prompt ${prompt.id} with model ${modelName}:`,
            error
          )

          results.push({
            id: generateId(),
            promptId: prompt.id,
            modelName,
            response: `ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`,
            latencyMs: Date.now() - startTime,
            temperature: config.temperature,
            timestamp: new Date().toISOString(),
          })
        }
      }
    }

    const successfulResults = results.filter(
      r => !r.response.startsWith('ERROR:')
    )
    this.allSuccessfulResults.push(...successfulResults)

    this.allResults.set(prompt.id, results)

    return results
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
    const evaluationResults: Record<string, EvaluationResult[]> = {}

    for (const [promptId, results] of this.allResults.entries()) {
      evaluationResults[promptId] = results
    }

    const timestamp = format(this.evaluationStartTime, "yyyyMMdd'T'HHmmss")
    const filename = `results-${timestamp}.json`
    const outputPath = path.join(this.outputDir, filename)

    let similarityMatrix = null

    const compareSimilarity = this.evaluationParams.compareSimilarity !== false
    if (compareSimilarity && this.allSuccessfulResults.length >= 2) {
      console.log(
        `Calculating similarities across ${this.allSuccessfulResults.length} successful responses...`
      )
      similarityMatrix = {
        comparisons: {} as Record<string, SimilarityScore>,
      }

      console.log(
        `Comparing all pairs among ${this.allSuccessfulResults.length} results using all similarity methods...`
      )

      const methods: SimilarityMethod[] = ['cosine', 'jaccard', 'levenshtein']

      for (let i = 0; i < this.allSuccessfulResults.length; i++) {
        const resultA = this.allSuccessfulResults[i]

        for (let j = i + 1; j < this.allSuccessfulResults.length; j++) {
          const resultB = this.allSuccessfulResults[j]
          const comparisonKey = `${resultA.id}_to_${resultB.id}`

          const scores: SimilarityScore = {
            cosine: 0,
            jaccard: 0,
            levenshtein: 0,
            average: 0,
          }

          for (const method of methods) {
            const score = calculateTextSimilarity(
              resultA.response,
              resultB.response,
              method
            )
            scores[method] = Number(score.toFixed(5))
          }

          scores.average = Number(
            ((scores.cosine + scores.jaccard + scores.levenshtein) / 3).toFixed(
              5
            )
          )

          similarityMatrix.comparisons[comparisonKey] = scores
        }
      }
    }

    const outputData = {
      prompts: evaluationResults,
      similarityMatrix,
      metadata: {
        evaluatedAt: new Date().toISOString(),
        startedAt: this.evaluationStartTime.toISOString(),
        promptCount: this.allResults.size,
        modelCount: this.modelConfigs.length,
        repeatCount: this.evaluationParams.repeatCount,
      },
    }

    console.log(`Saving all results to ${outputPath}`)
    fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2))
  }
}
