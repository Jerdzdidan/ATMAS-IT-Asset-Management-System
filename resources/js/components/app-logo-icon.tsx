import { type ImgHTMLAttributes } from 'react';

/**
 * The Forms International ring mark.
 *
 * Served straight from `public/` rather than bundled so the same file backs the React shell,
 * the printable label sheet, and the PDF masthead — all three render outside Vite.
 */
export default function AppLogoIcon({ className, alt = 'Forms International', ...props }: ImgHTMLAttributes<HTMLImageElement>) {
    return <img {...props} src="/images/forms-international-logo.png" alt={alt} className={className} />;
}
