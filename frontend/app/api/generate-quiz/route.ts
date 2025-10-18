import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs/promises'
import { v4 as uuidv4 } from 'uuid'

export async function POST(request: NextRequest) {
  try {
    const { ankiCards } = await request.json()

    if (!ankiCards || !Array.isArray(ankiCards)) {
      return NextResponse.json({ error: 'Invalid anki cards provided' }, { status: 400 })
    }

    // Create temporary file with anki cards
    const tempId = uuidv4()
    const tempDir = path.join(process.cwd(), 'temp')
    await fs.mkdir(tempDir, { recursive: true })
    const tempFilePath = path.join(tempDir, `${tempId}.json`)

    // Save anki cards to temp file
    await fs.writeFile(tempFilePath, JSON.stringify(ankiCards))

    // Call Python script to generate quiz
    const pythonScriptPath = path.join(process.cwd(), '..', 'slide_explainer.py')
    
    return new Promise<NextResponse>((resolve) => {
      const python = spawn(
        'python3',
        [pythonScriptPath, '--quiz', '--anki-file', tempFilePath],
        {
          env: {
            ...process.env,
            OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
            PYTHONUNBUFFERED: '1',
          },
        }
      )
      
      let output = ''
      let error = ''

      python.stdout.on('data', (data) => {
        output += data.toString()
      })

      python.stderr.on('data', (data) => {
        error += data.toString()
      })

      python.on('close', async (code) => {
        // Clean up temp file
        try {
          await fs.unlink(tempFilePath)
        } catch (e) {
          console.error('Failed to clean up temp file:', e)
        }

        if (code === 0) {
          try {
            const result = JSON.parse(output)
            resolve(NextResponse.json({ questions: result.questions }))
          } catch (parseError) {
            resolve(NextResponse.json({ error: 'Failed to parse Python quiz output' }, { status: 500 }))
          }
        } else {
          console.error('Python quiz script error:', error)
          resolve(NextResponse.json({ error: 'Quiz generation failed' }, { status: 500 }))
        }
      })
    })

  } catch (error) {
    console.error('Quiz API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}