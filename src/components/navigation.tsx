"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { DashboardIcon, LeagueIcon } from "@/components/icons";

const navigationItems = [
  { href: "/", label: "Dashboard", icon: DashboardIcon },
  { href: "/leagues", label: "Leagues", icon: LeagueIcon },
] as const;

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav aria-label="Primary" className="primary-nav">
      {navigationItems.map((item) => {
        const isCurrent = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link aria-current={isCurrent ? "page" : undefined} className="nav-link" href={item.href} key={item.href}>
            <Icon />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
