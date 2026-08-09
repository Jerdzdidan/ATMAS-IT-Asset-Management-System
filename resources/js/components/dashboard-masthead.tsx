import { userRoleLabels } from '@/components/status-badges';
import { type SharedData } from '@/types';
import { usePage } from '@inertiajs/react';
import { Building2, CalendarDays, ShieldCheck } from 'lucide-react';

interface DashboardMastheadProps {
    /** When the server built the page, so the date is the server's rather than the browser's. */
    generatedAt: string;
}

/**
 * The Forms International ring, in the order its segments run.
 *
 * Written out as whole class names rather than composed from a hue list: Tailwind finds the
 * utilities it generates by scanning the source for literal strings, so a name built at runtime
 * would leave the rule with no colour at all.
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

/**
 * The greeting that opens both dashboards.
 *
 * It introduces the session rather than reporting on it: who is signed in, what they are, and
 * which department they answer for. Everything that needs acting on is left to the cards below,
 * which say it more precisely than a sentence can.
 *
 * The panel is graphite rather than a colour, and the ring unrolled beneath the greeting is the
 * only colour on it. A panel in any one hue would either repeat a colour the status badges have
 * already given a meaning or invent a ninth the brand does not own; the ring is the whole palette
 * at once, so it reads as the mark rather than as a signal. Its tokens do not invert with the
 * theme, so the masthead is the same panel in light and dark.
 */
export function DashboardMasthead({ generatedAt }: DashboardMastheadProps) {
    const { auth, name: organisation } = usePage<SharedData>().props;

    return (
        <section className="bg-brand-deep relative overflow-hidden rounded-2xl p-6 text-white shadow-lg md:p-8">
            <p className="text-xs font-semibold tracking-[0.22em] text-white/55 uppercase">{organisation} · IT Asset Management</p>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">Welcome back, {auth.user.name}.</h1>

            <div className="mt-4 flex h-[3px] w-56 overflow-hidden rounded-full" aria-hidden="true">
                {ringSegments.map((segment) => (
                    <span key={segment} className={`flex-1 ${segment}`} />
                ))}
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 font-medium text-white/85">
                    <ShieldCheck className="size-3.5" />
                    {userRoleLabels[auth.user.role]}
                </span>
                {/* Only accounts that belong to a department carry one; the rest sit above them. */}
                {auth.department && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 font-medium text-white/85">
                        <Building2 className="size-3.5" />
                        {auth.department.name}
                    </span>
                )}
            </div>

            <p className="mt-5 inline-flex items-center gap-1.5 text-xs text-white/55">
                <CalendarDays className="size-3.5" />
                {new Date(generatedAt).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
        </section>
    );
}
