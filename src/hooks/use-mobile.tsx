
import { useBreakpoint } from "./use-breakpoint";

export function useIsMobile() {
  const breakpoint = useBreakpoint();
  return breakpoint === 'sm';
}
