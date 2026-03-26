'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { Spinner } from '@/components/ui/spinner';

type Difficulty = 'easy' | 'medium' | 'hard' | 'expert' | 'master';

const DIFFICULTIES: { value: Difficulty; label: string; description: string }[] = [
  {
    value: 'easy',
    label: 'Easy',
    description: '30 clues • Perfect for beginners',
  },
  {
    value: 'medium',
    label: 'Medium',
    description: '40 clues • Good warm-up',
  },
  {
    value: 'hard',
    label: 'Hard',
    description: '50 clues • Challenging',
  },
  {
    value: 'expert',
    label: 'Expert',
    description: '60 clues • Very difficult',
  },
  {
    value: 'master',
    label: 'Master',
    description: '70 clues • Extreme challenge',
  },
];

export default function CreateGamePage() {
  const router = useRouter();
  const [playerName, setPlayerName] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/games/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ difficulty, playerName: playerName.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to create game');
      }

      const data = await response.json();
      localStorage.setItem('sudoku-player-name', playerName.trim());
      if (data.playerId) localStorage.setItem('sudoku-player-id', data.playerId);
      router.push(`/game/${data.gameId}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create game. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-[100dvh] bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-100 via-white to-purple-100 dark:from-zinc-900 dark:via-zinc-950 dark:to-zinc-900 flex items-center justify-center p-4 sm:p-12 relative overflow-hidden">
      {/* Decorative Gradients */}
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-primary/20 rounded-full blur-[100px] -z-10 animate-float hidden md:block" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-accent/20 rounded-full blur-[100px] -z-10 animate-float delay-300 hidden md:block" />

      <div className="w-full max-w-2xl relative z-10 animate-appear">
        {/* Back Button */}
        <Link href="/" className="inline-flex items-center text-primary hover:text-primary/80 mb-4 md:mb-8 transition-all hover:-translate-x-1 font-bold text-sm md:text-base">
          <span className="mr-2">←</span>
          Back to Home
        </Link>

        {/* Card */}
        <div className="glass-card rounded-3xl md:rounded-[2.5rem] p-5 md:p-12 border-2 border-white/40 shadow-2xl">
          <h1 className="text-3xl md:text-5xl font-black mb-1 md:mb-2 gradient-text tracking-tight uppercase italic mt-1">
            Create Session
          </h1>
          <p className="text-muted-foreground mb-4 md:mb-10 font-medium text-xs md:text-base">
            Choose your challenge level and prepare to invite your partner.
          </p>

          {/* Player Name Input */}
          <div className="mb-4 md:mb-10">
            <label className="block text-xs md:text-sm font-bold text-foreground/80 uppercase tracking-widest mb-2 md:mb-4">
              Your Name
            </label>
            <Input
              placeholder="How should we call you?"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              disabled={loading}
              className="h-12 md:h-14 text-base md:text-lg rounded-xl md:rounded-2xl bg-white/50 border-2 border-zinc-200 hover:border-primary/50 focus:border-primary dark:border-white/10 dark:hover:border-primary/40 focus:ring-primary/30 font-medium transition-colors"
            />
          </div>

          {/* Difficulty Selection */}
          <div className="mb-6 md:mb-10">
            <label className="block text-xs md:text-sm font-bold text-foreground/80 uppercase tracking-widest mb-2 md:mb-4">
              Difficulty Level
            </label>
            <div className="grid grid-cols-2 md:grid-cols-2 gap-2 md:gap-4">
              {DIFFICULTIES.map((d, idx) => (
                <button
                  key={d.value}
                  onClick={() => setDifficulty(d.value)}
                  disabled={loading}
                  className={`p-3 md:p-5 rounded-xl md:rounded-2xl border-2 transition-all text-left relative overflow-hidden group ${
                    idx === DIFFICULTIES.length - 1 ? 'col-span-2 md:col-span-1' : ''
                  } ${
                    difficulty === d.value
                      ? 'border-primary bg-primary/5 shadow-inner'
                      : 'border-zinc-200 dark:border-white/10 bg-white/50 dark:bg-white/5 hover:border-primary/40 hover:bg-white/80 dark:hover:bg-white/10'
                  } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <div className={`font-black text-sm md:text-lg uppercase md:capitalize tracking-tight md:tracking-normal ${difficulty === d.value ? 'text-primary' : 'text-foreground/80'}`}>
                    {d.label}
                  </div>
                  <div className="text-[10px] md:text-sm text-muted-foreground font-medium mt-0 md:mt-1 hidden sm:block truncate">
                    {d.description}
                  </div>
                  {difficulty === d.value && (
                    <div className="absolute top-1.5 md:top-2 right-2 text-primary animate-pulse text-xs md:text-base">●</div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-destructive/10 border border-destructive/30 text-destructive px-5 py-4 rounded-2xl mb-8 text-sm font-bold animate-shake">
              {error}
            </div>
          )}

          {/* Create Button */}
          <Button
            onClick={handleCreate}
            disabled={loading || !playerName.trim()}
            className="w-full h-12 md:h-16 text-lg md:text-xl font-black bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl md:rounded-2xl shadow-xl hover:scale-[1.01] active:scale-[0.99] transition-all ring-offset-background hover:ring-4 ring-primary/20"
          >
            {loading ? (
              <div className="flex items-center gap-2 md:gap-3">
                <Spinner className="w-4 h-4 md:w-5 md:h-5" />
                Initializing...
              </div>
            ) : (
              'Launch Session'
            )}
          </Button>
        </div>
      </div>
    </main>
  );
}
