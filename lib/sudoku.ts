// Sudoku puzzle generator and solver
export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert' | 'master';

// Generate a valid Sudoku puzzle along with its solution
export function generateSudokuWithSolution(difficulty: Difficulty): { puzzle: number[][], solution: number[][] } {
  const solution = generateSolution();
  const puzzle = JSON.parse(JSON.stringify(solution)); // Deep copy

  // Remove numbers based on difficulty
  const cellsToRemove: Record<Difficulty, number> = {
    easy: 30,
    medium: 40,
    hard: 50,
    expert: 60,
    master: 70,
  };

  let removed = 0;
  const targetRemove = cellsToRemove[difficulty];

  while (removed < targetRemove) {
    const row = Math.floor(Math.random() * 9);
    const col = Math.floor(Math.random() * 9);

    if (puzzle[row][col] !== 0) {
      puzzle[row][col] = 0;
      removed++;
    }
  }

  return { puzzle, solution };
}

// Generate a valid Sudoku puzzle
export function generateSudoku(difficulty: Difficulty): number[][] {
  return generateSudokuWithSolution(difficulty).puzzle;
}

// Generate a complete valid Sudoku solution
function generateSolution(): number[][] {
  const grid: number[][] = Array(9)
    .fill(null)
    .map(() => Array(9).fill(0));

  fillGrid(grid);
  return grid;
}

// Backtracking algorithm to fill the grid
function fillGrid(grid: number[][]): boolean {
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (grid[row][col] === 0) {
        const numbers = shuffleArray([1, 2, 3, 4, 5, 6, 7, 8, 9]);

        for (const num of numbers) {
          if (isValidPlacement(grid, row, col, num)) {
            grid[row][col] = num;

            if (fillGrid(grid)) {
              return true;
            }

            grid[row][col] = 0;
          }
        }

        return false;
      }
    }
  }

  return true;
}

// Check if a number can be placed at the given position
function isValidPlacement(
  grid: number[][],
  row: number,
  col: number,
  num: number
): boolean {
  // Check row
  for (let x = 0; x < 9; x++) {
    if (grid[row][x] === num) return false;
  }

  // Check column
  for (let x = 0; x < 9; x++) {
    if (grid[x][col] === num) return false;
  }

  // Check 3x3 box
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;

  for (let i = boxRow; i < boxRow + 3; i++) {
    for (let j = boxCol; j < boxCol + 3; j++) {
      if (grid[i][j] === num) return false;
    }
  }

  return true;
}

// Helper to shuffle array
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Generate a room code
export function generateRoomCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Validate if a move is legal
export function isValidMove(
  grid: number[][],
  row: number,
  col: number,
  num: number
): boolean {
  // Can't place 0 in middle of game (only on empty cells)
  if (num < 0 || num > 9) return false;

  // Check row
  for (let x = 0; x < 9; x++) {
    if (x !== col && grid[row][x] === num) return false;
  }

  // Check column
  for (let x = 0; x < 9; x++) {
    if (x !== row && grid[x][col] === num) return false;
  }

  // Check 3x3 box
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;

  for (let i = boxRow; i < boxRow + 3; i++) {
    for (let j = boxCol; j < boxCol + 3; j++) {
      if ((i !== row || j !== col) && grid[i][j] === num) return false;
    }
  }

  return true;
}

// Check if the puzzle is solved
export function isSudokuSolved(grid: number[][]): boolean {
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (grid[row][col] === 0) return false;
    }
  }

  // Validate the complete solution
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      const num = grid[row][col];
      const tempVal = grid[row][col];
      grid[row][col] = 0;

      if (!isValidMove(grid, row, col, num)) {
        grid[row][col] = tempVal;
        return false;
      }

      grid[row][col] = tempVal;
    }
  }

  return true;
}
