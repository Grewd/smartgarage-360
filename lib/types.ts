// SmartGarage 360 — frozen entity contracts (docs/architecture.md §4)
// All amounts are integer minor units (KSh as integer shillings). Never floats.

export type Role =
  | 'super_admin' | 'owner' | 'manager' | 'mechanic' | 'receptionist' | 'accountant' | 'customer'

export type Garage = { id: string; name: string; phone: string; location: string; currency: string }

export const JOB_STATUSES = [
  'received', 'inspection', 'diagnosis', 'waiting-customer-approval', 'waiting-parts',
  'repairing', 'quality-check', 'completed', 'paid', 'delivered',
] as const
export type JobStatus = (typeof JOB_STATUSES)[number]

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  received: 'Received',
  inspection: 'Inspection',
  diagnosis: 'Diagnosis',
  'waiting-customer-approval': 'Waiting for approval',
  'waiting-parts': 'Waiting for parts',
  repairing: 'Repairing',
  'quality-check': 'Quality check',
  completed: 'Completed',
  paid: 'Paid',
  delivered: 'Delivered',
}

export const DONE_STATUSES: JobStatus[] = ['completed', 'paid', 'delivered']

export type JobItemKind = 'part' | 'labour' | 'charge'
export type JobItem = {
  id: string
  kind: JobItemKind
  description: string
  qty: number
  unitPrice: number
  amount: number // Math.round(qty * unitPrice)
  partRef?: string
}

export type InspectionRating = 'good' | 'needs-attention' | 'faulty'
export type InspectionItem = { system: string; rating: InspectionRating; note: string; photoUrl?: string }
export type Inspection = { id: string; jobId: string; items: InspectionItem[]; createdAt: string; byUserId: string }

export type ApprovalLine = { description: string; recommendedPrice: number }
export type Approval = {
  id: string
  jobId: string
  items: ApprovalLine[]
  decision: 'approved' | 'declined'
  decidedByUserId: string
  decidedAt: string
}

export type JobCard = {
  id: string
  createdAt: string
  completionDate?: string
  customerId: string
  customerName: string
  customerPhone: string
  customerEmail: string
  customerInitials: string
  vehicleId: string
  vehicleName: string
  reg: string
  year: string
  mileage: string
  mechanicUserId: string
  mechanicName: string
  complaint: string
  diagnosis: string
  workRequired: string
  items: JobItem[]
  discount: number
  status: JobStatus
  inspectionId?: string
  approvalId?: string
  photos: { url: string; caption: string }[]
  note: string
}

export type StockPart = {
  partNo: string
  name: string
  supplier: string
  buyPrice: number
  sellPrice: number
  qty: number
  unit: string
  location: string
  min: number
}

export type StockMovementType = 'received' | 'used' | 'sold' | 'adjusted'
export type StockMovement = { id: string; partNo: string; type: StockMovementType; qty: number; ref?: string; at: string }

export type PaymentMethod = 'cash' | 'mpesa' | 'bank' | 'card' | 'other'
export type Invoice = {
  id: string
  jobId?: string
  customerName: string
  customerPhone: string
  vehicleReg: string
  date: string
  total: number
  paid: number
  discount: number
}
export type Payment = { id: string; invoiceId: string; amount: number; method: PaymentMethod; ref?: string; at: string }

export type ReminderChannel = 'sms' | 'whatsapp' | 'email' | 'app'
export type ReminderType =
  | 'service-due' | 'vehicle-ready' | 'appointment' | 'balance'
  | 'approval' | 'low-stock' | 'job-assigned' | 'job-completed'
export type Reminder = {
  id: string
  type: ReminderType
  channel: ReminderChannel
  text: string
  due: string
  customerName: string
  vehicleReg: string
  status: 'pending' | 'sent'
}

export type Appointment = {
  id: string
  customerName: string
  vehicleReg: string
  at: string
  reason: string
  status: 'scheduled' | 'arrived' | 'done' | 'cancelled'
}

export type Expense = { id: string; category: string; amount: number; note: string; at: string }

export type Customer = {
  id: string
  name: string
  initials: string
  phone: string
  email: string
  vehicleCount: string
  spent: number
  outstanding: number
  lastService: string
}

export type Vehicle = {
  id: string
  customerId: string
  ownerName: string
  reg: string
  makeModel: string
  year: string
  mileage: string
  vin: string
  engineNo: string
  colour: string
  lastService: string
}