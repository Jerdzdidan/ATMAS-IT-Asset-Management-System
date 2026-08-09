import { userRoleLabels } from '@/components/status-badges';
import { type SharedData } from '@/types';
import { usePage } from '@inertiajs/react';
import { Building2, CalendarDays, ShieldCheck } from 'lucide-react';

/**
 * The Forms International ring, in the order its segments run.
 *
 * Written out as whole class names rather than composed from a hue list: Tailwind finds the
 * utilities it generates by scanning the source for literal strings, so a name built at runtime
 * would leave the bar with no colour at all.
 */
const ringSegments = [
    'bg-ring-blue',
    'bg-ring-green',
    'bg-ring-lime',
    'bg-ring-yellow',
    'bg-ring-orange',
    'bg-ring-red',
    'bg-ring-magenta',
    'bg-ring-purple',
];

interface DashboardMastheadProps {
    /** When the server built the page, so the date is the server's rather than the browser's. */
    generatedAt: string;
}

/**
 * The greeting that opens both dashboards.
 *
 * It introduces the session rather than reporting on it: who is signed in, what they are, and
 * which department they answer for. Everything that needs acting on is left to the cards below,
 * which say it more precisely than a sentence can.
 *
 * Built from the company's own masthead: a white ground, the wordmark blue carrying the type, and
 * the ring unrolled edge to edge beneath it. That bar is the one device their site leads with, and
 * it is the only place the whole palette appears at once — which is what keeps the panel from
 * having to pick a single hue, every one of which already means something on the cards below.
 */
export function DashboardMasthead({ generatedAt }: DashboardMastheadProps) {
    const { auth, name: organisation } = usePage<SharedData>().props;

    return (
        <section className="bg-card overflow-hidden rounded-xl border shadow-sm">
            <div className="flex h-2" aria-hidden="true">
                {ringSegments.map((segment) => (
                    <span key={segment} className={`flex-1 ${segment}`} />
                ))}
            </div>

            <div className="p-6 md:p-8">
                <p className="text-muted-foreground text-xs font-semibold tracking-[0.22em] uppercase">{organisation} · IT Asset Management</p>
                <h1 className="text-brand mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">Welcome back, {auth.user.name}.</h1>

                <div className="mt-5 flex flex-wrap items-center gap-2 text-xs">
                    <span className="bg-brand-soft text-brand-soft-foreground inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-medium">
                        <ShieldCheck className="size-3.5" />
                        {userRoleLabels[auth.user.role]}
                    </span>
                    {/* Only accounts that belong to a department carry one; the rest sit above them. */}
                    {auth.department && (
                        <span className="bg-brand-soft text-brand-soft-foreground inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-medium">
                            <Building2 className="size-3.5" />
                            {auth.department.name}
                        </span>
                    )}
                </div>

                <p className="text-muted-foreground mt-5 inline-flex items-center gap-1.5 text-xs">
                    <CalendarDays className="size-3.5" />
                    {new Date(generatedAt).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
            </div>
        </section>
    );
}
