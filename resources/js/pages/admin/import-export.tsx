import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Head, useForm, usePage } from '@inertiajs/react';
import { AlertTriangle, Download, FileDown, FileUp, Upload } from 'lucide-react';
import { type FormEvent } from 'react';

interface ImportExportPageProps {
    columns: string[];
    categories: { name: string; code: string }[];
    departments: { name: string; code: string }[];
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Import / Export', href: '/admin/import-export' },
];

export default function ImportExportPage({ columns, categories, departments }: ImportExportPageProps) {
    const { flash } = usePage<SharedData>().props;
    const summary = flash?.importSummary;
    const form = useForm<{ file: File | null }>({ file: null });

    function submit(event: FormEvent<HTMLFormElement>): void {
        event.preventDefault();
        form.post('/admin/import-export', {
            preserveScroll: true,
            onSuccess: () => form.reset('file'),
        });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Import and export" />
            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">Import and export</h1>
                    <p className="text-muted-foreground">Move the register in and out of Excel for bulk edits, migrations, and offline review.</p>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileDown className="size-4" /> Export
                            </CardTitle>
                            <CardDescription>
                                Downloads every asset you can see, in the same column order the importer reads. Edit it and send it back.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-3 sm:flex-row">
                            <Button asChild>
                                <a href="/admin/import-export/download">
                                    <Download /> Download register (.xlsx)
                                </a>
                            </Button>
                            <Button asChild variant="outline">
                                <a href="/admin/import-export/template">
                                    <FileUp /> Blank import template
                                </a>
                            </Button>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Upload className="size-4" /> Import
                            </CardTitle>
                            <CardDescription>
                                Rows are checked one at a time. A bad row is reported and skipped; the rest of the workbook still lands.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={submit} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="import-file">Workbook</Label>
                                    <Input
                                        id="import-file"
                                        type="file"
                                        accept=".xlsx,.xls,.csv"
                                        className="cursor-pointer file:cursor-pointer"
                                        onChange={(event) => form.setData('file', event.target.files?.[0] ?? null)}
                                    />
                                    {form.errors.file && <p className="text-destructive text-sm">{form.errors.file}</p>}
                                    <p className="text-muted-foreground text-xs">
                                        Asset tags are issued automatically on import — leave that column out.
                                    </p>
                                </div>
                                <Button type="submit" disabled={form.processing || form.data.file === null}>
                                    {form.processing ? `Importing… ${form.progress?.percentage ?? 0}%` : 'Import assets'}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>

                {summary && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Last import</CardTitle>
                            <CardDescription>
                                {summary.imported} row(s) imported, {summary.failed} rejected.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {summary.errors.length === 0 ? (
                                <p className="text-muted-foreground text-sm">Every row was accepted.</p>
                            ) : (
                                <div className="rounded-md border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-24">Sheet row</TableHead>
                                                <TableHead>Why it was rejected</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {summary.errors.map((error) => (
                                                <TableRow key={`${error.row}-${error.message}`}>
                                                    <TableCell className="font-medium">{error.row}</TableCell>
                                                    <TableCell className="flex items-start gap-2 text-sm">
                                                        <AlertTriangle className="text-warning mt-0.5 size-4 shrink-0" />
                                                        {error.message}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                <Card>
                    <CardHeader>
                        <CardTitle>Column reference</CardTitle>
                        <CardDescription>The importer matches on these headings. Only Name and Category Code are required.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-6 lg:grid-cols-3">
                        <div>
                            <h3 className="mb-2 text-sm font-medium">Columns</h3>
                            <ul className="text-muted-foreground space-y-1 text-sm">
                                {columns.map((column) => (
                                    <li key={column}>
                                        {column}
                                        {(column === 'Name' || column === 'Category Code') && <span className="text-destructive"> *</span>}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div>
                            <h3 className="mb-2 text-sm font-medium">Category codes</h3>
                            <ul className="text-muted-foreground space-y-1 text-sm">
                                {categories.map((category) => (
                                    <li key={category.code}>
                                        <span className="text-foreground font-mono">{category.code}</span> — {category.name}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div>
                            <h3 className="mb-2 text-sm font-medium">Department codes</h3>
                            <ul className="text-muted-foreground space-y-1 text-sm">
                                {departments.map((department) => (
                                    <li key={department.code}>
                                        <span className="text-foreground font-mono">{department.code}</span> — {department.name}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
