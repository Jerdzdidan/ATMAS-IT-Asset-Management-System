import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { type AssetCondition } from '@/types';
import { useForm } from '@inertiajs/react';
import { useEffect, type FormEvent } from 'react';
import { toast } from 'sonner';

/** The fields the form reads back off an existing record. */
export interface EditableAsset {
    id: number;
    asset_tag: string;
    name: string;
    asset_category_id: number;
    brand: string | null;
    model: string | null;
    serial_number: string | null;
    location: string | null;
    condition: AssetCondition;
    purchase_date: string | null;
    warranty_expires_at: string | null;
    purchase_cost: string | null;
    remarks: string | null;
    department: { id: number; name: string } | null;
}

type AssetFormData = {
    name: string;
    asset_category_id: string;
    brand: string;
    model: string;
    serial_number: string;
    location: string;
    condition: AssetCondition;
    purchase_date: string;
    warranty_expires_at: string;
    purchase_cost: string;
    remarks: string;
};

interface AssetFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** The record being edited, or null to register a new one. */
    asset: EditableAsset | null;
    categories: { id: number; name: string }[];
    /** Only used when registering, to preview the tag the asset will be issued on save. */
    tagSequence?: { currentYear: number; nextNumber: number };
}

const emptyForm: AssetFormData = {
    name: '',
    asset_category_id: '',
    brand: '',
    model: '',
    serial_number: '',
    location: '',
    condition: 'GOOD',
    purchase_date: '',
    warranty_expires_at: '',
    purchase_cost: '',
    remarks: '',
};

function formValuesFor(asset: EditableAsset | null): AssetFormData {
    if (asset === null) {
        return emptyForm;
    }

    return {
        name: asset.name,
        asset_category_id: String(asset.asset_category_id),
        brand: asset.brand ?? '',
        model: asset.model ?? '',
        serial_number: asset.serial_number ?? '',
        location: asset.location ?? '',
        condition: asset.condition,
        purchase_date: asset.purchase_date ?? '',
        warranty_expires_at: asset.warranty_expires_at ?? '',
        purchase_cost: asset.purchase_cost ?? '',
        remarks: asset.remarks ?? '',
    };
}

/**
 * The register form, shared by the asset list and the asset detail page.
 *
 * Both entry points post to the same endpoints and show the same fields, so it lives in one place:
 * a second copy on the detail page would drift the moment a field is added.
 */
