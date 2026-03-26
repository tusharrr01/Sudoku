-- Create game_sessions table
CREATE TABLE IF NOT EXISTS game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code VARCHAR(6) UNIQUE NOT NULL,
  difficulty VARCHAR(20) NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard', 'expert', 'master')),
  puzzle JSONB NOT NULL,
  solution JSONB NOT NULL,
  status VARCHAR(20) DEFAULT 'waiting',
  created_by VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create players table
CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  player_name VARCHAR(50) NOT NULL,
  is_creator BOOLEAN DEFAULT FALSE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create game_state table to track current board state
CREATE TABLE IF NOT EXISTS game_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL UNIQUE REFERENCES game_sessions(id) ON DELETE CASCADE,
  current_grid JSONB NOT NULL,
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create game_moves table for storing player moves
CREATE TABLE IF NOT EXISTS game_moves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id) ON DELETE SET NULL,
  row_index INT NOT NULL CHECK (row_index >= 0 AND row_index < 9),
  col_index INT NOT NULL CHECK (col_index >= 0 AND col_index < 9),
  value INT NOT NULL CHECK (value >= 0 AND value <= 9),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_moves ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_state ENABLE ROW LEVEL SECURITY;

-- Create policies for RLS (allow all for now, can be restricted later)
CREATE POLICY "Allow all on game_sessions" ON game_sessions FOR ALL USING (true);
CREATE POLICY "Allow all on players" ON players FOR ALL USING (true);
CREATE POLICY "Allow all on game_moves" ON game_moves FOR ALL USING (true);
CREATE POLICY "Allow all on game_state" ON game_state FOR ALL USING (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_game_sessions_room_code ON game_sessions(room_code);
CREATE INDEX IF NOT EXISTS idx_players_game_id ON players(game_id);
CREATE INDEX IF NOT EXISTS idx_game_moves_game_id ON game_moves(game_id);
CREATE INDEX IF NOT EXISTS idx_game_moves_player_id ON game_moves(player_id);
CREATE INDEX IF NOT EXISTS idx_game_state_game_id ON game_state(game_id);

-- Enable Realtime for game tables
-- Note: Run these in the Supabase SQL Editor to enable multiplayer sync
ALTER PUBLICATION supabase_realtime ADD TABLE game_state;
ALTER PUBLICATION supabase_realtime ADD TABLE players;
ALTER PUBLICATION supabase_realtime ADD TABLE game_sessions;
