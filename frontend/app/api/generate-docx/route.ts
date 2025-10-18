import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs/promises'
import { v4 as uuidv4 } from 'uuid'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { summary, ankiCards, slides_base64, explanations } = body

    console.log('DOCX API received:', { summary: summary?.substring(0, 100), ankiCardsCount: ankiCards?.length })

    if (!summary) {
      return NextResponse.json({ error: 'No summary provided' }, { status: 400 })
    }

    // Create temporary file with data
    const tempId = uuidv4()
    const tempDir = path.join(process.cwd(), 'temp')
    await fs.mkdir(tempDir, { recursive: true })
    const tempFilePath = path.join(tempDir, `${tempId}.json`)

    // Save data to temp file
    await fs.writeFile(tempFilePath, JSON.stringify({ summary, ankiCards, slides_base64, explanations }))

    // Call Python script to generate DOCX
    const pythonScriptPath = path.join(process.cwd(), '..', 'slide_explainer.py')
    
    return new Promise<NextResponse>((resolve) => {
      const python = spawn(
        'python3',
        [pythonScriptPath, '--docx', '--data-file', tempFilePath],
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
            if (result.docx_path) {
              // Read the generated DOCX file
              const docxData = await fs.readFile(result.docx_path)
              
              // Clean up generated file
              try {
                await fs.unlink(result.docx_path)
              } catch (e) {
                console.error('Failed to clean up generated file:', e)
              }

              // Return the file as response  
              resolve(new NextResponse(new Uint8Array(docxData), {
                headers: {
                  'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                  'Content-Disposition': 'attachment; filename="lecture-summary.docx"'
                }
              }))
            } else {
              resolve(NextResponse.json({ error: 'No DOCX file generated' }, { status: 500 }))
            }
          } catch (parseError) {
            resolve(NextResponse.json({ error: 'Failed to parse Python output' }, { status: 500 }))
          }
        } else {
          console.error('Python docx script error:', error)
          resolve(NextResponse.json({ error: 'DOCX generation failed' }, { status: 500 }))
        }
      })
    })

  } catch (error) {
    console.error('DOCX API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}