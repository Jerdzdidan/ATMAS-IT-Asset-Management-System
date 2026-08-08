import { AdminDataTable, type AdminTableColumn } from '@/components/admin/admin-data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type UserRole } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { Plus } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';

type AccountStatus = 'ACTIVE' | 'INACTIVE';

interface ManagedUser {
    id: number;
    name: string;
    email: string;
    role: UserRole;
    employee_code: string | null;
    department_id: number | null;
    position: string | null;
    contact_number: string | null;
    status: AccountStatus;
    department: { id: number; name: string } | null;
}

type UserFormData = {
    name: string;
    email: string;
    password: string;
    role: UserRole;
    employee_code: string;
    department_id: string;
    position: string;
    contact_number: string;
    status: AccountStatus;
};

interface UsersPageProps {
    users: ManagedUser[];
    departments: { id: number; name: string }[];
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Users', href: '/admin/users' },
];

/** Kept in step with App\Enums\UserRole so the picker explains what each role unlocks. */
const roles: { value: UserRole; label: string; description: string }[] = [
    { value: 'SUPER_ADMIN', label: 'Super Administrator', description: 'Full access to every module, user management, and settings.' },
    { value: 'IT_STAFF', label: 'Administrator (IT Staff)', description: 'Manages assets, records, inventory operations, and the repair queue.' },
    { value: 'DEPARTMENT_HEAD', label: 'Department Head', description: 'Views the assets allocated to their own department.' },
    { value: 'MANAGEMENT', label: 'Management', description: 'Views dashboards and summaries without editing records.' },
    { value: 'AUDITOR', label: 'Auditor', description: 'Read-only access to the inventory records.' },
    { value: 'EMPLOYEE', label: 'Employee', description: 'Views only the assets issued to them.' },
];

const roleLabels = Object.fromEntries(roles.map((role) => [role.value, role.label])) as Record<UserRole, string>;

const emptyForm: UserFormData = {
    name: '',
    email: '',
    password: '',
    role: 'EMPLOYEE',
    employee_code: '',
    department_id: '',
    position: '',
    contact_number: '',
    status: 'ACTIVE',
};

const unassignedDepartment = 'NONE';

