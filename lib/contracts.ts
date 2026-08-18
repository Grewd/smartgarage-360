// SmartGarage 360 — frontend↔backend contracts (docs/architecture.md §2, §5)
// The entire UI depends only on this module + lib/types. No component imports
// a database or the demo store directly.

import type {
  ApprovalLine, Customer, Expense, Garage, InspectionItem, Invoice, JobCard, JobItemKind,
  JobStatus, PaymentMethod, Reminder, ReminderChannel, ReminderType, Role, StockPart, Vehicle,
} from './types'

export type View =
  | 'dashboard' | 'customers' | 'vehicles' | 'job-cards' | 'inventory'
  | 'invoices' | 'reports' | 'reminders' | 'appointments' | 'settings'

export type Action =
  | 'create-job' | 'advance-job' | 'add-part' | 'edit-note'
  | 'create-inspection' | 'record-approval'
  | 'add-customer' | 'add-vehicle' | 'add-appointment'
  | 'add-stock' | 'adjust-stock'
  | 'add-invoice' | 'record-payment'
  | 'send-reminder' | 'add-reminder'
  | 'add-expense' | 'settings'

export const ROLE_VIEWS: Record<Role, View[]> = {
  super_admin: [],
  owner: ['dashboard', 'customers', 'vehicles', 'job-cards', 'inventory', 'invoices', 'reports', 'reminders', 'appointments', 'settings'],
  manager: ['dashboard', 'customers', 'vehicles', 'job-cards', 'inventory', 'invoices', 'reports', 'reminders', 'appointments'],
  mechanic: ['dashboard', 'job-cards'],
  receptionist: ['dashboard', 'customers', 'vehicles', 'job-cards', 'invoices', 'reminders', 'appointments'],
  accountant: ['dashboard', 'customers', 'job-cards', 'invoices', 'reports', 'reminders'],
  customer: ['dashboard'],
}

const ALL: Action[] = ['create-job', 'advance-job', 'add-part', 'edit-note', 'create-inspection', 'record-approval', 'add-customer', 'add-vehicle', 'add-appointment', 'add-stock', 'adjust-stock', 'add-invoice', 'record-payment', 'send-reminder', 'add-reminder', 'add-expense', 'settings']

export const ROLE_ACTIONS: Record<Role, Action[]> = {
  super_admin: [],
  owner: ALL,
  manager: ALL.filter(a => a !== 'settings'),
  mechanic: ['advance-job', 'add-part', 'edit-note', 'create-inspection', 'record-approval'],
  receptionist: ['create-job', 'add-customer', 'add-vehicle', 'add-appointment', 'send-reminder', 'add-reminder', 'record-payment'],
  accountant: ['add-invoice', 'record-payment', 'send-reminder', 'add-reminder', 'add-expense'],
  customer: [],
}

export const can = (role: Role, action: Action) => ROLE_ACTIONS[role].includes(action)

export const addActionForView: Partial<Record<View, Action>> = {
  customers: 'add-customer', vehicles: 'add-vehicle', inventory: 'add-stock',
  invoices: 'add-invoice', reminders: 'add-reminder', appointments: 'add-appointment',
}

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: 'Super Admin', owner: 'Owner', manager: 'Manager', mechanic: 'Mechanic',
  receptionist: 'Receptionist', accountant: 'Accountant', customer: 'Customer',
}

export type StaffRole = Exclude<Role, 'super_admin' | 'customer'>
export const STAFF_ROLES: StaffRole[] = ['owner', 'manager', 'mechanic', 'receptionist', 'accountant']

export const PERSONA: Record<StaffRole, { name: string; initials: string; email: string; title: string }> = {
  owner: { name: 'Peter Wambui', initials: 'PW', email: 'peter@smartgarage.co.ke', title: 'Garage owner' },
  manager: { name: 'Brian Otieno', initials: 'BO', email: 'brian@smartgarage.co.ke', title: 'Workshop manager' },
  mechanic: { name: 'David Kariuki', initials: 'DK', email: 'david@smartgarage.co.ke', title: 'Senior mechanic' },
  receptionist: { name: 'Joyce Njeri', initials: 'JN', email: 'joyce@smartgarage.co.ke', title: 'Front desk receptionist' },
  accountant: { name: 'Faith Wanjiku', initials: 'FW', email: 'faith@smartgarage.co.ke', title: 'Accountant' },
}

export const ROLE_INFO: Record<Role, { title: string; welcome: string }> = {
  owner: { title: 'Business command centre', welcome: 'See the health of your entire garage at a glance.' },
  manager: { title: 'Workshop operations', welcome: 'Keep bays moving and customers informed.' },
  mechanic: { title: 'My workbench', welcome: 'Focus on the repairs assigned to you today.' },
  receptionist: { title: 'Front desk workspace', welcome: 'Keep customers, appointments and handovers flowing.' },
  accountant: { title: 'Finance cockpit', welcome: 'Keep every invoice, payment and balance accounted for.' },
  super_admin: { title: 'Platform admin', welcome: 'Manage garages across the platform.' },
  customer: { title: 'My garage', welcome: 'Track your vehicles and service history.' },
}

export const CHANNEL_LABELS: Record<ReminderChannel, string> = {
  sms: 'SMS', whatsapp: 'WhatsApp', email: 'Email', app: 'App',
}

export interface GarageRepository {
  // query
  getGarage(): Garage
  listJobs(): JobCard[]
  getJob(id: string): JobCard | undefined
  listCustomers(): Customer[]
  listVehicles(): Vehicle[]
  listStock(): StockPart[]
  listInvoices(): Invoice[]
  listReminders(): Reminder[]
  listAppointments(): unknown[]
  listExpenses(): Expense[]

  // mutations
  createJob(input: { customerId: string; vehicleId: string; complaint: string; estimatedAmount?: number }): string
  advanceJob(id: string): JobStatus
  addJobItem(jobId: string, item: { kind: JobItemKind; description: string; qty: number; unitPrice: number }): void
  updateJobNote(jobId: string, note: string): void

  createInspection(jobId: string, items: InspectionItem[]): string
  recordApproval(jobId: string, input: { items: ApprovalLine[]; decision: 'approved' | 'declined' }): void

  addCustomer(input: { name: string; phone: string; email?: string }): string
  addVehicle(input: { customerId: string; reg: string; makeModel: string; year: string; mileage: string }): string
  addAppointment(input: { customerId: string; vehicleId: string; at: string; reason: string }): void

  addStock(part: StockPart): void
  adjustStock(partNo: string, delta: number, reason: string): void

  createInvoice(jobId: string): string
  recordPayment(invoiceId: string, input: { amount: number; method: PaymentMethod; ref?: string }): void

  addReminder(input: { type: ReminderType; channel: ReminderChannel; text: string; due: string; customerId: string; vehicleId: string }): void
  sendReminder(id: string): void
  addExpense(input: { category: string; amount: number; note: string }): void

  saveGarage(profile: Omit<Garage, 'id'>): void
  reset(): void
}