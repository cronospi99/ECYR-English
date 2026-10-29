import { DrawingBoard } from '@/components/draw/DrawingBoard';
import type { WidgetProps } from '../util';

interface D {
  img: string | null;
}

/** The shared drawing board in its compact form; "Guardar" keeps the drawing with the scene. */
export default function Draw({ data, set }: WidgetProps<D>) {
  return (
    <div className="h-full overflow-hidden">
      <DrawingBoard compact className="h-full w-full" initial={data.img ?? undefined} onDone={(img) => set({ img })} doneLabel="Guardar" />
    </div>
  );
}
