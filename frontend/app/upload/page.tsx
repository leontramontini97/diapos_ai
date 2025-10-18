import Link from "next/link"
import { Brain } from "lucide-react"
import { Button } from "@/components/ui/button"
import { LectureUploader } from "@/components/lecture-uploader"

export default function UploadPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <Link href="/" className="font-bold text-xl">StudyAI</Link>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Home
            </Link>
            <Link href="/upload">
              <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white">Convert PDF</Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-4 pt-10 md:pt-16 pb-4">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 text-sm font-medium mb-4">
            Upload & Convert
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-3">Convert Your Lecture PDF</h1>
          <p className="text-muted-foreground text-lg">
            Generate a polished .docx summary, view slide thumbnails, and download Anki flashcards in one place.
          </p>
        </div>
      </section>

      {/* Uploader */}
      <section className="container mx-auto px-4 pb-16">
        <div className="mx-auto max-w-4xl">
          <LectureUploader />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl">StudyAI</span>
            </div>
            <p className="text-sm text-muted-foreground">© 2025 StudyAI. Empowering students with AI.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}


