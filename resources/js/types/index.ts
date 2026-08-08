import { LucideIcon } from 'lucide-react';

export type UserRole = 'SUPER_ADMIN' | 'IT_STAFF' | 'DEPARTMENT_HEAD' | 'MANAGEMENT' | 'AUDITOR' | 'EMPLOYEE';
export type AssetStatus = 'AVAILABLE' | 'ASSIGNED' | 'UNDER_REPAIR' | 'RETIRED';
export type AssetCondition = 'NEW' | 'GOOD' | 'FAIR' | 'POOR';
export type MaintenanceRequestStatus = 'PENDING' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED';
export type MaintenanceRequestType = 'REPAIR' | 'PREVENTIVE' | 'REPLACEMENT';

/** Mirrors the route middleware so pages can hide the actions a role cannot perform. */
export interface Permissions {
    manages_assets: boolean;
    manages_users: boolean;
    views_register: boolean;
    is_department_scoped: boolean;
}

export interface Auth {
    user: User;
    permissions: Permissions;
}

export interface BreadcrumbItem {
    title: string;
    href: string;
}

export interface NavGroup {
    title: string;
    items: NavItem[];
}

export interface NavItem {
    title: string;
    url: string;
    icon?: LucideIcon | null;
    isActive?: boolean;
}

export interface SharedData {
    name: string;
    quote: { message: string; author: string };
    auth: Auth;
    flash?: { success?: string; error?: string };
    [key: string]: unknown;
}

export interface User {
    id: number;
    name: string;
    email: string;
    role: UserRole;
    employee_code: string | null;
    department_id: number | null;
    position: string | null;
    contact_number: string | null;
    status: 'ACTIVE' | 'INACTIVE';
    avatar?: string;
    email_verified_at: string | null;
    created_at: string;
    updated_at: string;
    [key: string]: unknown; // This allows for additional properties...
}
