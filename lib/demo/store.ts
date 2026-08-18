'use client'

// SmartGarage 360 — demo-backed implementation of GarageRepository (docs/architecture.md §5).
// In-memory + localStorage. M1B replaces this with a Drizzle/Postgres implementation of the
// same contracts — the UI only ever depends on lib/contracts.ts.

import { useEffect, useRef, useState } from 'react'
import type { GarageRepository } from '../contracts'
import {
  JOB_STATUSES, DONE_STATUSES,
  type Approval, type Appointment, type Customer, type Expense, type Garage, type Inspection,
  type InspectionItem, type Invoice, type JobCard, type JobItem, type Payment, type Reminder,
  type StockMovement, type StockPart, type Vehicle, type JobStatus, type JobItemKind,
} from '../types'
import { initialsOf } from '../utils'

const TODAY = '14 Aug 2024'

// ---- seed data --------------------------------------------------------------
const partItem = (id: string, description: string, qty: number, unitPrice: number, partRef?: string): JobItem =>
  ({ id, kind: 'part', description, qty, unitPrice, amount: Math.round(qty * unitPrice), partRef })
const labourItem = (id: string, description: string, amount: number): JobItem =>
  ({ id, kind: 'labour', description, qty: 1, unitPrice: amount, amount })
const chargeItem = (id: string, description: string, amount: number): JobItem =>
  ({ id, kind: 'charge', description, qty: 1, unitPrice: amount, amount })

export type DemoState = {
  garage: Garage
  jobs: JobCard[]
  customers: Customer[]
  vehicles: Vehicle[]
  stock: StockPart[]
  movements: StockMovement[]
  invoices: Invoice[]
  payments: Payment[]
  reminders: Reminder[]
  appointments: Appointment[]
  expenses: Expense[]
  inspections: Inspection[]
  approvals: Approval[]
}

