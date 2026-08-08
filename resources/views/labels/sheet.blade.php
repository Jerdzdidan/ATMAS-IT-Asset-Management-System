{{--
    Print-ready sheet of asset QR labels.

    Sized for a 3-across grid on A4 so a standard label sheet lines up, and served outside the
    Inertia shell so the print dialog gets the labels alone.
--}}
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Asset labels — {{ $organisation }}</title>
    <style>
        :root { --brand: #384d9c; --ink: #22242e; --muted: #6a6d7d; }
        * { box-sizing: border-box; }
        body { font-family: ui-sans-serif, system-ui, 'Segoe UI', sans-serif; color: var(--ink); margin: 0; padding: 16px; background: #f1f3f8; }
        .toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; max-width: 820px; margin: 0 auto 16px; }
        .toolbar h1 { font-size: 16px; margin: 0; color: var(--brand); }
        .toolbar p { margin: 2px 0 0; font-size: 12px; color: var(--muted); }
        .actions button, .actions a { font: inherit; font-size: 13px; cursor: pointer; border-radius: 6px; padding: 8px 14px; text-decoration: none; border: 1px solid #cdd3e2; background: #fff; color: var(--ink); }
        .actions button { background: var(--brand); border-color: var(--brand); color: #fff; }
        .sheet { max-width: 820px; margin: 0 auto; background: #fff; padding: 12px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
        .label { border: 1px dashed #b9bfd0; border-radius: 6px; padding: 8px; display: flex; gap: 8px; align-items: center; break-inside: avoid; }
        .label img { width: 74px; height: 74px; flex: none; }
        .label .tag { font-weight: 700; font-size: 12px; letter-spacing: 0.3px; color: var(--brand); }
        .label .name { font-size: 10px; line-height: 1.3; margin-top: 2px; }
        .label .meta { font-size: 8.5px; color: var(--muted); margin-top: 3px; line-height: 1.35; }
        .label .org { display: flex; align-items: center; gap: 4px; font-size: 7.5px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.6px; margin-top: 5px; }
        .label .org img { width: 11px; height: 11px; }
        .empty { max-width: 820px; margin: 0 auto; background: #fff; padding: 40px; text-align: center; color: var(--muted); }

        @media print {
            body { background: #fff; padding: 0; }
            .toolbar { display: none; }
            .sheet { max-width: none; padding: 8mm; gap: 4mm; }
            .label { border-style: solid; border-color: #d5d8e2; }
        }
    </style>
</head>
<body>
    <div class="toolbar">
        <div style="display: flex; align-items: center; gap: 10px;">
            <img src="/images/forms-international-logo-192.png" alt="" style="width: 34px; height: 34px;">
            <div>
                <h1>Asset labels</h1>
                <p>{{ count($labels) }} label(s) &middot; generated {{ $printedAt->format('d M Y, g:i A') }}</p>
            </div>
        </div>
        <div class="actions">
            <a href="{{ url()->previous() }}">Back</a>
            <button type="button" onclick="window.print()">Print</button>
        </div>
    </div>

    @if (empty($labels))
        <div class="empty">There are no assets to label.</div>
    @else
        <div class="sheet">
            @foreach ($labels as $label)
                <div class="label">
                    <img src="{{ $label['qr'] }}" alt="QR code for {{ $label['asset_tag'] }}">
                    <div>
                        <div class="tag">{{ $label['asset_tag'] }}</div>
                        <div class="name">{{ $label['name'] }}</div>
                        <div class="meta">
                            {{ $label['category'] ?? '—' }}@if ($label['department']) &middot; {{ $label['department'] }}@endif
                            @if ($label['serial_number'])<br>SN: {{ $label['serial_number'] }}@endif
                        </div>
                        <div class="org">
                            <img src="/images/forms-international-logo-192.png" alt="">
                            {{ $organisation }}
                        </div>
                    </div>
                </div>
            @endforeach
        </div>
    @endif
</body>
</html>
