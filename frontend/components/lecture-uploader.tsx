"use client"

import React, { useEffect, useState } from "react"
import { Upload, FileText, Download, Sparkles, Loader2, Globe } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useSearchParams } from "next/navigation"

interface ProcessedResult {
  summary: string
  ankiCards: Array<{ front: string; back: string }>
  slides: number
  slides_base64?: string[]
  explanations?: any[]
}

export function LectureUploader() {
  const [file, setFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState<ProcessedResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [language, setLanguage] = useState<string>("Spanish")
  const [email, setEmail] = useState<string>("")
  const [jobId, setJobId] = useState<string>("")
  const [jobStatus, setJobStatus] = useState<string>("")
  const [jobOutputs, setJobOutputs] = useState<any | null>(null)
  const [isPurchasing, setIsPurchasing] = useState(false)
  const searchParams = useSearchParams()

  useEffect(() => {
    const success = searchParams.get("success")
    const canceled = searchParams.get("canceled")
    if (success) {
      setError(null)
    }
    if (canceled) {
      setError("Checkout canceled. No charges were made.")
    }
  }, [searchParams])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile && selectedFile.type === "application/pdf") {
      setFile(selectedFile)
      setError(null)
      setResult(null)
    } else {
      setError("Please select a valid PDF file")
    }
  }

  const handleUpload = async () => {
    if (!file) return
    if (!email) { setError("Please enter your email first."); return }

    setIsProcessing(true)
    setError(null)
    setResult(null)
    setJobId("")
    setJobStatus("")
    setJobOutputs(null)

    try {
      // 1) Get presigned URL
      const presignRes = await fetch("/api/upload-url", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, filename: file.name, contentType: file.type || "application/pdf" })
      })
      if (!presignRes.ok) throw new Error("Failed to request upload URL")
      const { key, url } = await presignRes.json()

      // 2) PUT file to S3
      const putRes = await fetch(url, { method: "PUT", headers: { "content-type": file.type || "application/pdf" }, body: file })
      if (!putRes.ok) throw new Error("Failed to upload to S3")

      // 3) Start processing job (credits will be checked server-side)
      const procRes = await fetch("/api/process-lecture", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, s3Key: key, language })
      })
      if (procRes.status === 402) {
        setError("Insufficient credits. Please purchase a credit and try again.")
        return
      }
      if (!procRes.ok) throw new Error("Failed to start processing job")
      const { jobId } = await procRes.json()
      setJobId(jobId)
      setJobStatus("pending")

      // 4) Poll for completion
      const start = Date.now()
      const poll = async () => {
        if (!jobId) return
        const res = await fetch(`/api/jobs/${jobId}`)
        if (!res.ok) return
        const data = await res.json()
        setJobStatus(data.status)
        if (data.status === "completed") {
          setJobOutputs(data.outputs_json || null)
          setIsProcessing(false)
          return
        }
        if (Date.now() - start < 1000 * 60 * 5) { // up to 5 minutes
          setTimeout(poll, 2000)
        } else {
          setIsProcessing(false)
          setError("Processing is taking longer than expected. You will receive an email when it is ready.")
        }
      }
      setTimeout(poll, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
      setIsProcessing(false)
    }
  }

  const handleBuyCredit = async () => {
    if (!email) { setError("Please enter your email before purchasing."); return }
    setIsPurchasing(true)
    setError(null)
    try {
      const res = await fetch("/api/checkout/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, quantity: 1 })
      })
      if (!res.ok) throw new Error("Failed to create checkout session")
      const data = await res.json()
      if (data?.url) {
        window.location.href = data.url
      } else {
        throw new Error("No checkout URL returned")
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkout error")
    } finally {
      setIsPurchasing(false)
    }
  }

  const handleDownloadDocx = async () => {
    if (!result) return

    try {
      const response = await fetch("/api/generate-docx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result),
      })

      if (!response.ok) {
        throw new Error("Failed to generate document")
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${file?.name.replace(".pdf", "")}-summary.docx` || "lecture-summary.docx"
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      setError("Failed to download document")
    }
  }

  const handleDownloadAnki = () => {
    if (!result) return

    const ankiText = result.ankiCards.map((card) => `${card.front}\t${card.back}`).join("\n")

    const blob = new Blob([ankiText], { type: "text/plain" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${file?.name.replace(".pdf", "")}-anki.txt` || "anki-cards.txt"
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  }

  return (
    <div className="space-y-6">
      <Card className="border-2 border-orange-500/20 shadow-xl bg-white/80 backdrop-blur rounded-2xl">
        <CardHeader className="text-center pb-6">
          <div className="mb-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 text-orange-600 text-xs font-medium">
            Upload & Convert
          </div>
          <CardTitle className="flex items-center justify-center gap-2 text-2xl">
            <Upload className="h-6 w-6 text-orange-600" />
            Upload Lecture Slides
          </CardTitle>
          <CardDescription className="text-gray-600">Upload your PDF lecture slides to generate study materials</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-md border border-orange-300 bg-white/90 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
            <div className="flex items-end">
              <Button onClick={handleBuyCredit} disabled={!email || isPurchasing} className="w-full bg-orange-600 hover:bg-orange-700 text-white">
                {isPurchasing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Buy 1 credit ($3)
              </Button>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-orange-300 bg-gradient-to-br from-orange-50/70 via-white to-purple-50/70 p-14 transition-all duration-300 hover:border-orange-400 hover:shadow-lg group">
            <FileText className="mb-4 h-16 w-16 text-orange-500 group-hover:text-orange-600 transition-colors" />
            <label htmlFor="file-upload" className="cursor-pointer">
              <span className="text-lg font-semibold text-orange-600 hover:text-orange-700 transition-colors">Choose a PDF file</span>
              <input id="file-upload" type="file" accept=".pdf" onChange={handleFileChange} className="hidden" />
            </label>
            {file && <p className="mt-3 text-sm text-gray-700 bg-white/90 px-3 py-1 rounded-full border">📄 {file.name}</p>}
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-blue-500" />
              <label className="text-sm font-semibold text-gray-700">Language for explanations:</label>
            </div>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="w-full border-blue-200 bg-white/80 hover:border-blue-400 transition-colors">
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent className="bg-white border-blue-200">
                <SelectItem value="Spanish">🇪🇸 Spanish</SelectItem>
                <SelectItem value="English">🇺🇸 English</SelectItem>
                <SelectItem value="Portuguese">🇵🇹 Portuguese</SelectItem>
                <SelectItem value="French">🇫🇷 French</SelectItem>
                <SelectItem value="German">🇩🇪 German</SelectItem>
                <SelectItem value="Italian">🇮🇹 Italian</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button 
            onClick={handleUpload} 
            disabled={!file || isProcessing} 
            className="w-full bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300" 
            size="lg"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Processing your slides...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-5 w-5" />
                Process with 1 credit
              </>
            )}
          </Button>

          {jobId && (
            <div className="text-sm text-gray-700">
              <div className="mb-1">Job: <span className="font-mono">{jobId}</span></div>
              <div>Status: <span className="font-semibold">{jobStatus || 'pending'}</span></div>
            </div>
          )}

          {jobOutputs && (
            <div className="rounded-lg border p-4 bg-white/70">
              <div className="text-sm font-semibold mb-2">Results</div>
              <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(jobOutputs, null, 2)}</pre>
            </div>
          )}
        </CardContent>
      </Card>

      {result && (
        <div className="space-y-6">
          {/* Processing Summary Card */}
          <Card className="border-2 shadow-lg bg-gradient-to-r from-green-50 to-blue-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-800">
                <Sparkles className="h-5 w-5" />
                Processing Complete!
              </CardTitle>
              <CardDescription className="text-green-700">
                Successfully processed {result.slides} slides • Generated {result.ankiCards.length} flashcards • Language: {language}
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-2 shadow-lg">
            <CardHeader>
              <CardTitle>📖 Summary & Key Concepts</CardTitle>
              <CardDescription>AI-generated summary of your lecture slides in {language}</CardDescription>
            </CardHeader>
            <CardContent>
              {result.slides_base64 && result.slides_base64.length > 0 && (
                <div className="mb-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {result.slides_base64.map((b64, idx) => (
                    <img key={idx} src={`data:image/png;base64,${b64}`} alt={`Slide ${idx + 1}`} className="w-full h-auto rounded border" />
                  ))}
                </div>
              )}
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <div className="whitespace-pre-wrap rounded-lg bg-secondary/50 p-6 leading-relaxed text-black">

                  {result.summary}
                </div>
              </div>
              <Button onClick={handleDownloadDocx} className="mt-4 bg-transparent" variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Download as .docx
              </Button>
            </CardContent>
          </Card>

          <Card className="border-2 shadow-lg">
            <CardHeader>
              <CardTitle>🧠 Anki Flashcards</CardTitle>
              <CardDescription>{result.ankiCards.length} flashcards generated for spaced repetition learning</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {result.ankiCards.slice(0, 3).map((card, index) => (
                  <div key={index} className="rounded-lg border bg-gradient-to-r from-blue-50 to-purple-50 p-4 shadow-sm">
                    <p className="mb-2 font-semibold text-blue-900">Q: {card.front}</p>
                    <p className="text-sm text-purple-800">A: {card.back}</p>
                  </div>
                ))}
                {result.ankiCards.length > 3 && (
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-2">
                      + {result.ankiCards.length - 3} more cards available for download
                    </p>
                    <details className="text-left">
                      <summary className="cursor-pointer text-sm text-primary hover:underline">
                        Show all cards preview
                      </summary>
                      <div className="mt-3 space-y-2 max-h-60 overflow-y-auto">
                        {result.ankiCards.slice(3).map((card, index) => (
                          <div key={index + 3} className="rounded border bg-gray-50 p-2 text-xs">
                            <p className="font-medium text-gray-800">Q: {card.front}</p>
                            <p className="text-gray-600">A: {card.back}</p>
                          </div>
                        ))}
                      </div>
                    </details>
                  </div>
                )}
              </div>
              <Button onClick={handleDownloadAnki} className="mt-4 bg-transparent" variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Download Anki Cards (.txt)
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
