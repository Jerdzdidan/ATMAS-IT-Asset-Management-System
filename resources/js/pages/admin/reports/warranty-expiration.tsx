import { AdminReportPage, type AdminReportPageProps } from '@/components/admin/reports/admin-report-page';

export default function WarrantyExpirationReportPage(props: AdminReportPageProps) {
    return <AdminReportPage {...props} reportUrl="/admin/reports/warranty-expiration" />;
}
