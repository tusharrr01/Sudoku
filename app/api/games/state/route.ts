// @ts-ignore
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';


export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321',
    process.env.SUPABASE_SERVICE_ROLE_KEY || 'service-role-key'
  ) as any;
  try {
    const gameId = request.nextUrl.searchParams.get('gameId');

    if (!gameId) {
      return NextResponse.json(
        { error: 'Missing gameId' },
        { status: 400 }
      );
    }

    // Get game session
    const { data: gameSession, error: sessionError } = await supabase
      .from('game_sessions')
      .select('*')
      .eq('id', gameId)
      .single();

    if (sessionError || !gameSession) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      );
    }

    // Get game state
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

    // Get players
    const { data: players, error: playersError } = await supabase
      .from('players')
      .select('*')
      .eq('game_id', gameId);

    if (playersError) {
      return NextResponse.json(
        { error: 'Failed to fetch players' },
        { status: 500 }
      );
    }

    // Get moves to calculate accumulated mistakes
    const { data: moves } = await supabase
      .from('game_moves')
      .select('*')
      .eq('game_id', gameId);

    let mistakesCount = 0;
    if (moves && gameSession.solution) {
      mistakesCount = moves.filter((m: any) => 
        m.value !== 0 && m.value !== gameSession.solution[m.row_index][m.col_index]
      ).length;
    }

    return NextResponse.json({
      game: {
        ...gameSession,
        mistakes: mistakesCount
      },
      state: gameState,
      players: players || [],
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
