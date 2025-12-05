"use client";

import React from "react";

type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  ariaLabel?: string;
};

export default function Modal({
  isOpen,
  onClose,
  children,
  ariaLabel,
}: ModalProps) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel ?? "Modal dialog"}
      className="modal-overlay"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.5)",
        zIndex: 1000,
      }}>
      <div
        className="modal-content glass"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 800,
          width: "90%",
          padding: "1.25rem",
          borderRadius: 8,
        }}>
        {children}
      </div>
    </div>
  );
}
