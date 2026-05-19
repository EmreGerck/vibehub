'use client';

import { useState, useRef, useEffect, ClipboardEvent, KeyboardEvent } from 'react';

interface Props {
  length?: number;
  value: string;
  onChange: (v: string) => void;
  onComplete?: (v: string) => void;
  /** Triggers a shake + red-border animation. Parent should reset after the user retries. */
  error?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
}

/**
 * Premium OTP input.
 * - 6 (or N) auto-focusing boxes
 * - Smart paste: paste a full code into any box, it spreads across all
 * - Backspace clears + jumps left
 * - Arrow keys navigate
 * - Mobile-friendly: inputMode="numeric", one-time-code autocomplete
 */
export function OtpInput({
  length = 6,
  value,
  onChange,
  onComplete,
  error = false,
  disabled = false,
  autoFocus = true,
}: Props) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    if (autoFocus && refs.current[0]) {
      refs.current[0]?.focus();
    }
  }, [autoFocus]);

  useEffect(() => {
    if (value.length === length && onComplete) {
      onComplete(value);
    }
  }, [value, length, onComplete]);

  const getDigit = (i: number) => value[i] ?? '';

  function setDigit(i: number, d: string) {
    const next = value.split('');
    while (next.length < length) next.push('');
    next[i] = d;
    onChange(next.slice(0, length).join(''));
  }

  function focusInput(i: number) {
    const target = refs.current[Math.max(0, Math.min(length - 1, i))];
    target?.focus();
    target?.select();
  }

  function handleChange(i: number, raw: string) {
    // Only keep digits
    const digit = raw.replace(/\D/g, '').slice(-1);
    if (!digit) {
      setDigit(i, '');
      return;
    }
    setDigit(i, digit);
    if (i < length - 1) focusInput(i + 1);
  }

  function handleKeyDown(i: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace') {
      if (getDigit(i)) {
        setDigit(i, '');
      } else if (i > 0) {
        setDigit(i - 1, '');
        focusInput(i - 1);
      }
      e.preventDefault();
      return;
    }
    if (e.key === 'ArrowLeft' && i > 0) {
      focusInput(i - 1);
      e.preventDefault();
    }
    if (e.key === 'ArrowRight' && i < length - 1) {
      focusInput(i + 1);
      e.preventDefault();
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    const text = e.clipboardData.getData('text').replace(/\D/g, '');
    if (!text) return;
    e.preventDefault();
    const chars = text.slice(0, length).split('');
    onChange(chars.concat(new Array(length - chars.length).fill('')).join('').slice(0, length));
    focusInput(Math.min(chars.length, length - 1));
  }

  return (
    <div
      className={`flex justify-center gap-2 sm:gap-3 ${error ? 'animate-shake' : ''}`}
      onPaste={handlePaste}
    >
      {Array.from({ length }).map((_, i) => {
        const digit = getDigit(i);
        const filled = !!digit;
        return (
          <input
            key={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="text"
            inputMode="numeric"
            autoComplete={i === 0 ? 'one-time-code' : 'off'}
            maxLength={1}
            disabled={disabled}
            value={digit}
            onFocus={() => setActiveIdx(i)}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={handlePaste}
            aria-label={`Digit ${i + 1}`}
            className={`otp-input ${filled ? 'filled' : ''} ${error ? 'error' : ''} ${
              activeIdx === i && !filled ? 'animate-pulse-ring' : ''
            }`}
          />
        );
      })}
    </div>
  );
}
