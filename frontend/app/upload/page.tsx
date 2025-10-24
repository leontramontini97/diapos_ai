import { Suspense } from "react"
import { Brain } from "lucide-react"
import { LectureUploader } from "@/components/lecture-uploader"
import { Navigation } from "@/components/navigation"

export default function UploadPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <Navigation />

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
          <Suspense fallback={<div className="text-center text-sm text-muted-foreground">Loading…</div>}>
            <LectureUploader />
          </Suspense>
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


