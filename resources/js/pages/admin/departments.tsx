import { AdminDataTable, type AdminTableColumn } from '@/components/admin/admin-data-table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { Plus } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';

interface ManagedDepartment {
    id: number;
    name: string;
    code: string;
    users_count: number;
}

type DepartmentFormData = { name: string; code: string };

interface DepartmentsPageProps {
    departments: ManagedDepartment[];
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Departments', href: '/admin/departments' },
];

const emptyForm: DepartmentFormData = { name: '', code: '' };

export default function DepartmentsPage({ departments }: DepartmentsPageProps) {
    const [formOpen, setFormOpen] = useState(false);
    const [editingDepartment, setEditingDepartment] = useState<ManagedDepartment | null>(null);
    const [deletingDepartment, setDeletingDepartment] = useState<ManagedDepartment | null>(null);
    const form = useForm<DepartmentFormData>(emptyForm);
    const deleteForm = useForm<Record<string, never>>({});

    const columns: AdminTableColumn<ManagedDepartment>[] = [
        {
            key: 'name',
            label: 'Department',
            render: (department) => <span className="font-medium">{department.name}</span>,
            sortValue: (department) => department.name,
        },
        { key: 'code', label: 'Code', render: (department) => department.code, sortValue: (department) => department.code },
        {
            key: 'users_count',
            label: 'Employees',
            render: (department) => `${department.users_count} assigned`,
            sortValue: (department) => department.users_count,
        },
    ];

    function openCreate(): void {
        setEditingDepartment(null);
        form.setData(emptyForm);
        form.clearErrors();
        setFormOpen(true);
    }

    function openEdit(department: ManagedDepartment): void {
        setEditingDepartment(department);
        form.setData({ name: department.name, code: department.code });
        form.clearErrors();
        setFormOpen(true);
    }

    function submit(event: FormEvent<HTMLFormElement>): void {
        event.preventDefault();
        const options = {
            preserveScroll: true,
            onSuccess: () => {
                setFormOpen(false);
                form.setData(emptyForm);
                toast.success(editingDepartment ? 'Department updated successfully.' : 'Department created successfully.');
            },
        };

        if (editingDepartment) form.put(`/admin/departments/${editingDepartment.id}`, options);
        else form.post('/admin/departments', options);
    }

    function confirmDelete(): void {
        if (!deletingDepartment) return;
        deleteForm.delete(`/admin/departments/${deletingDepartment.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                setDeletingDepartment(null);
                toast.success('Department deleted successfully.');
            },
        });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Departments" />
            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight">Departments</h1>
                        <p className="text-muted-foreground">Organizational units that employees and their equipment belong to.</p>
                    </div>
                    <Button onClick={openCreate}>
                        <Plus /> Add department
                    </Button>
                </div>
                <AdminDataTable
                    data={departments}
                    columns={columns}
                    searchPlaceholder="Search departments..."
                    getSearchText={(department) => `${department.name} ${department.code}`}
                    onEdit={openEdit}
                    onDelete={setDeletingDepartment}
                    deleteDisabled={(department) => department.users_count > 0}
                />
            </div>

            <Dialog open={formOpen} onOpenChange={(open) => !form.processing && setFormOpen(open)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingDepartment ? 'Edit department' : 'Add department'}</DialogTitle>
                        <DialogDescription>Departments drive accountability reporting across the hardware register.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={submit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="department-name">Name</Label>
                            <Input
                                id="department-name"
                                placeholder="Information Technology"
                                value={form.data.name}
                                onChange={(event) => form.setData('name', event.target.value)}
                            />
                            {form.errors.name && <p className="text-destructive text-sm">{form.errors.name}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="department-code">Code</Label>
                            <Input
                                id="department-code"
                                placeholder="IT"
                                value={form.data.code}
                                onChange={(event) => form.setData('code', event.target.value.toUpperCase())}
                            />
                            {form.errors.code && <p className="text-destructive text-sm">{form.errors.code}</p>}
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={form.processing}>
                                {form.processing ? 'Saving...' : 'Save department'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={Boolean(deletingDepartment)} onOpenChange={(open) => !open && setDeletingDepartment(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete department?</DialogTitle>
                        <DialogDescription>
                            This permanently removes {deletingDepartment?.name}. Departments with employees cannot be deleted.
                        </DialogDescription>
                    </DialogHeader>
                    {deleteForm.errors.department && <p className="text-destructive text-sm">{deleteForm.errors.department}</p>}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeletingDepartment(null)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={confirmDelete} disabled={deleteForm.processing}>
                            {deleteForm.processing ? 'Deleting...' : 'Delete department'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
