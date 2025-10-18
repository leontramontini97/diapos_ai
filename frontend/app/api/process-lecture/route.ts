import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs/promises'
import { v4 as uuidv4 } from 'uuid'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const language = formData.get('language') as string || 'Spanish'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'File must be a PDF' }, { status: 400 })
    }

    // Create temporary file
    const tempId = uuidv4()
    const tempDir = path.join(process.cwd(), 'temp')
    await fs.mkdir(tempDir, { recursive: true })
    const tempFilePath = path.join(tempDir, `${tempId}.pdf`)

    // Save uploaded file
    const arrayBuffer = await file.arrayBuffer()
    await fs.writeFile(tempFilePath, new Uint8Array(arrayBuffer))

    // Call Python script to process the PDF
    const pythonScriptPath = path.join(process.cwd(), '..', 'slide_explainer.py')
    
    return new Promise<NextResponse>((resolve) => {
      const python = spawn(
        'python3',
        [pythonScriptPath, '--api', '--file', tempFilePath, '--language', language],
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
            console.log('Python output:', output.substring(0, 200))
            if (error) {
              console.error('Python stderr (non-fatal):', error.substring(0, 2000))
            }
            const result = JSON.parse(output)
            const normalizedCards = Array.isArray(result.anki_cards)
              ? result.anki_cards.map((c: any) => ({
                  front: c?.front ?? c?.pregunta ?? '',
                  back: c?.back ?? c?.respuesta ?? '',
                }))
              : []
            console.log('Parsed result:', { 
              summary: result.summary?.substring(0, 100), 
              ankiCardsCount: normalizedCards.length,
              slides: result.slides,
              slidesBase64: Array.isArray(result.slides_base64) ? result.slides_base64.length : undefined,
              explanationsCount: Array.isArray(result.explanations) ? result.explanations.length : undefined,
            })
            resolve(NextResponse.json({
              summary: result.summary,
              ankiCards: normalizedCards,
              slides: result.slides,
              slides_base64: result.slides_base64,
              explanations: result.explanations,
            }))
          } catch (parseError) {
            resolve(NextResponse.json({ error: 'Failed to parse Python output' }, { status: 500 }))
          }
        } else {
          console.error('Python script error:', error)
          resolve(NextResponse.json({ error: 'Processing failed' }, { status: 500 }))
        }
      })
    })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}