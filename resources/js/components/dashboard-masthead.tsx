import { formatDateTime } from '@/lib/format';
import { type SharedData } from '@/types';
import { usePage } from '@inertiajs/react';
import { CalendarDays, Clock3 } from 'lucide-react';
import { type ReactNode } from 'react';

interface DashboardMastheadProps {
    /** One line on what the figures below say, written for the role reading them. */
    summary: ReactNode;
    /** When the server built the figures, so "updated" is honest rather than page-load time. */
    generatedAt: string;
}

/**
 * The greeting that opens both dashboards.
 *
 * Deliberately the one place in the app that commits to a solid brand panel: it marks where a
 * session starts, and every other screen stays quiet so this one can carry the colour. The tokens
 * behind it do not invert with the theme, so the masthead reads the same in light and dark.
 */
export function DashboardMasthead({ summary, generatedAt }: DashboardMastheadProps) {
    const { auth, name: organisation } = usePage<SharedData>().props;
    // A first name is what a colleague would use; the full name already sits in the sidebar.
    const firstName = auth.user.name.split(' ')[0];

    return (
        <section className="bg-brand-deep relative overflow-hidden rounded-2xl p-6 text-white shadow-lg md:p-8">
            {/* Blurred discs rather than a gradient: they keep the panel from reading as a flat
                block without adding a second colour to the palette. */}
            <div className="bg-brand-glow/30 pointer-events-none absolute -top-28 -right-16 size-72 rounded-full blur-3xl" />
            <div className="bg-brand-glow/20 pointer-events-none absolute -bottom-32 left-1/4 size-80 rounded-full blur-3xl" />

            <div className="relative">
                <p className="text-xs font-semibold tracking-[0.22em] text-white/55 uppercase">{organisation} · IT Asset Management</p>
                <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">Welcome back, {firstName}.</h1>
                <p className="mt-2 max-w-xl text-sm leading-6 text-white/75">{summary}</p>

                <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-white/60">
                    <span className="inline-flex items-center gap-1.5">
                        <CalendarDays className="size-3.5" />
                        {new Date(generatedAt).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                        <Clock3 className="size-3.5" />
                        Updated {formatDateTime(generatedAt)}
                    </span>
                </div>
            </div>
        </section>
    );
}
