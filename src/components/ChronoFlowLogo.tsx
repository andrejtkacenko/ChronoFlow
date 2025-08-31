import * as React from "react";

const ChronoFlowLogo = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M10.1 2.182a10 10 0 0 1 11.418 7.915" />
    <path d="M13.9 21.818a10 10 0 0 1-11.418-7.915" />
    <path d="M2.5 12.5a10 10 0 0 1 16.4-7.5" />
    <path d="M21.5 11.5a10 10 0 0 1-16.4 7.5" />
    <path d="M12 6v6l4 2" />
  </svg>
);

export default ChronoFlowLogo;