export function AssetFormDialog({ open, onOpenChange, asset, categories, tagSequence }: AssetFormDialogProps) {
    const form = useForm<AssetFormData>(formValuesFor(asset));

    // Reloading on open rather than at the call site keeps every caller from repeating it, and
    // catches the detail page's case where the record can change under an already-mounted dialog.
    useEffect(() => {
        if (open) {
            form.setData(formValuesFor(asset));
            form.clearErrors();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps -- the form object changes on every keystroke.
    }, [open, asset]);

    const parsedYear = Number(form.data.purchase_date.slice(0, 4));
    const tagYear = Number.isInteger(parsedYear) && parsedYear > 1900 ? parsedYear : (tagSequence?.currentYear ?? 0);
    // Only the running total for the current year is known here, so older years show a placeholder.
    const previewTag = tagSequence
        ? `${tagYear}-${tagYear === tagSequence.currentYear ? String(tagSequence.nextNumber).padStart(4, '0') : '####'}`
        : '';

    function submit(event: FormEvent<HTMLFormElement>): void {
        event.preventDefault();

        const options = {
            preserveScroll: true,
            onSuccess: () => {
                onOpenChange(false);
                toast.success(asset ? 'Asset updated successfully.' : 'Asset registered successfully.');
            },
        };

        if (asset) {
            form.put(`/admin/assets/${asset.id}`, options);
        } else {
            form.post('/admin/assets', options);
        }
    }

    return (
        <Dialog open={open} onOpenChange={(next) => !form.processing && onOpenChange(next)}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{asset ? 'Edit asset' : 'Register asset'}</DialogTitle>
                    <DialogDescription>Record the identifiers, classification, and purchase details of the hardware.</DialogDescription>
                </DialogHeader>
                <form onSubmit={submit} className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2 sm:col-span-2">
                            <Label>Asset tag</Label>
                            <div className="bg-muted/50 text-foreground flex h-10 items-center rounded-md border px-3 font-mono text-sm">
                                {asset ? asset.asset_tag : previewTag}
                            </div>
                            <p className="text-muted-foreground text-xs">
                                {asset
                                    ? 'Asset tags are permanent once issued so they keep matching the label on the device.'
                                    : 'Generated on save from the acquisition year and a running number.'}
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="asset-name">Asset name</Label>
                            <Input id="asset-name" value={form.data.name} onChange={(event) => form.setData('name', event.target.value)} />
                            {form.errors.name && <p className="text-destructive text-sm">{form.errors.name}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label>Category</Label>
                            <Select value={form.data.asset_category_id} onValueChange={(value) => form.setData('asset_category_id', value)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a category" />
                                </SelectTrigger>
                                <SelectContent>
                                    {categories.map((category) => (
                                        <SelectItem key={category.id} value={String(category.id)}>
                                            {category.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {form.errors.asset_category_id && <p className="text-destructive text-sm">{form.errors.asset_category_id}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label>Department</Label>
                            <div className="bg-muted/50 flex h-10 items-center rounded-md border px-3 text-sm">
                                {asset?.department ? asset.department.name : <span className="text-muted-foreground">None until issued</span>}
                            </div>
                            <p className="text-muted-foreground text-xs">
                                Taken from whoever holds the asset, so it cannot contradict the custody record. Issue the asset to someone to place it
                                in their department.
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label>Condition</Label>
                            <Select value={form.data.condition} onValueChange={(value: AssetCondition) => form.setData('condition', value)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="NEW">New</SelectItem>
                                    <SelectItem value="GOOD">Good</SelectItem>
                                    <SelectItem value="FAIR">Fair</SelectItem>
                                    <SelectItem value="POOR">Poor</SelectItem>
                                </SelectContent>
                            </Select>
                            {form.errors.condition && <p className="text-destructive text-sm">{form.errors.condition}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="asset-brand">Brand</Label>
                            <Input id="asset-brand" value={form.data.brand} onChange={(event) => form.setData('brand', event.target.value)} />
                            {form.errors.brand && <p className="text-destructive text-sm">{form.errors.brand}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="asset-model">Model</Label>
                            <Input id="asset-model" value={form.data.model} onChange={(event) => form.setData('model', event.target.value)} />
                            {form.errors.model && <p className="text-destructive text-sm">{form.errors.model}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="asset-serial">Serial number</Label>
                            <Input
                                id="asset-serial"
                                value={form.data.serial_number}
                                onChange={(event) => form.setData('serial_number', event.target.value.toUpperCase())}
                            />
                            {form.errors.serial_number && <p className="text-destructive text-sm">{form.errors.serial_number}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="asset-location">Location</Label>
                            <Input
                                id="asset-location"
                                placeholder="Caloocan Plant"
                                value={form.data.location}
                                onChange={(event) => form.setData('location', event.target.value)}
                            />
                            {form.errors.location && <p className="text-destructive text-sm">{form.errors.location}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="asset-purchase-date">Purchase date</Label>
                            <Input
                                id="asset-purchase-date"
                                type="date"
                                value={form.data.purchase_date}
                                onChange={(event) => form.setData('purchase_date', event.target.value)}
                            />
                            {form.errors.purchase_date && <p className="text-destructive text-sm">{form.errors.purchase_date}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="asset-warranty">Warranty expiry</Label>
                            <Input
                                id="asset-warranty"
                                type="date"
                                value={form.data.warranty_expires_at}
                                onChange={(event) => form.setData('warranty_expires_at', event.target.value)}
                            />
                            {form.errors.warranty_expires_at && <p className="text-destructive text-sm">{form.errors.warranty_expires_at}</p>}
                        </div>
                        <div className="space-y-2 sm:col-span-2">
                            <Label htmlFor="asset-cost">Purchase cost</Label>
                            <Input
                                id="asset-cost"
                                type="number"
                                step="0.01"
                                min={0}
                                value={form.data.purchase_cost}
                                onChange={(event) => form.setData('purchase_cost', event.target.value)}
                            />
                            {form.errors.purchase_cost && <p className="text-destructive text-sm">{form.errors.purchase_cost}</p>}
                        </div>
                        <div className="space-y-2 sm:col-span-2">
                            <Label htmlFor="asset-remarks">Remarks</Label>
                            <Textarea
                                id="asset-remarks"
                                value={form.data.remarks}
                                onChange={(event) => form.setData('remarks', event.target.value)}
                            />
                            {form.errors.remarks && <p className="text-destructive text-sm">{form.errors.remarks}</p>}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={form.processing}>
                            {form.processing ? 'Saving...' : 'Save asset'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
