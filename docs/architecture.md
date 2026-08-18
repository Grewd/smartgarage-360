# SmartGarage 360 — Architecture & Frontend Contracts

Status: **DRAFT — contracts frozen for frontend build (M1F)**. Backend/database (M1B) implements the same contracts.

Source of truth: `docs/SmartGarage360_Developer_Project_Specification.pdf` (spec sections referenced inline).

---

## 1. Strategy

- **Frontend first.** The shareholder demo (`app/page.tsx`, in-memory + localStorage) is the validated UI/UX reference and the seed-data source. We restructure and extend it into a real, typed, componentized app — with **no backend required**.
- **Contract first.** The frontend and backend are decoupled by frozen TypeScript contracts (entity types, repository interface, status machine, RBAC action map, tenancy rules). The UI never touches the database; it talks to a `GarageRepository` seam. A demo-backed implementation ships in M1F; a Drizzle/Postgres implementation ships in M1B with **zero UI changes**.
- **Single garage first, multi-tenant ready.** The product runs one real garage; the schema/plumbing is tenant-aware from day one so a second garage is a feature release, not a migration (ADR-0002).
- **Money in minor units.** All amounts are integer minor units (KSh as integer shillings) — never floats (spec §9).
- **Stack (spec §22):** Next.js 16 App Router, React 19, TypeScript, Tailwind. Backend later: PostgreSQL + Drizzle, Auth.js v5 + argon2, Zod, Vercel + Neon, S3/R2 storage.

---

## 2. Roles & authorization

Seven roles (spec §16). Server-side enforcement arrives in M1B; the frontend is built to this model now.

```ts
type Role = 'super_admin' | 'owner' | 'manager' | 'mechanic' | 'receptionist' | 'accountant' | 'customer'
```

| Role | Scope | MVP frontend |
|---|---|---|
| `super_admin` | Platform (no garage) | Console deferred (M5+); not part of garage app |
| `owner` | Garage | Full access incl. Settings |
| `manager` | Garage | All views except Settings |
| `mechanic` | Garage | Dashboard, Job Cards (+ inspections, approvals input, parts) |
| `receptionist` | Garage | Dashboard, Customers, Vehicles, Job Cards, Invoices, Reminders, Appointments |
| `accountant` | Garage | Dashboard, Customers, Job Cards, Invoices, Reports, Reminders |
| `customer` | Own data | Portal deferred (post-pilot); schema-ready |

### Views

```ts
type View =
  | 'dashboard' | 'customers' | 'vehicles' | 'job-cards' | 'inventory'
  | 'invoices' | 'reports' | 'reminders' | 'appointments' | 'settings'
```

(`appointments` is new vs. the demo; `settings` owner-only.)

### Actions (UI capabilities)

```ts
type Action =
  | 'create-job' | 'advance-job' | 'add-part' | 'edit-note'
  | 'create-inspection' | 'record-approval'
  | 'add-customer' | 'add-vehicle' | 'add-appointment'
  | 'add-stock' | 'adjust-stock'
  | 'add-invoice' | 'record-payment'
  | 'send-reminder' | 'add-reminder'
  | 'add-expense' | 'settings'
```

### Role → actions (frontend matrix)

```ts
const ROLE_ACTIONS: Record<Role, Action[]> = {
  owner:         [all of the above],
  manager:       [all except 'settings'],
  mechanic:      ['advance-job', 'add-part', 'edit-note', 'create-inspection', 'record-approval'],
  receptionist:  ['create-job', 'add-customer', 'add-vehicle', 'add-appointment', 'send-reminder', 'add-reminder', 'record-payment'],
  accountant:    ['add-invoice', 'record-payment', 'send-reminder', 'add-reminder', 'add-expense'],
  super_admin:   [],
  customer:      [],
}
```

> The UI renders capabilities from this matrix; M1B re-enforces them server-side (spec §16 "server-side authorization, not only hidden buttons").

---

## 3. Job status machine (spec §5)

Ten states, forward-only. Each transition is recorded (backend: `job_status_history`; demo: in-memory log).

```ts
const JOB_STATUSES = [
  'received',
  'inspection',
  'diagnosis',
  'waiting-customer-approval',
  'waiting-parts',
  'repairing',
  'quality-check',
  'completed',
  'paid',
  'delivered',
] as const
type JobStatus = (typeof JOB_STATUSES)[number]

const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  received: 'Received', inspection: 'Inspection', diagnosis: 'Diagnosis',
  'waiting-customer-approval': 'Waiting for customer approval',
  'waiting-parts': 'Waiting for parts', repairing: 'Repairing',
  'quality-check': 'Quality check', completed: 'Completed',
  paid: 'Paid', delivered: 'Delivered',
}
```

Rules:

- Transitions advance one state at a time (`advanceJob` moves to the next state).
- **`completed → paid`** requires at least one full payment on the job's invoice. If an invoice is fully paid, the job is `paid`.
- **`delivered`** is terminal.
- `record-approval` is only reachable from `waiting-customer-approval` (or `diagnosis` when the approval was raised earlier); a declined approval can move a job back to `diagnosis` (recorded, not a forward step).
- Invoice generation is triggered at `completed` if none exists (spec §9: invoice from job card).

