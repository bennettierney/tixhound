import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { TrendingDown, Bell, BarChart2, Zap, Shield, ExternalLink } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="border-b border-border sticky top-0 z-50 bg-background/80 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-primary">TixHound</span>
            <Badge variant="secondary" className="text-xs">Beta</Badge>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost">Log in</Button>
            </Link>
            <Link href="/signup">
              <Button>Get Started Free</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 py-24 text-center">
        <Badge className="mb-6 bg-primary/10 text-primary border-primary/20">
          Track prices across StubHub, Vivid Seats, TickPick &amp; more
        </Badge>
        <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
          Never overpay for
          <span className="text-primary"> tickets</span> again
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
          TixHound monitors ticket prices 24/7 and alerts you the moment prices drop.
          Track concerts, sports, and events all in one place.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/signup">
            <Button size="lg" className="w-full sm:w-auto px-8">
              Start tracking for free
            </Button>
          </Link>
          <Link href="/events">
            <Button size="lg" variant="outline" className="w-full sm:w-auto px-8">
              Browse events
            </Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-center mb-12">Everything you need to buy smarter</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: BarChart2,
              title: 'Price History Charts',
              desc: 'See exactly how prices have moved over time so you can spot the best buying window.',
            },
            {
              icon: Bell,
              title: 'Instant Price Alerts',
              desc: 'Set a target price and get emailed the moment tickets drop below it.',
            },
            {
              icon: TrendingDown,
              title: 'Multi-Platform Comparison',
              desc: 'Compare prices across StubHub, Vivid Seats, TickPick, and Gametime side by side.',
            },
            {
              icon: Zap,
              title: 'No-Fee Platform Highlights',
              desc: 'We surface TickPick listings prominently — what you see is what you pay.',
            },
            {
              icon: Shield,
              title: 'Track up to 3 Events Free',
              desc: 'No credit card required. Start tracking today with our generous free tier.',
            },
            {
              icon: ExternalLink,
              title: 'One-Click Buy Links',
              desc: 'Jump straight to the listing on your preferred platform when the price is right.',
            },
          ].map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="bg-card border border-border rounded-xl p-6"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">{title}</h3>
              <p className="text-sm text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-4 py-20 text-center">
        <div className="bg-card border border-border rounded-2xl p-12">
          <h2 className="text-3xl font-bold mb-4">Ready to stop overpaying?</h2>
          <p className="text-muted-foreground mb-8">
            Join thousands of smart ticket buyers who use TixHound to find the best deals.
          </p>
          <Link href="/signup">
            <Button size="lg" className="px-12">Create free account</Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="max-w-6xl mx-auto px-4 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} TixHound. Track smarter, buy better.
        </div>
      </footer>
    </div>
  )
}
