import { Command } from 'commander'
import { loadConfig } from './config'
import { loadPrompts } from './promptLoader'
import { PromptEvaluator } from './evaluator'

async function main() {
  const program = new Command()

  program
    .name('llm-prompt-evaluator')
    .description('CLI tool to evaluate LLM prompts across different models')
    .version('1.0.0')
    .requiredOption('-c, --config <path>', 'Path to YAML config file')
    .parse(process.argv)

  const options = program.opts()

  try {
    const config = loadConfig(options.config)
    console.log(`Loaded configuration with ${config.models.length} models`)

    const prompts = await loadPrompts(config.promptsDir)
    console.log(`Loaded ${prompts.length} prompts from ${config.promptsDir}`)

    const evaluator = new PromptEvaluator(
      config.models,
      config.evaluationParams,
      config.outputDir
    )

    console.log('Starting evaluation...')
    await evaluator.evaluateAllPrompts(prompts)
    console.log(`Evaluation complete. Results saved to ${config.outputDir}`)

    process.exit(0)
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`)
    } else {
      console.error('An unknown error occurred')
    }
    process.exit(1)
  }
}

main()
