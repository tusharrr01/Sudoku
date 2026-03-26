'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { SudokuBoard } from '@/components/sudoku-board';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface GameData {
  game: {
    id: string;
    room_code: string;
    puzzle: number[][];
    solution: number[][];
    difficulty: string;
    status: string;
    mistakes?: number;
  };
  state: {
    current_grid: number[][];
  };
  players: Array<{ id: string; player_name: string; is_creator: boolean }>;
}

export default function GamePage() {
  const params = useParams();
  const router = useRouter();
  const gameId = params.gameId as string;

  const [gameData, setGameData] = useState<GameData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [gameCode, setGameCode] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchGameData = useCallback(async () => {
    try {
      const response = await fetch(`/api/games/state?gameId=${gameId}`);
      if (!response.ok) throw new Error('Failed to load game');
      const data = await response.json();
      setGameData(data);
      setGameCode(data.game.room_code);
    } catch (err) {
      setError('Failed to load game. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [gameId]);

  // Initial Fetch
  useEffect(() => {
    if (mounted && gameId) {
      fetchGameData();
    }
  }, [mounted, gameId, fetchGameData]);

  // STABLE Real-time Channel (one subscription per gameId)
  useEffect(() => {
    if (!mounted || !gameId) return;

    const channel = supabase
      .channel(`game-${gameId}`, {
        config: { broadcast: { self: true } }
      })
      .on(
        'broadcast',
        { event: 'refresh_state' },
        () => fetchGameData()
      )
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          setTimeout(() => {
            channel.send({
              type: 'broadcast',
              event: 'refresh_state',
              payload: {}
            });
          }, 500);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId, mounted, fetchGameData]);

  // Polling Fallback (Aggressive but targeted)
  useEffect(() => {
    if (!mounted || !gameId || !gameData) return;

    // Only poll if waiting for a partner
    if (gameData.game.status !== 'waiting' && gameData.players.length >= 2) return;

    const pollInterval = setInterval(() => {
      fetchGameData();
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [gameId, mounted, gameData?.game.status, gameData?.players.length, fetchGameData, !!gameData]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(gameCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-background via-background to-muted flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <Spinner className="w-8 h-8" />
          <p className="text-muted-foreground">Loading game...</p>
        </div>
      </main>
    );
  }

  if (error || !gameData) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-background via-background to-muted flex items-center justify-center p-4">
        <div className="bg-white dark:bg-card rounded-2xl shadow-lg p-8 max-w-md text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Game Not Found</h1>
          <p className="text-muted-foreground mb-6">{error}</p>
          <Link href="/">
            <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
              Back to Home
            </Button>
          </Link>
        </div>
      </main>
    );
  }

  if (!mounted) return null;

  return (
    <main className="min-h-[100dvh] bg-gradient-to-br from-background via-background to-muted p-2 sm:p-4 md:p-8 flex flex-col items-center justify-center pb-[80px]">
      <div className="w-full max-w-md md:max-w-4xl">
        {/* Compact Header */}
        <div className="flex items-center justify-between gap-2 mb-2 w-full px-1">
          <button onClick={() => setShowLeaveConfirm(true)} className="inline-flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white dark:bg-card border border-border text-primary hover:bg-primary/10 transition-colors flex-shrink-0 shadow-sm cursor-pointer z-[50]">
            <span className="text-xl leading-none -mt-0.5 font-bold">←</span>
          </button>
          <div className="bg-white dark:bg-card rounded-full px-4 py-1.5 sm:px-6 sm:py-2 border border-border flex-shrink-0 shadow-sm">
            <span className="text-[10px] sm:text-xs font-black tracking-wider uppercase text-foreground">{gameData.game.difficulty}</span>
          </div>
        </div>

        {/* Game Status overlay is now handled inside SudokuBoard */}

        {/* Game Board Section */}
        <SudokuBoard
          gameId={gameId}
          puzzle={gameData.game.puzzle}
          solution={gameData.game.solution}
          currentGrid={gameData.state.current_grid}
          players={gameData.players}
          mistakes={gameData.game.mistakes || 0}
          status={gameData.game.status}
        />


      </div>

      {/* FULL SCREEN WAITING POPUP */}
      {(gameData.game.status === 'waiting' && gameData.players.length < 2) && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 dark:bg-zinc-950/80 backdrop-blur-md p-4 animate-in fade-in duration-500">
          <div className="bg-white dark:bg-zinc-900 border-2 border-primary/20 shadow-2xl rounded-3xl p-6 sm:p-10 max-w-sm w-full flex flex-col items-center text-center animate-in zoom-in-95 duration-500 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-[40px] -z-10 animate-pulse" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-secondary/10 rounded-full blur-[40px] -z-10 animate-pulse delay-700" />

            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-primary/10 rounded-full flex items-center justify-center mb-4 sm:mb-6 animate-bounce shadow-lg border border-primary/30">
              <span className="text-4xl text-primary drop-shadow-md">⏳</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-foreground mb-2 uppercase tracking-tight">
              Waiting for Partner
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mb-6 font-medium">
              Share this room code. The game will start instantly when they join!
            </p>

            {/* Code Copy Box */}
            <div className="w-full bg-muted/50 dark:bg-zinc-950/50 rounded-2xl p-4 flex flex-col items-center justify-center border border-border">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Room Code</p>
              <div className="flex items-center gap-2 sm:gap-3">
                <span className="text-2xl sm:text-3xl font-black text-primary tracking-[0.2em]">{gameCode}</span>
                <Button onClick={copyToClipboard} size="sm" className="h-8 rounded-full font-bold shadow-md bg-primary hover:bg-primary/90 text-primary-foreground">
                  {copiedCode ? 'Copied!' : 'Copy'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Leave Confirmation Popup */}
      {showLeaveConfirm && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-background/90 dark:bg-zinc-950/90 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-zinc-900 border-2 border-destructive/20 shadow-2xl rounded-3xl p-6 sm:p-8 max-w-sm w-full flex flex-col items-center text-center animate-in zoom-in-95 duration-300 relative overflow-hidden pointer-events-auto">
            <div className="absolute top-0 right-0 w-32 h-32 bg-destructive/10 rounded-full blur-[40px] -z-10" />
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-6 shadow-sm border border-destructive/20 text-3xl">
              🚪
            </div>
            <h2 className="text-2xl font-black text-foreground mb-2 tracking-tight">Leave Game?</h2>
            <p className="text-sm text-muted-foreground mb-8 font-medium px-2">
              Are you sure you want to exit? Your partner will be left playing alone.
            </p>
            <div className="flex flex-col gap-3 w-full">
              <Button onClick={() => router.push('/')} variant="destructive" className="w-full h-12 rounded-2xl font-black shadow-md hover:bg-destructive/90 text-white z-10 relative">
                Yes, Leave Game
              </Button>
              <Button variant="outline" onClick={() => setShowLeaveConfirm(false)} className="w-full h-12 rounded-2xl font-black text-muted-foreground border-zinc-200 hover:bg-zinc-50 z-10 relative">
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
