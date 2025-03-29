# LLM Prompt Evaluator

A command-line tool for evaluating and comparing prompts across different LLM models. This tool helps you test prompt effectiveness, measure latency, and analyze response variations.

## Features

- Test multiple prompts across different LLM models
- Configure model parameters (temperature, max tokens)
- Support for OpenAI and Anthropic models
- Concurrent evaluation to speed up testing
- Repeat tests to measure consistency
- Text similarity comparison between responses
- Multiple similarity methods (cosine, Jaccard, Levenshtein)
- Save results as JSON for analysis
- Environment variable support for API keys and proxies

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd eval

# Install dependencies
npm install
# or
pnpm install
```

## Configuration

Create a `config.yaml` file or use the provided example:

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

Note: Model names must be unique, and all three similarity methods (cosine, jaccard, levenshtein) are calculated for each comparison.

### Environment Variables

Create a `.env` file with. This assumes the api key is the same and being used through the proxy.

```
API_KEY=your_api_key_here
PROXY=your_proxy_url_here  # Optional
```

## Prompts

Create markdown files in the `prompts` directory. Each file name (without extension) will be used as the prompt ID.

Example:
```
# prompts/test.md
Write a poem about artificial intelligence.
```

## Usage

```bash
# Build the project
npm run build

# Run the evaluator
npm start -- --config config.yaml

# Development mode
npm run dev -- --config config.yaml
```

## Results

Results are saved to the configured output directory as a single timestamped JSON file (e.g. `results-20250328T172630.json`).

The output file contains:

### Prompts
Results organized by prompt ID, each containing arrays of evaluation results.

Each result includes:
- Unique ID (generated with nanoid)
- Prompt ID
- Model name
- Response text
- Latency in milliseconds
- Timestamp
- Temperature value used for generation
- Optional token usage statistics

### Similarity Matrix
A single combined similarity matrix at the root level:
- Contains similarity comparisons between ALL responses across ALL prompts
- Includes:
  - Complete comparison structure with cross-prompt comparisons
  - Comparisons use keys in the format: `responseA_id_to_responseB_id`
  - Each comparison includes scores for all similarity methods:
    ```json
    "ezcsy_to_n5pb3": {
      "cosine": 0.60573,
      "jaccard": 0.82123,
      "levenshtein": 0.91000
    }
    ```
- Each pair of responses is compared only once (no redundant calculations)
- Self-comparisons (with score 1.0) are not included

#### Similarity Methods

The evaluator calculates all three text similarity algorithms for each comparison:

**Cosine Similarity**
- Represents texts as word frequency vectors and measures the cosine of the angle between them
- Focuses on word frequency patterns rather than exact matches
- Scores range from 0 (completely different) to 1 (identical)
- Best for comparing longer texts with similar vocabulary but different expression

**Jaccard Similarity**
- Measures similarity based on the ratio of shared words to total unique words
- Calculates: intersection size / union size of word sets
- Scores range from 0 (no words in common) to 1 (identical word sets)
- Useful for comparing similarity of topics and concepts, ignoring word frequency

**Levenshtein Similarity**
- Based on edit distance (number of operations to transform one text to another)
- Normalized to produce scores from 0 (completely different) to 1 (identical)
- Sensitive to character-level differences, word order, and text structure
- Best for detecting minor variations and similar phrasings

### Metadata
Information about the evaluation run:
- Evaluation start and end timestamps
- Prompt count
- Model count
- Repeat count

## Development

```bash
# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format

# Check formatting
npm run format:check
```
