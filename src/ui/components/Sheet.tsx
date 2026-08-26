import type { ReactNode } from 'react';

export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="absolute inset-0 z-40 flex flex-col justify-end">
      <button type="button" aria-label="Закрыть" onClick={onClose} className="absolute inset-0 bg-black/70 backdrop-blur-[2px]" />
      <div className="animate-slideUp relative max-h-[82%] rounded-t-3xl border-t border-white/10 bg-ink-800/95 shadow-card">
        <div className="flex items-center justify-between px-4 pb-2 pt-3">
          <div className="mx-auto h-1 w-10 rounded-full bg-white/20" />
        </div>
        {title && (
          <h3 className="px-4 pb-2 font-display text-base font-bold text-white">{title}</h3>
        )}
        <div className="scroll-y max-h-[58vh] px-4 pb-3">{children}</div>
        {footer && (
          <div className="border-t border-white/10 px-4 py-3" style={{ paddingBottom: 'calc(var(--safe-bottom) + 12px)' }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export default Sheet;