function buildSeed(): DemoState {
  const customers: Customer[] = [
    { id: 'c1', name: 'John Kamau', initials: 'JK', phone: '0712 345 678', email: 'johnkamau@gmail.com', vehicleCount: '2 vehicles', spent: 86500, outstanding: 0, lastService: 'Today' },
    { id: 'c2', name: 'Grace Wanjiru', initials: 'GW', phone: '0722 111 909', email: 'gracew@gmail.com', vehicleCount: '1 vehicle', spent: 142000, outstanding: 28500, lastService: '12 Aug 2024' },
    { id: 'c3', name: 'Samuel Otieno', initials: 'SO', phone: '0701 889 321', email: 'sam.otieno@outlook.com', vehicleCount: '1 vehicle', spent: 64200, outstanding: 42000, lastService: '10 Aug 2024' },
    { id: 'c4', name: 'Mary Achieng', initials: 'MA', phone: '0798 445 122', email: 'mary.achieng@gmail.com', vehicleCount: '3 vehicles', spent: 203800, outstanding: 8000, lastService: '08 Aug 2024' },
    { id: 'c5', name: 'Peter Mwangi', initials: 'PM', phone: '0715 220 876', email: '', vehicleCount: '2 vehicles', spent: 51400, outstanding: 0, lastService: '02 Aug 2024' },
    { id: 'c6', name: 'Esther Nyambura', initials: 'EN', phone: '0733 990 445', email: '', vehicleCount: '1 vehicle', spent: 22500, outstanding: 0, lastService: TODAY },
    { id: 'c7', name: 'Brian Kimathi', initials: 'BK', phone: '0740 123 558', email: '', vehicleCount: '1 vehicle', spent: 18000, outstanding: 0, lastService: '13 Aug 2024' },
  ]
  const vehicles: Vehicle[] = [
    { id: 'v1', customerId: 'c1', ownerName: 'John Kamau', reg: 'KDA 123A', makeModel: 'Toyota Axio', year: '2015', mileage: '124,560 km', vin: 'JTDBB32E400123456', engineNo: '1NZ-FE', colour: 'Silver', lastService: 'Today' },
    { id: 'v2', customerId: 'c2', ownerName: 'Grace Wanjiru', reg: 'KCB 456B', makeModel: 'Nissan X-Trail', year: '2018', mileage: '98,240 km', vin: 'JN10TAT10A70008976', engineNo: 'MR20DD', colour: 'Pearl White', lastService: '12 Aug 2024' },
    { id: 'v3', customerId: 'c3', ownerName: 'Samuel Otieno', reg: 'KDD 789C', makeModel: 'Subaru Forester', year: '2017', mileage: '156,800 km', vin: 'JF1SJ9L20FG065432', engineNo: 'FB20', colour: 'Dark Grey', lastService: '10 Aug 2024' },
    { id: 'v4', customerId: 'c4', ownerName: 'Mary Achieng', reg: 'KCF 321D', makeModel: 'Toyota Probox', year: '2014', mileage: '201,120 km', vin: 'NCP160401778901', engineNo: '1NZ-FE', colour: 'White', lastService: '08 Aug 2024' },
    { id: 'v5', customerId: 'c5', ownerName: 'Peter Mwangi', reg: 'KDG 681E', makeModel: 'Mazda Demio', year: '2019', mileage: '74,500 km', vin: 'MMDE5CY5JH104778', engineNo: 'P5', colour: 'Blue', lastService: '02 Aug 2024' },
    { id: 'v6', customerId: 'c6', ownerName: 'Esther Nyambura', reg: 'KDH 204F', makeModel: 'Toyota RAV4', year: '2021', mileage: '41,200 km', vin: 'JTMJ47EV1MD097665', engineNo: '2ZR-FAE', colour: 'Black', lastService: TODAY },
    { id: 'v7', customerId: 'c7', ownerName: 'Brian Kimathi', reg: 'KDL 775G', makeModel: 'Honda Fit', year: '2020', mileage: '62,000 km', vin: 'GD1-2278043', engineNo: 'L15B', colour: 'Red', lastService: '13 Aug 2024' },
  ]
  const jobs: JobCard[] = [
    {
      id: 'SG360-000125', createdAt: TODAY, customerId: 'c1', customerName: 'John Kamau', customerPhone: '0712 345 678', customerEmail: 'johnkamau@gmail.com', customerInitials: 'JK',
      vehicleId: 'v1', vehicleName: 'Toyota Axio', reg: 'KDA 123A', year: '2015', mileage: '124,560 km',
      mechanicUserId: 'm1', mechanicName: 'Peter Wambui', complaint: 'Engine noise and vibration', diagnosis: 'Worn engine mounting, oil change due, front brake pads worn out', workRequired: 'Engine mount replacement, oil & filter service, brake pad replacement',
      items: [
        partItem('i1', 'Engine Oil', 4, 1000, 'EO-5W30-4L'), partItem('i2', 'Oil Filter', 1, 800, 'OF-TY-001'),
        partItem('i3', 'Engine Mounting', 1, 3500), partItem('i4', 'Front Brake Pads', 1, 2800, 'BP-TY-AX-15'),
        partItem('i5', 'Brake Cleaner', 1, 400), labourItem('i6', 'Labour', 3000), chargeItem('i7', 'Workshop consumables', 500),
      ],
      discount: 0, status: 'paid', completionDate: TODAY,
      photos: [], note: 'Customer prefers M-Pesa receipts. Call before any additional work.',
    },
    {
      id: 'SG360-000124', createdAt: TODAY, customerId: 'c2', customerName: 'Grace Wanjiru', customerPhone: '0722 111 909', customerEmail: 'gracew@gmail.com', customerInitials: 'GW',
      vehicleId: 'v2', vehicleName: 'Nissan X-Trail', reg: 'KCB 456B', year: '2018', mileage: '98,240 km',
      mechanicUserId: 'm2', mechanicName: 'David Kariuki', complaint: 'Pulsing brake pedal and low brake fluid', diagnosis: 'Front discs worn, pads below limit, brake fluid flush recommended', workRequired: 'Front disc & pad replacement, brake fluid flush, coolant top-up',
      items: [
        partItem('i1', 'Brake Discs', 2, 7500, 'BD-TY-AX-15'), partItem('i2', 'Brake Pads', 1, 2800, 'BP-TY-AX-15'),
        partItem('i3', 'Brake Fluid', 1, 500, 'BF-001'), partItem('i4', 'Coolant', 1, 1200), labourItem('i5', 'Labour', 8000), chargeItem('i6', 'Workshop consumables', 1000),
      ],
      discount: 0, status: 'repairing',
      photos: [], note: 'Customer to call before any additional work is approved.',
    },
    {
      id: 'SG360-000123', createdAt: TODAY, customerId: 'c3', customerName: 'Samuel Otieno', customerPhone: '0701 889 321', customerEmail: 'sam.otieno@outlook.com', customerInitials: 'SO',
      vehicleId: 'v3', vehicleName: 'Subaru Forester', reg: 'KDD 789C', year: '2017', mileage: '156,800 km',
      mechanicUserId: 'm1', mechanicName: 'Peter Wambui', complaint: 'Clutch slipping, hard gear changes', diagnosis: 'Clutch worn, flywheel heat damage — awaiting parts from supplier', workRequired: 'Clutch kit, flywheel and gasket replacement',
      items: [
        partItem('i1', 'Clutch Kit', 1, 25000, 'CK-TY-001'), partItem('i2', 'Transmission Oil', 1, 2500),
        partItem('i3', 'Flywheel', 1, 9000), partItem('i4', 'Gasket Set', 1, 1500), labourItem('i5', 'Labour', 3500), chargeItem('i6', 'Workshop consumables', 500),
      ],
      discount: 0, status: 'waiting-parts',
      photos: [], note: 'Parts awaited from BrakePro KE — chase supplier daily.',
    },
    {
      id: 'SG360-000122', createdAt: TODAY, customerId: 'c4', customerName: 'Mary Achieng', customerPhone: '0798 445 122', customerEmail: 'mary.achieng@gmail.com', customerInitials: 'MA',
      vehicleId: 'v4', vehicleName: 'Toyota Probox', reg: 'KCF 321D', year: '2014', mileage: '201,120 km',
      mechanicUserId: 'm3', mechanicName: 'Joyce Njeri', complaint: 'Engine misfire and rough idle', diagnosis: 'Spark plugs fouled, air filter clogged — pending owner approval', workRequired: 'Spark plug and air filter replacement, fuel system clean',
      items: [
        partItem('i1', 'Spark Plugs', 4, 500, 'SP-NGK-04'), partItem('i2', 'Air Filter', 1, 800, 'AF-TY-002'),
        labourItem('i3', 'Labour', 5000), chargeItem('i4', 'Workshop consumables', 700),
      ],
      discount: 0, status: 'diagnosis',
      photos: [], note: 'Awaiting owner approval on spark plugs before ordering.',
    },
  ]
  const stock: StockPart[] = [
    { partNo: 'EO-5W30-4L', name: 'Engine Oil 5W-30', supplier: 'AutoParts KE', buyPrice: 3100, sellPrice: 4000, qty: 16, unit: 'L', location: 'Shelf A1', min: 10 },
    { partNo: 'OF-TY-001', name: 'Oil Filter', supplier: 'MotorHub Nairobi', buyPrice: 550, sellPrice: 800, qty: 9, unit: '', location: 'Shelf A2', min: 5 },
    { partNo: 'BP-TY-AX-15', name: 'Front Brake Pads', supplier: 'BrakePro KE', buyPrice: 2100, sellPrice: 2800, qty: 5, unit: '', location: 'Shelf B4', min: 8 },
    { partNo: 'BD-TY-AX-15', name: 'Brake Discs', supplier: 'BrakePro KE', buyPrice: 5800, sellPrice: 7500, qty: 2, unit: '', location: 'Shelf B5', min: 4 },
    { partNo: 'SP-NGK-04', name: 'Spark Plugs', supplier: 'NGK Kenya', buyPrice: 350, sellPrice: 500, qty: 24, unit: '', location: 'Shelf C1', min: 10 },
    { partNo: 'CK-TY-001', name: 'Clutch Kit', supplier: 'ClutchPro KE', buyPrice: 18000, sellPrice: 25000, qty: 1, unit: '', location: 'Shelf C2', min: 2 },
    { partNo: 'BF-001', name: 'Brake Fluid', supplier: 'AutoParts KE', buyPrice: 350, sellPrice: 500, qty: 3, unit: 'L', location: 'Shelf B6', min: 4 },
    { partNo: 'WB-UNI-01', name: 'Wiper Blades', supplier: 'MotorHub Nairobi', buyPrice: 250, sellPrice: 450, qty: 0, unit: '', location: 'Shelf D1', min: 5 },
    { partNo: 'AF-TY-002', name: 'Air Filter', supplier: 'MotorHub Nairobi', buyPrice: 600, sellPrice: 800, qty: 0, unit: '', location: 'Shelf D2', min: 5 },
  ]
  const invoices: Invoice[] = [
    { id: 'INV-000125', jobId: 'SG360-000125', customerName: 'John Kamau', customerPhone: '0712 345 678', vehicleReg: 'KDA 123A', date: TODAY, total: 15000, paid: 15000, discount: 0 },
    { id: 'INV-000120', customerName: 'Peter Mwangi', customerPhone: '0715 220 876', vehicleReg: 'KDG 681E', date: TODAY, total: 30000, paid: 30000, discount: 0 },
    { id: 'INV-000121', customerName: 'Esther Nyambura', customerPhone: '0733 990 445', vehicleReg: 'KDH 204F', date: TODAY, total: 22500, paid: 22500, discount: 0 },
    { id: 'INV-000124', jobId: 'SG360-000124', customerName: 'Grace Wanjiru', customerPhone: '0722 111 909', vehicleReg: 'KCB 456B', date: '12 Aug 2024', total: 28500, paid: 14000, discount: 0 },
    { id: 'INV-000119', customerName: 'Brian Kimathi', customerPhone: '0740 123 558', vehicleReg: 'KDL 775G', date: '13 Aug 2024', total: 10000, paid: 10000, discount: 0 },
    { id: 'INV-000118', customerName: 'John Kamau', customerPhone: '0712 345 678', vehicleReg: 'KDA 123A', date: '13 Aug 2024', total: 15000, paid: 15000, discount: 0 },
    { id: 'INV-000123', jobId: 'SG360-000123', customerName: 'Samuel Otieno', customerPhone: '0701 889 321', vehicleReg: 'KDD 789C', date: '10 Aug 2024', total: 42000, paid: 0, discount: 0 },
    { id: 'INV-000122', jobId: 'SG360-000122', customerName: 'Mary Achieng', customerPhone: '0798 445 122', vehicleReg: 'KCF 321D', date: '08 Aug 2024', total: 8500, paid: 500, discount: 0 },
  ]
  const reminders: Reminder[] = [
    { id: 'REM-004', type: 'vehicle-ready', channel: 'whatsapp', text: 'Vehicle ready for collection', customerName: 'Grace Wanjiru', vehicleReg: 'KCB 456B', due: 'Today, 4:30 PM', status: 'pending' },
    { id: 'REM-003', type: 'service-due', channel: 'sms', text: 'Service due', customerName: 'Peter Mwangi', vehicleReg: 'KDG 681E', due: 'Tomorrow', status: 'pending' },
    { id: 'REM-002', type: 'balance', channel: 'whatsapp', text: 'Payment follow-up', customerName: 'Mary Achieng', vehicleReg: 'KCF 321D', due: 'Overdue by 2 days', status: 'pending' },
    { id: 'REM-001', type: 'appointment', channel: 'sms', text: 'Upcoming appointment', customerName: 'John Kamau', vehicleReg: 'KDA 123A', due: '18 Aug 2024', status: 'pending' },
  ]
  const appointments: Appointment[] = [
    { id: 'APT-001', customerName: 'John Kamau', vehicleReg: 'KDA 123A', at: '18 Aug 2024, 10:00 AM', reason: 'Oil change + brake inspection', status: 'scheduled' },
    { id: 'APT-002', customerName: 'Esther Nyambura', vehicleReg: 'KDH 204F', at: '19 Aug 2024, 2:00 PM', reason: 'Regular service', status: 'scheduled' },
  ]
  const expenses: Expense[] = [
    { id: 'EXP-001', category: 'Rent', amount: 25000, note: 'Monthly workshop rent', at: TODAY },
  ]
  return {
    garage: { id: 'garage-1', name: 'SmartGarage 360 Demo Garage', phone: '0712 000 360', location: 'Warehouse Road, Industrial Area, Nairobi', currency: 'Kenyan Shilling (KSh)' },
    jobs, customers, vehicles, stock,
    movements: [], invoices, payments: [], reminders, appointments, expenses,
    inspections: [], approvals: [],
  }
}

