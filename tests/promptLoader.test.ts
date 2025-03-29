import { describe, it, expect, vi, beforeEach } from 'vitest'
import { loadPrompts } from '../src/promptLoader'
import fs from 'fs'
import path from 'path'

vi.mock('fs')
vi.mock('path')

describe('PromptLoader', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    
    fs.existsSync = vi.fn().mockReturnValue(true)
    fs.readdirSync = vi.fn().mockReturnValue(['test1.md', 'test2.md', 'not-md.txt'])
    fs.readFileSync = vi.fn().mockImplementation((filePath) => {
      if (filePath.includes('test1')) return 'Test prompt 1 content'
      if (filePath.includes('test2')) return 'Test prompt 2 content'
      return 'other content'
    })
    path.join = vi.fn().mockImplementation((...args) => args.join('/'))
    path.basename = vi.fn().mockImplementation((filePath, extension) => {
      if (extension) {
        return filePath.replace(extension, '')
      }
      return filePath
    })
  })
  
  it('should load prompts from the specified directory', async () => {
    const promptsDir = './prompts'
    const prompts = await loadPrompts(promptsDir)
    
    expect(fs.readdirSync).toHaveBeenCalledWith(promptsDir)
    expect(prompts.length).toBe(2)
    
    expect(prompts[0].id).toBe('test1')
    expect(prompts[0].content).toBe('Test prompt 1 content')
    expect(prompts[0].filePath).toBe('./prompts/test1.md')
    
    expect(prompts[1].id).toBe('test2')
    expect(prompts[1].content).toBe('Test prompt 2 content')
    expect(prompts[1].filePath).toBe('./prompts/test2.md')
  })
  
  it('should handle directory existence errors', async () => {
    fs.readdirSync = vi.fn().mockImplementation(() => {
      throw new Error('Directory does not exist')
    })
    
    await expect(loadPrompts('./non-existent')).rejects.toThrow('Directory does not exist')
  })
  
  it('should handle no prompt files', async () => {
    fs.readdirSync = vi.fn().mockReturnValue(['not-md.txt'])
    
    const prompts = await loadPrompts('./prompts')
    
    expect(prompts).toEqual([])
  })
})