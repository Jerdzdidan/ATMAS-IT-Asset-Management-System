import AppLogoIcon from '@/components/app-logo-icon';
import { Link } from '@inertiajs/react';

interface AuthLayoutProps {
    children: React.ReactNode;
    name?: string;
    title?: string;
    description?: string;
}

/**
 * The sign-in shell.
 *
 * Carries the full Forms International lockup rather than the bare mark: this is the only
 * screen an unauthenticated visitor sees, so it is where the system says who it belongs to.
 */
export default function AuthSimpleLayout({ children, title, description }: AuthLayoutProps) {
    return (
        <div className="bg-background relative flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
            {/* A soft wash of the brand blue lifts the card off a plain white page. */}
            <div aria-hidden="true" className="from-brand-soft pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b to-transparent" />

            <div className="relative w-full max-w-sm">
                <div className="flex flex-col gap-8">
                    <div className="flex flex-col items-center gap-4">
                        <Link href={route('home')} className="flex flex-col items-center gap-3 font-medium">
                            <AppLogoIcon className="size-14" />
                            <div className="text-center">
                                <p className="text-lg leading-none font-semibold tracking-tight">ATMAS</p>
                                <p className="text-muted-foreground mt-1.5 text-[11px] tracking-[0.18em] uppercase">Forms International</p>
                            </div>
                        </Link>

                        <div className="mt-2 space-y-2 text-center">
                            <h1 className="text-xl font-medium">{title}</h1>
                            <p className="text-muted-foreground text-center text-sm">{description}</p>
                        </div>
                    </div>
                    {children}
                </div>

                <p className="text-muted-foreground mt-8 text-center text-xs">IT Asset &amp; Lifecycle Management System</p>
            </div>
        </div>
    );
}
