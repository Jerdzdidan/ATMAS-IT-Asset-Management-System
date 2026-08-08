import { AdminReportPage, type AdminReportPageProps } from '@/components/admin/reports/admin-report-page';

export default function EmployeeAccountabilityReportPage(props: AdminReportPageProps) {
    return <AdminReportPage {...props} reportUrl="/admin/reports/employee-accountability" />;
}
