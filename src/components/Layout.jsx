import React, { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { Menu, LayoutDashboard, Truck, Users, Route, Fuel, Wrench, AlertTriangle, UserCircle, Radar } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const NAV = [
{ to: "/", label: "Command Center", icon: LayoutDashboard, end: true },
{ to: "/vehicles", label: "Vehicles", icon: Truck },
{ to: "/drivers", label: "Drivers", icon: Users },
{ to: "/trips", label: "Trips & Dispatch", icon: Route },
{ to: "/fuel", label: "Fuel", icon: Fuel },
{ to: "/maintenance", label: "Maintenance", icon: Wrench },
{ to: "/defects", label: "Defects", icon: AlertTriangle },
{ to: "/driver-portal", label: "Driver Portal", icon: UserCircle },
];

function NavLinks({ onNavigate }) {
return (
<nav className="flex flex-col gap-1 px-3">
{NAV.map(({ to, label, icon: Icon, end }) => (
<NavLink
key={to}
to={to}
end={end}
onClick={onNavigate}
className={({ isActive }) =>
`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
isActive
? "bg-primary/15 text-primary glow-teal"
: "text-sidebar-foreground/80 hover:bg-secondary hover:text-foreground"
}`
}
>
<Icon className="h-4 w-4" />
{label}
</NavLink>
))}
</nav>
);
}

function SidebarContent({ onNavigate }) {
return (
<div className="flex h-full flex-col">
<div className="flex items-center gap-2.5 px-6 py-6 border-b border-border/50">
<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 glow-teal">
<Radar className="h-5 w-5 text-primary" />
</div>
<div>
<p className="font-heading text-base font-bold leading-none tracking-tight">FleetPilot</p>
<p className="text-[10px] uppercase tracking-[0.2em] text-primary/70">Enterprise VMS</p>
</div>
</div>
<div className="flex-1 overflow-y-auto py-4 scrollbar-thin">
<NavLinks onNavigate={onNavigate} />
</div>
<div className="border-t border-border/50 px-6 py-4">
<p className="text-[10px] uppercase tracking-widest text-muted-foreground">Fleet capacity</p>
<p className="text-sm font-semibold text-foreground">500 vehicles · Tier 1</p>
<p className="text-[10px] text-muted-foreground/60 mt-3">Developed by Mahdi Sakib</p>
</div>
</div>
);
}

export default function Layout() {
const [open, setOpen] = useState(false);
return (
<div className="min-h-screen">
{/* Desktop sidebar */}
<aside className="fixed inset-y-0 left-0 z-40 hidden w-60 border-r border-border/50 bg-sidebar md:block">
<SidebarContent />
</aside>

{/* Mobile top bar */}
<div className="sticky top-0 z-40 flex items-center gap-3 border-b border-border/50 bg-background/90 px-4 py-3 backdrop-blur md:hidden">
<Sheet open={open} onOpenChange={setOpen}>
<SheetTrigger asChild>
<button className="rounded-md p-2 text-foreground">
<Menu className="h-5 w-5" />
</button>
</SheetTrigger>
<SheetContent side="left" className="w-64 border-border/50 bg-sidebar p-0">
<SidebarContent onNavigate={() => setOpen(false)} />
</SheetContent>
</Sheet>
<div className="flex items-center gap-2">
<Radar className="h-5 w-5 text-primary" />
<span className="font-heading font-bold">FleetPilot</span>
</div>
</div>

<main className="md:pl-60">
<div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-8">
<Outlet />
</div>
</main>
</div>
);
}
