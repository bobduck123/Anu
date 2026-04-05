import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';

function joinClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ');
}

interface ManuscriptOverlayProps {
  open: boolean;
  dialogId?: string;
  eyebrow: string;
  title: string;
  subtitle?: string;
  description?: ReactNode;
  onClose: () => void;
  primary: ReactNode;
  secondary?: ReactNode;
  footer?: ReactNode;
}

export function ManuscriptOverlay({
  open,
  dialogId,
  eyebrow,
  title,
  subtitle,
  description,
  onClose,
  primary,
  secondary,
  footer,
}: ManuscriptOverlayProps) {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const titleId = dialogId ? `${dialogId}-title` : undefined;
  const descriptionId = dialogId ? `${dialogId}-description` : undefined;

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <div
      id={dialogId}
      className="fixed inset-0 z-[60] flex items-center justify-center px-4 py-6 md:px-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
    >
      <button
        type="button"
        className="absolute inset-0 bg-[rgba(30,2,39,0.74)] backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close manuscript chamber"
      />

      <article className={joinClasses('anu-manuscript-overlay relative z-10 w-full max-w-6xl overflow-hidden')}>
        <div className="anu-manuscript-overlay__header">
          <div>
            <p className="text-[10px] uppercase tracking-[0.28em] text-[#7c413c]">{eyebrow}</p>
            <h2
              id={titleId}
              className="mt-3 text-3xl text-[#1e0227] md:text-[2.6rem]"
              style={{ fontFamily: 'var(--anu-type-display)' }}
            >
              {title}
            </h2>
            {subtitle ? <p className="mt-2 text-sm text-[#7c413c]">{subtitle}</p> : null}
            {description ? (
              <div id={descriptionId} className="mt-4 max-w-3xl text-sm leading-7 text-[#7c413c]">
                {description}
              </div>
            ) : null}
          </div>

          <button
            type="button"
            ref={closeButtonRef}
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#665700]/18 bg-[color:rgba(246,212,203,0.55)] text-[#1e0227] transition-colors hover:bg-[color:rgba(246,212,203,0.72)]"
            aria-label="Close manuscript chamber"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="anu-manuscript-overlay__plan">
          <div className="anu-manuscript-overlay__axis">
            <section className="anu-manuscript-chamber anu-manuscript-chamber-grand">{primary}</section>
            {secondary ? <span className="anu-manuscript-passage anu-manuscript-passage-ascending" aria-hidden="true" /> : null}
            {secondary ? <section className="anu-manuscript-chamber anu-manuscript-chamber-queen">{secondary}</section> : null}
          </div>

          <aside className="anu-manuscript-overlay__drawer">
            <div className="anu-manuscript-chamber anu-manuscript-chamber-side">
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#7c413c]">Archive guidance</p>
              <p className="mt-3 text-sm leading-7 text-[#7c413c]">
                The chamber opens inside the archive rather than replacing it. Read the purpose, state, version, and simulation shape first, then descend into steward lane, dependencies, and release history.
              </p>
            </div>

            {footer ? <div className="anu-manuscript-chamber anu-manuscript-chamber-side">{footer}</div> : null}
          </aside>
        </div>
      </article>
    </div>
  );
}
