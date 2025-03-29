import express from 'express'
import path from 'path'
import fs from 'fs'

const app = express()
const port = 3000

app.use(express.static(path.join(__dirname, 'public')))

app.get('/api/results', (req, res) => {
  const resultsDir = path.join(__dirname, '..', '..', 'results')
  try {
    const files = fs
      .readdirSync(resultsDir)
      .filter(file => file.endsWith('.json'))
      .sort((a, b) => {
        const aTime = fs.statSync(path.join(resultsDir, a)).mtime.getTime()
        const bTime = fs.statSync(path.join(resultsDir, b)).mtime.getTime()
        return bTime - aTime
      })
    res.json({ files })
  } catch (error) {
    res.status(500).json({ error: 'Failed to read results directory' })
  }
})

app.get('/api/results/:filename', (req, res) => {
  const filename = req.params.filename
  const filePath = path.join(__dirname, '..', '..', 'results', filename)

  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8')
      res.json(JSON.parse(data))
    } else {
      res.status(404).json({ error: 'File not found' })
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to read file' })
  }
})

app.get('/api/prompts/:promptId', (req, res) => {
  const promptId = req.params.promptId
  const promptPath = path.join(
    __dirname,
    '..',
    '..',
    'prompts',
    `${promptId}.md`
  )

  try {
    if (fs.existsSync(promptPath)) {
      const data = fs.readFileSync(promptPath, 'utf8')
      res.json({ content: data })
    } else {
      res.status(404).json({ error: 'Prompt not found' })
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to read prompt' })
  }
})

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'))
})

app.listen(port, () => {
  console.log(`UI server running at http://localhost:${port}`)
  console.log(`Press Ctrl+C to exit`)
})
