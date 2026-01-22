import type { SVGProps } from "react";

export function BarberPoleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      width="1em"
      height="1em"
      {...props}
    >
      <defs>
        <linearGradient id="stripeGradient" x1="0" x2="0" y1="0" y2="100%">
          <stop offset="0%" stopColor="hsl(var(--primary))" />
          <stop offset="12.5%" stopColor="hsl(var(--primary))" />
          <stop offset="12.5%" stopColor="hsl(var(--card))" />
          <stop offset="25%" stopColor="hsl(var(--card))" />
          <stop offset="25%" stopColor="hsl(var(--secondary))" />
          <stop offset="37.5%" stopColor="hsl(var(--secondary))" />
          <stop offset="37.5%" stopColor="hsl(var(--primary))" />
          <stop offset="50%" stopColor="hsl(var(--primary))" />
          <stop offset="50%" stopColor="hsl(var(--card))" />
          <stop offset="62.5%" stopColor="hsl(var(--card))" />
          <stop offset="62.5%" stopColor="hsl(var(--secondary))" />
          <stop offset="75%" stopColor="hsl(var(--secondary))" />
          <stop offset="75%" stopColor="hsl(var(--primary))" />
          <stop offset="87.5%" stopColor="hsl(var(--primary))" />
          <stop offset="87.5%" stopColor="hsl(var(--card))" />
          <stop offset="100%" stopColor="hsl(var(--card))" />
        </linearGradient>
        <mask id="stripeMask">
          <rect x="15" y="15" width="70" height="70" fill="white" />
        </mask>
      </defs>
      
      <circle cx="50" cy="10" r="10" fill="hsl(var(--secondary))" />
      <rect x="40" y="15" width="20" height="70" fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="2" />
      
      <g transform="skewY(-30)">
        <rect 
          x="10" 
          y="40" 
          width="80" 
          height="70" 
          fill="url(#stripeGradient)"
          mask="url(#stripeMask)"
        />
      </g>

      <rect x="40" y="15" width="20" height="70" fill="transparent" stroke="hsl(var(--secondary))" strokeWidth="2.5" />
      
      <circle cx="50" cy="90" r="10" fill="hsl(var(--secondary))" />
    </svg>
  );
}
