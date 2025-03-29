# LLM Prompt Evaluator

![Test Status](https://github.com/mawburn/prompteval/actions/workflows/test.yml/badge.svg)

Command-line tool for evaluating prompts across LLM models. Test effectiveness, measure latency, track tokens, and analyze response variations.

## Features

- Multi-model & multi-prompt testing
- Token usage tracking for prompts and responses
- Configurable parameters (temperature, max tokens)
- Concurrent evaluation with repeat testing
- Text similarity comparison (cosine, Jaccard, Levenshtein)
- Results saved as JSON with detailed analytics
- Environment variable support for API keys

## Installation

```bash
git clone <repository-url>
cd eval
pnpm install
```

## Configuration

Create a `config.yaml` file:

```yaml
promptsDir: "./prompts"
outputDir: "./results"

models:
  - name: "claude-3-7-sonnet-temp0.2"
    provider: "openai"
    modelName: "anthropic:claude-3-7-sonnet"
    temperature: 0.2
    maxTokens: 5000
  - name: "claude-3-7-sonnet-temp0.1"
    provider: "openai"
    modelName: "anthropic:claude-3-7-sonnet"
    temperature: 0.1
    maxTokens: 5000

evaluationParams:
  repeatCount: 1
  concurrency: 2
  timeoutSeconds: 60
  compareSimilarity: true
```

Note: Model names must be unique. The tool will calculate similarity using all three methods (cosine, jaccard, levenshtein) for each comparison.

### Environment Variables

Create a `.env` file:
```
API_KEY=your_api_key_here
PROXY=your_proxy_url_here  # Optional
```

## Prompts

Add markdown files to the `prompts` directory. Each file name becomes the prompt ID:
```
# prompts/test.md
Write a poem about artificial intelligence.
```

## Usage

```bash
# Build and run
pnpm run build
pnpm start -- --config config.yaml

# Development mode
pnpm run dev -- --config config.yaml
```

## Results

Results are saved as timestamped JSON files (e.g., `results-20250328T172630.json`):

### Prompt Results
Each evaluation result includes:
- Unique ID, prompt ID, model name
- Complete response text
- Latency in milliseconds, timestamp, temperature
- Token counts for both prompt and response

### Similarity Matrix
Pairwise comparisons between responses showing:
- Cosine similarity (word frequency patterns)
- Jaccard similarity (shared word ratio)
- Levenshtein similarity (edit distance)
- Average of all methods

### Metadata
Evaluation timestamps, prompt count, model count, and configuration details.

## Technical Implementation

- OpenAI API client for model integration
- js-tiktoken for accurate token counting
- Multiple similarity algorithms
- Concurrent processing for better performance

## Development

```bash
pnpm run lint        # Check code
pnpm run lint:fix    # Fix issues
pnpm run format      # Format code
pnpm run typecheck   # Check types
pnpm test           # Run tests
pnpm test:watch     # Run tests in watch mode
pnpm test:coverage  # Run tests with coverage
```
