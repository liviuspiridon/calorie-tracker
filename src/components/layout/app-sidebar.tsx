import Link from "next/link";

import { siteConfig } from "@/config/site";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { BrandMark } from "@/components/layout/brand-mark";

/** Fixed desktop sidebar. Hidden below `md`; the sheet in the header takes over. */
export function AppSidebar() {
  return (
    <aside className="bg-sidebar fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r md:flex">
      <div className="flex h-14 items-center border-b px-5">
        <Link
          href="/"
          className="text-sidebar-foreground flex items-center gap-2 font-semibold tracking-tight"
        >
          <BrandMark />
          {siteConfig.name}
        </Link>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-4">
        <SidebarNav />
      </div>
      <div className="text-muted-foreground border-t px-5 py-3 text-xs">
        v0.1 · foundation
      </div>
    </aside>
  );
}
