'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { SudokuCell } from './sudoku-cell';
import { isValidMove, isSudokuSolved } from '@/lib/sudoku';
import { Button } from './ui/button';
import { Eraser } from 'lucide-react';

interface SudokuBoardProps {
  gameId: string;
  puzzle: number[][];
  solution: number[][];
  currentGrid: number[][];
  players: Array<{ id: string; player_name: string; is_creator: boolean }>;
  mistakes?: number;
  status?: string;
}

export function SudokuBoard({
  gameId,
  puzzle,
  solution,
  currentGrid,
  players,
  mistakes = 0,
  status = 'active',
}: SudokuBoardProps) {
  const [grid, setGrid] = useState(currentGrid);
  const [selectedCell, setSelectedCell] = useState<[number, number] | null>(null);
  const [solved, setSolved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [vibratingCell, setVibratingCell] = useState<string | null>(null);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [historicalMistakes, setHistoricalMistakes] = useState<Set<string>>(new Set());

  // Sync grid with prop when parent fetches new state
  useEffect(() => {
    setGrid(currentGrid);
  }, [currentGrid]);

  // Sync solved status when parent fetches state
  useEffect(() => {
    if (status === 'completed') {
      setSolved(true);
    }
  }, [status]);

  // Chat State
  const [chatHistory, setChatHistory] = useState<Array<{ id: string, text: string, senderName: string, isMe: boolean }>>([]);
  const [ephemeralMessages, setEphemeralMessages] = useState<Array<{ id: string, text: string, senderName: string, isMe: boolean }>>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatFocused, setIsChatFocused] = useState(false);
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
  const myPlayerIdRef = useRef<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = localStorage.getItem('sudoku-player-id');
    setMyPlayerId(id);
    myPlayerIdRef.current = id;
  }, []);

  useEffect(() => {
    if (isChatFocused) {
      chatEndRef.current?.scrollIntoView({ behavior: 'auto' });
    }
  }, [chatHistory, isChatFocused]);

  const addChatMessage = useCallback((text: string, senderName: string, isMe: boolean) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newMsg = { id, text, senderName, isMe };

    setChatHistory(prev => [...prev, newMsg]);

    if (!isMe) {
      setEphemeralMessages(prev => {
        const msgs = [...prev, newMsg];
        return msgs.slice(-2); // Max 2 visible
      });

      setTimeout(() => {
        setEphemeralMessages(prev => prev.filter(m => m.id !== id));
      }, 6000); // 6 seconds timeout
    }
  }, []);

  const sendChat = () => {
    if (!chatInput.trim() || !channelRef.current) return;

    // Find absolute real player name from DB players state or local storage
    let realName = localStorage.getItem('sudoku-player-name') || 'Player';
    if (myPlayerId) {
      const me = players.find(p => p.id === myPlayerId);
      if (me && me.player_name) {
        realName = me.player_name;
      }
    }

    addChatMessage(chatInput.trim(), realName, true);

    channelRef.current.send({
      type: 'broadcast',
      event: 'chat_message',
      payload: { text: chatInput.trim(), senderName: realName, senderId: myPlayerId },
    });

    setChatInput('');
  };

  const handlePlayAgain = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/games/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId }),
      });

      if (!response.ok) throw new Error('Failed to reset game');

      // Clear local history mistakes too
      setHistoricalMistakes(new Set());
      localStorage.removeItem(`sudoku-mistakes-${gameId}`);

      // Notify everyone to refresh
      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'refresh_state',
          payload: {},
        });
      }

      setSolved(false);
      setSelectedCell(null);
    } catch (err) {
      console.error('Reset error:', err);
      setError('Failed to restart game');
    } finally {
      setLoading(false);
    }
  };

  const isNumberInInitialBox = (num: number, r: number, c: number) => {
    if (num === 0) return false;
    const boxRow = Math.floor(r / 3) * 3;
    const boxCol = Math.floor(c / 3) * 3;
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        if (puzzle[boxRow + i][boxCol + j] === num) return true;
      }
    }
    return false;
  };

  // Load saved hints
  useEffect(() => {
    const saved = localStorage.getItem(`sudoku-hints-${gameId}`);
    if (saved) setHintsUsed(parseInt(saved, 10));
  }, [gameId]);

  // Load saved mistakes and track them symmetrically based on grid updates
  useEffect(() => {
    const savedMistakes = localStorage.getItem(`sudoku-mistakes-${gameId}`);
    if (savedMistakes) {
      try {
        setHistoricalMistakes(new Set(JSON.parse(savedMistakes)));
      } catch (e) {
        console.error("Failed to parse mistakes", e);
      }
    }
  }, [gameId]);

  useEffect(() => {
    setHistoricalMistakes((prev) => {
      let changed = false;
      const next = new Set(prev);

      for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
          const value = grid[row][col];
          if (value !== 0 && puzzle[row][col] === 0 && value !== solution[row][col]) {
            const key = `${row}-${col}-${value}`;
            if (!next.has(key)) {
              next.add(key);
              changed = true;
            }
          }
        }
      }

      if (changed) {
        localStorage.setItem(`sudoku-mistakes-${gameId}`, JSON.stringify(Array.from(next)));
      }
      return changed ? next : prev;
    });
  }, [grid, puzzle, solution, gameId]);

  // Use the larger of the historical mistakes (all-time) vs. prop-provided count
  const mistakesCount = Math.max(historicalMistakes.size, mistakes);

  const channelRef = useRef<any>(null);

  // Subscribe to real-time updates via P2P Broadcast
  useEffect(() => {
    const channel = supabase
      .channel(`game-${gameId}`, {
        config: { broadcast: { ack: false } },
      })
      .on(
        'broadcast',
        { event: 'grid_update' },
        (payload: any) => {
          if (payload.payload.grid) {
            setGrid(payload.payload.grid);
            setSyncing(false);
          }
        }
      )
      .on(
        'broadcast',
        { event: 'chat_message' },
        (payload: any) => {
          // Use ref to get fresh value — state would be a stale closure from mount
          if (payload.payload.senderId && payload.payload.senderId === myPlayerIdRef.current) return;

          if (payload.payload.text && payload.payload.senderName) {
            addChatMessage(payload.payload.text, payload.payload.senderName, false);
          }
        }
      )
      .on(
        'broadcast',
        { event: 'refresh_state' },
        () => {
          // Parent GamePage handles the fetch, but we can clear syncing local state if needed
          setSyncing(false);
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId]);

  const handleCellChange = useCallback(
    async (row: number, col: number, value: number) => {
      // Prevent changes on initial puzzle cells
      if (puzzle[row][col] !== 0) return;

      // Erase guard: do NOT allow erasing a correct number
      if (value === 0 && grid[row][col] !== 0 && grid[row][col] === solution[row][col]) {
        setVibratingCell(`${row}-${col}`);
        setTimeout(() => setVibratingCell(null), 500);
        return;
      }

      // If the cell is already correct, don't allow changing it with a number either
      if (grid[row][col] !== 0 && grid[row][col] === solution[row][col]) return;

      // If the cell is wrong, force the user to erase it first (value === 0)
      if (grid[row][col] !== 0 && grid[row][col] !== solution[row][col] && value !== 0) {
        setVibratingCell(`${row}-${col}`);
        setTimeout(() => setVibratingCell(null), 500);
        return;
      }

      const newGrid = grid.map((r) => [...r]);
      newGrid[row][col] = value;

      const isInvalid = value !== 0 && value !== solution[row][col];

      setGrid(newGrid);
      setSyncing(true);

      if (isInvalid) {
        setVibratingCell(`${row}-${col}`);
        setTimeout(() => setVibratingCell(null), 500);
        // KEEP focus to allow correction
      } else {
        setSelectedCell(null); // Remove focus ONLY if correct or cleared
      }

      // INSTANT P2P Sync to other player
      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'grid_update',
          payload: { grid: newGrid },
        }).catch(console.error);
      }

      try {
        const response = await fetch('/api/games/move', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ gameId, row, col, num: value }),
        });

        if (!response.ok) {
      throw new Error('Failed to save move');
        }

        const data = await response.json();

        // If the server tells us the game is now solved or failed, force a hard refresh for everyone
        if (data.solved || data.failed) {
          if (data.solved) setSolved(true);
          
          if (channelRef.current) {
            channelRef.current.send({
              type: 'broadcast',
              event: 'refresh_state',
              payload: {}
            }).catch(console.error);
          }
        }

        // Keep local grid in sync with server representation just in case
        if (data.grid) {
          setGrid(data.grid);
        }

        // Notify lobby that state (mistakes/completion) has changed
        if (channelRef.current) {
          channelRef.current.send({
            type: 'broadcast',
            event: 'refresh_state',
            payload: {}
          });
        }

      } catch (err) {
        console.error('Move error:', err);
        setError('Failed to save move');
        setSyncing(false);
      }
    },
    [gameId, grid, puzzle, solution, supabase]
  );

  const isInitialCell = (row: number, col: number) => puzzle[row][col] !== 0;

  const getInvalidCells = useCallback(() => {
    const invalid = new Set<string>();

    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        const value = grid[row][col];
        if (value !== 0 && puzzle[row][col] === 0 && value !== solution[row][col]) {
          invalid.add(`${row}-${col}`);
        }
      }
    }

    return invalid;
  }, [grid, puzzle, solution]);

  const invalidCells = getInvalidCells();

  const getRemainingCounts = useCallback(() => {
    const counts: Record<number, number> = { 1: 9, 2: 9, 3: 9, 4: 9, 5: 9, 6: 9, 7: 9, 8: 9, 9: 9 };
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const val = grid[r][c];
        if (val >= 1 && val <= 9) {
          counts[val]--;
        }
      }
    }
    return counts;
  }, [grid]);

  const remainingCounts = getRemainingCounts();

  const handleHint = useCallback(() => {
    if (solved || hintsUsed >= 3) return;

    // If a cell is selected, empty, or wrong, fill it
    if (selectedCell) {
      const [r, c] = selectedCell;
      if (grid[r][c] !== solution[r][c] && puzzle[r][c] === 0) {
        handleCellChange(r, c, solution[r][c]);
        const newHints = hintsUsed + 1;
        setHintsUsed(newHints);
        localStorage.setItem(`sudoku-hints-${gameId}`, newHints.toString());
        return;
      }
    }
    // Otherwise pick random empty/wrong cell
    const emptyCells: [number, number][] = [];
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (puzzle[r][c] === 0 && grid[r][c] !== solution[r][c]) {
          emptyCells.push([r, c]);
        }
      }
    }
    if (emptyCells.length > 0) {
      const idx = Math.floor(Math.random() * emptyCells.length);
      const [r, c] = emptyCells[idx];
      handleCellChange(r, c, solution[r][c]);
      setSelectedCell([r, c]);
      const newHints = hintsUsed + 1;
      setHintsUsed(newHints);
      localStorage.setItem(`sudoku-hints-${gameId}`, newHints.toString());
    }
  }, [selectedCell, grid, solution, puzzle, handleCellChange, solved, hintsUsed, gameId]);

  return (
    <>
      <div className="w-full max-w-full animate-appear flex flex-col">
        {/* Game Info Header */}
        <div className="mb-3 flex items-center justify-between gap-1 sm:gap-2 w-full px-1">
          {/* Player 1 */}
          {players[0] && (
            <div className="flex items-center gap-1.5 sm:gap-3 text-foreground bg-white/80 dark:bg-card px-2 py-1 sm:px-3 sm:py-1.5 rounded-full border border-border shadow-sm">
              <div className="w-5 h-5 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-[9px] sm:text-xs font-bold bg-primary text-primary-foreground">
                {players[0].player_name[0].toUpperCase()}
              </div>
              <p className="text-[10px] sm:text-sm font-semibold truncate max-w-[70px] sm:max-w-[120px]">
                {players[0].player_name}
              </p>
            </div>
          )}

          <div className="text-[12px] sm:text-sm font-black text-muted-foreground/40">&</div>

          {/* Player 2 */}
          {players[1] ? (
            <div className="flex items-center gap-1.5 sm:gap-3 text-foreground bg-white/80 dark:bg-card px-2 py-1 sm:px-3 sm:py-1.5 rounded-full border border-border shadow-sm">
              <p className="text-[10px] sm:text-sm font-semibold truncate max-w-[70px] sm:max-w-[120px] text-right">
                {players[1].player_name}
              </p>
              <div className="w-5 h-5 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-[9px] sm:text-xs font-bold bg-secondary text-secondary-foreground">
                {players[1].player_name[0].toUpperCase()}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 sm:gap-3 text-muted-foreground bg-white/40 dark:bg-card/40 px-2 py-1 sm:px-3 sm:py-1.5 rounded-full border border-border border-dashed opacity-70">
              <p className="text-[10px] sm:text-sm font-medium italic truncate max-w-[60px] sm:max-w-[100px]">
                Waiting...
              </p>
              <div className="w-5 h-5 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-[9px] sm:text-xs font-bold bg-muted text-muted-foreground border border-dashed border-border/50">
                ?
              </div>
            </div>
          )}
        </div>

        <div className="w-full pb-1 flex flex-col">
          {/* Sudoku Board Wrapper */}
          <div className="flex justify-center mb-2 w-full px-1">
            <div className="relative group inline-block p-1">
              <div className="sudoku-grid bg-white dark:bg-zinc-950 border-2 border-foreground/80">
                {grid.map((row, rowIdx) =>
                  row.map((value, colIdx) => {
                    const isSelected =
                      selectedCell && selectedCell[0] === rowIdx && selectedCell[1] === colIdx;
                    const isHighlighted =
                      selectedCell &&
                      (selectedCell[0] === rowIdx || selectedCell[1] === colIdx);
                    const isInvalid = invalidCells.has(`${rowIdx}-${colIdx}`);
                    const isPartOfSelectedBox =
                      selectedCell &&
                      Math.floor(selectedCell[0] / 3) === Math.floor(rowIdx / 3) &&
                      Math.floor(selectedCell[1] / 3) === Math.floor(colIdx / 3);

                    const isThickRight = (colIdx + 1) % 3 === 0 && colIdx !== 8;
                    const isThickBottom = (rowIdx + 1) % 3 === 0 && rowIdx !== 8;

                    return (
                      <div
                        key={`${rowIdx}-${colIdx}`}
                        className={`w-[9.2vw] h-[9.2vw] max-w-[42px] max-h-[42px] sm:w-12 sm:h-12 md:w-14 md:h-14 sudoku-cell ${isThickRight ? 'sudoku-cell-thick-right' : ''} ${isThickBottom ? 'sudoku-cell-thick-bottom' : ''}`}
                      >
                        <SudokuCell
                          row={rowIdx}
                          col={colIdx}
                          value={value}
                          isInitial={isInitialCell(rowIdx, colIdx)}
                          isSelected={!!isSelected}
                          isHighlighted={!!isHighlighted}
                          isInvalid={isInvalid}
                          isVibrating={vibratingCell === `${rowIdx}-${colIdx}`}
                          isPartOfSelectedBox={!!isPartOfSelectedBox}
                          onChange={handleCellChange}
                          onSelect={(row, col) => setSelectedCell([row, col])}
                          disabled={solved}
                        />
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Victory Message (Old inline one removed in favor of popup) */}

          {/* Number Pad for Mobile/Convenience */}
          <div className="flex flex-col items-center gap-2 mb-2 animate-appear delay-300 w-full max-w-sm self-center">
            <label className="text-[9px] sm:text-xs font-bold text-muted-foreground uppercase tracking-widest hidden md:block">
              Quick Select
            </label>
            <div className="flex items-center gap-2 w-full">
              <div className="sudoku-grid-row border-2 border-foreground/80 bg-white dark:bg-zinc-950 flex overflow-hidden rounded-lg shadow-xl w-full">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <button
                    key={num}
                    onClick={() => selectedCell && handleCellChange(selectedCell[0], selectedCell[1], num)}
                    disabled={
                      !selectedCell ||
                      isInitialCell(selectedCell[0], selectedCell[1]) ||
                      solved ||
                      remainingCounts[num] <= 0 ||
                      (grid[selectedCell[0]][selectedCell[1]] !== 0 && grid[selectedCell[0]][selectedCell[1]] === solution[selectedCell[0]][selectedCell[1]]) ||
                      (selectedCell && isNumberInInitialBox(num, selectedCell[0], selectedCell[1]))
                    }
                    className={`flex-1 aspect-square relative sm:w-12 sm:h-12 flex items-center justify-center text-lg sm:text-xl font-bold transition-all border-r border-foreground/20 last:border-r-0 hover:bg-primary/10 active:bg-primary/20 disabled:opacity-20 disabled:cursor-not-allowed ${selectedCell && grid[selectedCell[0]][selectedCell[1]] === num ? 'bg-primary/20 text-primary' : 'text-foreground/80'
                      }`}
                  >
                    {num}
                    <span className="absolute top-[1px] right-[2px] sm:top-1 sm:right-1.5 text-[8px] sm:text-[10px] font-black opacity-80 text-primary drop-shadow-sm">
                      {remainingCounts[num] > 0 ? remainingCounts[num] : ''}
                    </span>
                  </button>
                ))}
              </div>
              <Button
                variant="outline"
                onClick={() => selectedCell && handleCellChange(selectedCell[0], selectedCell[1], 0)}
                className="flex-shrink-0 w-10 sm:w-12 aspect-square glass-card border-2 border-destructive/40 hover:border-destructive hover:bg-destructive/10 transition-all rounded-lg text-destructive p-0 flex items-center justify-center shadow-lg"
                disabled={!selectedCell || isInitialCell(selectedCell[0], selectedCell[1]) || solved || (grid[selectedCell[0]][selectedCell[1]] !== 0 && grid[selectedCell[0]][selectedCell[1]] === solution[selectedCell[0]][selectedCell[1]])}
                title="Clear cell"
              >
                <Eraser className="w-4 h-4 sm:w-6 sm:h-6" />
              </Button>
            </div>
          </div>

          {/* Options Dashboard */}
          <div className="flex w-full justify-between items-center gap-2 mb-2 max-w-sm self-center animate-appear delay-300">
            <button
              onClick={handleHint}
              disabled={solved || hintsUsed >= 3}
              className="flex-1 glass-card h-12 flex items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/5 hover:bg-primary/10 transition-all duration-300 group shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="text-xl group-hover:scale-110 transition-transform">
                {hintsUsed >= 3 ? '🔒' : '💡'}
              </span>
              <span className="text-[10px] sm:text-xs text-primary font-bold uppercase tracking-wider">Hint {hintsUsed}/3</span>
            </button>

            <div className="flex-1 glass-card h-12 flex items-center justify-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 cursor-default shadow-sm text-destructive">
              <span className="text-xl font-black">
                {mistakesCount}/5
              </span>
              <span className="text-sm">❌</span>
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">Mistakes</span>
            </div>
          </div>
        </div>

      </div>

      {/* EPHEMERAL CHAT BUBBLES (When input is NOT focused) */}
      {!isChatFocused && ephemeralMessages.length > 0 && (
        <div className="fixed bottom-[70px] left-4 z-[80] flex flex-col items-start gap-2 pointer-events-none">
          {ephemeralMessages.map(msg => (
            <div key={msg.id} className="px-5 py-2.5 bg-white rounded-2xl border border-zinc-100 shadow-[0_4px_20px_rgba(0,0,0,0.1)] animate-in slide-in-from-bottom-2 fade-in duration-300 max-w-[280px]">
              <span className="text-zinc-900 text-[15px] font-medium leading-snug break-all">{msg.text}</span>
            </div>
          ))}
        </div>
      )}

      {/* FULL CHAT HISTORY OVERLAY (When input IS focused) */}
      {isChatFocused && (
        <div className="fixed inset-0 top-0 bottom-[60px] z-[90] bg-white/60 backdrop-blur-md flex flex-col justify-end p-4 animate-in fade-in duration-200">
          <div className="absolute inset-0 z-[-1]" onMouseDown={(e) => {
            e.preventDefault();
            setIsChatFocused(false);
          }} />

          <div className="flex flex-col gap-3 overflow-y-auto max-h-full no-scrollbar pb-2 w-full pt-10">
            {chatHistory.map(msg => (
              <div key={msg.id} className={`flex max-w-[85%] ${msg.isMe ? 'self-end' : 'self-start'}`}>
                <div className={`px-4 py-2.5 rounded-2xl ${msg.isMe ? 'bg-[#3b82f6] text-white rounded-br-sm' : 'bg-zinc-100 border border-zinc-200 text-zinc-900 rounded-bl-sm'} shadow-sm`}>
                  {!msg.isMe && <p className="text-[10px] text-zinc-500 font-bold mb-1 tracking-wide">{msg.senderName}</p>}
                  <p className="text-[14px] font-medium leading-snug break-all">{msg.text}</p>
                </div>
              </div>
            ))}
            <div ref={chatEndRef} className="h-1" />
          </div>
        </div>
      )}

      {/* PERSISTENT PLATO-STYLE CHAT BAR */}
      <div className={`fixed bottom-0 left-0 right-0 h-[60px] bg-white border-t border-zinc-200 z-[100] flex items-center px-4 gap-3 transition-shadow duration-300 ${isChatFocused ? 'shadow-none' : 'shadow-[0_-10px_30px_rgba(0,0,0,0.05)]'}`}>
        {/* Chat Bubble Icon */}
        <div className="text-[#3b82f6] flex-shrink-0">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            <line x1="9" y1="9" x2="15" y2="9"></line>
            <line x1="9" y1="13" x2="15" y2="13"></line>
          </svg>
        </div>

        {/* Input */}
        <input
          type="text"
          value={chatInput}
          onChange={e => setChatInput(e.target.value)}
          onFocus={() => setIsChatFocused(true)}
          onBlur={() => setIsChatFocused(false)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault();
              sendChat();
            }
          }}
          className="flex-1 bg-transparent border-none outline-none text-zinc-900 placeholder:text-zinc-400 text-[15px] font-medium placeholder:font-normal h-full"
          placeholder="Say hello..."
        />

        {/* Send Arrow */}
        <button
          onMouseDown={(e) => {
            e.preventDefault(); // Prevents input from losing focus when clicking send
            sendChat();
          }}
          className={`${chatInput.trim().length > 0 ? 'text-[#3b82f6] hover:text-[#60a5fa]' : 'text-zinc-400 hover:text-zinc-500'} transition-colors flex-shrink-0`}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="opacity-100">
            <path d="M2 21l21-9L2 3v7l15 2-15 2v7z"></path>
          </svg>
        </button>
      </div>

      {/* FULL SCREEN GAME OVER POPUP (Win or Loss) */}
      {solved && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-background/90 dark:bg-zinc-950/90 backdrop-blur-md p-4 animate-in fade-in duration-500">
          <div className="bg-white dark:bg-zinc-900 border-2 border-primary/20 shadow-2xl rounded-3xl p-6 sm:p-10 max-w-sm w-full flex flex-col items-center text-center animate-in zoom-in-95 duration-500 relative overflow-hidden pointer-events-auto z-[130]">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-[40px] -z-10" />
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-primary/10 rounded-full flex items-center justify-center mb-4 sm:mb-6 shadow-lg border border-primary/30">
              <span className="text-4xl">🏆</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-foreground mb-2 uppercase tracking-tight text-primary">Match Won!</h2>
            <p className="text-xs sm:text-sm text-muted-foreground mb-6 font-medium px-2">Legendary performance! You and your partner have conquered the board.</p>
            <div className="flex flex-col gap-3 w-full">
              <Button onClick={handlePlayAgain} disabled={loading} className="w-full h-12 rounded-2xl font-black shadow-md bg-primary hover:bg-primary/90 text-primary-foreground pointer-events-auto relative z-[150] cursor-pointer block">
                {loading ? 'Starting...' : 'Play Again'}
              </Button>
              <Button variant="outline" onClick={() => window.location.href = '/'} className="w-full h-12 rounded-2xl font-black text-muted-foreground border-zinc-200">
                Back to Home
              </Button>
            </div>
          </div>
        </div>
      )}

      {(mistakesCount >= 5) && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-background/90 dark:bg-zinc-950/90 backdrop-blur-md p-4 animate-in fade-in duration-500">
          <div className="bg-white dark:bg-zinc-900 border-2 border-destructive/20 shadow-2xl rounded-3xl p-6 sm:p-10 max-w-sm w-full flex flex-col items-center text-center animate-in zoom-in-95 duration-500 relative overflow-hidden pointer-events-auto z-[130]">
            <div className="absolute top-0 right-0 w-32 h-32 bg-destructive/10 rounded-full blur-[40px] -z-10" />
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-destructive/10 rounded-full flex items-center justify-center mb-4 sm:mb-6 animate-pulse shadow-lg border border-destructive/30">
              <span className="text-4xl">💀</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-foreground mb-2 uppercase tracking-tight text-destructive">Match Lost</h2>
            <p className="text-xs sm:text-sm text-muted-foreground mb-6 font-medium px-2">The board has suffered 5 critical mistakes. It has been compromised.</p>
            <div className="flex flex-col gap-3 w-full">
              <Button onClick={handlePlayAgain} disabled={loading} className="w-full h-12 rounded-2xl font-black shadow-md bg-destructive hover:bg-destructive/90 text-white pointer-events-auto relative z-[150] cursor-pointer block">
                {loading ? 'Starting...' : 'Try Again'}
              </Button>
              <Button variant="outline" onClick={() => window.location.href = '/'} className="w-full h-12 rounded-2xl font-black text-muted-foreground border-zinc-200">
                Back to Home
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
