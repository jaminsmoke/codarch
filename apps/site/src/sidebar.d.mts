export interface SidebarItem {
  label?: string;
  translations?: Record<string, string>;
  link?: string;
  slug?: string;
  items?: SidebarItem[];
  collapsed?: boolean;
  attrs?: Record<string, unknown>;
}

export function sidebar(): SidebarItem[];
export function sidebarUsar(): SidebarItem;
export function sidebarDesarrollo(): SidebarItem;
