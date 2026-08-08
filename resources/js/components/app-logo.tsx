import AppLogoIcon from './app-logo-icon';

/**
 * Sidebar lockup: the ring mark, the product name, and who the system is built for.
 */
export default function AppLogo() {
    return (
        <>
            <AppLogoIcon className="size-8 shrink-0" />
            <div className="ml-1 grid flex-1 text-left">
                <span className="truncate text-sm leading-none font-semibold tracking-tight">ATMAS</span>
                <span className="text-muted-foreground mt-1 truncate text-[10px] leading-none tracking-wide uppercase">Forms International</span>
            </div>
        </>
    );
}
