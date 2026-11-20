import type { Pole } from "@/lib/types";

// Placeholder drawing for sample poles that have no photo.
export default function PoleIllustration({ pole }: { pole: Pole }) {
  const has = (a: string) => pole.attachments.includes(a as Pole["attachments"][number]);
  const lean = pole.condition === "Leaning" ? 6 : 0;
  return (
    <svg viewBox="0 0 320 176" className="h-full w-full" role="img" aria-label="Pole illustration (no photo)">
      <rect width="320" height="176" fill="#151821" />
      <rect y="150" width="320" height="26" fill="#1c2029" />
      <g transform={`rotate(${lean} 160 150)`}>
        <rect x="155" y="18" width="10" height="134" rx="2" fill={pole.material === "Wood" ? "#7c5a3a" : pole.material === "Steel" ? "#8b93a1" : "#a3a3a3"} />
        <rect x="110" y="30" width="100" height="6" rx="1.5" fill="#6b7280" />
        {[118, 146, 174, 202].map((x) => (
          <rect key={x} x={x - 2} y="22" width="4" height="9" rx="1" fill="#e5e7eb" />
        ))}
        <path d="M0 24 L118 24 M146 24 L174 24 M202 24 L320 24" stroke="#4b5563" strokeWidth="1.2" fill="none" />
        {has("Distribution transformer") && (
          <>
            <rect x="166" y="56" width="26" height="32" rx="4" fill="#4b5563" stroke="#6b7280" />
            {has("Fuse cutout") && <rect x="186" y="40" width="4" height="12" fill="#d1d5db" />}
          </>
        )}
        {has("Streetlight") && (
          <>
            <path d="M155 70 L128 64" stroke="#9ca3af" strokeWidth="3" fill="none" />
            <rect x="118" y="62" width="14" height="5" rx="2" fill="#fbbf24" />
          </>
        )}
        {has("Service drop") && <path d="M165 100 Q 240 120 320 110" stroke="#4b5563" strokeWidth="1.2" fill="none" />}
      </g>
      {has("Guy wire") && <path d="M160 46 L250 150" stroke="#6b7280" strokeWidth="1" fill="none" />}
      <text x="12" y="166" fontSize="10" fill="#6b7280">Sample pole · no photo</text>
    </svg>
  );
}
