import { Combobox as HeadlessCombobox, ComboboxButton, ComboboxInput, ComboboxOption, ComboboxOptions } from '@headlessui/react';
import { Check, ChevronDown } from 'lucide-react';
import { useState } from 'react';

import { cn } from '@/lib/utils';

export interface ComboboxOptionItem {
    value: string;
    label: string;
    /** Shown under the label and included in the search, e.g. an employee code or asset name. */
    description?: string;
}

interface ComboboxProps {
    id?: string;
    value: string;
    options: ComboboxOptionItem[];
    onValueChange: (value: string) => void;
    placeholder?: string;
    emptyMessage?: string;
    disabled?: boolean;
    className?: string;
}

/**
 * A select that can be typed into, for lists too long to scan by eye.
 *
 * The options render inline rather than in a portal so the list stays inside whatever dialog
 * contains it, and the dialog's focus trap leaves it alone.
 */
export function Combobox({
    id,
    value,
    options,
    onValueChange,
    placeholder = 'Select an option',
    emptyMessage = 'No matches found.',
    disabled,
    className,
}: ComboboxProps) {
    const [query, setQuery] = useState('');

    const normalized = query.trim().toLowerCase();
    const filtered = normalized
        ? options.filter((option) => `${option.label} ${option.description ?? ''}`.toLowerCase().includes(normalized))
        : options;

    return (
        <HeadlessCombobox
            value={value}
            onChange={(next: string | null) => onValueChange(next ?? '')}
            onClose={() => setQuery('')}
            disabled={disabled}
            immediate
        >
            <div className={cn('relative', className)}>
                <ComboboxInput
                    id={id}
                    autoComplete="off"
                    className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus:ring-ring flex h-10 w-full items-center rounded-md border px-3 py-2 pr-9 text-sm focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder={placeholder}
                    displayValue={(current: string) => options.find((option) => option.value === current)?.label ?? ''}
                    onChange={(event) => setQuery(event.target.value)}
                />
                <ComboboxButton
                    className="absolute inset-y-0 right-0 flex cursor-pointer items-center px-3 disabled:cursor-not-allowed"
                    aria-label="Toggle options"
                >
                    <ChevronDown className="size-4 opacity-50" />
                </ComboboxButton>
                <ComboboxOptions className="bg-popover text-popover-foreground absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border p-1 shadow-md empty:hidden">
                    {filtered.length === 0 ? (
                        <div className="text-muted-foreground px-2 py-3 text-center text-sm">{emptyMessage}</div>
                    ) : (
                        filtered.map((option) => (
                            <ComboboxOption
                                key={option.value}
                                value={option.value}
                                className="relative flex w-full cursor-pointer items-center rounded-sm py-1.5 pr-2 pl-8 text-sm outline-hidden select-none data-[focus]:bg-accent data-[focus]:text-accent-foreground"
                            >
                                <span className="absolute left-2 flex size-3.5 items-center justify-center">
                                    {option.value === value && <Check className="size-4" />}
                                </span>
                                <span className="min-w-0">
                                    <span className="block truncate">{option.label}</span>
                                    {option.description && <span className="text-muted-foreground block truncate text-xs">{option.description}</span>}
                                </span>
                            </ComboboxOption>
                        ))
                    )}
                </ComboboxOptions>
            </div>
        </HeadlessCombobox>
    );
}
