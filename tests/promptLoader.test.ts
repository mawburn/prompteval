import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { loadPrompts } from '@src/promptLoader'
import fs from 'fs'
import path from 'path'
import { Prompt } from '@src/types'

vi.mock('fs')
vi.mock('path')

describe('PromptLoader', () => {
  const mockFiles = ['test1.md', 'test2.md', 'not-md.txt', 'empty.md', 'special-chars.md']
  
  beforeEach(() => {
    vi.resetAllMocks()
    
    fs.existsSync = vi.fn().mockReturnValue(true)
    fs.readdirSync = vi.fn().mockReturnValue(mockFiles)
    fs.readFileSync = vi.fn().mockImplementation((filePath, encoding) => {
      expect(encoding).toBe('utf8')
      
      if (filePath.includes('test1')) return '  Test prompt 1 content  '
      if (filePath.includes('test2')) return 'Test prompt 2 content'
      if (filePath.includes('empty')) return ''
      if (filePath.includes('special-chars')) return 'Special chars: !@#$%^&*()'
      if (filePath.includes('error')) throw new Error('ENOENT: no such file or directory')
      
      return 'other content'
    })
    
    path.join = vi.fn().mockImplementation((...args) => args.join('/'))
    path.basename = vi.fn().mockImplementation((filePath, extension) => {
      if (extension) {
        return filePath.split('/').pop()?.replace(extension, '') || ''
      }
      return filePath.split('/').pop() || ''
    })
  })
  
  afterEach(() => {
    vi.clearAllMocks()
  })
  
  it('should load prompts from the specified directory', async () => {
    const promptsDir = './prompts'
    const prompts = await loadPrompts(promptsDir)
    
    expect(fs.readdirSync).toHaveBeenCalledWith(promptsDir)
    expect(prompts.length).toBe(4)
    
    expect(prompts[0]).toEqual({
      id: 'test1',
      content: 'Test prompt 1 content',
      filePath: './prompts/test1.md',
    })
    
    expect(prompts[1]).toEqual({
      id: 'test2',
      content: 'Test prompt 2 content',
      filePath: './prompts/test2.md',
    })
  })
  
  it.each([
    { fileName: 'test1.md', expectedContent: 'Test prompt 1 content', description: 'correctly trim whitespace' },
    { fileName: 'empty.md', expectedContent: '', description: 'handle empty markdown files' },
    { fileName: 'special-chars.md', expectedContent: 'Special chars: !@#$%^&*()', description: 'handle special characters' }
  ])('should $description in prompt content', async ({ fileName, expectedContent }) => {
    fs.readdirSync = vi.fn().mockReturnValue([fileName])
    
    const prompts = await loadPrompts('./prompts')
    
    expect(prompts.length).toBe(1)
    expect(prompts[0].content).toBe(expectedContent)
    expect(fs.readFileSync).toHaveBeenCalledWith(`./prompts/${fileName}`, 'utf8')
  })
  
  it('should filter out non-markdown files', async () => {
    await loadPrompts('./prompts')
    
    expect(fs.readFileSync).toHaveBeenCalledTimes(4)
    for (const file of mockFiles) {
      if (file.endsWith('.md')) {
        expect(fs.readFileSync).toHaveBeenCalledWith(`./prompts/${file}`, 'utf8')
      } else {
        expect(fs.readFileSync).not.toHaveBeenCalledWith(`./prompts/${file}`, 'utf8')
      }
    }
  })
  
  it.each([
    { errorCode: 'ENOENT', errorMessage: 'no such file or directory' },
    { errorCode: 'EACCES', errorMessage: 'permission denied' }
  ])('should handle $errorCode directory error', async ({ errorCode, errorMessage }) => {
    fs.readdirSync = vi.fn().mockImplementation(() => {
      const error = new Error(`${errorCode}: ${errorMessage}`) as NodeJS.ErrnoException
      error.code = errorCode
      throw error
    })
    
    await expect(loadPrompts('./problem-dir')).rejects.toThrow(errorCode)
  })
  
  it('should handle no prompt files', async () => {
    fs.readdirSync = vi.fn().mockReturnValue(['not-md.txt'])
    
    const prompts = await loadPrompts('./prompts')
    
    expect(prompts).toEqual([])
  })
  
  it('should handle file read errors', async () => {
    fs.readdirSync = vi.fn().mockReturnValue(['error.md'])
    
    await expect(loadPrompts('./prompts')).rejects.toThrow('ENOENT')
  })
  
  it('should ensure returned objects have correct Prompt type structure', async () => {
    const prompts = await loadPrompts('./prompts')
    
    prompts.forEach(prompt => {
      expect(prompt).toMatchObject({
        id: expect.any(String),
        content: expect.any(String),
        filePath: expect.any(String),
      } as Prompt)
    })
  })
})