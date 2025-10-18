import { LectureUploader } from "@/components/lecture-uploader"

export default function UploadPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <section className="container mx-auto px-4 py-10 md:py-16">
        <div className="mx-auto max-w-4xl">
          <h1 className="mb-6 text-3xl md:text-4xl font-bold tracking-tight">Upload and Convert Your Lecture PDF</h1>
          <p className="mb-10 text-muted-foreground">
            Choose a PDF file, select your preferred language, and generate a summary, Anki flashcards, and a .docx report.
          </p>
          <LectureUploader />
        </div>
      </section>
    </main>
  )
}


