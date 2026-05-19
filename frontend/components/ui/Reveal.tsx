'use client';

import { useInView } from '../../hooks/useInView';
import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** Which entrance animation to play when the element scrolls into view. */
  as?: 'up' | 'down' | 'left' | 'right' | 'scale' | 'fade';
  delay?: number;
  className?: string;
}

const ANIM = {
  up: 'animate-fade-in-up',
  down: 'animate-fade-in-down',
  left: 'animate-slide-left',
  right: 'animate-slide-right',
  scale: 'animate-scale-in',
  fade: 'animate-fade-in',
};

/**
 * Wraps children with a scroll-triggered entrance animation. Stays invisible
 * until it first enters the viewport, then plays the chosen animation once.
 */
export function Reveal({ children, as = 'up', delay = 0, className = '' }: Props) {
  const { ref, inView } = useInView<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={`${className} ${inView ? ANIM[as] : 'opacity-0'}`}
      style={{ animationDelay: inView ? `${delay}ms` : undefined }}
    >
      {children}
    </div>
  );
}
