"use client";
import { useEffect, useRef } from "react";
import { X, Quote } from "lucide-react";
export default function QuoteModal({
  quote,
  title,
  onClose,
}: {
  quote: string;
  title: string;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
    return () => ref.current?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="quote-dialog"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="dialog-head">
        <span className="eyebrow">SOURCE EVIDENCE</span>
        <button
          className="icon-button"
          aria-label="Close source evidence"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>
      <h2>{title}</h2>
      <Quote size={28} className="teal" />
      <blockquote>{quote}</blockquote>
      <p className="muted">Verbatim excerpt from the source meeting.</p>
      <button className="primary" onClick={onClose}>
        Close
      </button>
    </dialog>
  );
}