export default function UsersPage({ users, departments }: UsersPageProps) {
    const [formOpen, setFormOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
    const [deletingUser, setDeletingUser] = useState<ManagedUser | null>(null);
    const form = useForm<UserFormData>(emptyForm);
    const deleteForm = useForm<Record<string, never>>({});

    const columns: AdminTableColumn<ManagedUser>[] = [
        {
            key: 'name',
            label: 'Name',
            render: (user) => <span className="font-medium">{user.name}</span>,
            sortValue: (user) => user.name,
        },
        { key: 'email', label: 'Email', render: (user) => user.email, sortValue: (user) => user.email },
        {
            key: 'employee_code',
            label: 'Employee code',
            render: (user) => user.employee_code ?? <span className="text-muted-foreground">—</span>,
            sortValue: (user) => user.employee_code ?? '',
        },
        {
            key: 'department',
            label: 'Department',
            render: (user) => user.department?.name ?? <span className="text-muted-foreground">—</span>,
            sortValue: (user) => user.department?.name ?? '',
        },
        { key: 'role', label: 'Role', render: (user) => roleLabels[user.role], sortValue: (user) => user.role },
        {
            key: 'status',
            label: 'Status',
            render: (user) => <Badge variant={user.status === 'ACTIVE' ? 'default' : 'destructive'}>{user.status}</Badge>,
            sortValue: (user) => user.status,
        },
    ];

    function openCreate(): void {
        setEditingUser(null);
        form.setData(emptyForm);
        form.clearErrors();
        setFormOpen(true);
    }

    function openEdit(user: ManagedUser): void {
        setEditingUser(user);
        form.setData({
            name: user.name,
            email: user.email,
            password: '',
            role: user.role,
            employee_code: user.employee_code ?? '',
            department_id: user.department_id ? String(user.department_id) : unassignedDepartment,
            position: user.position ?? '',
            contact_number: user.contact_number ?? '',
            status: user.status,
        });
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
                toast.success(editingUser ? 'User updated successfully.' : 'User created successfully.');
            },
        };

        // The select needs a non-empty sentinel, but the API expects a null department.
        form.transform((data) => ({
            ...data,
            department_id: data.department_id === unassignedDepartment || data.department_id === '' ? null : data.department_id,
        }));

        if (editingUser) form.put(`/admin/users/${editingUser.id}`, options);
        else form.post('/admin/users', options);
    }

    function confirmDelete(): void {
        if (!deletingUser) return;
        deleteForm.delete(`/admin/users/${deletingUser.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                setDeletingUser(null);
                toast.success('User deleted successfully.');
            },
        });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="User management" />
            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight">User management</h1>
                        <p className="text-muted-foreground">Accounts, roles, and the employees who can hold company hardware.</p>
                    </div>
                    <Button onClick={openCreate}>
                        <Plus /> Add user
                    </Button>
                </div>
                <AdminDataTable
                    data={users}
                    columns={columns}
                    searchPlaceholder="Search users..."
                    getSearchText={(user) => `${user.name} ${user.email} ${user.employee_code ?? ''} ${user.department?.name ?? ''} ${user.role}`}
                    onEdit={openEdit}
                    onDelete={setDeletingUser}
                    filterOptions={[{ value: 'ALL', label: 'All roles' }, ...roles.map((role) => ({ value: role.value, label: role.label }))]}
                    getFilterValue={(user) => user.role}
                />
            </div>

            <Dialog open={formOpen} onOpenChange={(open) => !form.processing && setFormOpen(open)}>
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{editingUser ? 'Edit user' : 'Add user'}</DialogTitle>
                        <DialogDescription>Roles decide what each account can see and do inside ATMAS.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={submit} className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="user-name">Full name</Label>
                                <Input id="user-name" value={form.data.name} onChange={(event) => form.setData('name', event.target.value)} />
                                {form.errors.name && <p className="text-destructive text-sm">{form.errors.name}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="user-email">Email</Label>
                                <Input
                                    id="user-email"
                                    type="email"
                                    value={form.data.email}
                                    onChange={(event) => form.setData('email', event.target.value)}
                                />
                                {form.errors.email && <p className="text-destructive text-sm">{form.errors.email}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="user-password">{editingUser ? 'New password (optional)' : 'Password'}</Label>
                                <Input
                                    id="user-password"
                                    type="password"
                                    autoComplete="new-password"
                                    value={form.data.password}
                                    onChange={(event) => form.setData('password', event.target.value)}
                                />
                                {form.errors.password && <p className="text-destructive text-sm">{form.errors.password}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label>Role</Label>
                                <Select value={form.data.role} onValueChange={(value: UserRole) => form.setData('role', value)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {roles.map((role) => (
                                            <SelectItem key={role.value} value={role.value}>
                                                {role.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <p className="text-muted-foreground text-xs">{roles.find((role) => role.value === form.data.role)?.description}</p>
                                {form.errors.role && <p className="text-destructive text-sm">{form.errors.role}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="user-employee-code">Employee code</Label>
                                <Input
                                    id="user-employee-code"
                                    placeholder="23-00101"
                                    value={form.data.employee_code}
                                    onChange={(event) => form.setData('employee_code', event.target.value.toUpperCase())}
                                />
                                {form.errors.employee_code && <p className="text-destructive text-sm">{form.errors.employee_code}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label>Department</Label>
                                <Select value={form.data.department_id} onValueChange={(value) => form.setData('department_id', value)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a department" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value={unassignedDepartment}>Unassigned</SelectItem>
                                        {departments.map((department) => (
                                            <SelectItem key={department.id} value={String(department.id)}>
                                                {department.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {form.errors.department_id && <p className="text-destructive text-sm">{form.errors.department_id}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="user-position">Position</Label>
                                <Input
                                    id="user-position"
                                    value={form.data.position}
                                    onChange={(event) => form.setData('position', event.target.value)}
                                />
                                {form.errors.position && <p className="text-destructive text-sm">{form.errors.position}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="user-contact">Contact number</Label>
                                <Input
                                    id="user-contact"
                                    value={form.data.contact_number}
                                    onChange={(event) => form.setData('contact_number', event.target.value)}
                                />
                                {form.errors.contact_number && <p className="text-destructive text-sm">{form.errors.contact_number}</p>}
                            </div>
                            {editingUser && (
                                <div className="space-y-2 sm:col-span-2">
                                    <Label>Status</Label>
                                    <Select value={form.data.status} onValueChange={(value: AccountStatus) => form.setData('status', value)}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ACTIVE">Active</SelectItem>
                                            <SelectItem value="INACTIVE">Inactive</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {form.errors.status && <p className="text-destructive text-sm">{form.errors.status}</p>}
                                </div>
                            )}
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={form.processing}>
                                {form.processing ? 'Saving...' : 'Save user'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={Boolean(deletingUser)} onOpenChange={(open) => !open && setDeletingUser(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete user?</DialogTitle>
                        <DialogDescription>
                            This permanently removes {deletingUser?.name}. Accounts with asset or maintenance history must be deactivated instead.
                        </DialogDescription>
                    </DialogHeader>
                    {deleteForm.errors.user && <p className="text-destructive text-sm">{deleteForm.errors.user}</p>}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeletingUser(null)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={confirmDelete} disabled={deleteForm.processing}>
                            {deleteForm.processing ? 'Deleting...' : 'Delete user'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
