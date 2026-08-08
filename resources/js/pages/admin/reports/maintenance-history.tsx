import { AdminReportPage, type AdminReportPageProps } from '@/components/admin/reports/admin-report-page';

export default function MaintenanceHistoryReportPage(props: AdminReportPageProps) {
    return <AdminReportPage {...props} reportUrl="/admin/reports/maintenance-history" />;
}
