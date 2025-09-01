
import { useState, useEffect } from 'react';

const getBreakpoint = (width: number): string => {
  if (width < 640) return 'sm';
  if (width < 768) return 'md';
  if (width < 1024) return 'lg';
  if (width < 1280) return 'xl';
  return '2xl';
};

export function useBreakpoint() {
  const [breakpoint, setBreakpoint] = useState<string>('xl');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      setBreakpoint(getBreakpoint(window.innerWidth));
    };

    handleResize(); // Set initial breakpoint
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return breakpoint;
}
