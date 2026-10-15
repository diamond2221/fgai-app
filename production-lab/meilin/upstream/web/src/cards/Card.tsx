import { ReactNode, useRef } from 'react';
import { pickFiles } from '../lib/files';

// A stage page: sticky head (title + the actions that move this stage forward) over a viewfinder panel.
export function Card({ title, kicker, sub, children, footer, wide, className = '' }: { title: string; kicker?: string; sub?: ReactNode; children: ReactNode; footer?: ReactNode; wide?: boolean; className?: string }) {
  return (
    <article className={`page ${wide ? 'wide' : ''} ${className}`}>
      <header className="page-head">
        <div className="page-title">
          {kicker && <span className="page-kicker">{kicker}</span>}
          <h2>{title}</h2>
          {sub && <p>{sub}</p>}
        </div>
        {footer && <div className="page-actions">{footer}</div>}
      </header>
      <div className="panel brackets">{children}</div>
    </article>
  );
}

export async function copyText(t: string) {
  try {
    await navigator.clipboard.writeText(t);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = t;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  }
}

export function Chips({ options, pick, onPick, label }: { options: string[]; pick: number; onPick: (i: number) => void; label: string }) {
  return (
    <div className="chips" role="radiogroup" aria-label={label}>
      {options.map((o, i) => (
        <button key={o} role="radio" aria-checked={pick === i} className={`chip ${pick === i ? 'on' : ''}`} onClick={() => onPick(i)}>{o}</button>
      ))}
    </div>
  );
}

export function Locked({ children }: { children: ReactNode }) {
  return <span className="locked"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>{children}</span>;
}

// Primary action button that remembers itself as the origin of the success burst.
export function Go({ children, onGo, disabled, kind = 'primary' }: { children: ReactNode; onGo: (el: HTMLButtonElement | null) => void; disabled?: boolean; kind?: 'primary' | 'ghost' | '' }) {
  const ref = useRef<HTMLButtonElement>(null);
  return <button ref={ref} className={`btn ${kind} ${kind === 'primary' ? 'beam' : ''}`} disabled={disabled} onClick={() => onGo(ref.current)}>{children}</button>;
}

export function UploadButton({ accept, multiple, onFiles, children, className = 'btn ghost small' }: { accept: string; multiple?: boolean; onFiles: (f: File[]) => void; children: ReactNode; className?: string }) {
  return (
    <button type="button" className={className} onClick={async () => { const f = await pickFiles(accept, multiple); if (f.length) onFiles(f); }}>
      <svg className="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V4M7 9l5-5 5 5M5 20h14" /></svg>{children}
    </button>
  );
}

export function Empty({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return <div className="empty"><p>{children}</p>{action}</div>;
}
