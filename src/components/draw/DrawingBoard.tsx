// STUB — replaced by the drawing-board implementation. The props are the contract.
export interface DrawingBoardProps {
  onDone?: (dataUrl: string) => void;
  doneLabel?: string;
  initial?: string;
  aspect?: number;
  compact?: boolean;
  className?: string;
}

export function DrawingBoard({ className }: DrawingBoardProps) {
  return <div className={className} />;
}
