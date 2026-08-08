import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { Camera, CameraOff, Keyboard, ScanLine } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Scan', href: '/admin/scan' },
];

/** The element the camera stream is mounted into. */
const READER_ID = 'asset-qr-reader';

export default function ScanPage() {
    const form = useForm({ code: '' });
    const [cameraState, setCameraState] = useState<'idle' | 'starting' | 'running' | 'unavailable'>('idle');
    const [cameraError, setCameraError] = useState<string | null>(null);

    /*
     * Held in refs rather than state: the scanner instance must survive re-renders, and the
     * "already handled" latch has to be readable from inside the decode callback without
     * waiting for a render to commit.
     */
    const scannerRef = useRef<{ stop: () => Promise<void>; clear: () => void } | null>(null);
    const handledRef = useRef(false);

    async function stopCamera(): Promise<void> {
        const scanner = scannerRef.current;
        scannerRef.current = null;

        if (scanner === null) {
            return;
        }

        try {
            await scanner.stop();
            scanner.clear();
        } catch {
            // The camera was already released; nothing further to tidy up.
        }
    }

    // Release the camera when the operator navigates away.
    useEffect(() => {
        return () => {
            void stopCamera();
        };
    }, []);

    async function startCamera(): Promise<void> {
        setCameraError(null);
        setCameraState('starting');
        handledRef.current = false;

        try {
            const { Html5Qrcode } = await import('html5-qrcode');
            const scanner = new Html5Qrcode(READER_ID);
            scannerRef.current = scanner;

            await scanner.start(
                { facingMode: 'environment' },
                { fps: 10, qrbox: { width: 240, height: 240 } },
                (decodedText: string) => {
                    // A held camera fires the same code many times a second; only act once.
                    if (handledRef.current) {
                        return;
                    }

                    handledRef.current = true;
                    void stopCamera().then(() => {
                        setCameraState('idle');
                        submitCode(decodedText);
                    });
                },
                () => {
                    // Fires constantly for frames without a code; not worth surfacing.
                },
            );

            setCameraState('running');
        } catch (error) {
            await stopCamera();
            setCameraState('unavailable');
            setCameraError(
                error instanceof Error && error.message
                    ? error.message
                    : 'The camera could not be started. Grant camera access, or type the tag below instead.',
            );
        }
    }

    function submitCode(code: string): void {
        form.transform(() => ({ code }));
        form.post('/admin/scan', { preserveScroll: true });
    }

    function submitManual(event: FormEvent<HTMLFormElement>): void {
        event.preventDefault();
        submitCode(form.data.code);
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Scan asset" />
            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">Scan an asset</h1>
                    <p className="text-muted-foreground">
                        Point the camera at the QR label on a device, or enter the tag by hand. A scan opens the asset record straight away.
                    </p>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Camera className="size-4" /> Camera
                            </CardTitle>
                            <CardDescription>Browsers only release the camera over HTTPS or on localhost.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div
                                id={READER_ID}
                                className="bg-muted flex min-h-64 items-center justify-center overflow-hidden rounded-md border [&_video]:w-full"
                            >
                                {cameraState !== 'running' && (
                                    <div className="text-muted-foreground flex flex-col items-center gap-2 p-6 text-center text-sm">
                                        <ScanLine className="size-8" />
                                        {cameraState === 'starting' ? 'Requesting camera access…' : 'The camera preview appears here.'}
                                    </div>
                                )}
                            </div>

                            {cameraError && <p className="text-destructive text-sm">{cameraError}</p>}

                            {cameraState === 'running' ? (
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="w-full"
                                    onClick={() => void stopCamera().then(() => setCameraState('idle'))}
                                >
                                    <CameraOff /> Stop camera
                                </Button>
                            ) : (
                                <Button type="button" className="w-full" disabled={cameraState === 'starting'} onClick={() => void startCamera()}>
                                    <Camera /> {cameraState === 'starting' ? 'Starting…' : 'Start camera'}
                                </Button>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Keyboard className="size-4" /> Enter a tag
                            </CardTitle>
                            <CardDescription>
                                Works with a handheld barcode scanner too — most send the code followed by Enter, exactly like typing.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={submitManual} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="code">Asset tag</Label>
                                    <Input
                                        id="code"
                                        autoFocus
                                        autoComplete="off"
                                        placeholder="L-2026-0001"
                                        value={form.data.code}
                                        onChange={(event) => form.setData('code', event.target.value)}
                                    />
                                    {form.errors.code && <p className="text-destructive text-sm">{form.errors.code}</p>}
                                </div>
                                <Button type="submit" className="w-full" disabled={form.processing || form.data.code.trim() === ''}>
                                    {form.processing ? 'Looking up…' : 'Open asset'}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