---

## 4. Entity contracts

All IDs are strings (`JobId`, `CustomerId`, …). Timestamps are ISO-8601 strings. Amounts are integer shillings.

```ts
// Tenancy — the repository is always bound to one garage.
type GarageId = string
type Garage = { id: GarageId; name: string; phone: string; location: string; currency: string }

type User = { id: string; name: string; email: string; phone: string; role: Role; title: string }

type Customer = {
  id: CustomerId; name: string; phone: string; email: string
  notes: string
  // derived: visitHistory, invoices, outstanding, lastService — from queries
}

type Vehicle = {
  id: VehicleId; customerId: CustomerId; reg: string
  makeModel: string; year: string; mileage: string
  vin: string; engineNo: string; colour: string   // spec §4/§7
  lastService: string
}

type JobItemKind = 'part' | 'labour' | 'charge'
type JobItem = {
  id: string; kind: JobItemKind; description: string
  qty: number; unitPrice: number; amount: number   // amount = qty * unitPrice
  partRef?: string                                  // StockPart.partNo when kind='part'
}

type InspectionRating = 'good' | 'needs-attention' | 'faulty'
type InspectionItem = { system: string; rating: InspectionRating; note: string; photoUrl?: string }
type Inspection = { id: string; jobId: JobId; items: InspectionItem[]; createdAt: string; byUserId: string }

type ApprovalLine = { description: string; recommendedPrice: number }
type Approval = {
  id: string; jobId: JobId; items: ApprovalLine[]
  decision: 'approved' | 'declined'; decidedByUserId: string; decidedAt: string
}

type JobCard = {
  id: JobId; number: string            // e.g. 'SG360-000125'
  createdAt: string; completionDate?: string
  customerId: CustomerId; vehicleId: VehicleId
  complaint: string; diagnosis: string; workRequired: string
  mechanicUserId: string
  items: JobItem[]                     // parts + labour + charges
  discount: number
  status: JobStatus
  approvalId?: string; inspectionId?: string
  photos: { url: string; caption: string }[]
  note: string
  // derived: total = sum(items.amount) - discount; paid/balance from invoice
}

type StockPart = {
  partNo: string; name: string; supplier: string
  buyPrice: number; sellPrice: number; qty: number; unit: string; location: string; min: number
}
type StockMovementType = 'received' | 'used' | 'sold' | 'adjusted'
type StockMovement = { id: string; partNo: string; type: StockMovementType; qty: number; ref?: string; at: string }

type PaymentMethod = 'cash' | 'mpesa' | 'bank' | 'card' | 'other'
type Invoice = {
  id: string; jobId?: JobId; customerId: CustomerId; vehicleId: VehicleId
  date: string; total: number; paid: number; discount: number
  // derived: balance = total - paid
}
type Payment = { id: string; invoiceId: string; amount: number; method: PaymentMethod; ref?: string; at: string }

type ReminderChannel = 'sms' | 'whatsapp' | 'email' | 'app'
type ReminderType = 'service-due' | 'vehicle-ready' | 'appointment' | 'balance' | 'approval' | 'low-stock' | 'job-assigned' | 'job-completed'
type Reminder = { id: string; type: ReminderType; channel: ReminderChannel; text: string; due: string; customerId: CustomerId; vehicleId: VehicleId; status: 'pending' | 'sent' }

type Appointment = { id: string; customerId: CustomerId; vehicleId: VehicleId; at: string; reason: string; status: 'scheduled' | 'arrived' | 'done' | 'cancelled' }

type Expense = { id: string; category: string; amount: number; note: string; at: string }
type Notification = { id: string; type: string; message: string; read: boolean; at: string }
```

---

## 5. Repository seam (the frontend↔backend contract)

The entire UI reads/writes through a single interface. The demo implements it in-memory; the backend will implement it with Drizzle + server actions. **No component imports a database or the demo store directly.**

```ts
interface GarageRepository {
  // query
  listJobs(): JobCard[]
  getJob(id: JobId): JobCard | undefined
  listCustomers(): Customer[]
  listVehicles(): Vehicle[]
  listStock(): StockPart[]
  listInvoices(): Invoice[]
  listReminders(): Reminder[]
  listAppointments(): Appointment[]
  listExpenses(): Expense[]
  getGarage(): Garage
  getCurrentUser(): User

  // mutations
  createJob(input: { customerId: CustomerId; vehicleId: VehicleId; complaint: string; estimatedAmount?: number }): JobId
  advanceJob(id: JobId): JobStatus
  addJobItem(jobId: JobId, item: { kind: JobItemKind; description: string; qty: number; unitPrice: number; partRef?: string }): void
  updateJobNote(jobId: JobId, note: string): void

  createInspection(jobId: JobId, items: InspectionItem[]): InspectionId
  recordApproval(jobId: JobId, input: { items: ApprovalLine[]; decision: 'approved' | 'declined' }): void

  addCustomer(input: { name: string; phone: string; email?: string }): CustomerId
  addVehicle(input: { customerId: CustomerId; reg: string; makeModel: string; year: string; mileage: string; vin?: string; engineNo?: string; colour?: string }): VehicleId
  addAppointment(input: { customerId: CustomerId; vehicleId: VehicleId; at: string; reason: string }): void

  addStock(part: StockPart): void
  adjustStock(partNo: string, delta: number, reason: string): void

  createInvoice(jobId: JobId): InvoiceId
  recordPayment(invoiceId: string, input: { amount: number; method: PaymentMethod; ref?: string }): void

  addReminder(input: { type: ReminderType; channel: ReminderChannel; text: string; due: string; customerId: CustomerId; vehicleId: VehicleId }): void
  sendReminder(id: string): void
  addExpense(input: { category: string; amount: number; note: string }): void

  saveGarage(profile: Omit<Garage, 'id'>): void
}
```

