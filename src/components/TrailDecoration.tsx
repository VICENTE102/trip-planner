interface TrailDecorationProps {
  side: "left" | "right";
}

// Very low-opacity contour lines + footprints for the empty margins on wide
// screens — pure ambience, never meant to compete with the content.
export function TrailDecoration({ side }: TrailDecorationProps) {
  return (
    <svg
      viewBox="0 0 160 900"
      className={`pointer-events-none absolute top-0 hidden h-full w-40 lg:block ${
        side === "left" ? "left-0" : "right-0 -scale-x-100"
      }`}
      aria-hidden="true"
    >
      <g fill="none" stroke="#e8dcd3" strokeWidth="1.5">
        <path d="M-20 60 C 40 100, 10 160, 60 210 S 30 320, 90 360" />
        <path d="M-30 140 C 30 180, 0 240, 55 290 S 20 400, 85 440" />
        <path d="M-25 480 C 35 520, 5 580, 65 630 S 25 740, 95 780" />
      </g>
      <g fill="#cff7f1" opacity="0.7">
        <ellipse cx="55" cy="205" rx="3" ry="4" />
        <ellipse cx="63" cy="218" rx="3.4" ry="4.8" />
        <ellipse cx="50" cy="355" rx="3" ry="4" />
        <ellipse cx="58" cy="368" rx="3.4" ry="4.8" />
        <ellipse cx="60" cy="625" rx="3" ry="4" />
        <ellipse cx="68" cy="638" rx="3.4" ry="4.8" />
      </g>
    </svg>
  );
}
