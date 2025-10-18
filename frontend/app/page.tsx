import { LectureUploader } from "@/components/lecture-uploader"

export default function Home() {
  return (
    <main style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #eff6ff 0%, #ffffff 50%, #faf5ff 100%)' }}>
      <div className="container mx-auto px-4 py-12">
        <div className="mx-auto max-w-4xl">
          <div className="mb-12 text-center">
            <h1 className="mb-4 text-5xl font-bold tracking-tight text-balance bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Transform Your Lecture Slides
            </h1>
            <p className="text-xl text-gray-600 text-pretty max-w-3xl mx-auto">
              Upload your PDF slides and get AI-generated summaries with key concepts and Anki flashcards for efficient studying
            </p>
          </div>

          <LectureUploader />
        </div>
      </div>
    </main>
  )
}
