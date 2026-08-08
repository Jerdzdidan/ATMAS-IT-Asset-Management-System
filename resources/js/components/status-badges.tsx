import { Badge } from '@/components/ui/badge';
import { type AssetCondition, type AssetStatus, type MaintenanceRequestStatus } from '@/types';

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline';

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

const assetStatusVariants: Record<AssetStatus, BadgeVariant> = {
    AVAILABLE: 'default',
    ASSIGNED: 'secondary',
    UNDER_REPAIR: 'destructive',
    RETIRED: 'outline',
};

const assetConditionVariants: Record<AssetCondition, BadgeVariant> = {
    NEW: 'default',
    GOOD: 'default',
    FAIR: 'secondary',
    POOR: 'destructive',
};

const maintenanceStatusVariants: Record<MaintenanceRequestStatus, BadgeVariant> = {
    PENDING: 'secondary',
    IN_PROGRESS: 'default',
    RESOLVED: 'outline',
    REJECTED: 'destructive',
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
