import { AdminDataTable, type AdminTableColumn } from '@/components/admin/admin-data-table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { Plus } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';

interface ManagedCategory {
    id: number;
    name: string;
    code: string;
    description: string | null;
    assets_count: number;
}

type CategoryFormData = { name: string; code: string; description: string };

interface CategoriesPageProps {
    categories: ManagedCategory[];
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Categories', href: '/admin/categories' },
];

const emptyForm: CategoryFormData = { name: '', code: '', description: '' };

export default function CategoriesPage({ categories }: CategoriesPageProps) {
    const [formOpen, setFormOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<ManagedCategory | null>(null);
    const [deletingCategory, setDeletingCategory] = useState<ManagedCategory | null>(null);
    const form = useForm<CategoryFormData>(emptyForm);
    const deleteForm = useForm<Record<string, never>>({});

    const columns: AdminTableColumn<ManagedCategory>[] = [
        {
            key: 'name',
            label: 'Category',
            render: (category) => <span className="font-medium">{category.name}</span>,
            sortValue: (category) => category.name,
        },
        {
            key: 'code',
            label: 'Tag code',
            render: (category) => <span className="font-mono">{category.code}</span>,
            sortValue: (category) => category.code,
        },
        {
            key: 'description',
            label: 'Description',
            render: (category) => category.description ?? <span className="text-muted-foreground">—</span>,
        },
        {
            key: 'assets_count',
            label: 'Assets',
            render: (category) => `${category.assets_count} registered`,
            sortValue: (category) => category.assets_count,
        },
    ];

    function openCreate(): void {
        setEditingCategory(null);
        form.setData(emptyForm);
        form.clearErrors();
        setFormOpen(true);
    }

    function openEdit(category: ManagedCategory): void {
        setEditingCategory(category);
        form.setData({ name: category.name, code: category.code, description: category.description ?? '' });
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
                toast.success(editingCategory ? 'Category updated successfully.' : 'Category created successfully.');
            },
        };

        if (editingCategory) form.put(`/admin/categories/${editingCategory.id}`, options);
        else form.post('/admin/categories', options);
    }

    function confirmDelete(): void {
        if (!deletingCategory) return;
        deleteForm.delete(`/admin/categories/${deletingCategory.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                setDeletingCategory(null);
                toast.success('Category deleted successfully.');
            },
        });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Asset categories" />
            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight">Asset categories</h1>
                        <p className="text-muted-foreground">Device types used to classify the hardware register.</p>
                    </div>
                    <Button onClick={openCreate}>
                        <Plus /> Add category
                    </Button>
                </div>
                <AdminDataTable
                    data={categories}
                    columns={columns}
                    searchPlaceholder="Search categories..."
                    getSearchText={(category) => `${category.name} ${category.code} ${category.description ?? ''}`}
                    onEdit={openEdit}
                    onDelete={setDeletingCategory}
                    deleteDisabled={(category) => category.assets_count > 0}
                />
            </div>

            <Dialog open={formOpen} onOpenChange={(open) => !form.processing && setFormOpen(open)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingCategory ? 'Edit category' : 'Add category'}</DialogTitle>
                        <DialogDescription>Group hardware by device type so reporting and search stay consistent.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={submit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="category-name">Name</Label>
                            <Input
                                id="category-name"
                                placeholder="Laptop"
                                value={form.data.name}
                                onChange={(event) => form.setData('name', event.target.value)}
                            />
                            {form.errors.name && <p className="text-destructive text-sm">{form.errors.name}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="category-code">Tag code</Label>
                            <Input
                                id="category-code"
                                placeholder="L"
                                className="font-mono"
                                disabled={Boolean(editingCategory && editingCategory.assets_count > 0)}
                                value={form.data.code}
                                onChange={(event) => form.setData('code', event.target.value.toUpperCase())}
                            />
                            <p className="text-muted-foreground text-xs">
                                {editingCategory && editingCategory.assets_count > 0
                                    ? 'Locked because assets already carry this code in their tags.'
                                    : `Prefixes every asset tag in this category, e.g. ${form.data.code || 'L'}-${new Date().getFullYear()}-0001.`}
                            </p>
                            {form.errors.code && <p className="text-destructive text-sm">{form.errors.code}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="category-description">Description</Label>
                            <Textarea
                                id="category-description"
                                value={form.data.description}
                                onChange={(event) => form.setData('description', event.target.value)}
                            />
                            {form.errors.description && <p className="text-destructive text-sm">{form.errors.description}</p>}
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={form.processing}>
                                {form.processing ? 'Saving...' : 'Save category'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={Boolean(deletingCategory)} onOpenChange={(open) => !open && setDeletingCategory(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete category?</DialogTitle>
                        <DialogDescription>
                            This permanently removes {deletingCategory?.name}. Categories still used by assets cannot be deleted.
                        </DialogDescription>
                    </DialogHeader>
                    {deleteForm.errors.category && <p className="text-destructive text-sm">{deleteForm.errors.category}</p>}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeletingCategory(null)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={confirmDelete} disabled={deleteForm.processing}>
                            {deleteForm.processing ? 'Deleting...' : 'Delete category'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
