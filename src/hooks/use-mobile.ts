import * as React from "react";

const MOBILE_BREAKPOINT = 768;

/**
 * `true` sous le breakpoint `md` (768px). Renvoie `false` au premier rendu serveur/avant montage
 * (évite un flash : le shell rend la sidebar desktop par défaut, neutralisée en CSS sous `md`).
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean>(false);

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isMobile;
}
