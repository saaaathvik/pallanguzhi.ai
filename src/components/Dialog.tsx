import { useEffect, useId, useRef, type ReactNode } from 'react';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

/** Native <dialog> modal: focus trapping and Escape-to-close come from the browser. */
export function Dialog({ open, onClose, title, children }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="dialog"
      aria-labelledby={titleId}
      onClose={() => {
        // The native close event also fires when the effect above closes the dialog because `open`
        // became false; only report closes the user started (Escape) while it is still meant to be open.
        if (open) onClose();
      }}
      onClick={(event) => {
        // Clicking the backdrop (the dialog element itself, outside its content) closes it.
        if (event.target === ref.current) onClose();
      }}
    >
      <div className="dialog-body">
        <div className="dialog-header">
          <h2 id={titleId}>{title}</h2>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
