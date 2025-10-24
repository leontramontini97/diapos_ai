import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ArrowRight, FileText, Brain, Zap, Sparkles, CheckCircle } from "lucide-react"
import { Navigation } from "@/components/navigation"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <Navigation variant="landing" />

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 md:py-32">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 text-sm font-medium">
            <Sparkles className="w-4 h-4" />
            AI-Powered Study Assistant
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-balance">
            Transform Lecture Slides into <span className="text-orange-500">Study Materials</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto text-pretty leading-relaxed">
            Upload your PDF lecture slides and get AI-generated summaries, key concepts, and Anki flashcards in seconds.
            Study smarter, not harder.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/upload">
              <Button size="lg" className="bg-orange-500 hover:bg-orange-600 text-white text-lg px-8 h-12">
                Start Converting
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="text-lg px-8 h-12 bg-transparent">
              Watch Demo
            </Button>
          </div>
          <div className="pt-8 flex items-center justify-center gap-8 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-teal-500" />
              Free to use
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-teal-500" />
              No signup required
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-teal-500" />
              Instant results
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="container mx-auto px-4 py-20 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-balance">Everything You Need to Study Better</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto text-pretty">
              Powered by advanced AI to extract, summarize, and organize your lecture content
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="p-6 space-y-4 border-2 hover:border-orange-500/50 transition-colors">
              <div className="w-12 h-12 bg-orange-500/10 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-orange-500" />
              </div>
              <h3 className="text-xl font-semibold">Smart Summaries</h3>
              <p className="text-muted-foreground leading-relaxed">
                Get comprehensive .docx summaries with key concepts, explanations, and important details extracted from
                your slides.
              </p>
            </Card>
            <Card className="p-6 space-y-4 border-2 hover:border-teal-500/50 transition-colors">
              <div className="w-12 h-12 bg-teal-500/10 rounded-lg flex items-center justify-center">
                <Brain className="w-6 h-6 text-teal-500" />
              </div>
              <h3 className="text-xl font-semibold">Anki Flashcards</h3>
              <p className="text-muted-foreground leading-relaxed">
                Automatically generate Anki-compatible flashcards to help you memorize and retain information
                effectively.
              </p>
            </Card>
            <Card className="p-6 space-y-4 border-2 hover:border-orange-500/50 transition-colors">
              <div className="w-12 h-12 bg-orange-500/10 rounded-lg flex items-center justify-center">
                <Zap className="w-6 h-6 text-orange-500" />
              </div>
              <h3 className="text-xl font-semibold">Lightning Fast</h3>
              <p className="text-muted-foreground leading-relaxed">
                Process your lecture slides in seconds with our optimized AI pipeline. No waiting, just instant study
                materials.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-balance">Simple 3-Step Process</h2>
            <p className="text-lg text-muted-foreground text-pretty">
              From lecture slides to study materials in minutes
            </p>
          </div>
          <div className="space-y-8">
            <div className="flex gap-6 items-start">
              <div className="w-12 h-12 bg-orange-500 text-white rounded-full flex items-center justify-center font-bold text-xl flex-shrink-0">
                1
              </div>
              <div className="space-y-2 pt-2">
                <h3 className="text-2xl font-semibold">Upload Your PDF</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Drag and drop your lecture slides or click to browse. We support any PDF file format.
                </p>
              </div>
            </div>
            <div className="flex gap-6 items-start">
              <div className="w-12 h-12 bg-teal-500 text-white rounded-full flex items-center justify-center font-bold text-xl flex-shrink-0">
                2
              </div>
              <div className="space-y-2 pt-2">
                <h3 className="text-2xl font-semibold">AI Processing</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Our AI analyzes your slides, extracts key concepts, and generates comprehensive study materials
                  automatically.
                </p>
              </div>
            </div>
            <div className="flex gap-6 items-start">
              <div className="w-12 h-12 bg-orange-500 text-white rounded-full flex items-center justify-center font-bold text-xl flex-shrink-0">
                3
              </div>
              <div className="space-y-2 pt-2">
                <h3 className="text-2xl font-semibold">Download & Study</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Get your formatted summary document and Anki flashcards ready to import and start studying
                  immediately.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20 bg-gradient-to-br from-orange-500/10 to-teal-500/10 rounded-3xl my-20">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          <h2 className="text-4xl md:text-5xl font-bold text-balance">Ready to Ace Your Exams?</h2>
          <p className="text-xl text-muted-foreground text-pretty">
            Join thousands of students who are studying smarter with AI-powered study materials
          </p>
          <Link href="/upload">
            <Button size="lg" className="bg-orange-500 hover:bg-orange-600 text-white text-lg px-8 h-12">
              Convert Your First Lecture
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
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
