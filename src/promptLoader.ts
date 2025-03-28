import fs from 'fs'
import path from 'path'
import { Prompt } from './types'

export async function loadPrompts(promptsDir: string): Promise<Prompt[]> {
  const promptFiles = fs
    .readdirSync(promptsDir)
    .filter(file => file.endsWith('.md'))

  const prompts: Prompt[] = []

  for (const file of promptFiles) {
    const filePath = path.join(promptsDir, file)
    const content = fs.readFileSync(filePath, 'utf8')

    prompts.push({
      id: path.basename(file, '.md'),
      content: content.trim(),
      filePath,
    })
  }

  return prompts
}
