// @ts-ignore
import { createClient } from '@supabase/supabase-js';
import { isValidMove, isSudokuSolved } from '@/lib/sudoku';
import { NextRequest, NextResponse } from 'next/server';


export async function POST(request: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321',
    process.env.SUPABASE_SERVICE_ROLE_KEY || 'service-role-key'
  ) as any;
  try {
    const { gameId, row, col, num } = await request.json();

    if (gameId === undefined || row === undefined || col === undefined || num === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get current game session (for solution)
    const { data: gameSession, error: sessionError } = await supabase
      .from('game_sessions')
      .select('*')
      .eq('id', gameId)
      .single();

    if (sessionError || !gameSession) {
      return NextResponse.json(
        { error: 'Game session not found' },
        { status: 404 }
      );
    }

    // Get current game state
    const { data: gameState, error: stateError } = await supabase
      .from('game_state')
      .select('*')
      .eq('game_id', gameId)
      .single();

    if (stateError || !gameState) {
      return NextResponse.json(
        { error: 'Game state not found' },
        { status: 404 }
      );
    }

    const currentGrid = gameState.current_grid;

    // Update the grid
    currentGrid[row][col] = num;

    // Check if solved
    const solved = isSudokuSolved(currentGrid);

    // Update game state
    const { error: updateError } = await supabase
      .from('game_state')
      .update({
        current_grid: currentGrid,
        updated_at: new Date().toISOString(),
      })
      .eq('game_id', gameId);

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to save move' },
        { status: 500 }
      );
    }

    // Record the move
    const { error: moveError } = await supabase.from('game_moves').insert({
      game_id: gameId,
      row_index: row,
      col_index: col,
      value: num,
    });

    if (moveError) {
      console.error('Move record error:', moveError);
      // Don't fail the request if move recording fails
    }

    // Calculate accumulated mistakes
    let mistakes = 0;
    const { data: moves } = await supabase.from('game_moves').select('*').eq('game_id', gameId);
    
    if (moves) {
      mistakes = moves.filter((m: any) => 
        m.value !== 0 && m.value !== gameSession.solution[m.row_index][m.col_index]
      ).length;
    }

    let isFailed = mistakes >= 5;

    // Update game session status
    if (isFailed) {
      const { error: gameError } = await supabase
        .from('game_sessions')
        .update({ status: 'failed' })
        .eq('id', gameId);

      if (gameError) console.error('Game failure error:', gameError);
    } else if (solved) {
      const { error: gameError } = await supabase
        .from('game_sessions')
        .update({ status: 'completed' })
        .eq('id', gameId);

      if (gameError) console.error('Game completion error:', gameError);
    }

    return NextResponse.json({
      success: true,
      solved,
      failed: isFailed,
      mistakes,
      grid: currentGrid,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
