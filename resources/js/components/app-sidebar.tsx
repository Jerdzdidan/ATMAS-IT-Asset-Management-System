import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { type NavGroup, type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { Building2, HardDrive, Layers, LayoutGrid, LifeBuoy, Users, Wrench } from 'lucide-react';
import AppLogo from './app-logo';

const dashboardGroup: NavGroup = {
    title: 'Main',
    items: [{ title: 'Dashboard', url: '/dashboard', icon: LayoutGrid }],
};

/** Categories are reference data, so only the roles that can edit the register see them. */
function buildAssetManagementGroup(managesAssets: boolean): NavGroup {
    return {
        title: 'Asset Management',
        items: [
            { title: 'Assets', url: '/admin/assets', icon: HardDrive },
            ...(managesAssets ? [{ title: 'Categories', url: '/admin/categories', icon: Layers }] : []),
            { title: 'Maintenance', url: '/admin/maintenance-requests', icon: Wrench },
        ],
    };
}

const administrationGroup: NavGroup = {
    title: 'Administration',
    items: [
        { title: 'Users', url: '/admin/users', icon: Users },
        { title: 'Departments', url: '/admin/departments', icon: Building2 },
    ],
};

const myWorkspaceGroup: NavGroup = {
    title: 'My Workspace',
    items: [
        { title: 'My Assets', url: '/my/assets', icon: HardDrive },
        { title: 'My Requests', url: '/my/requests', icon: LifeBuoy },
    ],
};

export function AppSidebar() {
    const { auth } = usePage<SharedData>().props;

    const navGroups: NavGroup[] = [
        dashboardGroup,
        ...(auth.permissions.views_register ? [buildAssetManagementGroup(auth.permissions.manages_assets)] : []),
        ...(auth.permissions.manages_users ? [administrationGroup] : []),
        myWorkspaceGroup,
    ];

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href="/dashboard" prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent className="gap-2">
                <NavMain groups={navGroups} />
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
