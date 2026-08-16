// => admin/components/ConfirmModal/ConfirmModal.jsx
// => Reusable yes/no confirmation modal
// => Props:
//    - isOpen    : boolean - controls visibility
//    - message   : string  - the question shown to the admin
//    - onConfirm : fn      - called when admin clicks Yes
//    - onCancel  : fn      - called when admin clicks No or backdrop

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import './ConfirmModal.css';

export default function ConfirmModal({ isOpen, message, onConfirm, onCancel }) {
  // => Listens for Enter/Escape only while the modal is open
  // => Enter confirms (matches clicking "Yes"), Escape cancels (matches clicking "No")
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        onConfirm();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    // => Cleanup, so the listener doesn't stack up if the modal opens and closes repeatedly
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onConfirm, onCancel]);

  // => Don't render anything if not open
  if (!isOpen) return null;

  // => Rendered via a portal directly onto document.body, instead of wherever
  // => this component is called from in the tree. Fixes a real CSS clipping
  // => bug: SideBar.jsx renders this as a child of <aside className="sidebar">,
  // => and that aside has overflow-y: auto, which clips position:fixed
  // => descendants to the aside's own box (240px wide, 100vh tall), even
  // => though "fixed" normally means viewport-relative. Without the portal,
  // => the modal centers itself inside that narrow sidebar column instead
  // => of the actual screen, and the hamburger toggle button (which lives
  // => outside the sidebar) ends up rendering on top of it. The portal
  // => escapes that ancestor entirely, so this fix applies wherever
  // => ConfirmModal gets used going forward, not just the logout case.
  return createPortal(
    <div className="confirm-backdrop" onClick={onCancel}>
      <div
        className="confirm-box"
        onClick={e => e.stopPropagation()} // => prevent backdrop click from firing inside
      >
        <p className="confirm-message">{message}</p>
        <div className="confirm-actions">
          <button className="confirm-btn confirm-btn--yes" onClick={onConfirm}>
            Yes
          </button>
          <button className="confirm-btn confirm-btn--no" onClick={onCancel}>
            No
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}