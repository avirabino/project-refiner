// ── Vigil Logo SVG — extracted from VIGIL_UI_KIT.html ───────────────────────
// Variants: 'full' (mark + wordmark) | 'mark' (eye only)

interface VigilLogoProps {
  variant?: 'full' | 'mark';
  className?: string;
  height?: number;
}

export function VigilLogo({ variant = 'full', className = '', height = 40 }: VigilLogoProps) {
  if (variant === 'mark') {
    return (
      <svg
        width={height}
        height={height}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        aria-label="Vigil logo"
      >
        <defs>
          <linearGradient id="vLogoGrad" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#67e8f9" />
            <stop offset="1" stopColor="#06b6d4" />
          </linearGradient>
        </defs>
        <path
          d="M24 8C14 8 6 20 4 24C6 28 14 40 24 40C34 40 42 28 44 24C42 20 34 8 24 8Z"
          fill="none"
          stroke="url(#vLogoGrad)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="24" cy="24" r="9" fill="none" stroke="#22d3ee" strokeWidth="2" />
        <circle cx="24" cy="24" r="4" fill="#22d3ee" />
        <path
          d="M16 14L24 30L32 14"
          fill="none"
          stroke="#22d3ee"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.6"
        />
        <path d="M8 12L4 12L4 18" fill="none" stroke="#67e8f9" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
        <path d="M40 12L44 12L44 18" fill="none" stroke="#67e8f9" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
        <path d="M8 36L4 36L4 30" fill="none" stroke="#67e8f9" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
        <path d="M40 36L44 36L44 30" fill="none" stroke="#67e8f9" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
      </svg>
    );
  }

  // Full lockup: mark + VIGIL wordmark
  const aspect = 200 / 48;
  const w = height * aspect;
  return (
    <svg
      width={w}
      height={height}
      viewBox="0 0 200 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Vigil logo"
    >
      <defs>
        <linearGradient id="vLogoGradFull" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#67e8f9" />
          <stop offset="1" stopColor="#06b6d4" />
        </linearGradient>
      </defs>
      <g transform="translate(4,0)">
        <path
          d="M24 8C14 8 6 20 4 24C6 28 14 40 24 40C34 40 42 28 44 24C42 20 34 8 24 8Z"
          fill="none"
          stroke="url(#vLogoGradFull)"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="24" cy="24" r="7" fill="none" stroke="#22d3ee" strokeWidth="1.5" />
        <circle cx="24" cy="24" r="3" fill="#22d3ee" />
        <path
          d="M17 15L24 28L31 15"
          fill="none"
          stroke="#22d3ee"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.5"
        />
      </g>
      <text
        x="58"
        y="31"
        fontFamily="Inter, sans-serif"
        fontWeight="800"
        fontSize="22"
        fill="#e8eaed"
        letterSpacing="-0.5"
      >
        VIGIL
      </text>
    </svg>
  );
}
