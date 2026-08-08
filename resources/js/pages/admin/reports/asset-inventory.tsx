import { AdminReportPage, type AdminReportPageProps } from '@/components/admin/reports/admin-report-page';

export default function AssetInventoryReportPage(props: AdminReportPageProps) {
    return <AdminReportPage {...props} reportUrl="/admin/reports/asset-inventory" />;
}
