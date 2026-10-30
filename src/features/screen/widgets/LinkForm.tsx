import { useState, type ReactNode } from 'react';
import { History, Link2, X } from 'lucide-react';
import { Act, Empty, inputCls, Label } from './ui';

export interface Recent {
  label: string;
  url: string;
}

/** Keeps the 6 most recent links, newest first. */
export const pushRecent = (list: Recent[] | undefined, item: Recent) => [item, ...(list ?? []).filter((r) => r.url !== item.url)].slice(0, 6);

/**
 * "Paste a link" screen shared by the media widgets: input, quick presets and
 * the recent links of this widget.
 */
export function LinkForm({
  icon,
  color,
  prompt,
  placeholder,
  error,
  presets,
  recent,
  onSubmit,
  onForget,
  footer,
}: {
  icon: ReactNode;
  color: string;
  prompt: string;
  placeholder: string;
  error: string;
  presets?: Recent[];
  recent?: Recent[];
  /** Returns false when the link is not valid. */
  onSubmit: (url: string) => boolean;
  onForget: (url: string) => void;
  footer?: ReactNode;
}) {
  const [url, setUrl] = useState('');
  const [bad, setBad] = useState(false);
  const go = (u: string) => {
    const ok = onSubmit(u);
    setBad(!ok);
    if (ok) setUrl('');
  };
  const chip = 'bg-fill-2 hover:bg-fill inline-flex h-9 max-w-full items-center gap-1.5 rounded-full pl-3 text-[14px] font-semibold transition-colors';
  return (
    <div className="h-full overflow-auto">
      <Empty icon={icon} text={bad ? error : prompt}>
        <form
          className="flex w-full max-w-md gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            go(url);
          }}
        >
          <input className={inputCls} value={url} onChange={(e) => setUrl(e.target.value)} placeholder={placeholder} aria-label={prompt} inputMode="url" />
          <Act solid color={color} type="submit" aria-label="Mostrar">
            <Link2 size={18} />
          </Act>
        </form>
        {!!recent?.length && (
          <div className="flex w-full max-w-md flex-col items-start gap-1.5">
            <Label>
              <History size={12} className="mr-1 inline" />
              Recientes
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {recent.map((r) => (
                <span key={r.url} className={chip}>
                  <button type="button" className="truncate" onClick={() => go(r.url)}>
                    {r.label}
                  </button>
                  <button type="button" aria-label={`Quitar ${r.label}`} onClick={() => onForget(r.url)} className="text-label-3 hover:text-label grid h-9 w-8 place-items-center">
                    <X size={14} />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}
        {!!presets?.length && (
          <div className="flex w-full max-w-md flex-col items-start gap-1.5">
            <Label>Para la clase</Label>
            <div className="flex flex-wrap gap-1.5">
              {presets.map((r) => (
                <button key={r.url} type="button" className={`${chip} pr-3`} onClick={() => go(r.url)}>
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        )}
        {footer}
      </Empty>
    </div>
  );
}
