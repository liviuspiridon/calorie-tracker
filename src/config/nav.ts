import {
  HeartPulse,
  House,
  LayoutDashboard,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  /** Sections that ship later are visible but marked as such. */
  status?: "soon";
};

/**
 * Single source of truth for primary navigation.
 * Sidebar (desktop) and sheet menu (mobile) both render from this list.
 */
export const mainNav: NavItem[] = [
  { title: "Today", href: "/", icon: LayoutDashboard },
  { title: "Health", href: "/health", icon: HeartPulse, status: "soon" },
  { title: "Meals", href: "/meals", icon: UtensilsCrossed },
  { title: "Home", href: "/home", icon: House, status: "soon" },
];
