import { createClient } from '@supabase/supabase-js';
import { generateSudokuWithSolution, generateRoomCode } from '@/lib/sudoku';
import { NextRequest, NextResponse } from 'next/server';


export async function POST(request: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321',
    process.env.SUPABASE_SERVICE_ROLE_KEY || 'service-role-key'
  );
  try {
    const { difficulty, playerName } = await request.json();

    if (!difficulty || !playerName) {
      return NextResponse.json(
        { error: 'Missing difficulty or playerName' },
        { status: 400 }
      );
    }

    // Generate puzzle and room code
    const { puzzle, solution } = generateSudokuWithSolution(difficulty as any);
    const roomCode = generateRoomCode();

    // Create game session
    const { data: gameSession, error: gameError } = await supabase
      .from('game_sessions')
      .insert({
        room_code: roomCode,
        difficulty,
        puzzle: puzzle,
        solution: solution,
        status: 'waiting',
        created_by: playerName,
      })
      .select()
      .single();

    if (gameError) {
      console.error('Game creation error:', gameError);
      throw new Error(`Failed to create game: ${gameError.message}`);
    }

    // Add creator as first player
    const { data: player, error: playerError } = await supabase.from('players').insert({
      game_id: gameSession.id,
      player_name: playerName,
      is_creator: true,
    }).select().single();

    if (playerError) {
      console.error('Player insert error:', playerError);
      throw new Error(`Failed to add player: ${playerError.message}`);
    }

    // Initialize game state
    const { error: stateError } = await supabase
      .from('game_state')
      .insert({
        game_id: gameSession.id,
        current_grid: puzzle,
      });

    if (stateError) {
      console.error('State init error:', stateError);
      throw new Error(`Failed to initialize game state: ${stateError.message}`);
    }

    // Update game session with created_by_id if we have it
    // (Optional: depends if you want to store the ID or just the name)

    return NextResponse.json({
      gameId: gameSession.id,
      roomCode: roomCode,
      difficulty,
      playerId: player.id,
    });
  } catch (error: any) {
    console.error('Detailed Create Game Error:', {
      message: error.message,
      stack: error.stack,
      cause: error.cause
    });
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
