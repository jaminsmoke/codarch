export interface SidebarItem {
  label?: string;
  link?: string;
  slug?: string;
  items?: SidebarItem[];
  collapsed?: boolean;
  attrs?: Record<string, unknown>;
}

export function sidebar(): SidebarItem[];
