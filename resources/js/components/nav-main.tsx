import { SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { type NavGroup, type NavItem } from '@/types';
import { Link, usePage } from '@inertiajs/react';

function urlPath(url: string): string {
    return url.split(/[?#]/, 1)[0] || '/';
}

function isCurrent(currentPath: string, url: string): boolean {
    const path = urlPath(url);

    return currentPath === path || currentPath.startsWith(`${path}/`);
}

function NavLinks({ items, currentPath }: { items: NavItem[]; currentPath: string }) {
    return (
        <SidebarMenu>
            {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild tooltip={item.title} isActive={isCurrent(currentPath, item.url)}>
                        <Link href={item.url} prefetch>
                            {item.icon && <item.icon />}
                            <span>{item.title}</span>
                        </Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            ))}
        </SidebarMenu>
    );
}

export function NavMain({ groups = [] }: { groups: NavGroup[] }) {
    const page = usePage();
    const currentPath = urlPath(page.url);

    return (
        <>
            {groups.map((group) => (
                <SidebarGroup key={group.title} className="px-2 py-0">
                    <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
                    <NavLinks items={group.items} currentPath={currentPath} />
                </SidebarGroup>
            ))}
        </>
    );
}
