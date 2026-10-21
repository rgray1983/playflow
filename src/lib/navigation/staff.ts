export const staffNavigation = [
  {label: "Dashboard", href: "/", icon: "▣"},
  {label: "Check-In", href: "/check-in", icon: "✓"},
  {label: "Calendar", href: "/calendar", icon: "◷"},
  {label: "Bookings", href: "/bookings", icon: "✎"},
  {label: "Party & Events", href: "/parties", icon: "★"},
  {label: "POS", href: "/pos", icon: "$"},
  {label: "Reports", href: "/reports", icon: "▥"},
  {label: "Company Settings", href: "/company-settings", icon: "⚙"},
] as const;

export function isNavigationActive(pathname: string, href: string) {
  return pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));
}

export function isStaffPage(pathname: string) {
  return staffNavigation.some(item => isNavigationActive(pathname, item.href));
}
