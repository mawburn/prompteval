import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import path from 'path'

describe('UI Frontend', () => {
  const originalWindow = global.window
  const originalDocument = global.document
  let appJsContent: string
  
  // Load the app.js file content for testing
  beforeEach(() => {
    const appJsPath = path.join(__dirname, '../../../src/server/public/app.js')
    appJsContent = fs.readFileSync(appJsPath, 'utf-8')
    
    // Mock DOM elements and globals
    global.document = {
      getElementById: vi.fn().mockImplementation((id) => {
        if (id === 'result-select') {
          return {
            innerHTML: '',
            addEventListener: vi.fn(),
            appendChild: vi.fn()
          }
        } else if (id === 'results-body') {
          return {
            innerHTML: '',
            appendChild: vi.fn()
          }
        } else if (id === 'similarity-matrix') {
          return {
            innerHTML: '',
            appendChild: vi.fn()
          }
        } else if (id === 'similarity-method') {
          return {
            value: 'average',
            addEventListener: vi.fn()
          }
        }
        return null
      }),
      querySelector: vi.fn().mockImplementation((selector) => {
        if (selector.includes('data-tab="similarity"')) {
          return {
            classList: {
              contains: vi.fn().mockReturnValue(false)
            }
          }
        }
        return null
      }),
      querySelectorAll: vi.fn().mockImplementation((selector) => {
        if (selector === '.tab-button') {
          return [{
            classList: { remove: vi.fn(), add: vi.fn() },
            dataset: { tab: 'results' },
            addEventListener: vi.fn()
          }, {
            classList: { remove: vi.fn(), add: vi.fn() },
            dataset: { tab: 'similarity' },
            addEventListener: vi.fn()
          }]
        } else if (selector === '.tab-content') {
          return [{
            classList: { remove: vi.fn(), add: vi.fn() }
          }, {
            classList: { remove: vi.fn(), add: vi.fn() }
          }]
        }
        return []
      }),
      body: {
        appendChild: vi.fn()
      }
    } as any
    
    global.console = {
      error: vi.fn()
    } as any
    
    global.fetch = vi.fn()
    
    const mockOptions = [] as any[]
    global.document.createElement = vi.fn().mockImplementation((tag) => {
      if (tag === 'option') {
        const option = {
          value: '',
          textContent: ''
        }
        mockOptions.push(option)
        return option
      } else if (tag === 'tr') {
        return {
          className: '',
          innerHTML: '',
          appendChild: vi.fn()
        }
      } else if (tag === 'div') {
        return {
          className: '',
          style: {},
          innerHTML: '',
          addEventListener: vi.fn(),
          appendChild: vi.fn()
        }
      } else if (tag === 'table') {
        return {
          className: '',
          appendChild: vi.fn()
        }
      } else if (tag === 'thead' || tag === 'tbody') {
        return {
          appendChild: vi.fn()
        }
      } else if (tag === 'th' || tag === 'td') {
        return {
          className: '',
          title: '',
          textContent: '',
          appendChild: vi.fn()
        }
      }
      return {}
    })
  })
  
  afterEach(() => {
    global.window = originalWindow
    global.document = originalDocument
    vi.clearAllMocks()
  })
  
  it('should define the required DOM interactions', () => {
    expect(appJsContent).toContain('getElementById(\'result-select\')')
    expect(appJsContent).toContain('getElementById(\'results-body\')')
    expect(appJsContent).toContain('getElementById(\'similarity-matrix\')')
    expect(appJsContent).toContain('getElementById(\'similarity-method\')')
  })
  
  it('should define fetch functions for API endpoints', () => {
    expect(appJsContent).toContain('fetch(\'/api/results\')')
    expect(appJsContent).toContain('fetch(`/api/results/${filename}`)')
    expect(appJsContent).toContain('fetch(`/api/prompts/${promptId}`)')
  })
  
  it('should define functions for loading and displaying results', () => {
    expect(appJsContent).toContain('async function loadResultFiles()')
    expect(appJsContent).toContain('async function getPromptContent(')
    expect(appJsContent).toContain('async function loadResult(')
  })
  
  it('should define functions for the similarity matrix', () => {
    expect(appJsContent).toContain('function renderSimilarityMatrix(')
    expect(appJsContent).toContain('function showComparisonDetails(')
  })
  
  it('should have tab navigation functionality', () => {
    expect(appJsContent).toContain('querySelectorAll(\'.tab-button\')')
    expect(appJsContent).toContain('querySelectorAll(\'.tab-content\')')
    expect(appJsContent).toContain('data-tab="similarity"')
    expect(appJsContent).toContain('btn.classList.remove(\'active\')')
    expect(appJsContent).toContain('button.classList.add(\'active\')')
  })
  
  it('should have event listeners for UI interactions', () => {
    expect(appJsContent).toContain('resultSelect.addEventListener(\'change\'')
    expect(appJsContent).toContain('similarityMethodSelect.addEventListener(\'change\'')
    expect(appJsContent).toContain('button.addEventListener(\'click\'')
    expect(appJsContent).toContain('valueDiv.addEventListener(\'click\'')
    expect(appJsContent).toContain('closeButton.addEventListener(\'click\'')
    expect(appJsContent).toContain('modal.addEventListener(\'click\'')
  })
  
  it('should implement prompt caching mechanism', () => {
    expect(appJsContent).toContain('const promptCache = {}')
    expect(appJsContent).toContain('if (promptCache[promptId])')
    expect(appJsContent).toContain('promptCache[promptId] = data.content')
  })
  
  it('should implement modal dialog for comparison details', () => {
    expect(appJsContent).toContain('modal.className = \'similarity-modal\'')
    expect(appJsContent).toContain('modalContent.className = \'similarity-modal-content\'')
    expect(appJsContent).toContain('closeButton.className = \'close-modal\'')
    expect(appJsContent).toContain('document.body.appendChild(modal)')
  })
});