// ---- derived stats ----------------------------------------------------------
export const jobParts = (j: JobCard) => j.items.filter(i => i.kind === 'part')
export const jobLabour = (j: JobCard) => j.items.filter(i => i.kind === 'labour').reduce((s, i) => s + i.amount, 0)
export const jobConsumables = (j: JobCard) => j.items.filter(i => i.kind === 'charge').reduce((s, i) => s + i.amount, 0)
export const jobPartsTotal = (j: JobCard) => jobParts(j).reduce((s, i) => s + i.amount, 0)
export const jobTotal = (j: JobCard) => j.items.reduce((s, i) => s + i.amount, 0) - j.discount

export const completedCount = (d: DemoState) => d.jobs.filter(j => DONE_STATUSES.includes(j.status)).length
export const activeCount = (d: DemoState) => d.jobs.filter(j => !DONE_STATUSES.includes(j.status)).length
export const waitingPartsCount = (d: DemoState) => d.jobs.filter(j => j.status === 'waiting-parts').length
export const readyForCollection = (d: DemoState) => d.jobs.filter(j => j.status === 'completed').length
export const lowStockCount = (d: DemoState) => d.stock.filter(s => s.qty > 0 && s.qty <= s.min).length
export const outStockCount = (d: DemoState) => d.stock.filter(s => s.qty === 0).length
export const outstandingTotal = (d: DemoState) => d.invoices.reduce((s, i) => s + (i.total - i.paid), 0)
export const openInvoices = (d: DemoState) => d.invoices.filter(i => i.total - i.paid > 0).length
export const revenueTotal = (d: DemoState) => d.invoices.reduce((s, i) => s + i.paid, 0)
export const revenueToday = (d: DemoState) => d.invoices.filter(i => i.date === TODAY).reduce((s, i) => s + i.paid, 0)
export const paidTodayCount = (d: DemoState) => d.invoices.filter(i => i.paid >= i.total && i.date === TODAY).length
export const labourTotal = (d: DemoState) => d.jobs.reduce((s, j) => s + jobLabour(j), 0)
export const vehiclesToday = (d: DemoState) => d.jobs.filter(j => j.createdAt === TODAY).length
export const remindersDue = (d: DemoState) => d.reminders.filter(r => r.status === 'pending').length

