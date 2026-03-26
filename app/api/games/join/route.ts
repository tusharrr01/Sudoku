// @ts-ignore
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';


export async function POST(request: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321',
    process.env.SUPABASE_SERVICE_ROLE_KEY || 'service-role-key'
  );
  try {
    const { roomCode, playerName } = await request.json();

    if (!roomCode || !playerName) {
      return NextResponse.json(
        { error: 'Missing roomCode or playerName' },
        { status: 400 }
      );
    }

    // Find game session by room code
    const { data: gameSession, error: sessionError } = await supabase
      .from('game_sessions')
      .select('*')
      .eq('room_code', roomCode.toUpperCase())
      .single();

    if (sessionError || !gameSession) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      );
    }

    if (gameSession.status !== 'waiting') {
      return NextResponse.json(
        { error: 'Game already in progress or finished' },
        { status: 400 }
      );
    }

    // Check if game is full (2 players max)
    const { count, error: countError } = await supabase
      .from('players')
      .select('*', { count: 'exact' })
      .eq('game_id', gameSession.id);

    if (countError || (count && count >= 2)) {
      return NextResponse.json(
        { error: 'Game is full' },
        { status: 400 }
      );
    }

    // Add second player
    const { data: player, error: playerError } = await supabase.from('players').insert({
      game_id: gameSession.id,
      player_name: playerName,
      is_creator: false,
    }).select().single();

    if (playerError) {
      return NextResponse.json(
        { error: 'Failed to join game' },
        { status: 500 }
      );
    }

    // Update game status to active
    const { error: updateError } = await supabase
      .from('game_sessions')
      .update({ status: 'active' })
      .eq('id', gameSession.id);

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to start game' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      gameId: gameSession.id,
      roomCode: gameSession.room_code,
      difficulty: gameSession.difficulty,
      playerId: player.id,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
