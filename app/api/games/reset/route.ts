import { createClient } from '@supabase/supabase-js';
import { generateSudokuWithSolution } from '@/lib/sudoku';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321',
    process.env.SUPABASE_SERVICE_ROLE_KEY || 'service-role-key'
  );

  try {
    const { gameId } = await request.json();

    if (!gameId) {
      return NextResponse.json(
        { error: 'Missing gameId' },
        { status: 400 }
      );
    }

    // Get current game session to find difficulty
    const { data: gameSession, error: sessionError } = await supabase
      .from('game_sessions')
      .select('difficulty')
      .eq('id', gameId)
      .single();

    if (sessionError || !gameSession) {
      return NextResponse.json(
        { error: 'Game session not found' },
        { status: 404 }
      );
    }

    // Generate new puzzle
    const { puzzle, solution } = generateSudokuWithSolution(gameSession.difficulty as any);

    // Update game session status and puzzle/solution
    const { error: gameError } = await supabase
      .from('game_sessions')
      .update({
        puzzle: puzzle,
        solution: solution,
        status: 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('id', gameId);

    if (gameError) {
      throw new Error(`Failed to reset game session: ${gameError.message}`);
    }

    // Reset game state
    const { error: stateError } = await supabase
      .from('game_state')
      .update({
        current_grid: puzzle,
        updated_at: new Date().toISOString(),
      })
      .eq('game_id', gameId);

    if (stateError) {
      throw new Error(`Failed to reset game state: ${stateError.message}`);
    }

    // Clear game moves for this session
    const { error: movesError } = await supabase
      .from('game_moves')
      .delete()
      .eq('game_id', gameId);

    if (movesError) {
      console.error('Failed to clear moves:', movesError);
      // Non-critical, continue
    }

    return NextResponse.json({
      success: true,
      puzzle,
    });
  } catch (error: any) {
    console.error('Reset Game Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
