import { AdminReportPage, type AdminReportPageProps } from '@/components/admin/reports/admin-report-page';

export default function DepartmentDistributionReportPage(props: AdminReportPageProps) {
    return <AdminReportPage {...props} reportUrl="/admin/reports/department-distribution" />;
}
