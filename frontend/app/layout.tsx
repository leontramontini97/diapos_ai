import './global.css'

export const metadata = {
  title: 'Transform Your Lecture Slides - AI Study Materials',
  description: 'Upload PDF slides and get AI-generated summaries with Anki flashcards for efficient studying',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  )
}
