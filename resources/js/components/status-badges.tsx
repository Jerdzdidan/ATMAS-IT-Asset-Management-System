import { Badge } from '@/components/ui/badge';
import { type AssetCondition, type AssetStatus, type MaintenanceFrequency, type MaintenanceRequestStatus, type UserRole } from '@/types';

type BadgeVariant = 'success' | 'info' | 'warning' | 'danger' | 'neutral';

/** Kept in step with App\Enums\UserRole. Lives here so any screen can name a role, not just Users. */
export const userRoleLabels: Record<UserRole, string> = {
    SUPER_ADMIN: 'Super Administrator',
    IT_STAFF: 'Administrator (IT Staff)',
    DEPARTMENT_HEAD: 'Department Head',
    MANAGEMENT: 'Management',
    AUDITOR: 'Auditor',
    EMPLOYEE: 'Employee',
};

export const assetStatusLabels: Record<AssetStatus, string> = {
    AVAILABLE: 'Available',
    ASSIGNED: 'Assigned',
    UNDER_REPAIR: 'Under repair',
    RETIRED: 'Retired',
};

export const assetConditionLabels: Record<AssetCondition, string> = {
    NEW: 'New',
    GOOD: 'Good',
    FAIR: 'Fair',
    POOR: 'Poor',
};

export const maintenanceStatusLabels: Record<MaintenanceRequestStatus, string> = {
    PENDING: 'Pending',
    IN_PROGRESS: 'In progress',
    RESOLVED: 'Resolved',
    REJECTED: 'Rejected',
};

/** Kept in step with App\Enums\MaintenanceFrequency. */
export const maintenanceFrequencyLabels: Record<MaintenanceFrequency, string> = {
    MONTHLY: 'Monthly',
    QUARTERLY: 'Quarterly',
    SEMI_ANNUAL: 'Every 6 months',
    ANNUAL: 'Annually',
};

/**
 * Status colours follow the Forms International ring: green for healthy, blue for in-use,
 * orange for needs-attention, red for a problem, grey for out of service.
 */
const assetStatusVariants: Record<AssetStatus, BadgeVariant> = {
    AVAILABLE: 'success',
    ASSIGNED: 'info',
    UNDER_REPAIR: 'warning',
    RETIRED: 'neutral',
};

const assetConditionVariants: Record<AssetCondition, BadgeVariant> = {
    NEW: 'success',
    GOOD: 'info',
    FAIR: 'warning',
    POOR: 'danger',
};

const maintenanceStatusVariants: Record<MaintenanceRequestStatus, BadgeVariant> = {
    PENDING: 'warning',
    IN_PROGRESS: 'info',
    RESOLVED: 'success',
    REJECTED: 'danger',
};

export function AssetStatusBadge({ status }: { status: AssetStatus }) {
    return <Badge variant={assetStatusVariants[status]}>{assetStatusLabels[status]}</Badge>;
}

export function AssetConditionBadge({ condition }: { condition: AssetCondition }) {
    return <Badge variant={assetConditionVariants[condition]}>{assetConditionLabels[condition]}</Badge>;
}

export function MaintenanceStatusBadge({ status }: { status: MaintenanceRequestStatus }) {
    return <Badge variant={maintenanceStatusVariants[status]}>{maintenanceStatusLabels[status]}</Badge>;
}