describe('UI HTML Structure', () => {
  let indexHtmlContent: string
  
  beforeEach(() => {
    const htmlPath = path.join(__dirname, '../../../src/server/public/index.html')
    indexHtmlContent = fs.readFileSync(htmlPath, 'utf-8')
  })
  
  it('should have the correct table structure', () => {
    expect(indexHtmlContent).toContain('<table id="results-table">')
    expect(indexHtmlContent).toContain('<thead>')
    expect(indexHtmlContent).toContain('<tbody id="results-body">')
  })
  
  it('should have the right column headers', () => {
    expect(indexHtmlContent).toContain('<th>Prompt</th>')
    expect(indexHtmlContent).toContain('<th>Response</th>')
    // Should not have the weight column anymore
    expect(indexHtmlContent).not.toContain('<th>Weight')
  })
  
  it('should include a dropdown for result selection', () => {
    expect(indexHtmlContent).toContain('<select id="result-select">')
  })
  
  it('should have tab navigation UI', () => {
    expect(indexHtmlContent).toContain('<div class="tabs">')
    expect(indexHtmlContent).toContain('<button class="tab-button active" data-tab="results">Results</button>')
    expect(indexHtmlContent).toContain('<button class="tab-button" data-tab="similarity">Similarity Matrix</button>')
    expect(indexHtmlContent).toContain('<div id="results-container" class="tab-content active" data-tab="results">')
    expect(indexHtmlContent).toContain('<div id="similarity-container" class="tab-content" data-tab="similarity">')
  })
  
  it('should include similarity matrix controls', () => {
    expect(indexHtmlContent).toContain('<div class="matrix-controls">')
    expect(indexHtmlContent).toContain('<label for="similarity-method">Similarity Method:</label>')
    expect(indexHtmlContent).toContain('<select id="similarity-method">')
    expect(indexHtmlContent).toContain('<option value="average">Average</option>')
    expect(indexHtmlContent).toContain('<option value="cosine">Cosine</option>')
    expect(indexHtmlContent).toContain('<option value="jaccard">Jaccard</option>')
    expect(indexHtmlContent).toContain('<option value="levenshtein">Levenshtein</option>')
    expect(indexHtmlContent).toContain('<div id="similarity-matrix"></div>')
  })
  
  it('should load the required CSS and JS files', () => {
    expect(indexHtmlContent).toContain('<link rel="stylesheet" href="styles.css">')
    expect(indexHtmlContent).toContain('<script src="app.js">')
  })
})

describe('UI CSS Styling', () => {
  let cssContent: string
  
  beforeEach(() => {
    const cssPath = path.join(__dirname, '../../../src/server/public/styles.css')
    cssContent = fs.readFileSync(cssPath, 'utf-8')
  })
  
  it('should style the model name/prompt column', () => {
    expect(cssContent).toContain('td:first-child')
    expect(cssContent).toContain('font-size: 13px')
    expect(cssContent).toContain('max-width: 200px')
  })
  
  it('should style the table layout', () => {
    expect(cssContent).toContain('table {')
    expect(cssContent).toContain('th, td {')
  })
  
  it('should style prompt content display', () => {
    expect(cssContent).toContain('.prompt-content')
  })
  
  it('should style the response display', () => {
    expect(cssContent).toContain('.response')
  })
  
  it('should style the tab navigation', () => {
    expect(cssContent).toContain('.tabs {')
    expect(cssContent).toContain('.tab-button {')
    expect(cssContent).toContain('.tab-button.active {')
    expect(cssContent).toContain('.tab-content {')
    expect(cssContent).toContain('.tab-content.active {')
  })
  
  it('should style the similarity matrix elements', () => {
    expect(cssContent).toContain('.similarity-table {')
    expect(cssContent).toContain('.similarity-value {')
    expect(cssContent).toContain('.similarity-table th {')
    expect(cssContent).toContain('.similarity-table td {')
  })
  
  it('should style the modal dialog', () => {
    expect(cssContent).toContain('.similarity-modal {')
    expect(cssContent).toContain('.similarity-modal-content {')
    expect(cssContent).toContain('.close-modal {')
    expect(cssContent).toContain('.response-comparison {')
    expect(cssContent).toContain('.response-column {')
  })
  
  it('should not contain unused weight-related styles', () => {
    expect(cssContent).not.toContain('.weight')
    expect(cssContent).not.toContain('.similarity-high')
    expect(cssContent).not.toContain('.similarity-medium')
    expect(cssContent).not.toContain('.similarity-low')
  })
})