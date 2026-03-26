'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  return (
    <main className="min-h-[100dvh] bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-100 via-white to-purple-100 dark:from-zinc-900 dark:via-zinc-950 dark:to-zinc-900 flex flex-col p-4 sm:p-12 relative overflow-hidden">
      {/* Decorative Gradients */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] -z-10 animate-float" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-accent/20 rounded-full blur-[120px] -z-10 animate-float delay-300" />

      <div className="w-full max-w-4xl mx-auto flex-1 relative z-10 flex flex-col justify-between sm:justify-center py-6 sm:py-0 animate-appear">
        
        {/* Header - Pushed to top on mobile */}
        <div className="text-center mt-12 sm:mt-0 sm:mb-16">
          <div className="inline-block mb-4 sm:mb-6 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] sm:text-sm font-bold tracking-wider uppercase animate-bounce">
            Real-time Multiplayer
          </div>
          <h1 className="text-[12vw] sm:text-5xl md:text-8xl font-black mb-3 leading-[0.9] tracking-tighter gradient-text uppercase italic">
            Sudoku<br className="sm:hidden" /> Mastery
          </h1>
          <p className="text-sm sm:text-base md:text-2xl text-muted-foreground/80 max-w-md mx-auto font-medium leading-relaxed px-4 mt-4">
            Challenge your friends, sync your moves, and solve puzzles together.
          </p>
        </div>

        {/* Action Cards - Pushed to bottom on mobile */}
        <div className="flex flex-col sm:grid sm:grid-cols-2 gap-4 md:gap-8 w-full mt-auto mb-4 sm:mb-16">
          <Link href="/create" className="group flex-1">
            <div className="glass-card h-full p-6 md:p-10 rounded-[2rem] md:rounded-[2.5rem] hover:scale-[1.02] transition-all duration-500 border-white/40 border-2 shadow-xl md:shadow-2xl overflow-hidden relative">
              <div className="absolute top-0 right-0 p-4 md:p-8 text-6xl md:text-8xl opacity-10 group-hover:opacity-20 transition-opacity">➕</div>
              <div className="relative z-10">
                <div className="flex items-center gap-4 mb-3 md:mb-6">
                  <div className="w-12 h-12 md:w-16 md:h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-2xl md:text-4xl shadow-md border border-primary/20 shrink-0">🔥</div>
                  <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-foreground">Create Game</h2>
                </div>
                <p className="text-muted-foreground mb-4 md:mb-8 text-xs sm:text-sm md:text-lg font-medium leading-relaxed">
                  Start a session, select difficulty, and invite a partner.
                </p>
                <Button className="w-full h-12 md:h-14 text-base md:text-lg font-black bg-primary hover:bg-primary/90 text-primary-foreground rounded-2xl shadow-lg ring-offset-background group-hover:ring-4 ring-primary/20 transition-all">
                  Get Started
                </Button>
              </div>
            </div>
          </Link>

          <Link href="/join" className="group flex-1">
            <div className="glass-card h-full p-6 md:p-10 rounded-[2rem] md:rounded-[2.5rem] hover:scale-[1.02] transition-all duration-500 border-white/40 border-2 shadow-xl md:shadow-2xl overflow-hidden relative">
              <div className="absolute top-0 right-0 p-4 md:p-8 text-6xl md:text-8xl opacity-10 group-hover:opacity-20 transition-opacity">🔗</div>
              <div className="relative z-10">
                <div className="flex items-center gap-4 mb-3 md:mb-6">
                  <div className="w-12 h-12 md:w-16 md:h-16 bg-secondary/10 rounded-2xl flex items-center justify-center text-2xl md:text-4xl shadow-md border border-secondary/20 shrink-0">⚡</div>
                  <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-foreground">Join Session</h2>
                </div>
                <p className="text-muted-foreground mb-4 md:mb-8 text-xs sm:text-sm md:text-lg font-medium leading-relaxed">
                  Have a room code? Enter it to sync with your friend instantly.
                </p>
                <Button className="w-full h-12 md:h-14 text-base md:text-lg font-black bg-secondary hover:bg-secondary/90 text-secondary-foreground rounded-2xl shadow-lg ring-offset-background group-hover:ring-4 ring-secondary/20 transition-all">
                  Enter Code
                </Button>
              </div>
            </div>
          </Link>
        </div>

        {/* Feature Grid - Hidden on mobile */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 hidden sm:grid">
          {[
            { icon: '⚡', label: 'Real-time sync' },
            { icon: '🎯', label: '5 Levels' },
            { icon: '🤝', label: 'Invite Link' },
            { icon: '📱', label: 'Responsive' }
          ].map((feat, i) => (
            <div key={i} className="glass-card p-2 md:p-4 rounded-xl md:rounded-2xl flex items-center justify-center sm:justify-start gap-2 md:gap-3 border-white/50 border bg-white/40 hover:bg-white/60 transition-colors">
              <span className="text-lg md:text-2xl">{feat.icon}</span>
              <span className="font-bold text-xs md:text-sm tracking-tight">{feat.label}</span>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
