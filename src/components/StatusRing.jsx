import React from "react";

// Glowing circular status ring used across the command center.
export default function StatusRing({ value, max = 100, label, sublabel, color = "#45A29E", size = 128, strokeWidth = 9 }) {
const pct = Math.max(0, Math.min(1, (value || 0) / (max || 1)));
const r = (size - strokeWidth) / 2;
const c = 2 * Math.PI * r;
return (
<div className="flex flex-col items-center gap-2.5">
<div className="relative" style={{ width: size, height: size }}>
<svg width={size} height={size} className="-rotate-90">
<circle cx={size / 2} cy={size / 2} r={r} stroke="hsl(var(--secondary))" strokeWidth={strokeWidth} fill="none" />
<circle
cx={size / 2}
cy={size / 2}
r={r}
stroke={color}
strokeWidth={strokeWidth}
fill="none"
strokeDasharray={c}
strokeDashoffset={c * (1 - pct)}
strokeLinecap="round"
style={{ filter: `drop-shadow(0 0 8px ${color}88)` }}
/>
</svg>
<div className="absolute inset-0 flex flex-col items-center justify-center">
<span className="font-heading text-2xl font-bold tracking-tight">{Math.round(pct * 100)}%</span>
{sublabel && (
<span className="text-[10px] uppercase tracking-widest text-muted-foreground">{sublabel}</span>
)}
</div>
</div>
{label && (
<span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">{label}</span>
)}
</div>
);
}
