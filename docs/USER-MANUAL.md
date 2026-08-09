# ATMAS — User Manual

**IT Asset & Lifecycle Management System**
Built for Forms International Enterprises Corporation

---

## Table of contents

1. [What ATMAS is for](#1-what-atmas-is-for)
2. [Roles — who is in charge of what](#2-roles--who-is-in-charge-of-what)
3. [Signing in and finding your way around](#3-signing-in-and-finding-your-way-around)
4. [Core concepts you need before anything else](#4-core-concepts-you-need-before-anything-else)
5. [The asset register](#5-the-asset-register)
6. [Custody — issuing and returning hardware](#6-custody--issuing-and-returning-hardware)
7. [The maintenance flow](#7-the-maintenance-flow)
8. [Preventive maintenance schedules](#8-preventive-maintenance-schedules)
9. [QR labels and scanning](#9-qr-labels-and-scanning)
10. [Import and export](#10-import-and-export)
11. [Reports](#11-reports)
12. [Logs](#12-logs)
13. [Administration — users, departments, categories](#13-administration--users-departments-categories)
14. [My Workspace — the employee view](#14-my-workspace--the-employee-view)
15. [Reference tables](#15-reference-tables)
16. [Troubleshooting](#16-troubleshooting)

---

## 1. What ATMAS is for

ATMAS is the single register of every piece of IT hardware the company owns. It answers four
questions that a spreadsheet cannot answer reliably:

- **What do we own?** Every device, its specification, cost, and warranty.
- **Who has it?** A custody record for every handover, with a signature trail.
- **What condition is it in?** Status, condition grade, repair history, and photographs.
- **Who changed the record, and when?** An append-only log that nobody can edit.

Everything else in the system — reports, QR labels, maintenance schedules — exists to keep those
four answers accurate.

### The one rule that matters

**Nothing is done "on the side."** If a laptop moves desks, a ticket is closed, or a device is
scrapped, it is recorded in ATMAS at the time it happens. A register that is updated weekly is a
register nobody trusts, and every report in this system inherits the accuracy of the day-to-day
entries.

---

## 2. Roles — who is in charge of what

There are six roles. Each person has exactly one. The role decides what they see and what they can
change, and it is enforced by the server — hiding a button is a convenience, not the security
boundary.

### 2.1 Super Administrator

**Who:** The IT Manager, or whoever owns the system itself.

**In charge of:**
- Creating, editing, and deactivating every user account
- Assigning roles — **this is the only role that can do so**
- Maintaining the department list and the asset category list
- Everything the Administrator (IT Staff) role can do
- Reading the Logs

**Accounts do not self-register.** A new hire gets an ATMAS account because the Super Administrator
creates one. When someone leaves, the Super Administrator sets their account to **Inactive** rather
than deleting it — deleting would orphan their custody history.

### 2.2 Administrator (IT Staff)

**Who:** The IT technicians who physically handle the hardware.

**In charge of:**
- Registering new assets and keeping their details current
- Issuing hardware to employees and recording returns
- Working the repair queue: accepting, progressing, and closing tickets
- Setting up and completing preventive maintenance schedules
- Uploading condition photographs
- Printing QR labels
- Bulk import and export
- Retiring hardware at end of life

**Cannot:** manage user accounts, or read the Logs. That separation is deliberate — the people who
maintain the register are not the people who audit it.

### 2.3 Department Head

**Who:** The manager accountable for a department's equipment budget.

**In charge of:**
- Reviewing the assets their **own department** owns
- Watching their department's open tickets and overdue servicing
- Running any report, automatically narrowed to their department
- Reading the Logs for their own department's assets

**Sees nothing outside their department.** A department head assigned to Accounting sees only
Accounting's hardware — on the register, on the dashboard counters, in every report, and in the
logs. Their own department is named under their account in the profile menu, and every module they
open says which department's records it is showing. A head with no department set sees nothing at
all, which is deliberate: it fails closed, and the screen says so rather than looking empty.

Because a department is read from whoever holds an asset (see §4.3), a head sees the hardware their
people are **currently holding**. Anything sitting unissued in a cupboard belongs to no department
and appears for nobody.

**No Actions column.** Read-only roles get the table without one, rather than a menu that opens
onto nothing.

**Cannot change anything.** This role is read-only. If a device needs to move, the head raises it
with IT Staff, who make the change.

### 2.4 Management

**Who:** Senior management and finance.

**In charge of:**
- Reading the dashboards, the portfolio summaries, and every report
- Using the Management Summary report for budget and refresh decisions

**Cannot** edit any record and cannot read the Logs. They get the numbers, not the paper trail.

### 2.5 Auditor

**Who:** Internal or external audit.

**In charge of:**
- Reading the whole register, unrestricted
- Running the Audit Inventory count sheet and taking it into the field
- Reading the Logs in full — every change, who made it, and the before/after values

**Cannot** edit anything. An auditor who could change records would not be an auditor.

### 2.6 Employee

**Who:** Everyone else in the company.

**In charge of:**
- Looking after the equipment issued to them
- Checking **My Assets** to confirm what they are accountable for
- Reporting a fault through **My Requests** as soon as it happens

**Sees only their own equipment.** No register, no reports, no other employee's records.

### 2.7 Permission matrix

| | Super Admin | IT Staff | Dept. Head | Management | Auditor | Employee |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| View asset register | All | All | Own dept. | All | All | — |
| Register / edit assets | ✅ | ✅ | — | — | — | — |
| Issue & return hardware | ✅ | ✅ | — | — | — | — |
| Retire / restore assets | ✅ | ✅ | — | — | — | — |
| Upload photos | ✅ | ✅ | — | — | — | — |
| Manage repair queue | ✅ | ✅ | — | — | — | — |
| Manage PM schedules | ✅ | ✅ | — | — | — | — |
| Scan / download labels | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| Import / export | ✅ | ✅ | — | — | — | — |
| Reports | All | All | Own dept. | All | All | — |
| Logs | ✅ | — | Own dept. | — | ✅ | — |
| Manage categories | ✅ | ✅ | — | — | — | — |
| Manage users & departments | ✅ | — | — | — | — | — |
| Report own faults | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## 3. Signing in and finding your way around

### Signing in

Go to the ATMAS address, enter your work email and password, and press **Log in**. If you have
forgotten your password, ask the Super Administrator to reset it — there is no self-service reset,
and no sign-up. Both would be doors into an internal register, so neither the links nor the pages
behind them exist. Once you are in, you can change your own password under **Settings → Password**.

If your account has been set to **Inactive**, sign-in is refused. That is normal for someone who
has left; contact the Super Administrator if it happens to you unexpectedly.

Every sign-in and sign-out is recorded in the Logs.

### The sidebar

What you see depends on your role. The full set is:

| Group | Item | Purpose |
|---|---|---|
| **Main** | Dashboard | Live counters and things needing attention |
| **Asset Management** | Assets | The register — every device |
| | Categories | Device types used to classify the register |
| | Maintenance | The repair queue |
| | PM Schedules | Recurring preventive servicing |
| **Reporting** | Reports | The ten standard reports |
| | Logs | The audit trail |
| **Administration** | Users | Accounts and roles |
| | Departments | The department list |
| **My Workspace** | My Assets | What *you* are holding |
| | My Requests | Faults *you* have reported |

**My Workspace is always visible, to everyone.** Even the Super Administrator is issued a laptop
and reports their own faults through it.

**Scan, Labels, and Import / Export are not in the sidebar.** They belong to the register rather
than beside it, so they live as buttons across the top of the **Assets** page, and each carries a
link back to the register.

### The dashboard

The dashboard opens with a greeting naming you, the date, and when the figures were built. Under it
is a one-line read of what is waiting — overdue services, open tickets, warranties running out — or
confirmation that nothing needs attention. Everything it counts respects your role, so a Department
Head's greeting describes their own department's hardware.

The dashboard is the first thing you see. Six counters run across the top:

| Counter | What it means | Act when… |
|---|---|---|
| Total assets | Everything on the register | — |
| Available | In store, ready to issue | It hits zero and requests are queuing |
| Assigned | Currently in employee custody | — |
| Open requests | Tickets not yet closed | The number climbs week on week |
| **Overdue PM** | Servicing past its due date | **Any number above zero** |
| **Warranty ending** | Cover lapsing within 90 days | **Any number above zero** |

The last two turn red when they are non-zero, because both cost money if ignored. Below the
counters, **Maintenance due soon** lists what falls due in the next 30 days.

Employees see a different dashboard: their own equipment and their own open tickets.

---

## 4. Core concepts you need before anything else

### 4.1 The asset tag

Every asset gets a permanent identifier the moment it is registered:

```
2026 - 0001
 │      └── running number, per year, never reused
 └───────── year of acquisition (falls back to the current year)
```

**You never type an asset tag.** The system issues it on save and the number is never reused, even
if the asset is later deleted. That is what makes a tag safe to print on a sticker and cite in an
audit ten years later.

The tag says nothing about what the device is — that is the category's job, and a category can be
renamed at any time without stranding the labels already stuck to hardware.

### 4.2 Status vs condition — they are different things

**Status is where the asset is in its life.** The system controls this; you rarely set it directly.

| Status | Meaning |
|---|---|
| Available | In store, ready to issue |
| Assigned | In an employee's custody |
| Under repair | A ticket is being worked on |
| Retired | Out of service permanently |

**Condition is how worn the hardware is.** A human grades this.

| Condition | Meaning |
|---|---|
| New | Unused, still in warranty period |
| Good | Working normally, no visible wear |
| Fair | Working but showing age — plan a replacement |
| Poor | Barely serviceable — replace it |

A device can be **Assigned** and in **Poor** condition at the same time. That combination is exactly
what the Damaged and Retired report is looking for.

### 4.3 An asset's department comes from whoever holds it

**You never set an asset's department.** It is read from whoever is holding the asset:

- Issue a laptop to someone in Accounting and the laptop becomes an Accounting asset.
- Record its return and it goes back to the shared pool with **no department at all**.
- Move that employee to Sales and everything they are holding moves with them.

This is what keeps the register honest — a department can never be billed for hardware nobody in it
has. The trade is that unassigned stock belongs to no one: a laptop sitting in the store cupboard
shows a blank department and is invisible to every Department Head until it is issued. If you need a
department to see its spare hardware, issue it to someone — a store keeper or the head themselves.

**Assigned employee** is who is physically holding it right now; **Department** is simply their
department, copied onto the asset so reports and access scoping have one column to read.

---

## 5. The asset register

**Who:** IT Staff and Super Administrator can change it. Department Heads, Management, and Auditors
can read it.

### 5.1 Registering a new asset

**Assets → Register asset.** Fill in what you know:

| Field | Required | Notes |
|---|---|---|
| Name | ✅ | What it is, e.g. "Dell Latitude 5440" |
| Category | ✅ | What kind of device it is |
| Brand / Model | — | |
| Serial number | — | Stored uppercase; **must be unique** |
| Location | — | Where it physically sits |
| Condition | ✅ | Defaults to Good |
| Purchase date | — | Cannot be in the future; sets the tag year |
| Warranty expiry | — | Cannot precede the purchase date |
| Purchase cost | — | Drives every financial report |
| Remarks | — | Anything else worth knowing |

The form previews the tag the asset will receive before you save.

> **Fill in purchase cost and warranty expiry.** They look optional, and they are — but every
> finance report and the entire warranty overview are blank without them. Ten minutes at
> registration saves a reconstruction exercise later.

### 5.2 The register list

Columns: thumbnail, tag, name, category, department, assigned to, condition, status.

- **Search** matches tag, name, brand, model, serial, department, and holder.
- **Filter by status** with its own dropdown, since it is the one most people reach for.
- **Filter by** anything else in two steps: pick the field — Category, Department, Condition, or
  Assigned to — and a second box appears for the value. That box is searchable, so you can type
  “vill” rather than scrolling a hundred names. It only lists values that actually appear in your
  register, so it can never hand you an empty table. Status and the chosen field stack, so
  Assigned + Laptop is one query; switching the field drops the previous one, and **Clear filters**
  resets everything.
- **Sort** by clicking a column heading.
- Row menu → **View** opens the full record; **Edit** and **Delete** appear for IT Staff.

The list opens on the newest tags — read as the year and running number, so `2026-0004` sits above
`2026-0003` and both above anything from 2025. Note that the year in a tag comes from the **purchase
date**, not the date you registered the asset, so backdated equipment lands where it was bought
rather than at the top.

**Table or Grid.** The switch on the right of the search row swaps the list for a card grid — a
larger photo per asset, with the tag, name, brand and model, category, department, holder, and both
badges underneath. Cards suit picture-led work such as checking condition photos or finding a device
you recognise by sight; the table suits scanning many records at once. Clicking anywhere on a card
opens the asset, and the **…** menu in its corner carries the same actions as the row menu. Your
search, filter, and sort carry across both views — in grid view sorting moves to its own dropdown,
with the arrow button beside it flipping between ascending and descending.

Your choice of view is remembered on that computer, so the register opens the way you left it next
time. It is stored in the browser rather than on your account, so a different machine starts on the
table again.

Header buttons: **Scan**, **Labels**, **Import / Export** (IT Staff), **Register asset**
(IT Staff).

### 5.3 The asset detail page

Everything known about one device:

- **Asset details** — the full specification
- **Current custody** — who holds it, since when, who issued it
- **Asset label** — the QR code, with a **Download label (PNG)** button
- **Photos** — condition evidence; click one to open it full size
- **Preventive maintenance** — the plans attached to it
- **Assignment history** — every handover, ever
- **Maintenance history** — every repair and service

The buttons across the top are **Download label**, **Edit**, **Issue asset** or **Record return**,
and **Retire** or **Restore** — the last three for IT Staff only. **Edit** opens the same form the
register list uses, so you can correct a serial number or add a purchase cost without going back to
the list to find the row again.

### 5.4 Photographs

**Add photos** on the asset detail page. JPG, PNG, or WebP, up to 5 MB each, six at a time.

The first photo becomes the thumbnail automatically. Hover any photo to make it primary (star) or
delete it (bin). Deleting removes the file from disk as well as the record.

**Click a photo to open it full size.** The viewer shows the caption, where the photo sits in the
set, and when it was uploaded. Move between photos with the arrows on either side or the **←** and
**→** keys, and close it with **Esc** or the **✕**. That is how you actually read a serial number
off a photograph — the grid thumbnails are square crops and will have cut it off.

> **Photograph hardware at issue and at return.** A dated photo settles a damage dispute in seconds.

### 5.5 Retiring, restoring, deleting

**Retire** takes an asset out of service permanently. It stays on the register and in every
historical report. **You must record the return first** — the system refuses to retire an asset that
is still in someone's custody, because that would lose the accountability trail.

**Restore** brings a retired asset back into the available pool.

**Delete** removes the record entirely and is **blocked** once the asset has any custody or
maintenance history. This is not a limitation to work around: an asset with history should be
retired, never deleted. Deletion exists only for correcting a mistyped entry made minutes ago.

---

## 6. Custody — issuing and returning hardware

**Who:** IT Staff and Super Administrator.

### 6.1 Issuing

Open the asset → **Issue asset** → choose the employee, set the date and time, add notes.

The asset must be **Available**, and the employee's account must be **Active**. On save the asset
becomes **Assigned** and a custody record opens.

> Note the condition and any existing damage in the notes field. That note is what you will point at
> if the device comes back scratched.

### 6.2 Returning

Open the asset → **Record return** → set the date and time, **grade the condition it came back in**,
add notes.

The return date cannot precede the issue date. On save the custody record closes, the asset's
condition updates to the grade you set, and the asset becomes **Available** again — unless it is
sitting in the repair queue, in which case it stays **Under repair** until the ticket is closed.

### 6.3 Transferring between employees

There is no single "transfer" action. Record the return from the current holder, then issue to the
new one. Two records, both dated, both signed — which is exactly what an auditor needs to see.

---

## 7. The maintenance flow

This is the flow most people ask about, so here it is end to end. There are two ways work starts:
an employee reports a fault, or a schedule falls due.

### 7.1 Reactive repair — employee reports a fault

```
   EMPLOYEE                    IT STAFF                       SYSTEM
      │                           │                              │
 1. My Requests                   │                              │
    → Report an issue ────────────┼──────────────────────────► Ticket created
      (pick asset,                │                            status: PENDING
       type, description)         │                              │
      │                           │                              │
      │                     2. Maintenance queue                 │
      │                        → sees PENDING ticket             │
      │                           │                              │
      │                     3. Sets IN PROGRESS ──────────────► Asset flips to
      │                        (starts work)                    UNDER REPAIR
      │                           │                              │
      │                     4. Fixes the device                  │
      │                           │                              │
      │                     5. Sets RESOLVED ─────────────────► Ticket closed,
      │                        (or REJECTED)                    resolved_at stamped,
      │                           │                            asset returns to
      │                           │                            ASSIGNED or AVAILABLE
 6. Sees the outcome ◄────────────┘                              │
    in My Requests                                          Every step logged
```

**Step 1 — the employee reports it.** My Requests → describe the fault. They can only report against
hardware **currently in their own custody**; the asset picker shows nothing else. They choose a type:

- **Repair** — it is broken
- **Preventive** — routine servicing
- **Replacement** — beyond economical repair

**Step 2 — IT Staff pick it up.** New tickets land in **Maintenance** as **Pending**.

**Step 3 — work starts.** Setting the ticket to **In progress** automatically flips the asset to
**Under repair**. Nobody sets the asset status by hand; the ticket drives it.

**Step 4 — the fix.** Record what was done in the resolution notes. That text becomes the permanent
repair history, and the next technician will read it.

**Step 5 — close it.**
- **Resolved** — fixed.
- **Rejected** — no fault found, or not something IT will action. Say why in the notes.

Either way the ticket closes, the resolution time is stamped, and the asset comes out of **Under
repair**: back to **Assigned** if someone still holds it, or **Available** if not.

**A closed ticket cannot be reopened.** If the fault recurs, the employee raises a new ticket. That
keeps the repair count honest — three tickets on one laptop is a signal to replace it, and reopening
would hide that signal.

**Retired assets are never touched** by this flow, whatever happens to their tickets.

### 7.2 Who is responsible at each step

| Step | Owner | Where |
|---|---|---|
| Notice and report the fault | Employee holding the asset | My Requests |
| Triage and prioritise | IT Staff | Maintenance |
| Carry out the repair | IT Staff | — |
| Record the outcome | IT Staff | Maintenance |
| Monitor the backlog | Department Head, Management | Dashboard, Maintenance History report |
| Verify the trail | Auditor | Logs |

### 7.3 Escalating to replacement

If a device is beyond repair: close the ticket as **Resolved** noting the finding, record the return
from the employee, **Retire** the asset, register the replacement, and issue it. Five steps, and the
register stays truthful at every one.

---

## 8. Preventive maintenance schedules

**Who:** IT Staff and Super Administrator set them up and complete them. Everyone with register
access can see them.

Reactive repair waits for something to break. Preventive maintenance stops it breaking. **PM
Schedules** holds the recurring plans.

### 8.1 Creating a plan

**PM Schedules → New schedule.**

| Field | Notes |
|---|---|
| Asset | Which device (retired assets are excluded) |
| Task | What gets done, e.g. "Firmware patching and disk health check" |
| Frequency | Monthly, Quarterly, Every 6 months, or Annually |
| Next due | When the first service falls due — may be backdated from a paper schedule |
| Instructions | The checklist for the technician |
| Active | Untick to pause without deleting |

### 8.2 The three states

- **Scheduled** — more than 30 days out
- **Due soon** — within 30 days (amber)
- **Overdue** — past its date (red, and it feeds the dashboard's red counter)

A plan due *today* is **not** overdue. It has the day to run.

### 8.3 Completing a service

Row menu → **Log service** → record what was done.

Two things happen, and this is the part worth understanding:

1. **A resolved Preventive ticket is filed** against the asset's maintenance history. Servicing and
   repairs share one timeline, so the asset's history page tells the whole story.
2. **The plan rolls forward** — next due date = today + one full cycle.

> The next date counts from **today**, not from the date that was missed. Service a three-month plan
> two weeks late and the next one falls due three months from today, not in ten weeks. An overdue
> plan does not immediately fall due again the moment you finish it.

### 8.4 What to put on a plan

Sensible starting points: servers quarterly (firmware, disk health) and half-yearly (backup restore
drill); networking half-yearly (firmware); printers quarterly (rollers, toner); desktops annually
(dust, thermals); laptops half-yearly (battery health, OS updates).

---

## 9. QR labels and scanning

### 9.1 Downloading labels

- **One asset:** open it → **Download label**. You get a PNG image of the finished label — QR code,
  tag, name, category, department, serial, and the company mark — ready to drop straight into
  label-printer software, a document, or a chat message. Deliberately an image and not a PDF: one
  sticker does not need a page of its own.
- **A batch:** Assets → **Labels** opens the label picker. Search by tag, name, or serial and
  filter by category, department, or status, then tick the assets you want. **Select filtered**
  takes everything the current filters match, not just the rows on screen. Everything still in
  service starts ticked, so printing the whole register is the same one click it always was — you
  are just no longer forced into it. **Download PDF** saves the sheet, three labels across, for
  printing onto label stock in one pass.

The **Preview** panel underneath shows the real label images for what you have selected (the first
twelve, when you have picked more), so you can check a sticker before committing it to paper.

Both are generated on the server rather than sent to the browser's print dialog, so the QR codes
keep their full resolution and stay readable to a scanner.

The single-asset label crops to the width its text needs, and a very long name or department is
shortened with an ellipsis so the sticker keeps a sensible shape.

### 9.2 What the code contains

The QR encodes a web address, not just the tag. Scan it with **any** phone camera and it opens that
asset's record directly (after signing in). High error correction means it still reads when the
sticker is scuffed or partly peeled.

### 9.3 Scanning

**Assets → Scan** offers two routes:

- **Camera** — press Start camera, point at the label, and the record opens. Browsers only release
  the camera over HTTPS or on `localhost`; on plain HTTP the camera will not start.
- **Type a tag** — also works with a handheld barcode scanner, which behaves like a keyboard.

Scanning is available to everyone with register access, which is what makes a physical stock count
practical: walk the floor with the Audit Inventory sheet, scan each device, tick it off.

If you scan an asset outside your department and you are a Department Head, you are told so plainly
rather than shown the record.

---

## 10. Import and export

**Who:** IT Staff and Super Administrator. **Assets → Import / Export.**

### 10.1 Exporting

**Download register (.xlsx)** gives you every asset you are allowed to see. The column order matches
the importer exactly, so an export can be edited and fed straight back in.

### 10.2 Importing

1. **Download the blank import template** — it carries the exact headings plus a worked example row
   and the category names this system accepts.
2. Fill it in. Delete the example row.
3. Upload it.

| Column | Required | Notes |
|---|---|---|
| Name | ✅ | |
| Category | ✅ | `Laptop`, `Desktop`, `Monitor`, `Printer`, `Networking Device`, `Server`, `Peripheral` |
| Brand, Model | — | |
| Serial Number | — | Must be unique across the register |
| Location | — | |
| Condition | — | `NEW`, `GOOD`, `FAIR`, `POOR` — defaults to `GOOD` |
| Purchase Date | — | `YYYY-MM-DD` or a real Excel date cell |
| Warranty Expiry | — | Same |
| Purchase Cost | — | Numbers only |
| Remarks | — | |

**There is no Asset Tag column.** Tags are issued by the system on import, exactly as they are on
the form.

### 10.3 When rows fail

Rows are validated one at a time. A bad row is **reported and skipped**; the rest of the workbook
still lands. Afterwards you get a table of every rejected row with its spreadsheet line number and
the reason — unknown category, duplicate serial, missing name, and so on. Fix those rows in the
original file and re-upload just them.

Blank rows are ignored, so trailing empty rows are harmless.

---

## 11. Reports

**Who:** everyone except Employees. Department Heads see their own department only.

**Reports** opens a catalogue of ten reports, grouped by the question each one answers. Pick one to
open it.

### 11.1 What every report page gives you

- **Headline figures** across the top — the numbers you would quote in a meeting. Hover the ⓘ on any
  figure for an explanation of what it counts.
- **A chart, on the five reports where one helps** — a trend by month, a ranking, or severity
  bands. Listings, logbooks, and count sheets deliberately have none: you read those row by row,
  and a graph over them is decoration.
- **Filters** — only the ones that report supports. Applied filters appear as chips you can clear
  individually.
- **A sortable, paged table** — click any heading to sort; 25, 50, or 100 rows per page.
- **Report switcher** — jump straight to another report without going back to the catalogue.
- **Download PDF** — the report as a paper document: masthead, the figures, the chart, every
  matching row (not just the page on screen), and prepared / reviewed / approved sign-off lines.
- **Export** — Excel or CSV, for when you want the numbers rather than the document.

Filters live in the address bar, so a filtered report can be bookmarked or pasted to a colleague and
it opens exactly as you left it.

### 11.2 The ten reports

**Inventory**

| Report | Answers |
|---|---|
| Comprehensive asset inventory | What hardware do we own, and what condition is it in? |
| Assets assigned to each employee | Who is currently holding what, and since when? |
| Departmental asset distribution | How is the hardware and its value spread across departments? |

**Lifecycle & maintenance**

| Report | Answers |
|---|---|
| Warranty expiration overview | What is still under warranty, expiring soon, or already lapsed? |
| Maintenance and repair history | What broke, who fixed it, and how long did it take? |
| Damaged and retired assets | What has left service, and what value did it carry? |

**Finance & management**

| Report | Answers |
|---|---|
| New asset acquisition overview | What did we buy in this period, and what did it cost? |
| Management summary | How is the portfolio performing, department by department? |

**Audit & accountability**

| Report | Answers |
|---|---|
| Asset movement and transfers | Where has each asset been, and who signed for it? |
| Audit inventory overview | What should a physical count find, and when was each item last touched? |

### 11.3 Which export to choose

- **Excel** — you want to sort, pivot, or total the numbers. Costs come through as real numbers.
- **CSV** — you are feeding another system.
- **PDF** (the **Download PDF** button) — you are circulating or filing it. Carries the letterhead,
  the period, who generated it, the filters that were applied, the chart, and prepared / reviewed /
  approved sign-off lines.

### 11.4 Running a physical stock count

1. Open **Audit inventory overview**, filter to the department, **Download PDF**, and print it.
2. Walk the floor with the sheet and a phone. Scan each device; tick the **Physically verified**
   column.
3. Anything on the sheet you cannot find, and anything you find that is not on the sheet, is your
   exception list.
4. Hand the exceptions to IT Staff to correct in the register.

The report also flags assets with no serial number and assets never touched since registration —
both are the usual causes of a count that will not reconcile.

---

## 12. Logs

**Who:** Super Administrator and Auditor see everything. Department Heads see entries for their own
department's assets plus their own actions. Nobody else has access.

Every change is recorded automatically, and **no one can edit or delete an entry** — including the
Super Administrator. That is what makes it evidence.

### 12.1 What each entry holds

When it happened · what kind of event · a plain-English description · **the exact fields that
changed, with before and after values** · who did it · their IP address.

Passwords are never recorded, in either direction.

### 12.2 Recorded events

`Created` · `Updated` · `Deleted` · `Issued` · `Returned` · `Retired` · `Restored` · `Serviced` ·
`Imported` · `Exported` · `Signed in` · `Signed out`

### 12.3 Finding something

Filter by free text (tag, description, or person), event type, and date range. The page shows the
most recent 400 matching entries — narrow the dates to reach older activity.

Because the log records the *system*, not just assets, it also answers "who exported the register
last month" and "who was signed in on the 3rd."

---

## 13. Administration — users, departments, categories

### 13.1 Users — Super Administrator only

**Users → Add user.** Name, email, password, role, employee code, department, position, contact
number, status.

The role picker explains what each role unlocks as you select it.

**Deactivate, do not delete.** Set status to **Inactive** when someone leaves. They can no longer
sign in, and they can no longer be issued equipment, but their custody history stays intact.

> Before deactivating, **record the return of everything they hold**. An inactive account still
> holding a laptop is a laptop nobody is accountable for.

### 13.2 Departments — Super Administrator only

Name and a short code. The code is used by the spreadsheet importer, so keep it short and stable.
Departments drive asset ownership, department-head scoping, and every departmental report.

### 13.3 Categories — IT Staff and Super Administrator

Name and description. Categories classify the register and drive reporting; they take no part in
the asset tag, so renaming one is safe at any time and never invalidates a printed label.

---

## 14. My Workspace — the employee view

Available to everyone, whatever their role.

### 14.1 My Assets

Everything currently issued to you: tag, name, category, status, condition. This is what you are
accountable for. If something here is not actually in your possession, tell IT immediately.

### 14.2 My Requests

Your fault reports and where each one has got to.

**Report an issue** → pick one of your assets, choose Repair / Preventive / Replacement, describe the
problem.

> **Describe what actually happens.** "Laptop shuts down after about ten minutes on battery, fine on
> mains" gets fixed on the first visit. "Laptop broken" does not.

You cannot close your own ticket — IT Staff do that, and their resolution notes appear against it.

---

## 15. Reference tables

### 15.1 Asset statuses

| Status | Set by | Next states |
|---|---|---|
| Available | System, on registration or return | Assigned, Under repair, Retired |
| Assigned | System, on issue | Available (return), Under repair (ticket) |
| Under repair | System, when a ticket goes In progress | Assigned or Available on close |
| Retired | IT Staff, manually | Available (restore) |

### 15.2 Maintenance ticket statuses

| Status | Meaning | Asset effect |
|---|---|---|
| Pending | Logged, not yet started | None |
| In progress | Being worked on | → Under repair |
| Resolved | Fixed | Leaves Under repair |
| Rejected | No action taken | Leaves Under repair |

Resolved and Rejected are final.

### 15.3 Codes

**Departments:** `IT` Information Technology · `ACCT` Accounting · `HR` Human Resources ·
`PROD` Production · `SALES` Sales and Marketing · `ADMIN` Administration

### 15.4 Demo accounts

Password for all: `password`

| Email | Role |
|---|---|
| `admin@gmail.com` | Super Administrator |
| `itstaff@gmail.com` | Administrator (IT Staff) |
| `depthead@gmail.com` | Department Head (Accounting) |
| `management@gmail.com` | Management |
| `auditor@gmail.com` | Auditor |
| `employee@gmail.com` | Employee |

> These exist for demonstration and testing. **Delete or deactivate every one of them before the
> system carries real data.**

---

## 16. Troubleshooting

**"This asset cannot be issued while its status is …"**
Only **Available** assets can be issued. Close the repair ticket, record the return, or restore it
from retired first.

**"Return the asset from its current holder before retiring it."**
Record the return, then retire.

**"This asset cannot be deleted because it has custody or maintenance history."**
Working as intended — retire it instead. Deleting would destroy the trail.

**"The serial number has already been taken."**
Serials are unique. Search the register for it; you are probably registering something already
there.

**The camera will not start on the Scan page.**
Browsers only release the camera over HTTPS or on `localhost`. Use the manual tag field, or reach
the system over HTTPS.

**A QR code opens the wrong address.**
The encoded address comes from the system's configured URL. If that setting is wrong, labels printed
before it was corrected will need reprinting.

**An import rejected rows I expected to work.**
Read the rejection table — it names the row and the reason. Usual causes: a category code that does
not exist, a duplicate serial, a missing name, or a date Excel stored as text.

**A Department Head sees nothing at all.**
Their account has no department set. Users → edit → assign one.

**A frontend change is not showing.**
The assets need rebuilding: `npm run build` (or `composer run dev` while developing).

---

*ATMAS — IT Asset & Lifecycle Management System, built for Forms International Enterprises
Corporation.*
