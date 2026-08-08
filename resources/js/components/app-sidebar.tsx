import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { type NavGroup, type Permissions, type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { Building2, CalendarClock, FileSpreadsheet, HardDrive, Layers, LayoutGrid, LifeBuoy, QrCode, ScrollText, Users, Wrench } from 'lucide-react';
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
            { title: 'PM Schedules', url: '/admin/maintenance-schedules', icon: CalendarClock },
            { title: 'Scan', url: '/admin/scan', icon: QrCode },
        ],
    };
}

/** Reporting and the audit trail answer to different roles, so they are gated separately. */
function buildInsightsGroup(permissions: Permissions): NavGroup {
    return {
        title: 'Reporting',
        items: [
            { title: 'Reports', url: '/admin/reports', icon: FileSpreadsheet },
            ...(permissions.views_audit_trail ? [{ title: 'Audit Trail', url: '/admin/activity-log', icon: ScrollText }] : []),
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
    const { permissions } = auth;

    const navGroups: NavGroup[] = [
        dashboardGroup,
        ...(permissions.views_register ? [buildAssetManagementGroup(permissions.manages_assets)] : []),
        ...(permissions.views_register ? [buildInsightsGroup(permissions)] : []),
        ...(permissions.manages_assets
            ? [{ title: 'Data', items: [{ title: 'Import / Export', url: '/admin/import-export', icon: FileSpreadsheet }] }]
            : []),
        ...(permissions.manages_users ? [administrationGroup] : []),
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
