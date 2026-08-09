import { LucideIcon } from 'lucide-react';

export type UserRole = 'SUPER_ADMIN' | 'IT_STAFF' | 'DEPARTMENT_HEAD' | 'MANAGEMENT' | 'AUDITOR' | 'EMPLOYEE';
export type AssetStatus = 'AVAILABLE' | 'ASSIGNED' | 'UNDER_REPAIR' | 'RETIRED';
export type AssetCondition = 'NEW' | 'GOOD' | 'FAIR' | 'POOR';
export type MaintenanceRequestStatus = 'PENDING' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED';
export type MaintenanceRequestType = 'REPAIR' | 'PREVENTIVE' | 'REPLACEMENT';
export type MaintenanceFrequency = 'MONTHLY' | 'QUARTERLY' | 'SEMI_ANNUAL' | 'ANNUAL';
export type AuditEventType =
    | 'CREATED'
    | 'UPDATED'
    | 'DELETED'
    | 'ISSUED'
    | 'RETURNED'
    | 'RETIRED'
    | 'RESTORED'
    | 'SERVICED'
    | 'IMPORTED'
    | 'EXPORTED'
    | 'LOGGED_IN'
    | 'LOGGED_OUT';

/** Mirrors the route middleware so pages can hide the actions a role cannot perform. */
export interface Permissions {
    manages_assets: boolean;
    manages_users: boolean;
    views_register: boolean;
    views_audit_trail: boolean;
    is_department_scoped: boolean;
}

export interface AssetPhoto {
    id: number;
    asset_id: number;
    path: string;
    url: string;
    original_name: string;
    size_bytes: number;
    caption: string | null;
    is_primary: boolean;
    created_at: string;
}

export interface MaintenanceSchedule {
    id: number;
    asset_id: number;
    title: string;
    frequency: MaintenanceFrequency;
    next_due_on: string;
    last_completed_on: string | null;
    instructions: string | null;
    is_active: boolean;
    is_overdue: boolean;
    days_until_due: number | null;
    asset?: { id: number; asset_tag: string; name: string; department?: { id: number; name: string } | null } | null;
}

/** Outcome of a spreadsheet import, flashed back to the import console. */
export interface ImportSummary {
    imported: number;
    failed: number;
    errors: { row: number; message: string }[];
}

/** One report produced by App\Services\ReportBuilder. */
export interface ReportPayload {
    key: string;
    title: string;
    description: string;
    columns: { key: string; label: string; align?: string }[];
    rows: Record<string, string>[];
    summary: { label: string; value: string }[];
}

export interface Auth {
    user: User;
    /** The signed-in account's own department, or null when it belongs to none. */
    department: { id: number; name: string } | null;
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
    flash?: { success?: string; error?: string; importSummary?: ImportSummary };
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