export function stockScore(d: DemoState) {
  const total = d.stock.length || 1
  const healthy = d.stock.filter(s => s.qty > s.min).length
  return Math.round((healthy / total) * 100)
}

// ---- store ------------------------------------------------------------------
const STORAGE_KEY = 'smartgarage-360-demo-v4'
const invIdForJob = (jobId: string) => 'INV-' + jobId.replace(/^SG360-/, '')

type Listener = (s: DemoState) => void
const seqNum = (ids: string[], re: RegExp) => {
  let max = 0
  for (const id of ids) { const m = re.exec(id); if (m) max = Math.max(max, parseInt(m[1], 10)) }
  return max + 1
}

export class DemoRepository implements GarageRepository {
  private data: DemoState
  private listeners = new Set<Listener>()

  constructor() {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY)
      if (saved) { this.data = { ...buildSeed(), ...JSON.parse(saved) }; return }
    } catch { /* ignore corrupt state */ }
    this.data = buildSeed()
  }

  getState() { return this.data }
  subscribe(fn: Listener) { this.listeners.add(fn); return () => { this.listeners.delete(fn) } }

  private commit(next: DemoState) {
    this.data = next
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch { /* storage full */ }
    this.listeners.forEach(l => l(next))
  }

  // query
  getGarage() { return this.data.garage }
  listJobs() { return this.data.jobs }
  getJob(id: string) { return this.data.jobs.find(j => j.id === id) }
  listCustomers() { return this.data.customers }
  listVehicles() { return this.data.vehicles }
  listStock() { return this.data.stock }
  listInvoices() { return this.data.invoices }
  listReminders() { return this.data.reminders }
  listAppointments() { return this.data.appointments }
  listExpenses() { return this.data.expenses }

  // mutations
  createJob(input: { customerId: string; vehicleId: string; complaint: string; estimatedAmount?: number }) {
    const d = this.data
    const customer = d.customers.find(c => c.id === input.customerId)
    const vehicle = d.vehicles.find(v => v.id === input.vehicleId)
    const n = seqNum(d.jobs.map(j => j.id), /^SG360-0*(\d+)$/)
    const id = 'SG360-' + String(n).padStart(6, '0')
    const items: JobItem[] = input.estimatedAmount ? [labourItem(`i-${n}-1`, 'Estimated labour', Math.max(0, input.estimatedAmount))] : []
    const job: JobCard = {
      id, createdAt: TODAY,
      customerId: customer?.id ?? '', customerName: customer?.name ?? 'New customer', customerPhone: customer?.phone ?? '', customerEmail: customer?.email ?? '', customerInitials: customer?.initials ?? 'NC',
      vehicleId: vehicle?.id ?? '', vehicleName: vehicle?.makeModel ?? 'Vehicle', reg: vehicle?.reg ?? '', year: vehicle?.year ?? '—', mileage: vehicle?.mileage ?? '—',
      mechanicUserId: 'm1', mechanicName: 'Peter Wambui',
      complaint: input.complaint, diagnosis: 'Pending diagnosis', workRequired: 'Awaiting inspection',
      items, discount: 0, status: 'received', photos: [], note: 'No internal notes yet',
    }
    this.commit({ ...d, jobs: [job, ...d.jobs] })
    return id
  }

  advanceJob(id: string): JobStatus {
    const d = this.data
    const job = d.jobs.find(j => j.id === id)
    if (!job) return 'received'
    const i = JOB_STATUSES.indexOf(job.status)
    const next = JOB_STATUSES[i + 1]
    if (!next) return job.status
    // 'paid' requires the job's invoice to be settled (spec §5)
    if (next === 'paid') {
      const inv = d.invoices.find(x => x.jobId === id)
      if (!inv || inv.paid < inv.total) return job.status
    }
    const reachingDone = next === 'completed' || next === 'paid' || next === 'delivered'
    const jobs = d.jobs.map(j => j.id === id ? { ...j, status: next, completionDate: reachingDone ? (j.completionDate || TODAY) : j.completionDate } : j)
    let invoices = d.invoices
    if (next === 'completed') {
      const invId = invIdForJob(id)
      if (!invoices.some(x => x.id === invId)) {
        invoices = [{ id: invId, jobId: id, customerName: job.customerName, customerPhone: job.customerPhone, vehicleReg: job.reg, date: TODAY, total: jobTotal(job), paid: 0, discount: job.discount }, ...invoices]
      }
    }
    this.commit({ ...d, jobs, invoices })
    return next
  }

  addJobItem(jobId: string, item: { kind: JobItemKind; description: string; qty: number; unitPrice: number }) {
    const d = this.data
    const job = d.jobs.find(j => j.id === jobId)
    if (!job) return
    let stock = d.stock
    let movements = d.movements
    let partRef: string | undefined
    // Spec §8: adding a part deducts inventory + records movement in the same operation.
    if (item.kind === 'part') {
      const match = stock.find(s => s.name.toLowerCase() === item.description.trim().toLowerCase())
      if (match) {
        partRef = match.partNo
        stock = stock.map(s => s.partNo === match.partNo ? { ...s, qty: Math.max(0, s.qty - item.qty) } : s)
        movements = [{ id: 'mv-' + (d.movements.length + 1), partNo: match.partNo, type: 'used', qty: item.qty, ref: jobId, at: TODAY }, ...d.movements]
      }
    }
    const newItem: JobItem = { id: 'i-' + (job.items.length + 1), kind: item.kind, description: item.description, qty: item.qty, unitPrice: item.unitPrice, amount: Math.round(item.qty * item.unitPrice), partRef }
    const jobs = d.jobs.map(j => j.id === jobId ? { ...j, items: [...j.items, newItem] } : j)
    this.commit({ ...d, jobs, stock, movements })
  }

  updateJobNote(jobId: string, note: string) {
    const d = this.data
    this.commit({ ...d, jobs: d.jobs.map(j => j.id === jobId ? { ...j, note } : j) })
  }

  createInspection(jobId: string, items: InspectionItem[]): string {
    const d = this.data
    const n = seqNum(d.inspections.map(x => x.id), /^insp-(\d+)$/)
    const id = 'insp-' + n
    const inspection: Inspection = { id, jobId, items, createdAt: TODAY, byUserId: 'm1' }
    const jobs = d.jobs.map(j => j.id === jobId
      ? { ...j, inspectionId: id, status: (j.status === 'received' || j.status === 'inspection') ? 'diagnosis' : j.status }
      : j)
    this.commit({ ...d, inspections: [inspection, ...d.inspections], jobs })
    return id
  }

  recordApproval(jobId: string, input: { items: { description: string; recommendedPrice: number }[]; decision: 'approved' | 'declined' }) {
    const d = this.data
    const n = seqNum(d.approvals.map(x => x.id), /^appr-(\d+)$/)
    const id = 'appr-' + n
    const approval: Approval = { id, jobId, items: input.items, decision: input.decision, decidedByUserId: 'demo-staff', decidedAt: TODAY }
    const jobs = d.jobs.map(j => j.id === jobId
      ? { ...j, approvalId: id, status: input.decision === 'approved' ? 'waiting-parts' as JobStatus : 'diagnosis' as JobStatus }
      : j)
    this.commit({ ...d, approvals: [approval, ...d.approvals], jobs })
  }

  addCustomer(input: { name: string; phone: string; email?: string }) {
    const d = this.data
    const n = seqNum(d.customers.map(c => c.id), /^c(\d+)$/)
    const id = 'c' + n
    const customer: Customer = { id, name: input.name, initials: initialsOf(input.name), phone: input.phone, email: input.email ?? '', vehicleCount: '0 vehicles', spent: 0, outstanding: 0, lastService: '—' }
    this.commit({ ...d, customers: [customer, ...d.customers] })
    return id
  }

  addVehicle(input: { customerId: string; reg: string; makeModel: string; year: string; mileage: string }) {
    const d = this.data
    const n = seqNum(d.vehicles.map(v => v.id), /^v(\d+)$/)
    const id = 'v' + n
    const owner = d.customers.find(c => c.id === input.customerId)
    const vehicle: Vehicle = { id, customerId: input.customerId, ownerName: owner?.name ?? '', reg: input.reg, makeModel: input.makeModel, year: input.year, mileage: input.mileage, vin: '—', engineNo: '—', colour: '—', lastService: '—' }
    this.commit({ ...d, vehicles: [vehicle, ...d.vehicles] })
    return id
  }

  addAppointment(input: { customerId: string; vehicleId: string; at: string; reason: string }) {
    const d = this.data
    const n = seqNum(d.appointments.map(a => a.id), /^APT-(\d+)$/)
    const customer = d.customers.find(c => c.id === input.customerId)
    const vehicle = d.vehicles.find(v => v.id === input.vehicleId)
    const appointment: Appointment = { id: 'APT-' + String(n).padStart(3, '0'), customerName: customer?.name ?? '', vehicleReg: vehicle?.reg ?? '', at: input.at, reason: input.reason, status: 'scheduled' }
    this.commit({ ...d, appointments: [appointment, ...d.appointments] })
  }

  addStock(part: StockPart) {
    const d = this.data
    this.commit({ ...d, stock: [part, ...d.stock] })
  }

  adjustStock(partNo: string, delta: number, reason: string) {
    const d = this.data
    const stock = d.stock.map(s => s.partNo === partNo ? { ...s, qty: Math.max(0, s.qty + delta) } : s)
    const movements = delta !== 0 ? [{ id: 'mv-' + (d.movements.length + 1), partNo, type: 'adjusted' as const, qty: delta, ref: reason, at: TODAY }, ...d.movements] : d.movements
    this.commit({ ...d, stock, movements })
  }

  createInvoice(jobId: string): string {
    const d = this.data
    const existing = d.invoices.find(i => i.jobId === jobId)
    if (existing) return existing.id
    const job = d.jobs.find(j => j.id === jobId)
    if (!job) return ''
    const n = seqNum(d.invoices.map(i => i.id), /^INV-0*(\d+)$/)
    const id = 'INV-' + String(n).padStart(6, '0')
    const invoice: Invoice = { id, jobId, customerName: job.customerName, customerPhone: job.customerPhone, vehicleReg: job.reg, date: TODAY, total: jobTotal(job), paid: 0, discount: job.discount }
    this.commit({ ...d, invoices: [invoice, ...d.invoices] })
    return id
  }

  recordPayment(invoiceId: string, input: { amount: number; method: 'cash' | 'mpesa' | 'bank' | 'card' | 'other'; ref?: string }) {
    const d = this.data
    const invoices = d.invoices.map(inv => {
      if (inv.id !== invoiceId) return inv
      return { ...inv, paid: Math.min(inv.total, inv.paid + Math.max(0, input.amount)) }
    })
    const inv = invoices.find(i => i.id === invoiceId)
    let jobs = d.jobs
    if (inv && inv.jobId && inv.paid >= inv.total) {
      jobs = d.jobs.map(j => j.id === inv.jobId && (j.status === 'completed' || j.status === 'paid') ? { ...j, status: 'paid' as JobStatus } : j)
    }
    const n = seqNum(d.payments.map(p => p.id), /^pay-(\d+)$/)
    const payments: Payment[] = [{ id: 'pay-' + n, invoiceId, amount: Math.max(0, input.amount), method: input.method, ref: input.ref, at: TODAY }, ...d.payments]
    this.commit({ ...d, invoices, jobs, payments })
  }

  addReminder(input: { type: Reminder['type']; channel: Reminder['channel']; text: string; due: string; customerId: string; vehicleId: string }) {
    const d = this.data
    const n = seqNum(d.reminders.map(r => r.id), /^REM-(\d+)$/)
    const customer = d.customers.find(c => c.id === input.customerId)
    const vehicle = d.vehicles.find(v => v.id === input.vehicleId)
    const reminder: Reminder = { id: 'REM-' + String(n).padStart(3, '0'), type: input.type, channel: input.channel, text: input.text, due: input.due, customerName: customer?.name ?? '', vehicleReg: vehicle?.reg ?? '', status: 'pending' }
    this.commit({ ...d, reminders: [reminder, ...d.reminders] })
  }

  sendReminder(id: string) {
    const d = this.data
    this.commit({ ...d, reminders: d.reminders.map(r => r.id === id ? { ...r, status: 'sent' } : r) })
  }

  addExpense(input: { category: string; amount: number; note: string }) {
    const d = this.data
    const n = seqNum(d.expenses.map(e => e.id), /^EXP-(\d+)$/)
    const expense: Expense = { id: 'EXP-' + String(n).padStart(3, '0'), category: input.category, amount: input.amount, note: input.note, at: TODAY }
    this.commit({ ...d, expenses: [expense, ...d.expenses] })
  }

  saveGarage(profile: Omit<Garage, 'id'>) {
    const d = this.data
    this.commit({ ...d, garage: { ...d.garage, ...profile } })
  }

  reset() {
    this.commit(buildSeed())
  }
}

// ---- react binding ----------------------------------------------------------
export function useDemoRepository(): DemoRepository {
  const ref = useRef<DemoRepository | null>(null)
  if (!ref.current) ref.current = new DemoRepository()
  const repo = ref.current
  const [, setTick] = useState(0)
  useEffect(() => repo.subscribe(() => setTick(t => t + 1)), [repo])
  return repo
}