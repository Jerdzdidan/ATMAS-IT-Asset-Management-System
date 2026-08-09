import { Button } from '@/components/ui/button';

interface PaginationProps {
    page: number;
    pageCount: number;
    onPageChange: (page: number) => void;
}

/** Numbered page buttons with neighbors of the current page, first, and last always visible. */
export function Pagination({ page, pageCount, onPageChange }: PaginationProps) {
    const pages = new Set<number>([1, pageCount, page, page - 1, page + 1]);
    const visible = [...pages].filter((candidate) => candidate >= 1 && candidate <= pageCount).sort((left, right) => left - right);

    return (
        <div className="flex flex-wrap items-center gap-1">
            <Button type="button" size="sm" variant="outline" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
                Previous
            </Button>
            {visible.map((candidate, index) => (
                <span key={candidate} className="flex items-center gap-1">
                    {index > 0 && visible[index - 1] !== candidate - 1 && <span className="text-muted-foreground px-1">…</span>}
                    <Button
                        type="button"
                        size="sm"
                        variant={candidate === page ? 'default' : 'outline'}
                        className="min-w-9"
                        onClick={() => onPageChange(candidate)}
                    >
                        {candidate}
                    </Button>
                </span>
            ))}
            <Button type="button" size="sm" variant="outline" disabled={page >= pageCount} onClick={() => onPageChange(page + 1)}>
                Next
            </Button>
        </div>
    );
}
