{{--
    Downloadable sheet of asset QR labels.

    Laid out with tables rather than grid or flex because DomPDF supports neither, and every
    image travels as a data URI since the renderer fetches no HTTP assets.
--}}
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Asset labels — {{ $organisation }}</title>
    <style>
        @page { margin: 10mm 8mm; }
        body { font-family: 'DejaVu Sans', sans-serif; color: #22242e; margin: 0; font-size: 9px; }
        .masthead { width: 100%; border-bottom: 2.5px solid #384d9c; padding-bottom: 6px; margin-bottom: 10px; }
        .masthead td { vertical-align: middle; }
        .masthead img { display: block; }
        /*
          Cell alignment centres the box, but a line of type is not centred on its box: the
          descender band below the baseline is empty for capitals, so a wordmark reads high.
          These paddings push each mark back down onto the optical centre of the text beside it,
          and were measured off the rendered PDF rather than guessed.
        */
        .masthead .mark { padding-top: 3px; }
        .brand { font-size: 14px; font-weight: bold; color: #384d9c; }
        .brand span { color: #55555f; font-weight: normal; font-size: 11px; }
        .meta { text-align: right; color: #6a6d7d; font-size: 8px; line-height: 1.5; }
        /* Fixed layout so a part-filled last row keeps the same thirds as a full one. */
        table.sheet { width: 100%; border-collapse: separate; border-spacing: 4px; table-layout: fixed; }
        /* Targeted by class, not `table > tr > td`: the implicit tbody breaks that child chain. */
        /*
          `vertical-align: top` matters: without it a cell holding one line less than its
          neighbours is centred in the row and the whole sticker floats up out of line with them.
        */
        td.cell { width: 33.33%; vertical-align: top; }
        .label { border: 1px solid #c9cee0; border-radius: 4px; padding: 6px; }
        /*
          The height lives on the two cells rather than on the table. DomPDF treats a table height
          as a hint it is free to ignore, so a label carrying no serial number came out shorter
          than the one beside it; a cell height it honours, which keeps every sticker identical
          whatever it holds.
        */
        .label td.qr, .label td.info { height: 66px; vertical-align: middle; }
        .qr { width: 66px; }
        .qr img { width: 66px; height: 66px; display: block; }
        .tag { font-weight: bold; font-size: 11px; color: #384d9c; letter-spacing: 0.3px; }
        .name { font-size: 8.5px; line-height: 1.25; padding-top: 1px; }
        .detail { font-size: 7px; color: #6a6d7d; line-height: 1.35; padding-top: 2px; }
        .org { font-size: 6.5px; color: #6a6d7d; text-transform: uppercase; letter-spacing: 0.5px; padding-top: 3px; }
        /*
          The mark and the wordmark sit in their own two-cell table. `vertical-align: middle` on an
          inline image is the one thing DomPDF places badly — it put the mark a fifth of its own
          height above the centre of the text — while cell alignment it gets right. The 1px top
          padding is the same optical correction as the masthead's.
        */
        .org table { border-collapse: collapse; }
        .org td { height: auto; padding: 0; vertical-align: middle; }
        .org img { width: 9px; height: 9px; display: block; }
        .org .mark { padding-right: 3px; padding-top: 1px; width: 9px; }
        .empty { padding: 40px; text-align: center; color: #85858f; border: 1px dashed #d5d8e2; }
        .footer { position: fixed; bottom: -6mm; left: 0; right: 0; color: #9a9aa4; font-size: 7px; }
    </style>
</head>
<body>
    <table class="masthead">
        <tr>
            <td class="mark" width="42">
                @if ($logo)<img src="{{ $logo }}" alt="" width="34" height="34">@endif
            </td>
            <td>
                <div class="brand">{{ $organisation }} <span>| Asset labels</span></div>
            </td>
            <td class="meta">
                {{ count($labels) }} label(s)<br>
                Generated {{ $printedAt->format('d M Y, g:i A') }}
            </td>
        </tr>
    </table>

    @if (empty($labels))
        <div class="empty">There are no assets to label.</div>
    @else
        {{-- Chunked into rows of three so each sticker lands in a fixed cell on the sheet. --}}
        <table class="sheet">
            @foreach (array_chunk($labels, 3) as $row)
                <tr>
                    @foreach ($row as $label)
                        <td class="cell">
                            <table class="label" width="100%">
                                <tr>
                                    <td class="qr">
                                        <img src="{{ $label['qr'] }}" alt="QR code for {{ $label['asset_tag'] }}">
                                    </td>
                                    <td class="info">
                                        <div class="tag">{{ $label['asset_tag'] }}</div>
                                        <div class="name">{{ $label['name'] }}</div>
                                        <div class="detail">
                                            {{ $label['classification'] }}<br>{{ $label['serial_line'] }}
                                        </div>
                                        <div class="org">
                                            <table>
                                                <tr>
                                                    @if ($logo)<td class="mark"><img src="{{ $logo }}" alt=""></td>@endif
                                                    <td>{{ $organisation }}</td>
                                                </tr>
                                            </table>
                                        </div>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    @endforeach

                    {{-- Hold the remaining thirds open so a short last row is not stretched. --}}
                    @for ($i = count($row); $i < 3; $i++)
                        <td class="cell"></td>
                    @endfor
                </tr>
            @endforeach
        </table>
    @endif

    <div class="footer">{{ $organisation }} &mdash; scan any code to open the asset record.</div>
</body>
</html>
