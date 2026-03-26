import { useCallback, useEffect, useRef } from 'react';

interface SudokuCellProps {
  row: number;
  col: number;
  value: number;
  isInitial: boolean;
  isSelected: boolean;
  isHighlighted: boolean;
  isInvalid: boolean;
  isVibrating?: boolean;
  isPartOfSelectedBox: boolean;
  onChange: (row: number, col: number, value: number) => void;
  onSelect: (row: number, col: number) => void;
  disabled?: boolean;
}

export function SudokuCell({
  row,
  col,
  value,
  isInitial,
  isSelected,
  isHighlighted,
  isInvalid,
  isVibrating,
  isPartOfSelectedBox,
  onChange,
  onSelect,
  disabled,
}: SudokuCellProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isSelected && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isSelected]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.target.value;
      if (input === '' || /^[1-9]$/.test(input)) {
        onChange(row, col, input === '' ? 0 : parseInt(input));
      }
    },
    [row, col, onChange]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (isInitial || disabled) return;

      const directions: Record<string, [number, number]> = {
        ArrowUp: [-1, 0],
        ArrowDown: [1, 0],
        ArrowLeft: [0, -1],
        ArrowRight: [0, 1],
      };

      const [dr, dc] = directions[e.key] ?? [0, 0];
      if (dr !== 0 || dc !== 0) {
        e.preventDefault();
        const newRow = Math.max(0, Math.min(8, row + dr));
        const newCol = Math.max(0, Math.min(8, col + dc));
        onSelect(newRow, newCol);
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        onChange(row, col, 0);
      }
    },
    [row, col, isInitial, disabled, onChange, onSelect]
  );

  const boxRow = Math.floor(row / 3);
  const boxCol = Math.floor(col / 3);
  const boxBorder =
    (boxRow !== Math.floor((row + 1) / 3) ? 'border-b-2' : 'border-b') +
    ' ' +
    (boxCol !== Math.floor((col + 1) / 3) ? 'border-r-2' : 'border-r');

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="none"
      maxLength={1}
      value={value || ''}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      onClick={() => onSelect(row, col)}
      disabled={disabled}
      readOnly={isInitial}
      className={`
        w-full h-full text-xl md:text-2xl text-center transition-all duration-200 cursor-pointer disabled:cursor-default focus:outline-none caret-transparent
        ${isVibrating ? 'animate-vibrate' : ''}
        ${
          isSelected 
            ? (isInvalid ? 'bg-destructive/25 z-10 shadow-inner ring-2 ring-destructive/50' : 'bg-primary/25 z-10 shadow-inner ring-2 ring-primary/50')
            : isHighlighted 
              ? (isInvalid ? 'bg-destructive/15' : 'bg-primary/5')
              : isPartOfSelectedBox
                ? (isInvalid ? 'bg-destructive/10' : 'bg-muted/30')
                : (isInvalid ? 'bg-destructive/10' : (isInitial ? 'bg-muted/40' : 'bg-transparent'))
        }
        ${
          isInvalid 
            ? 'text-destructive font-bold'
            : isInitial 
              ? 'text-foreground/80 font-black'
              : 'text-primary dark:text-blue-400 font-bold'
        }
      `}
    />
  );
}
