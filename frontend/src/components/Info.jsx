// Info component => reusable tooltip for additional information, used in Enrollment Form.
import React, { useState, useRef, useEffect } from 'react';
import './Info.css';

let idCounter = 0;

const Info = ({ children, content, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, side: 'right' });
  const triggerRef = useRef(null);
  const tooltipRef = useRef(null);
  const tooltipIdRef = useRef(`info-tooltip-${++idCounter}`);

  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);
  const toggle = () => setIsOpen((s) => !s);

  // Position tooltip when opened
  useEffect(() => {
    if (!isOpen || !triggerRef.current || !tooltipRef.current) return;

    const trig = triggerRef.current.getBoundingClientRect();
    const tip = tooltipRef.current.getBoundingClientRect();

    // default position: to the right of trigger
    let left = trig.right + 10;
    let top = trig.top + (trig.height - tip.height) / 2;
    let side = 'right';

    // if overflowing right edge, flip to left
    if (left + tip.width > window.innerWidth - 12) {
      left = trig.left - tip.width - 10;
      side = 'left';
    }

    // clamp vertically
    const minTop = 8;
    const maxTop = window.innerHeight - tip.height - 8;
    if (top < minTop) top = minTop;
    if (top > maxTop) top = maxTop;

    setPosition({ top, left, side });
  }, [isOpen]);

  // Close on outside click and Esc
  useEffect(() => {
    const onDocClick = (e) => {
      if (
        triggerRef.current &&
        tooltipRef.current &&
        !triggerRef.current.contains(e.target) &&
        !tooltipRef.current.contains(e.target)
      ) {
        close();
      }
    };
    const onKey = (e) => {
      if (e.key === 'Escape') close();
    };

    if (isOpen) {
      document.addEventListener('mousedown', onDocClick);
      document.addEventListener('touchstart', onDocClick);
      document.addEventListener('keydown', onKey);
      return () => {
        document.removeEventListener('mousedown', onDocClick);
        document.removeEventListener('touchstart', onDocClick);
        document.removeEventListener('keydown', onKey);
      };
    }
  }, [isOpen]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={`info-trigger ${className}`}
        onClick={toggle}
        onMouseEnter={open}
        onFocus={open}
        onMouseLeave={() => {
          // delay close to allow moving into tooltip
          setTimeout(() => {
            if (!tooltipRef.current) return;
            // if the tooltip is hovered/focused, keep it open
            if (!tooltipRef.current.matches(':hover') && document.activeElement !== tooltipRef.current) {
              close();
            }
          }, 150);
        }}
        aria-describedby={tooltipIdRef.current}
        aria-expanded={isOpen}
      >
        {children || 'i'}
      </button>

      <div
        ref={tooltipRef}
        id={tooltipIdRef.current}
        className={`info-tooltip ${position.side}`}
        role="tooltip"
        aria-hidden={!isOpen}
        style={{
          position: 'fixed',
          top: `${position.top}px`,
          left: `${position.left}px`,
          zIndex: 10000,
          pointerEvents: isOpen ? 'auto' : 'none',
          visibility: isOpen ? 'visible' : 'hidden',
          opacity: isOpen ? 1 : 0,
          transition: 'opacity 150ms ease, visibility 150ms'
        }}
        onMouseLeave={() => {
          // close when leaving tooltip (mirror trigger behavior)
          setTimeout(() => {
            if (!triggerRef.current) return;
            if (!triggerRef.current.matches(':hover') && document.activeElement !== triggerRef.current) {
              close();
            }
          }, 150);
        }}
      >
        <div className="info-content">
          {content || children}
        </div>
        <div className="info-arrow" />
      </div>
    </>
  );
};

export default Info;