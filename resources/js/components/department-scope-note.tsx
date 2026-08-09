import { type SharedData } from '@/types';
import { usePage } from '@inertiajs/react';

/**
 * Names the department a scoped account is confined to.
 *
 * A line of page description rather than a dismissible banner: it sits where a reader already
 * looks to find out what a page holds, and an alert repeated across every module stops being read
 * by the second one. Renders nothing for accounts that see the whole register.
 */
export function DepartmentScopeNote({ noun }: { noun: string }) {
    const { department, permissions } = usePage<SharedData>().props.auth;

    if (!permissions.is_department_scoped) {
        return null;
    }

    // Scoping fails closed, so a head without a department sees an empty system. Saying why beats
    // leaving them to conclude the records are missing.
    if (department === null) {
        return (
            <p className="text-destructive text-sm">Your account has no department set, so nothing is shown. Ask your administrator to assign one.</p>
        );
    }

    return (
        <p className="text-muted-foreground">
            Showing {noun} for <span className="text-foreground font-medium">{department.name}</span> only.
        </p>
    );
}
