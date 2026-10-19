"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

export default function SigningDialog({ title, busy, onClose, children, wide = false }: {
  wide?: boolean;
  title: string;
  busy: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    dialog?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog?.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement) previousFocus.focus({ preventScroll: true });
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-busy={busy}
      onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}
      className={`${wide ? "sm:max-w-[min(96vw,1500px)]" : "sm:max-w-3xl"} fixed inset-0 m-auto h-dvh max-h-dvh w-screen max-w-none overflow-hidden border-0 bg-white p-0 text-[#1E293B] shadow-2xl backdrop:bg-black/60 sm:h-[85dvh] sm:rounded-2xl`}
    >
      <div className="flex h-full flex-col">
        <header className="flex shrink-0 items-center justify-between gap-4 border-b bg-white px-5 py-4">
          <h2 id={titleId} className="text-lg font-semibold">{title}</h2>
          <button type="button" disabled={busy} onClick={onClose} className="rounded-lg border px-4 py-2 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-40">Close</button>
        </header>
        <div className="public-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 sm:p-5">
          {children}
        </div>
      </div>
    </dialog>
  );
}