Backend invariants that the seam must honor (validated in M1B, UI also enforces them):

1. **Inventory deduction is atomic** (spec §8): `addJobItem` with `kind='part'` deducts `qty` from the matching `StockPart` and writes a `StockMovement(type='used')` in the same transaction. No partial state.
2. **Invoice math** (spec §9): `total = Σ(parts) + Σ(labour) + Σ(charges) − discount`; `balance = total − paid`; partial/full payments recorded against `Invoice`.
3. **One invoice per completed job** — never duplicated (`createInvoice` is idempotent per `jobId`).
4. **Money in integers** — unit price × qty rounding: `amount = Math.round(qty * unitPrice)`.

---

## 6. Frontend structure (M1F target)

```
app/
  (marketing)/page.tsx                  # landing (from demo)
  (auth)/login/page.tsx                 # real sign-in screen; demo role-switcher kept for presentation
  (app)/layout.tsx                      # tenant-scoped AppShell (sidebar/header/presentation bar)
  (app)/dashboard/page.tsx
  (app)/customers/page.tsx
  (app)/vehicles/page.tsx
  (app)/job-cards/page.tsx
  (app)/job-cards/[id]/page.tsx         # job card detail + inspection + approval + parts
  (app)/inventory/page.tsx
  (app)/invoices/page.tsx
  (app)/reports/page.tsx
  (app)/reminders/page.tsx
  (app)/appointments/page.tsx
  (app)/settings/page.tsx
lib/
  types.ts                             # §4 entities
  contracts.ts                         # §5 GarageRepository interface + status machine + RBAC maps
  demo/store.ts                        # DemoRepository (in-memory + localStorage) — seeds from demo data
  server/repo.ts                       # (M1B) DrizzleRepository implementing the same interface
components/                            # shared UI: tables, modals, status chip, export, search…
```

Rules:

- Screens depend only on `contracts.ts` (`GarageRepository`). A React context (`GarageProvider`) provides the implementation (demo now, server later).
- The **AppShell is tenant-scoped**: it resolves the current garage + user and binds the repository to that garage (ADR-0002).
- The shareholder demo remains fully runnable — it is the demo-backed repository plus the presentation layer.
- Status chip/timeline render from `JOB_STATUSES`, not hardcoded demo strings.

---

## 7. What the frontend adds beyond the demo (spec gaps)

| Gap | Spec | Frontend work |
|---|---|---|
| Inspection checklist | §12 | 11-system checklist (engine, oil, coolant, battery, brakes, tyres, suspension, steering, lights, electrical, transmission) with GOOD / NEEDS ATTENTION / FAULTY + note + photo per item |
| Customer approval | §10 | APPROVE / DECLINE with itemized prices + timestamp, captured in-workshop |
| 10-state workflow | §5 | Replace the 7 demo stages with the full machine |
| Inventory deduction | §8 | On add-part: demo repository will deduct stock + record movement (backend enforces in txn) |
| Appointments | §6/§13/§14 | New view + list/modal |
| Expenses | §13 | Expense entry + reports line |
| Photos | §4/§7/§12 | Upload UI (storage is M1B; demo stores object URLs in state) |
| Receipts | §9 | Printable invoice/receipt per payment method |
| Vehicle VIN/engine/colour | §4/§7 | Fields on vehicle + job card |
| Paid job status | §5 | Job timeline shows `paid` when invoice settled |

---

## 8. Milestones

- **M1F (current):** restructure demo → typed app; freeze contracts (this doc); demo-backed `GarageRepository`; add missing screens; presentation layer preserved. Shipable as the enhanced shareholder demo.
- **M1B:** Drizzle schema + migration (tenant-aware, RLS, composite keys), Auth.js v5 + argon2, server implementation of `GarageRepository`, seed from demo data, ERD.
- **M2:** customers/vehicles/job cards harden; inspections/approvals persisted; 10-state machine with history.
- **M3:** inventory + atomic deduction, invoices/receipts/payments (manual methods + Daraja stub), expenses.
- **M4:** reports (real DB), reminders/notifications, appointments, photos (R2), audit logs, permissions.
- **M5:** automated tests (incl. role restrictions + Garage A/B isolation), security review, CI hygiene, deploy (Vercel Pro + Neon), backup/restore, data export, user guide, pilot gate.