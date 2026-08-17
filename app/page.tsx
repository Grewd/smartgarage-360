'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle, ArrowLeft, ArrowRight, BarChart3, Bell, Car, Check, CheckCircle2, ChevronRight,
  CircleDollarSign, ClipboardCheck, ClipboardList, Clock3, Cog, CreditCard, Download, FileText, Gauge,
  Layers3, LogOut, Mail, MapPin, Menu, Minus, MoreHorizontal, Package, Phone, Plus, Search, Send, Settings,
  Share2, ShieldCheck, Sparkles, TrendingUp, Users, Wrench, X,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type View = 'dashboard' | 'customers' | 'vehicles' | 'job-cards' | 'inventory' | 'invoices' | 'reports' | 'reminders' | 'settings'
type Role = 'Owner' | 'Manager' | 'Mechanic' | 'Receptionist' | 'Accountant'

const navItems: { id: View; label: string; icon: typeof Gauge }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: Gauge }, { id: 'customers', label: 'Customers', icon: Users },
  { id: 'vehicles', label: 'Vehicles', icon: Car }, { id: 'job-cards', label: 'Job Cards', icon: ClipboardList },
  { id: 'inventory', label: 'Inventory', icon: Package }, { id: 'invoices', label: 'Invoices', icon: FileText },
  { id: 'reports', label: 'Reports', icon: BarChart3 }, { id: 'reminders', label: 'Reminders', icon: Bell },
  { id: 'settings', label: 'Settings', icon: Settings },
]

const roleInfo: Record<Role, { title: string; welcome: string }> = {
  Owner: { title: 'Business command centre', welcome: 'See the health of your entire garage at a glance.' },
  Manager: { title: 'Workshop operations', welcome: 'Keep bays moving and customers informed.' },
  Mechanic: { title: 'My workbench', welcome: 'Focus on the repairs assigned to you today.' },
  Receptionist: { title: 'Front desk workspace', welcome: 'Keep customers, appointments and handovers flowing.' },
  Accountant: { title: 'Finance cockpit', welcome: 'Keep every invoice, payment and balance accounted for.' },
}

const STAGES = ['Received', 'Diagnosis', 'Waiting for parts', 'Repair', 'Quality check', 'Completed', 'Delivered'] as const
type JobStatus = (typeof STAGES)[number]

const TODAY = '14 Aug 2024'
const ksh = (n: number) => 'KSh ' + n.toLocaleString('en-KE')
const initialsOf = (name: string) => name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
const nextSeq = (ids: string[]) => {
  let max = 120
  for (const id of ids) { const m = /\d+$/.exec(id); if (m) max = Math.max(max, parseInt(m[0], 10)) }
  return max + 1
}
const invIdForJob = (jobId: string) => 'INV-' + jobId.replace(/^SG360-/, '')

function statusMeta(s: JobStatus): { tone: string; label: string } {
  switch (s) {
    case 'Completed': case 'Delivered': return { tone: 'green', label: s === 'Delivered' ? 'Delivered' : 'Completed' }
    case 'Received': return { tone: 'purple', label: 'Received' }
    case 'Diagnosis': return { tone: 'purple', label: 'Diagnosis' }
    case 'Waiting for parts': return { tone: 'amber', label: 'Waiting parts' }
    case 'Repair': return { tone: 'blue', label: 'In progress' }
    case 'Quality check': return { tone: 'blue', label: 'Quality check' }
  }
}

type Part = { name: string; qty: string; unit: number; amount: number }
type Job = {
  id: string; date: string; customer: string; initials: string; phone: string; email: string
  vehicle: string; reg: string; year: string; mileage: string; status: JobStatus
  complaint: string; diagnosis: string; parts: Part[]; labour: number; consumables: number; assigned: string; note: string
}
type StockItem = { partNo: string; name: string; supplier: string; buy: number; sell: number; qty: number; unit: string; location: string; min: number }
type Invoice = { id: string; customer: string; vehicle: string; date: string; total: number; paid: number }
type Reminder = { id: string; text: string; customer: string; vehicle: string; due: string; channel: string; sent: boolean }
type Customer = { name: string; initials: string; phone: string; vehicles: string; spent: number; outstanding: number; lastService: string }
type Vehicle = { reg: string; makeModel: string; year: string; owner: string; mileage: string; lastService: string }
type Profile = { workshop: string; phone: string; location: string; currency: string }

type DemoData = {
  jobs: Job[]; customers: Customer[]; vehicles: Vehicle[]; stock: StockItem[]
  invoices: Invoice[]; reminders: Reminder[]; profile: Profile
}

const seedJobs: Job[] = [
  { id: 'SG360-000125', date: TODAY, customer: 'John Kamau', initials: 'JK', phone: '0712 345 678', email: 'johnkamau@gmail.com', vehicle: 'Toyota Axio', reg: 'KDA 123A', year: '2015', mileage: '124,560 km', status: 'Completed', complaint: 'Engine noise and vibration', diagnosis: 'Worn engine mounting, oil change due, front brake pads worn out', parts: [
    { name: 'Engine Oil', qty: '4L', unit: 1000, amount: 4000 }, { name: 'Oil Filter', qty: '1', unit: 800, amount: 800 },
    { name: 'Engine Mounting', qty: '1', unit: 3500, amount: 3500 }, { name: 'Front Brake Pads', qty: '1 set', unit: 2800, amount: 2800 },
    { name: 'Brake Cleaner', qty: '1', unit: 400, amount: 400 } ], labour: 3000, consumables: 500, assigned: 'Peter Wambui', note: 'Customer prefers M-Pesa receipts. Call before any additional work.' },
  { id: 'SG360-000124', date: TODAY, customer: 'Grace Wanjiru', initials: 'GW', phone: '0722 111 909', email: 'gracew@gmail.com', vehicle: 'Nissan X-Trail', reg: 'KCB 456B', year: '2018', mileage: '98,240 km', status: 'Repair', complaint: 'Pulsing brake pedal and low brake fluid', diagnosis: 'Front discs worn, pads below limit, brake fluid flush recommended', parts: [
    { name: 'Brake Discs', qty: '2', unit: 7500, amount: 15000 }, { name: 'Brake Pads', qty: '1 set', unit: 2800, amount: 2800 },
    { name: 'Brake Fluid', qty: '1', unit: 500, amount: 500 }, { name: 'Coolant', qty: '1', unit: 1200, amount: 1200 } ], labour: 8000, consumables: 1000, assigned: 'David Kariuki', note: 'Customer to call before any additional work is approved.' },
  { id: 'SG360-000123', date: TODAY, customer: 'Samuel Otieno', initials: 'SO', phone: '0701 889 321', email: 'sam.otieno@outlook.com', vehicle: 'Subaru Forester', reg: 'KDD 789C', year: '2017', mileage: '156,800 km', status: 'Waiting for parts', complaint: 'Clutch slipping, hard gear changes', diagnosis: 'Clutch worn, flywheel heat damage — awaiting parts from supplier', parts: [
    { name: 'Clutch Kit', qty: '1', unit: 25000, amount: 25000 }, { name: 'Transmission Oil', qty: '1', unit: 2500, amount: 2500 },
    { name: 'Flywheel', qty: '1', unit: 9000, amount: 9000 }, { name: 'Gasket Set', qty: '1', unit: 1500, amount: 1500 } ], labour: 3500, consumables: 500, assigned: 'Peter Wambui', note: 'Parts awaited from BrakePro KE — chase supplier daily.' },
  { id: 'SG360-000122', date: TODAY, customer: 'Mary Achieng', initials: 'MA', phone: '0798 445 122', email: 'mary.achieng@gmail.com', vehicle: 'Toyota Probox', reg: 'KCF 321D', year: '2014', mileage: '201,120 km', status: 'Diagnosis', complaint: 'Engine misfire and rough idle', diagnosis: 'Spark plugs fouled, air filter clogged — pending owner approval', parts: [
    { name: 'Spark Plugs', qty: '4', unit: 500, amount: 2000 }, { name: 'Air Filter', qty: '1', unit: 800, amount: 800 } ], labour: 5000, consumables: 700, assigned: 'Joyce Njeri', note: 'Awaiting owner approval on spark plugs before ordering.' },
]

const seedStock: StockItem[] = [
  { partNo: 'EO-5W30-4L', name: 'Engine Oil 5W-30', supplier: 'AutoParts KE', buy: 3100, sell: 4000, qty: 16, unit: 'L', location: 'Shelf A1', min: 10 },
  { partNo: 'OF-TY-001', name: 'Oil Filter', supplier: 'MotorHub Nairobi', buy: 550, sell: 800, qty: 9, unit: '', location: 'Shelf A2', min: 5 },
  { partNo: 'BP-TY-AX-15', name: 'Front Brake Pads', supplier: 'BrakePro KE', buy: 2100, sell: 2800, qty: 5, unit: '', location: 'Shelf B4', min: 8 },
  { partNo: 'BD-TY-AX-15', name: 'Brake Discs', supplier: 'BrakePro KE', buy: 5800, sell: 7500, qty: 2, unit: '', location: 'Shelf B5', min: 4 },
  { partNo: 'SP-NGK-04', name: 'Spark Plugs', supplier: 'NGK Kenya', buy: 350, sell: 500, qty: 24, unit: '', location: 'Shelf C1', min: 10 },
  { partNo: 'CK-TY-001', name: 'Clutch Kit', supplier: 'ClutchPro KE', buy: 18000, sell: 25000, qty: 1, unit: '', location: 'Shelf C2', min: 2 },
  { partNo: 'BF-001', name: 'Brake Fluid', supplier: 'AutoParts KE', buy: 350, sell: 500, qty: 3, unit: 'L', location: 'Shelf B6', min: 4 },
  { partNo: 'WB-UNI-01', name: 'Wiper Blades', supplier: 'MotorHub Nairobi', buy: 250, sell: 450, qty: 0, unit: '', location: 'Shelf D1', min: 5 },
  { partNo: 'AF-TY-002', name: 'Air Filter', supplier: 'MotorHub Nairobi', buy: 600, sell: 800, qty: 0, unit: '', location: 'Shelf D2', min: 5 },
]

const seedInvoices: Invoice[] = [
  { id: 'INV-000125', customer: 'John Kamau', vehicle: 'KDA 123A', date: TODAY, total: 15000, paid: 15000 },
  { id: 'INV-000120', customer: 'Peter Mwangi', vehicle: 'KDG 681E', date: TODAY, total: 30000, paid: 30000 },
  { id: 'INV-000121', customer: 'Esther Nyambura', vehicle: 'KDH 204F', date: TODAY, total: 22500, paid: 22500 },
  { id: 'INV-000124', customer: 'Grace Wanjiru', vehicle: 'KCB 456B', date: '12 Aug 2024', total: 28500, paid: 14000 },
  { id: 'INV-000119', customer: 'Brian Kimathi', vehicle: 'KDL 775G', date: '13 Aug 2024', total: 10000, paid: 10000 },
  { id: 'INV-000118', customer: 'John Kamau', vehicle: 'KDA 123A', date: '13 Aug 2024', total: 15000, paid: 15000 },
  { id: 'INV-000123', customer: 'Samuel Otieno', vehicle: 'KDD 789C', date: '10 Aug 2024', total: 42000, paid: 0 },
  { id: 'INV-000122', customer: 'Mary Achieng', vehicle: 'KCF 321D', date: '08 Aug 2024', total: 8500, paid: 500 },
]

const seedReminders: Reminder[] = [
  { id: 'REM-004', text: 'Vehicle ready for collection', customer: 'Grace Wanjiru', vehicle: 'KCB 456B', due: 'Today, 4:30 PM', channel: 'WhatsApp', sent: false },
  { id: 'REM-003', text: 'Service due', customer: 'Peter Mwangi', vehicle: 'KDG 681E', due: 'Tomorrow', channel: 'SMS', sent: false },
  { id: 'REM-002', text: 'Payment follow-up', customer: 'Mary Achieng', vehicle: 'KCF 321D', due: 'Overdue by 2 days', channel: 'WhatsApp', sent: false },
  { id: 'REM-001', text: 'Upcoming appointment', customer: 'John Kamau', vehicle: 'KDA 123A', due: '18 Aug 2024', channel: 'SMS', sent: false },
]

const seedCustomers: Customer[] = [
  { name: 'John Kamau', initials: 'JK', phone: '0712 345 678', vehicles: '2 vehicles', spent: 86500, outstanding: 0, lastService: 'Today' },
  { name: 'Grace Wanjiru', initials: 'GW', phone: '0722 111 909', vehicles: '1 vehicle', spent: 142000, outstanding: 28500, lastService: '12 Aug 2024' },
  { name: 'Samuel Otieno', initials: 'SO', phone: '0701 889 321', vehicles: '1 vehicle', spent: 64200, outstanding: 42000, lastService: '10 Aug 2024' },
  { name: 'Mary Achieng', initials: 'MA', phone: '0798 445 122', vehicles: '3 vehicles', spent: 203800, outstanding: 8000, lastService: '08 Aug 2024' },
  { name: 'Peter Mwangi', initials: 'PM', phone: '0715 220 876', vehicles: '2 vehicles', spent: 51400, outstanding: 0, lastService: '02 Aug 2024' },
  { name: 'Esther Nyambura', initials: 'EN', phone: '0733 990 445', vehicles: '1 vehicle', spent: 22500, outstanding: 0, lastService: TODAY },
  { name: 'Brian Kimathi', initials: 'BK', phone: '0740 123 558', vehicles: '1 vehicle', spent: 18000, outstanding: 0, lastService: '13 Aug 2024' },
]

const seedVehicles: Vehicle[] = [
  { reg: 'KDA 123A', makeModel: 'Toyota Axio', year: '2015', owner: 'John Kamau', mileage: '124,560 km', lastService: 'Today' },
  { reg: 'KCB 456B', makeModel: 'Nissan X-Trail', year: '2018', owner: 'Grace Wanjiru', mileage: '98,240 km', lastService: '12 Aug 2024' },
  { reg: 'KDD 789C', makeModel: 'Subaru Forester', year: '2017', owner: 'Samuel Otieno', mileage: '156,800 km', lastService: '10 Aug 2024' },
  { reg: 'KCF 321D', makeModel: 'Toyota Probox', year: '2014', owner: 'Mary Achieng', mileage: '201,120 km', lastService: '08 Aug 2024' },
  { reg: 'KDG 681E', makeModel: 'Mazda Demio', year: '2019', owner: 'Peter Mwangi', mileage: '74,500 km', lastService: '02 Aug 2024' },
  { reg: 'KDH 204F', makeModel: 'Toyota RAV4', year: '2021', owner: 'Esther Nyambura', mileage: '41,200 km', lastService: TODAY },
  { reg: 'KDL 775G', makeModel: 'Honda Fit', year: '2020', owner: 'Brian Kimathi', mileage: '62,000 km', lastService: '13 Aug 2024' },
]

const seedData: DemoData = {
  jobs: seedJobs, customers: seedCustomers, vehicles: seedVehicles,
  stock: seedStock, invoices: seedInvoices, reminders: seedReminders,
  profile: { workshop: 'SmartGarage 360 Demo Garage', phone: '0712 000 360', location: 'Warehouse Road, Industrial Area, Nairobi', currency: 'Kenyan Shilling (KSh)' },
}

// ---- derived stats ----------------------------------------------------------
const completedCount = (d: DemoData) => d.jobs.filter(j => j.status === 'Completed' || j.status === 'Delivered').length
const activeCount = (d: DemoData) => d.jobs.filter(j => !['Completed', 'Delivered'].includes(j.status)).length
const waitingPartsCount = (d: DemoData) => d.jobs.filter(j => j.status === 'Waiting for parts').length
const readyForCollection = (d: DemoData) => d.jobs.filter(j => j.status === 'Completed').length
const lowStockCount = (d: DemoData) => d.stock.filter(s => s.qty > 0 && s.qty <= s.min).length
const outStockCount = (d: DemoData) => d.stock.filter(s => s.qty === 0).length
const outstandingTotal = (d: DemoData) => d.invoices.reduce((s, i) => s + (i.total - i.paid), 0)
const openInvoices = (d: DemoData) => d.invoices.filter(i => i.total - i.paid > 0).length
const revenueTotal = (d: DemoData) => d.invoices.reduce((s, i) => s + i.paid, 0)
const revenueToday = (d: DemoData) => d.invoices.filter(i => i.date === TODAY).reduce((s, i) => s + i.paid, 0)
const paidTodayCount = (d: DemoData) => d.invoices.filter(i => i.paid >= i.total && i.date === TODAY).length
const labourTotal = (d: DemoData) => d.jobs.reduce((s, j) => s + j.labour, 0)
const vehiclesToday = (d: DemoData) => d.jobs.filter(j => j.date === TODAY).length
const remindersDue = (d: DemoData) => d.reminders.filter(r => !r.sent).length
const jobPartsTotal = (j: Job) => j.parts.reduce((s, p) => s + p.amount, 0)
const jobTotal = (j: Job) => jobPartsTotal(j) + j.labour + j.consumables

function stockScore(d: DemoData) {
  const total = d.stock.length || 1
  const healthy = d.stock.filter(s => s.qty > s.min).length
  return Math.round((healthy / total) * 100)
}

// ---- store ------------------------------------------------------------------
type NewJob = { customer: string; vehicle: string; reg: string; complaint: string; amount: number }

type Demo = {
  state: DemoData
  createJob: (input: NewJob) => string
  advanceJob: (id: string) => void
  generateInvoice: (jobId: string) => void
  addPartToJob: (jobId: string, part: Part) => void
  recordPayment: (invId: string) => void
  addInvoice: (inv: { customer: string; vehicle: string; total: number }) => void
  sendReminder: (id: string) => void
  addReminder: (r: Omit<Reminder, 'id' | 'sent'>) => void
  adjustStock: (partNo: string, delta: number) => void
  addStock: (s: StockItem) => void
  addCustomer: (c: { name: string; phone: string }) => void
  addVehicle: (v: Omit<Vehicle, 'lastService'>) => void
  updateJobNote: (jobId: string, note: string) => void
  saveProfile: (p: Profile) => void
  reset: () => void
}

const STORAGE_KEY = 'smartgarage-360-demo-v3'

function useGarageDemo(): Demo {
  const [state, setState] = useState<DemoData>(seedData)
  const [ready, setReady] = useState(false)
  const ref = useRef(state)
  ref.current = state

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY)
      if (saved) setState({ ...seedData, ...JSON.parse(saved) })
    } catch { /* ignore corrupt state */ }
    setReady(true)
  }, [])
  useEffect(() => { if (ready) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state)) }, [state, ready])

  const set = (next: DemoData) => setState(next)

  const createJob = (input: NewJob) => {
    const d = ref.current
    const n = nextSeq(d.jobs.map(j => j.id))
    const id = 'SG360-' + String(n).padStart(6, '0')
    const job: Job = {
      id, date: TODAY, customer: input.customer, initials: initialsOf(input.customer), phone: '', email: '',
      vehicle: input.vehicle, reg: input.reg, year: '—', mileage: '—', status: 'Received',
      complaint: input.complaint, diagnosis: 'Pending diagnosis', parts: [], labour: Math.max(0, input.amount), consumables: 0, assigned: 'Peter Wambui', note: 'No internal notes yet',
    }
    set({ ...d, jobs: [job, ...d.jobs] })
    return id
  }

  const advanceJob = (id: string) => {
    const d = ref.current
    const jobs = d.jobs.map(j => {
      if (j.id !== id) return j
      const i = STAGES.indexOf(j.status)
      if (i >= STAGES.length - 1) return j
      return { ...j, status: STAGES[i + 1] }
    })
    let invoices = d.invoices
    const job = jobs.find(j => j.id === id)
    if (job && job.status === 'Completed') {
      const invId = invIdForJob(job.id)
      if (!invoices.some(i => i.id === invId)) {
        invoices = [{ id: invId, customer: job.customer, vehicle: job.reg, date: TODAY, total: jobTotal(job), paid: 0 }, ...invoices]
      }
    }
    set({ ...d, jobs, invoices })
  }

  const generateInvoice = (jobId: string) => {
    const d = ref.current
    const job = d.jobs.find(j => j.id === jobId)
    if (!job) return
    const invId = invIdForJob(jobId)
    if (d.invoices.some(i => i.id === invId)) return
    set({ ...d, invoices: [{ id: invId, customer: job.customer, vehicle: job.reg, date: TODAY, total: jobTotal(job), paid: 0 }, ...d.invoices] })
  }

  const addPartToJob = (jobId: string, part: Part) => {
    const d = ref.current
    set({ ...d, jobs: d.jobs.map(j => j.id === jobId ? { ...j, parts: [...j.parts, part] } : j) })
  }

  const recordPayment = (invId: string) => {
    const d = ref.current
    set({ ...d, invoices: d.invoices.map(i => i.id === invId ? { ...i, paid: i.total } : i) })
  }

  const addInvoice = (inv: { customer: string; vehicle: string; total: number }) => {
    const d = ref.current
    const n = nextSeq(d.invoices.map(i => i.id))
    set({ ...d, invoices: [{ id: 'INV-' + String(n).padStart(6, '0'), date: TODAY, paid: 0, ...inv }, ...d.invoices] })
  }

  const sendReminder = (id: string) => {
    const d = ref.current
    set({ ...d, reminders: d.reminders.map(r => r.id === id ? { ...r, sent: true } : r) })
  }

  const addReminder = (r: Omit<Reminder, 'id' | 'sent'>) => {
    const d = ref.current
    const n = nextSeq(d.reminders.map(x => x.id))
    set({ ...d, reminders: [{ id: 'REM-' + String(n).padStart(3, '0'), sent: false, ...r }, ...d.reminders] })
  }

  const adjustStock = (partNo: string, delta: number) => {
    const d = ref.current
    set({ ...d, stock: d.stock.map(s => s.partNo === partNo ? { ...s, qty: Math.max(0, s.qty + delta) } : s) })
  }

  const addStock = (s: StockItem) => {
    const d = ref.current
    set({ ...d, stock: [s, ...d.stock] })
  }

  const addCustomer = (c: { name: string; phone: string }) => {
    const d = ref.current
    set({ ...d, customers: [{ name: c.name, initials: initialsOf(c.name), phone: c.phone, vehicles: '0 vehicles', spent: 0, outstanding: 0, lastService: '—' }, ...d.customers] })
  }

  const addVehicle = (v: Omit<Vehicle, 'lastService'>) => {
    const d = ref.current
    set({ ...d, vehicles: [{ ...v, lastService: '—' }, ...d.vehicles] })
  }

  const saveProfile = (p: Profile) => set({ ...ref.current, profile: p })
  const updateJobNote = (jobId: string, note: string) => {
    const d = ref.current
    set({ ...d, jobs: d.jobs.map(j => j.id === jobId ? { ...j, note } : j) })
  }
  const reset = () => set(seedData)

  return { state, createJob, advanceJob, generateInvoice, addPartToJob, recordPayment, addInvoice, sendReminder, addReminder, adjustStock, addStock, addCustomer, addVehicle, updateJobNote, saveProfile, reset }
}

function downloadCSV(filename: string, headers: string[], rows: string[][]) {
  const esc = (v: string) => '"' + v.replace(/"/g, '""') + '"'
  const csv = [headers.map(esc).join(','), ...rows.map(r => r.map(esc).join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

// Minimal dependency-free PDF writer (PDF 1.4 + Helvetica, single byte WinAnsi encoding).
const WIN_ANSI: Record<number, number> = { 128: 0x80, 8216: 0x91, 8217: 0x92, 8220: 0x93, 8221: 0x94, 8226: 0x95, 8211: 0x96, 8212: 0x97 }
const pdfEscape = (s: string) => {
  let out = ''
  for (const ch of s) {
    const code = ch.codePointAt(0)!
    let b = code <= 255 ? code : WIN_ANSI[code] ?? 63
    if (b === 92) out += '\\\\'
    else if (b === 40) out += '\\('
    else if (b === 41) out += '\\)'
    else out += String.fromCharCode(b)
  }
  return out
}
function downloadPDF(filename: string, title: string, headers: string[], rows: string[][]) {
  const W = 612, H = 792, ML = 50, MR = 50, gap = 12
  const cols = Math.max(headers.length, 1)
  const colW = (W - ML - MR - gap * (cols - 1)) / cols
  const f = 8.5, lineH = f + 4, maxLines = 3
  const maxChars = Math.max(2, Math.floor(colW / (f * 0.52)))
  const wrap = (s: string) => {
    const lines: string[] = []
    let cur = ''
    for (const w of String(s).split(/\s+/)) {
      if (cur && (cur + ' ' + w).length > maxChars) { lines.push(cur); cur = w } else cur = cur ? cur + ' ' + w : w
      if (lines.length === maxLines) break
    }
    if (cur && lines.length < maxLines) lines.push(cur)
    if (lines.length > maxLines) lines.length = maxLines
    const last = lines[maxLines - 1]
    if (last && last.length > maxChars) lines[maxLines - 1] = last.slice(0, maxChars - 1) + '…'
    return lines.length ? lines : ['']
  }
  const pages: string[][] = []
  let current: string[] = []
  let y = H - 96
  const newPage = () => { if (current.length) pages.push(current); current = []; y = H - 96 }
  current.push(`BT /F1 15 Tf ${ML} ${H - 70} Td (${pdfEscape(title)}) Tj ET`)
  current.push(`BT /F1 8 Tf ${ML} ${H - 92} Td (${pdfEscape(`SmartGarage 360 · Export · ${TODAY}`)}) Tj ET`)
  const drawRow = (cells: string[], bold: boolean) => {
    const wrapped = cells.map(wrap)
    const height = Math.max(1, ...wrapped.map(l => l.length))
    if (y - height * lineH < 70) newPage()
    const font = bold ? 'F2' : 'F1'
    for (let li = 0; li < height; li++) {
      for (let i = 0; i < cells.length; i++) {
        const text = wrapped[i][li]
        if (!text) continue
        const x = ML + i * (colW + gap)
        current.push(`BT /${font} ${f} Tf ${x.toFixed(1)} ${y.toFixed(1)} Td (${pdfEscape(text)}) Tj ET`)
      }
      y -= lineH
    }
    y -= 4
  }
  if (rows.length) {
    drawRow(headers, true)
    current.push(`q 0.88 0.9 0.92 rg ${ML} ${y} ${W - ML - MR} 0.6 re f Q`)
    y -= 8
    for (const row of rows) drawRow(row.map(String), false)
  } else {
    current.push(`BT /F1 9 Tf ${ML} ${y} Td (${pdfEscape('No records to export.')}) Tj ET`)
  }
  pages.push(current)

  const n = pages.length
  const f1Ref = 3 + n, f2Ref = 4 + n
  const contentRef = (i: number) => 5 + n + i
  let out = '%PDF-1.4\n'
  const offsets: number[] = []
  const emit = (s: string) => { offsets.push(out.length); out += s }
  emit('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n')
  emit(`2 0 obj\n<< /Type /Pages /Kids [${Array.from({ length: n }, (_, i) => `${3 + i} 0 R`).join(' ')}] /Count ${n} >>\nendobj\n`)
  for (let i = 0; i < n; i++) emit(`${3 + i} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Contents ${contentRef(i)} 0 R /Resources << /Font << /F1 ${f1Ref} 0 R /F2 ${f2Ref} 0 R >> >> >>\nendobj\n`)
  emit(`${f1Ref} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n`)
  emit(`${f2Ref} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n`)
  for (let i = 0; i < n; i++) {
    const content = pages[i].join('\n')
    emit(`${contentRef(i)} 0 obj\n<< /Length ${content.length} >>\nstream\n${content}\nendstream\nendobj\n`)
  }
  const xrefStart = out.length
  out += `xref\n0 ${offsets.length + 1}\n0000000000 65535 f \n`
  for (const off of offsets) out += `${String(off).padStart(10, '0')} 00000 n \n`
  out += `trailer\n<< /Size ${offsets.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`
  const bytes = Uint8Array.from(out, c => c.charCodeAt(0))
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }))
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

function ExportButtons({ csv, pdf, notify }: { csv: () => void; pdf: () => void; notify: (m: string) => void }) {
  return <div className="flex gap-2"><button className="secondary-button" onClick={() => { csv(); notify('Exported as CSV.') }}><Download className="size-4" /> CSV</button><button className="secondary-button" onClick={() => { pdf(); notify('Exported as PDF.') }}><FileText className="size-4" /> PDF</button></div>
}

// ---- shared UI --------------------------------------------------------------
function Logo({ light = false }: { light?: boolean }) {
  return <div className="flex items-center gap-3"><div className={cn('brand-mark', light && 'brand-mark-light')}><Cog className="size-5" /><Car className="brand-car size-4" /></div><div><div className={cn('font-semibold tracking-tight', light ? 'text-white' : 'text-slate-900')}>SmartGarage <span className="text-emerald-500">360</span></div><div className={cn('text-[9px] uppercase tracking-[0.22em]', light ? 'text-slate-400' : 'text-slate-400')}>Garage intelligence</div></div></div>
}

function Status({ children, tone = 'green' }: { children: React.ReactNode; tone?: string }) {
  return <span className={cn('status', `status-${tone}`)}><span />{children}</span>
}

const inputCls = 'w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="mb-3 block"><span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</span>{children}</label>
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4 backdrop-blur-sm" onClick={onClose}>
    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl" onClick={e => e.stopPropagation()}>
      <div className="mb-4 flex items-center justify-between"><h3 className="text-base font-bold">{title}</h3><button aria-label="Close" onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100"><X className="size-4" /></button></div>
      {children}
    </div>
  </div>
}

function SubmitRow({ onCancel, children }: { onCancel: () => void; children: React.ReactNode }) {
  return <div className="mt-5 flex items-center justify-end gap-2">{children}<button className="rounded-md border border-slate-200 px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50" onClick={onCancel}>Cancel</button></div>
}

function GlobalSearch({ demo, onClose, openJob, setView }: {
  demo: Demo; onClose: () => void; openJob: (id: string) => void; setView: (v: View) => void
}) {
  const [q, setQ] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    inputRef.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  const query = q.trim().toLowerCase()
  const results = useMemo(() => {
    if (!query) return { jobs: [], customers: [], vehicles: [], invoices: [] } as { jobs: Job[]; customers: Customer[]; vehicles: Vehicle[]; invoices: Invoice[] }
    return {
      jobs: demo.state.jobs.filter(j => `${j.id} ${j.customer} ${j.vehicle} ${j.reg}`.toLowerCase().includes(query)).slice(0, 5),
      customers: demo.state.customers.filter(c => `${c.name} ${c.phone}`.toLowerCase().includes(query)).slice(0, 4),
      vehicles: demo.state.vehicles.filter(v => `${v.reg} ${v.makeModel} ${v.owner}`.toLowerCase().includes(query)).slice(0, 4),
      invoices: demo.state.invoices.filter(i => `${i.id} ${i.customer} ${i.vehicle}`.toLowerCase().includes(query)).slice(0, 4),
    }
  }, [query, demo.state])
  const first = results.jobs[0] || results.customers[0] || results.vehicles[0] || results.invoices[0]
  const total = results.jobs.length + results.customers.length + results.vehicles.length + results.invoices.length
  const openFirst = () => {
    if (!first) return
    onClose()
    if ('status' in first) openJob(first.id)
    else if ('reg' in first) setView('vehicles')
    else if ('spent' in first) setView('customers')
    else setView('invoices')
  }
  const Row = ({ icon, primary, secondary, onClick }: { icon: React.ReactNode; primary: string; secondary: string; onClick: () => void }) => (
    <button className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-emerald-50" onClick={() => { onClose(); onClick() }}><span className="grid size-8 shrink-0 place-items-center rounded-md bg-slate-100 text-slate-500">{icon}</span><span className="min-w-0"><span className="block truncate text-sm font-semibold">{primary}</span><span className="block truncate text-xs text-slate-400">{secondary}</span></span><ChevronRight className="ml-auto size-4 shrink-0 text-slate-300" /></button>
  )
  return <div className="fixed inset-0 z-50 bg-slate-900/40 p-4 backdrop-blur-sm" onClick={onClose}>
    <div className="mx-auto mt-[12vh] w-full max-w-xl rounded-2xl border border-slate-200 bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
      <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3"><Search className="size-4 shrink-0 text-emerald-500" /><input ref={inputRef} placeholder="Search customers, vehicles, job cards, invoices…" value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') openFirst() }} className="w-full py-2 text-sm outline-none" /><button aria-label="Close search" className="text-slate-400 hover:text-slate-600" onClick={onClose}><X className="size-4" /></button></div>
      {!query && <p className="px-4 py-8 text-center text-xs text-slate-400">Type to search your entire garage — customers, vehicles, job cards and invoices.</p>}
      {query && total === 0 && <p className="px-4 py-8 text-center text-xs text-slate-400">No matches for “{q}”.</p>}
      {query && total > 0 && <div className="max-h-[60vh] overflow-auto py-1">
        {results.jobs.length > 0 && <p className="px-4 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">Job cards</p>}{results.jobs.map(j => <Row key={j.id} icon={<ClipboardList className="size-4" />} primary={`${j.id} · ${j.customer}`} secondary={`${j.vehicle} ${j.reg} — ${statusMeta(j.status).label}`} onClick={() => openJob(j.id)} />)}
        {results.customers.length > 0 && <p className="px-4 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">Customers</p>}{results.customers.map(c => <Row key={c.name} icon={<Users className="size-4" />} primary={c.name} secondary={`${c.phone} · ${c.spent > 0 ? ksh(c.spent) : 'New customer'} total spending`} onClick={() => setView('customers')} />)}
        {results.vehicles.length > 0 && <p className="px-4 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">Vehicles</p>}{results.vehicles.map(v => <Row key={v.reg} icon={<Car className="size-4" />} primary={`${v.reg} · ${v.makeModel}`} secondary={`${v.owner} · ${v.mileage}`} onClick={() => setView('vehicles')} />)}
        {results.invoices.length > 0 && <p className="px-4 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">Invoices</p>}{results.invoices.map(i => <Row key={i.id} icon={<FileText className="size-4" />} primary={`${i.id} · ${i.customer}`} secondary={`${ksh(i.total)} · ${i.paid >= i.total ? 'Paid' : 'Balance due'}`} onClick={() => setView('invoices')} />)}
      </div>}
    </div>
  </div>
}

// ---- landing ----------------------------------------------------------------
function Landing({ onDemo }: { onDemo: () => void }) {
  const problems = [{ icon: ClipboardList, title: 'Lost job cards', copy: 'Paper trails disappear. Customer history gets fragmented.' }, { icon: Package, title: 'No inventory tracking', copy: 'Parts go missing while urgent jobs wait on the shelf.' }, { icon: CircleDollarSign, title: 'No revenue visibility', copy: 'Make decisions on instinct instead of real-time numbers.' }]
  const features = [{ tag: '01 / OPERATIONS', title: 'Every repair, beautifully documented.', copy: 'Digital job cards keep your team aligned from check-in to handover. Capture complaints, diagnosis, photos, parts and approvals in one place.', icon: ClipboardCheck }, { tag: '02 / INVENTORY', title: 'Know what is on the shelf.', copy: 'Track stock levels, margins and movement in real time. Get ahead of low-stock surprises before they delay a customer.', icon: Layers3 }, { tag: '03 / CUSTOMER HISTORY', title: 'Build trust that brings them back.', copy: 'Give every vehicle a living service history. Make the next visit personal, proactive and profitable.', icon: Car }]
  return <main className="landing-page">
    <section className="hero-section"><div className="hero-grid" /><div className="hero-glow hero-glow-one" /><div className="hero-glow hero-glow-two" />
      <nav className="landing-nav"><Logo light /><div className="hidden items-center gap-8 text-sm text-slate-300 md:flex"><a href="#problem">The problem</a><a href="#solution">The solution</a><a href="#pricing">Pricing</a></div><button onClick={onDemo} className="landing-nav-cta">Request demo <ArrowRight className="size-4" /></button></nav>
      <div className="hero-content"><div className="hero-copy"><div className="eyebrow"><span className="live-dot" /> Built for Kenya&apos;s garages</div><h1>One System.<br /><span>Every Repair.</span><br />Complete Control.</h1><p>The all-in-one platform for managing garages, job cards, inventory and customers — built for Kenya&apos;s auto repair industry.</p><div className="hero-actions"><button onClick={onDemo} className="button-primary">Request Demo <ArrowRight className="size-4" /></button><a href="#solution" className="button-outline">See how it works <ChevronRight className="size-4" /></a></div><div className="hero-proof"><div className="avatar-stack"><span>JK</span><span>GW</span><span>SO</span><span>+</span></div><div><div className="flex items-center gap-1 text-sm text-white"><Sparkles className="size-3.5 text-emerald-400" /> Trusted by forward-thinking garages</div><div className="text-xs text-slate-500">From Nairobi to Mombasa</div></div></div></div><div className="hero-visual"><div className="garage-scene"><div className="scene-label"><span className="live-dot" /> LIVE WORKSHOP VIEW</div><div className="garage-lights"><i /><i /><i /></div><div className="car-illustration"><div className="car-roof" /><div className="car-body"><div className="car-window window-left" /><div className="car-window window-right" /><div className="car-wheel wheel-left" /><div className="car-wheel wheel-right" /><div className="car-headlight" /></div></div><div className="scene-data scene-data-left"><Gauge className="size-4 text-emerald-400" /><div><b>15</b><small>vehicles today</small></div></div><div className="scene-data scene-data-right"><TrendingUp className="size-4 text-emerald-400" /><div><b>+24.8%</b><small>revenue this week</small></div></div><div className="scene-floor" /></div></div></div>
      <div className="scroll-cue"><span>Scroll to explore</span><div /></div>
    </section>
    <section id="problem" className="problem-section section-dark"><div className="section-kicker">THE OLD WAY OF WORKING</div><h2>Running a garage shouldn&apos;t<br /><span>feel like a guessing game.</span></h2><p className="section-intro">Great mechanics deserve better systems. SmartGarage 360 replaces the chaos with a clear, connected view of your entire operation.</p><div className="problem-grid">{problems.map((item) => <div className="problem-card" key={item.title}><div className="problem-icon"><item.icon className="size-5" /></div><h3>{item.title}</h3><p>{item.copy}</p><ArrowRight className="size-4 text-slate-600" /></div>)}</div></section>
    <section id="solution" className="solution-section"><div className="section-kicker">THE SMARTGARAGE DIFFERENCE</div><h2>Clarity at every <span>turn.</span></h2><p className="section-intro">One connected system that moves at the speed of your workshop.</p><div className="feature-list">{features.map((item, index) => <div className={cn('feature-row', index % 2 && 'feature-row-reverse')} key={item.title}><div className="feature-copy"><div className="feature-tag">{item.tag}</div><h3>{item.title}</h3><p>{item.copy}</p><a href="#demo" onClick={onDemo}>Explore feature <ArrowRight className="size-4" /></a></div><div className="feature-mock"><div className="mock-top"><span><item.icon className="size-4 text-emerald-500" /> {index === 0 ? 'Digital Job Card' : index === 1 ? 'Inventory health' : 'Vehicle history'}</span><MoreHorizontal className="size-4 text-slate-400" /></div>{index === 0 && <div className="mock-job"><div className="mock-line long" /><div className="mock-line short" /><div className="mock-check-row"><Check className="size-3" /> Engine mount replacement <b>KSh 3,500</b></div><div className="mock-check-row"><Check className="size-3" /> Front brake pads <b>KSh 2,800</b></div><div className="mock-total">Total <strong>KSh 15,000</strong></div></div>}{index === 1 && <div className="mock-bars"><div><span>Engine Oil 5W-30</span><i style={{ width: '82%' }} /><small>16L</small></div><div><span>Oil Filter</span><i style={{ width: '58%' }} /><small>9</small></div><div><span>Brake Pads</span><i className="bar-amber" style={{ width: '30%' }} /><small>5</small></div><div><span>Brake Discs</span><i className="bar-red" style={{ width: '12%' }} /><small>2</small></div></div>}{index === 2 && <div className="mock-history"><div className="history-car"><Car className="size-8 text-emerald-500" /><div><b>Toyota Axio</b><small>KDA 123A · 124,560 km</small></div></div><div className="history-line"><span>Today</span><b>Engine service</b><em>Completed</em></div><div className="history-line"><span>Mar 2024</span><b>Brake service</b><em>Completed</em></div><div className="history-line"><span>Sep 2023</span><b>Full service</b><em>Completed</em></div></div>}</div></div>)}</div></section>
    <section className="preview-section section-dark"><div className="section-kicker">A BETTER COMMAND CENTRE</div><h2>Your garage, <span>in focus.</span></h2><p className="section-intro">See the numbers that matter. Make the decisions that move your business forward.</p><div className="dashboard-preview"><div className="preview-sidebar"><Logo light /><div className="preview-nav">{navItems.slice(0, 6).map((n, i) => <span className={i === 0 ? 'active' : ''} key={n.id}><n.icon className="size-3.5" />{n.label}</span>)}</div></div><div className="preview-main"><div className="preview-header"><div><small>Wednesday, 14 August 2024</small><b>Good morning, Peter</b></div><div className="preview-avatar">PW</div></div><div className="preview-stats">{[['15', 'Vehicles received'], ['6', 'Jobs in progress'], ['KSh 67.5K', 'Today&apos;s revenue'], ['6', 'Low-stock parts']].map((s, i) => <div key={s[1]}><small>{s[1]}</small><b>{s[0]}</b><span className={i === 3 ? 'warn' : ''}>{i === 3 ? 'Needs attention' : '+12.5% vs yesterday'}</span></div>)}</div><div className="preview-chart"><div className="chart-title"><b>Revenue overview</b><small>Last 7 days <ChevronRight className="size-3" /></small></div><svg viewBox="0 0 700 130" preserveAspectRatio="none"><path d="M0,112 C55,100 70,106 115,83 S180,98 225,75 S290,80 335,88 S400,50 450,57 S515,48 560,35 S630,48 700,14" fill="none" stroke="currentColor" strokeWidth="3" /><path d="M0,112 C55,100 70,106 115,83 S180,98 225,75 S290,80 335,88 S400,50 450,57 S515,48 560,35 S630,48 700,14 V130 H0Z" fill="currentColor" opacity=".08" /></svg></div></div></div></section>
    <section className="workflow-section"><div className="section-kicker">TRUSTED WORKFLOW</div><h2>From keys in to <span>keys out.</span></h2><div className="workflow-line">{['Received', 'Diagnosis', 'Repair', 'Quality check', 'Completed', 'Delivered'].map((step, i) => <div className="workflow-step" key={step}><div className={cn('workflow-dot', i < 5 && 'done')}>{i < 5 ? <Check className="size-4" /> : <Car className="size-4" />}</div><b>{step}</b><small>{i === 0 ? '08:42 AM' : i === 1 ? '09:15 AM' : i === 2 ? '10:30 AM' : i === 3 ? '02:20 PM' : i === 4 ? '03:10 PM' : 'Pending'}</small></div>)}</div></section>
    <section id="pricing" className="pricing-section section-dark"><div className="section-kicker">SIMPLE, TRANSPARENT PRICING</div><h2>Start small. <span>Scale smart.</span></h2><div className="pricing-grid">{[{ name: 'Starter', price: '2,500', desc: 'For independent mechanics finding their flow.', features: ['1 workshop location', 'Digital job cards', 'Customer & vehicle records', 'Basic reports'] }, { name: 'Growing Garage', price: '6,500', desc: 'For busy workshops ready for control.', features: ['Everything in Starter', 'Inventory management', 'Invoices & M-Pesa tracking', 'Advanced reports', 'Team access'], popular: true }, { name: 'Enterprise Garage', price: '14,500', desc: 'For multi-bay operations built to lead.', features: ['Everything in Growing', 'Multi-location support', 'Role-based permissions', 'Priority support'] }].map(t => <div className={cn('price-card', t.popular && 'popular')} key={t.name}>{t.popular && <div className="popular-label">MOST POPULAR</div>}<h3>{t.name}</h3><p>{t.desc}</p><div className="price"><span>KSh</span>{t.price}<small>/ month</small></div><button onClick={onDemo}>{t.popular ? 'Get started' : 'Request demo'} <ArrowRight className="size-4" /></button><div className="price-features">{t.features.map(f => <span key={f}><Check className="size-4 text-emerald-500" />{f}</span>)}</div></div>)}</div></section>
    <footer className="landing-footer"><Logo light /><div className="flex items-center gap-2 text-sm text-slate-500"><MapPin className="size-4 text-emerald-500" /> Nairobi, Kenya</div><div className="text-xs text-slate-600">© 2026 SmartGarage 360. All rights reserved. Powered by SmartGarage 360.</div></footer>
  </main>
}

function Login({ onLogin, onBack }: { onLogin: (role: Role) => void; onBack: () => void }) {
  const [role, setRole] = useState<Role>('Owner')
  return <main className="login-page"><div className="login-glow" /><div className="login-card"><button onClick={onBack} className="back-link"><ArrowRight className="size-4 rotate-180" /> Back to website</button><Logo light /><div className="login-heading"><div className="eyebrow"><span className="live-dot" /> Demo workspace</div><h1>Welcome back.</h1><p>Choose a workspace view for this presentation.</p></div><label>Email address<input defaultValue="peter@smartgarage.co.ke" type="email" /></label><label>Password<input defaultValue="••••••••••••" type="password" /></label><label>Role<select value={role} onChange={e => setRole(e.target.value as Role)}><option>Owner</option><option>Manager</option><option>Mechanic</option><option>Receptionist</option><option>Accountant</option></select></label><button className="login-button" onClick={() => onLogin(role)}>Enter as {role} <ArrowRight className="size-4" /></button><div className="demo-garage"><MapPin className="size-4 text-emerald-500" /><div><b>SmartGarage 360 Demo Garage</b><span>Warehouse Road, Industrial Area, Nairobi</span></div></div></div></main>
}

// ---- app shell --------------------------------------------------------------
function AppShell({ demo, view, setView, role, onLogout, openJob, activeJobId, setActiveJobId, openModal, notify }: {
  demo: Demo; view: View; setView: (v: View) => void; role: Role; onLogout: () => void
  openJob: (id: string) => void; activeJobId: string | null; setActiveJobId: (id: string | null) => void
  openModal: (v: View) => void; notify: (m: string) => void
}) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  useEffect(() => {
    if (!profileOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setProfileOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [profileOpen])
  const activeJob = activeJobId ? demo.state.jobs.find(j => j.id === activeJobId) : undefined
  return <div className="app-shell"><aside className={cn('app-sidebar', mobileOpen && 'open')}><div className="sidebar-head"><Logo /><button className="mobile-close" onClick={() => setMobileOpen(false)}><X className="size-5" /></button></div><div className="workspace-switch"><div className="workspace-avatar">SG</div><div><b>SmartGarage 360</b><span>Demo Garage <ChevronRight className="size-3" /></span></div></div><nav className="app-nav">{navItems.map(item => <button key={item.id} onClick={() => { setView(item.id); setActiveJobId(null); setMobileOpen(false) }} className={cn(view === item.id && 'active')}><item.icon className="size-[18px]" />{item.label}{item.id === 'reminders' && <em>{remindersDue(demo.state)}</em>}</button>)}</nav><div className="sidebar-bottom"><div className="help-card"><Sparkles className="size-4 text-emerald-500" /><b>Need a hand?</b><span>Visit our help centre</span></div><button onClick={onLogout} className="user-row"><div className="user-avatar">PW</div><div><b>Peter Wambui</b><span>Garage owner</span></div><MoreHorizontal className="ml-auto size-4 text-slate-400" /></button></div></aside>{mobileOpen && <button aria-label="Close menu" className="sidebar-overlay" onClick={() => setMobileOpen(false)} />}<div className="app-content"><header className="app-header"><button className="mobile-menu" onClick={() => setMobileOpen(true)}><Menu className="size-5" /></button><div className="header-title"><span>Wednesday, 14 August 2024</span><h1>{navItems.find(n => n.id === view)?.label}</h1></div><div className="header-actions"><button aria-label="Search" className="icon-button" onClick={() => { setSearchOpen(true); setMobileOpen(false) }}><Search className="size-4" /></button><button aria-label="Notifications" className="icon-button notification" onClick={() => { setView('reminders'); setMobileOpen(false) }}><Bell className="size-4" /><i /></button><div className="header-user-wrap relative"><button aria-label="Profile menu" className="header-user border-0 bg-transparent cursor-pointer" onClick={() => { setProfileOpen(v => !v); setMobileOpen(false) }}><div className="user-avatar">PW</div><div><b>Peter Wambui</b><span>{role}</span></div><ChevronRight className={cn('size-4 rotate-90 text-slate-400 transition-transform', profileOpen && '-rotate-90')} /></button>{profileOpen && <><button aria-label="Close profile menu" className="fixed inset-0 z-40 cursor-default" onClick={() => setProfileOpen(false)} /><div className="absolute right-0 top-[calc(100%+10px)] z-50 w-56 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl"><p className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">Signed in as</p><div className="px-2 pb-2"><b className="block text-xs">Peter Wambui</b><span className="block text-[10px] text-slate-500">{role} · SmartGarage 360 Demo Garage</span></div><div className="my-1 border-t border-slate-100" /><button className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-xs font-semibold hover:bg-slate-50" onClick={() => { setProfileOpen(false); setView('settings') }}><Settings className="size-3.5 text-slate-500" /> My profile & settings</button><button className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-xs font-semibold text-red-600 hover:bg-red-50" onClick={() => { setProfileOpen(false); onLogout() }}><LogOut className="size-3.5" /> Log out</button></div></>}</div></div></header><main className="app-main">
      {view === 'dashboard' && <div className="app-dashboard-host"><Dashboard demo={demo} role={role} setView={setView} openJob={openJob} openModal={openModal} notify={notify} /></div>}
      {view === 'job-cards' && (activeJob
        ? <JobCardView job={activeJob} demo={demo} setView={setView} onBack={() => setActiveJobId(null)} notify={notify} />
        : <JobCardsView demo={demo} onOpen={openJob} openModal={openModal} notify={notify} />)}
      {view === 'reports' && <Reports demo={demo} setView={setView} notify={notify} />}
      {view === 'settings' && <SettingsView demo={demo} notify={notify} />}
      {['customers', 'vehicles', 'inventory', 'invoices', 'reminders'].includes(view) && <GenericView view={view as 'customers' | 'vehicles' | 'inventory' | 'invoices' | 'reminders'} demo={demo} openModal={openModal} notify={notify} />}
    </main></div>{searchOpen && <GlobalSearch demo={demo} onClose={() => setSearchOpen(false)} openJob={openJob} setView={setView} />}</div>
}

// ---- dashboard --------------------------------------------------------------
function Dashboard({ demo, role, setView, openJob, openModal, notify }: {
  demo: Demo; role: Role; setView: (v: View) => void; openJob: (id: string) => void; openModal: (v: View) => void; notify: (m: string) => void
}) {
  const info = roleInfo[role]
  const d = demo.state
  const metrics: { num: string; label: string; change: string; tone: string; icon: typeof Gauge }[] = (() => {
    switch (role) {
      case 'Owner': return [
        { num: ksh(revenueToday(d)), label: 'Today\u2019s revenue', change: '+24.8%', tone: 'green', icon: CircleDollarSign },
        { num: ksh(outstandingTotal(d)), label: 'Outstanding payments', change: `${openInvoices(d)} invoices`, tone: 'red', icon: CreditCard },
        { num: String(lowStockCount(d) + outStockCount(d)), label: 'Low-stock parts', change: 'Needs attention', tone: 'amber', icon: Package },
        { num: String(completedCount(d)), label: 'Jobs completed', change: '+18.4%', tone: 'green', icon: CheckCircle2 },
      ]
      case 'Manager': return [
        { num: String(vehiclesToday(d)), label: 'Vehicles received today', change: '+12.5%', tone: 'blue', icon: Car },
        { num: String(activeCount(d)), label: 'Jobs in progress', change: '+8.2%', tone: 'purple', icon: Wrench },
        { num: String(waitingPartsCount(d)), label: 'Waiting for parts', change: 'Needs attention', tone: 'amber', icon: Clock3 },
        { num: String(lowStockCount(d) + outStockCount(d)), label: 'Low-stock parts', change: 'Needs attention', tone: 'amber', icon: Package },
      ]
      case 'Mechanic': return [
        { num: String(d.jobs.filter(j => j.status !== 'Delivered').length), label: 'Jobs assigned today', change: '2 due soon', tone: 'blue', icon: ClipboardList },
        { num: String(d.jobs.filter(j => j.status === 'Quality check').length), label: 'Quality checks', change: 'Ready', tone: 'green', icon: ShieldCheck },
        { num: String(completedCount(d)), label: 'Tasks completed', change: 'This week', tone: 'green', icon: CheckCircle2 },
        { num: String(waitingPartsCount(d)), label: 'Parts to collect', change: 'From stores', tone: 'amber', icon: Package },
      ]
      case 'Receptionist': return [
        { num: String(vehiclesToday(d)), label: 'Vehicles received today', change: '4 arrivals next', tone: 'blue', icon: Car },
        { num: String(remindersDue(d)), label: 'Reminders due', change: 'Send now', tone: 'amber', icon: Bell },
        { num: String(readyForCollection(d)), label: 'Vehicles ready', change: 'Collection', tone: 'green', icon: Clock3 },
        { num: ksh(outstandingTotal(d)), label: 'Payments to follow up', change: `${openInvoices(d)} customers`, tone: 'red', icon: CreditCard },
      ]
      case 'Accountant': return [
        { num: ksh(revenueToday(d)), label: 'Today\u2019s revenue', change: '+24.8%', tone: 'green', icon: CircleDollarSign },
        { num: ksh(outstandingTotal(d)), label: 'Outstanding balance', change: `${openInvoices(d)} invoices`, tone: 'red', icon: CreditCard },
        { num: String(paidTodayCount(d)), label: 'Paid in full today', change: `${paidTodayCount(d)} invoices`, tone: 'green', icon: CheckCircle2 },
        { num: ksh(labourTotal(d)), label: 'Labour income', change: 'All jobs', tone: 'purple', icon: Wrench },
      ]
    }
  })()
  const score = stockScore(d)
  const inventoryList = [['Healthy stock', lowStockCount(d) > 0 ? String(d.stock.length - lowStockCount(d) - outStockCount(d)) : String(d.stock.length), 'green'], ['Low stock', String(lowStockCount(d)), 'amber'], ['Out of stock', String(outStockCount(d)), 'red']] as [string, string, string][]
  return <div className="dashboard-view"><div className="welcome-row"><div><p className="page-kicker">{role.toUpperCase()} WORKSPACE</p><h2>{info.title} <span className="wave">✦</span></h2><p>{info.welcome}</p></div><div className="quick-actions"><label className="dashboard-role-switcher">Role<select value={role} onChange={e => window.dispatchEvent(new CustomEvent('smartgarage-role', { detail: e.target.value }))}><option>Owner</option><option>Manager</option><option>Mechanic</option><option>Receptionist</option><option>Accountant</option></select></label><ExportButtons csv={() => downloadCSV('jobs.csv', ['Job card', 'Customer', 'Vehicle', 'Status', 'Amount', 'Assigned'], d.jobs.map(j => [j.id, j.customer, j.reg, j.status, ksh(jobTotal(j)), j.assigned]))} pdf={() => downloadPDF('jobs.pdf', 'Job Cards — SmartGarage 360', ['Job card', 'Customer', 'Vehicle', 'Status', 'Amount', 'Assigned'], d.jobs.map(j => [j.id, j.customer, j.reg, j.status, ksh(jobTotal(j)), j.assigned]))} notify={notify} /><button onClick={() => { setView('job-cards'); openModal('job-cards') }} className="primary-button"><Plus className="size-4" /> New job card</button></div></div><div className="metric-grid">{metrics.map(m => <div className="metric-card" key={m.label}><div className={cn('metric-icon', `metric-${m.tone}`)}><m.icon className="size-4" /></div><small>{m.label}</small><strong>{m.num}</strong><span className={cn(m.tone === 'amber' || m.tone === 'red' ? 'change-warn' : 'change-up')}>{m.change}</span></div>)}</div><div className="content-grid"><div className="data-card recent-jobs"><div className="card-head"><div><h3>Recent job cards</h3><p>Latest activity from your workshop</p></div><button onClick={() => setView('job-cards')} className="text-button">View all <ArrowRight className="size-4" /></button></div><div className="jobs-table"><div className="table-row table-header"><span>Customer & vehicle</span><span>Status</span><span>Amount</span><span /></div>{d.jobs.slice(0, 5).map((job, i) => <button onClick={() => openJob(job.id)} className="table-row" key={job.id}><span className="customer-cell"><i className={cn('customer-avatar', `avatar-${i}`)}>{job.initials}</i><b>{job.customer}<small>{job.vehicle} · {job.reg}</small></b></span><Status tone={statusMeta(job.status).tone}>{statusMeta(job.status).label}</Status><strong>{ksh(jobTotal(job))}</strong><ChevronRight className="size-4 text-slate-400" /></button>)}</div></div><div className="data-card inventory-alert"><div className="card-head"><div><h3>Inventory health</h3><p>Parts needing attention</p></div><button onClick={() => setView('inventory')} className="icon-button"><ArrowRight className="size-4" /></button></div><div className="inventory-score"><div className="score-ring"><strong>{score}</strong><span>/100</span></div><div><b>{score > 60 ? 'Good shape' : 'Needs attention'}</b><p>Stock levels across {d.stock.length} tracked parts</p></div></div><div className="stock-list">{inventoryList.map(([label, num, dot]) => <div key={label}><span><i className={cn('stock-dot', dot)} /> {label}</span><b>{num} items</b></div>)}</div><button onClick={() => setView('inventory')} className="full-button">Review inventory <ArrowRight className="size-4" /></button></div></div><div className="bottom-grid"><div className="data-card revenue-card"><div className="card-head"><div><h3>Revenue overview</h3><p>Total revenue captured</p></div></div><div className="revenue-value">{ksh(revenueTotal(d))} <span><TrendingUp className="size-3" /> {outstandingTotal(d) > 0 ? 'open invoices' : 'on track'}</span></div><svg className="big-chart" viewBox="0 0 700 150" preserveAspectRatio="none"><path d="M0 124 C35 116 62 122 90 104 S135 106 165 112 S216 82 255 92 S302 68 340 80 S390 48 430 66 S470 55 510 36 S570 52 610 28 S660 35 700 12" /><path className="area" d="M0 124 C35 116 62 122 90 104 S135 106 165 112 S216 82 255 92 S302 68 340 80 S390 48 430 66 S470 55 510 36 S570 52 610 28 S660 35 700 12 V150 H0Z" /></svg><div className="chart-labels"><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Today</span></div></div><div className="data-card reminders-card"><div className="card-head"><div><h3>Today&apos;s reminders</h3><p>Stay ahead of your customers</p></div><button onClick={() => setView('reminders')} className="text-button">View all <ArrowRight className="size-4" /></button></div>{d.reminders.filter(r => !r.sent).slice(0, 3).map((r, i) => <button className="reminder-item cursor-pointer w-full text-left border-0 bg-transparent p-0" onClick={() => setView('reminders')} key={r.id}><div className={cn('reminder-icon', i === 0 ? 'amber' : i === 1 ? 'blue' : 'red')}><Bell className="size-4" /></div><div><b>{r.text}</b><span>{r.customer} · {r.vehicle}</span></div><small>{r.due}</small></button>)}</div></div></div>
}

// ---- job cards --------------------------------------------------------------
function JobCardsView({ demo, onOpen, openModal, notify }: {
  demo: Demo; onOpen: (id: string) => void; openModal: (v: View) => void; notify: (m: string) => void
}) {
  const [query, setQuery] = useState('')
  const d = demo.state
  const rows = useMemo(() => d.jobs.filter(j => `${j.id} ${j.customer} ${j.vehicle} ${j.reg} ${j.status}`.toLowerCase().includes(query.toLowerCase())), [d.jobs, query])
  return <div className="generic-view"><div className="welcome-row"><div><p className="page-kicker">WORKSHOP MANAGEMENT</p><h2>Job Cards</h2><p>Every repair, documented from intake to handover.</p></div><div className="quick-actions"><ExportButtons csv={() => downloadCSV('job-cards.csv', ['Job card', 'Customer', 'Vehicle', 'Status', 'Amount', 'Assigned'], d.jobs.map(j => [j.id, j.customer, j.reg, j.status, ksh(jobTotal(j)), j.assigned]))} pdf={() => downloadPDF('job-cards.pdf', 'Job Cards — SmartGarage 360', ['Job card', 'Customer', 'Vehicle', 'Status', 'Amount', 'Assigned'], d.jobs.map(j => [j.id, j.customer, j.reg, j.status, ksh(jobTotal(j)), j.assigned]))} notify={notify} /><button className="primary-button" onClick={() => openModal('job-cards')}><Plus className="size-4" /> New job card</button></div></div><div className="data-card full-table-card"><div className="list-toolbar"><div className="search-field"><Search className="size-4" /><input id="global-search" placeholder="Search job cards..." value={query} onChange={e => setQuery(e.target.value)} /></div><span className="text-xs text-slate-400">{rows.length} records</span></div><div className="wide-table"><div className="wide-row wide-header" style={{ gridTemplateColumns: '1.3fr 1fr 1fr 1fr 0.9fr 1fr 20px', minWidth: 780 }}><span>Job card</span><span>Customer</span><span>Vehicle</span><span>Status</span><span>Amount</span><span>Assigned</span><span /></div>{rows.map(j => <button className="wide-row" key={j.id} onClick={() => onOpen(j.id)} style={{ gridTemplateColumns: '1.3fr 1fr 1fr 1fr 0.9fr 1fr 20px', minWidth: 780 }}><span className="strong-cell">{j.id}</span><span>{j.customer}</span><span>{j.vehicle} · {j.reg}</span><span><Status tone={statusMeta(j.status).tone}>{statusMeta(j.status).label}</Status></span><span>{ksh(jobTotal(j))}</span><span>{j.assigned}</span><ChevronRight className="size-4 text-slate-300" /></button>)}</div></div></div>
}

function JobCardView({ job, demo, setView, onBack, notify }: {
  job: Job; demo: Demo; setView: (v: View) => void; onBack: () => void; notify: (m: string) => void
}) {
  const [shared, setShared] = useState(false)
  const [addingPart, setAddingPart] = useState(false)
  const [partName, setPartName] = useState('')
  const [partQty, setPartQty] = useState('1')
  const [partAmount, setPartAmount] = useState('')
  const [editNote, setEditNote] = useState(false)
  const [draftNote, setDraftNote] = useState(job.note)
  useEffect(() => { setDraftNote(job.note); setEditNote(false) }, [job.id, job.note])
  const invoice = demo.state.invoices.find(i => i.id === invIdForJob(job.id))
  const done = job.status === 'Completed' || job.status === 'Delivered'
  const stageIndex = STAGES.indexOf(job.status)
  const meta = statusMeta(job.status)
  const partsTotal = jobPartsTotal(job)
  const total = jobTotal(job)
  const balance = invoice ? invoice.total - invoice.paid : total
  const share = () => {
    const text = `SmartGarage 360 job card ${job.id} — ${job.customer}, ${job.vehicle} ${job.reg} (${meta.label}). ${ksh(total)}`
    try { navigator.clipboard?.writeText(text) } catch { /* clipboard unavailable */ }
    setShared(true); notify(`Job card link copied for ${job.customer}.`)
  }
  const advance = () => {
    const next = STAGES[Math.min(stageIndex + 1, STAGES.length - 1)]
    const willCreate = next === 'Completed' && !invoice
    demo.advanceJob(job.id)
    if (next === 'Completed') notify(willCreate ? `Job completed — invoice ${invIdForJob(job.id)} generated and awaiting payment.` : `Job completed — invoice ${invIdForJob(job.id)} is already on file.`)
    else notify(`Sample workflow advanced: ${job.customer}\u2019s ${job.vehicle} → ${next}.`)
  }
  return <div className="job-card-view"><div className="detail-toolbar"><div><p className="page-kicker">JOB CARD</p><h2>{job.id} <Status tone={meta.tone}>{meta.label}</Status></h2></div><div className="quick-actions">
    <button className="text-button" onClick={onBack}><ArrowLeft className="size-4" /> Back to list</button>
    {!done && <button className="secondary-button" onClick={advance}>Advance stage <ArrowRight className="size-4" /></button>}
    <button className="secondary-button" onClick={() => { if (invoice) { setView('invoices'); notify(`Invoice ${invoice.id} already exists for this job.`) } else { demo.generateInvoice(job.id); setView('invoices'); notify(`Invoice ${invIdForJob(job.id)} generated for ${ksh(total)}.`) } }}><Download className="size-4" /> {invoice ? 'View invoice' : 'Generate invoice'}</button>
    <button className="primary-button" onClick={share}><Share2 className="size-4" /> {shared ? 'Link copied' : 'Share job card'}</button>
  </div></div>
    <div className="job-hero-card"><div className="customer-profile"><div className="large-avatar">{job.initials}</div><div><p className="page-kicker">CUSTOMER</p><h3>{job.customer}</h3><div className="contact-line">{job.phone ? <><Phone className="size-3.5" /> {job.phone}</> : <><Phone className="size-3.5" /> 0712 345 678</>}{job.email && <><Mail className="ml-3 size-3.5" /> {job.email}</>}</div><div className="contact-line"><MapPin className="size-3.5" /> Westlands, Nairobi</div></div></div><div className="vehicle-profile"><div className="vehicle-icon"><Car className="size-7" /></div><div><p className="page-kicker">VEHICLE</p><h3>{job.vehicle} <span>{job.reg}</span></h3><div className="contact-line">{job.year} <i /> {job.mileage} <i /> Silver</div></div></div></div>
    <div className="job-timeline-card"><div className="card-head"><div><h3>Job progress</h3><p>{done ? `Completed on ${job.date}` : `Currently: ${meta.label}`}</p></div><Status tone={done ? 'green' : meta.tone}>{done ? 'Ready for collection' : meta.label}</Status></div><div className="job-timeline">{STAGES.map((s, i) => <div className="job-step" key={s}><div className={cn('job-step-dot', i > stageIndex && 'opacity-30')}>{i <= stageIndex ? <Check className="size-3.5" /> : null}</div><div className="job-step-line" /><b>{s}</b><small>{i < stageIndex ? 'done' : i === stageIndex ? 'current' : 'pending'}</small></div>)}</div></div>
    <div className="job-columns"><div className="job-main-column"><div className="data-card"><div className="card-head"><div><h3>Service details</h3><p>What brought this vehicle in</p></div></div><div className="detail-block"><small>Customer complaint</small><p>{job.complaint}</p></div><div className="detail-block"><small>Diagnosis</small><p>{job.diagnosis}</p></div><div className="detail-block"><small>Work completed</small><div className="check-list">{job.parts.map(p => <span key={p.name}><CheckCircle2 className="size-4 text-emerald-500" />{p.name}</span>)}</div></div><div className="assigned-mechanic"><div className="mechanic-avatar">{initialsOf(job.assigned)}</div><div><small>MECHANIC ASSIGNED</small><b>{job.assigned}</b></div><ShieldCheck className="ml-auto size-5 text-emerald-500" /></div></div><div className="data-card parts-card"><div className="card-head"><div><h3>Parts & materials</h3><p>{job.parts.length} items on this job</p></div><button className="text-button" onClick={() => setAddingPart(v => !v)}>{addingPart ? 'Done' : 'Add part'} {addingPart ? <X className="size-4" /> : <Plus className="size-4" />}</button></div>{addingPart && <div className="mb-3 grid grid-cols-[1.5fr_0.6fr_0.8fr_auto] items-end gap-2">{['Part name', 'Qty', 'Amount'].map(l => <span key={l} className="text-[10px] font-bold uppercase text-slate-400">{l}</span>)}<span />{/* placeholder row for header alignment */}<input placeholder="e.g. Air Filter" value={partName} onChange={e => setPartName(e.target.value)} className={inputCls} /><input placeholder="1" value={partQty} onChange={e => setPartQty(e.target.value)} className={inputCls} /><input placeholder="1200" value={partAmount} onChange={e => setPartAmount(e.target.value)} className={inputCls} /><button className="rounded-md bg-emerald-600 px-3 py-2 text-xs font-bold text-white" onClick={() => { const amt = parseInt(partAmount, 10) || 0; const q = parseInt(partQty, 10) || 1; if (!partName || !amt) { notify('Add a part name and amount first.'); return } demo.addPartToJob(job.id, { name: partName, qty: partQty, unit: amt, amount: amt * q }); setPartName(''); setPartQty('1'); setPartAmount(''); setAddingPart(false); notify(`${partName} added to job card.`) }}>Add</button></div>}<div className="parts-table"><div className="parts-row parts-header"><span>Item</span><span>Qty</span><span>Unit price</span><span>Total</span></div>{job.parts.map(r => <div className="parts-row" key={r.name}><span><i className="part-icon"><Wrench className="size-3" /></i>{r.name}</span><span>{r.qty}</span><span>{ksh(r.unit)}</span><b>{ksh(r.amount)}</b></div>)}<div className="parts-total"><span>Parts subtotal</span><b>{ksh(partsTotal)}</b></div></div></div></div><div className="job-side-column"><div className="data-card financial-card"><div className="card-head"><div><h3>Financial summary</h3><p>{invoice ? `Invoice ${invoice.id}` : 'No invoice yet'}</p></div><CreditCard className="size-5 text-emerald-500" /></div><div className="finance-lines"><span>Parts & materials <b>{ksh(partsTotal)}</b></span><span>Labour <b>{ksh(job.labour)}</b></span><span>Workshop consumables <b>{ksh(job.consumables)}</b></span></div><div className="grand-total"><span>Grand total</span><strong>{ksh(total)}</strong></div>{invoice ? (invoice.paid >= invoice.total ? <div className="paid-banner"><CheckCircle2 className="size-5" /><div><b>PAID IN FULL</b><span>Payment received · M-Pesa</span></div></div> : <div className="paid-banner !bg-amber-50 !text-amber-700" style={{ background: '#fff7e6', color: '#b45309' }}><Clock3 className="size-5" /><div><b>BALANCE DUE</b><span>{ksh(balance)} outstanding</span></div></div>) : null}{invoice && <div className="paid-detail"><span>Amount paid <b>{ksh(invoice.paid)}</b></span><span>Balance <b className={invoice.paid >= invoice.total ? 'text-emerald-600' : 'text-red-500'}>{ksh(Math.max(0, balance))}</b></span></div>}</div><div className="data-card note-card"><div className="card-head"><h3>Internal note</h3><button className="text-button" onClick={() => { if (editNote && draftNote !== job.note) { demo.updateJobNote(job.id, draftNote); notify('Internal note saved.') } setEditNote(v => !v) }}>{editNote ? 'Save' : 'Edit'} {editNote ? <Check className="size-4" /> : <MoreHorizontal className="size-4" />}</button></div>{editNote ? <textarea value={draftNote} onChange={e => setDraftNote(e.target.value)} className={cn(inputCls, 'h-20 resize-none')} /> : <p>{job.note}</p>}<div className="note-author"><div className="mechanic-avatar">PW</div><span>Added by Peter · Today, 3:20 PM</span></div></div><div className="next-service"><AlertTriangle className="size-5" /><div><b>Next service due</b><span>At 134,500 km or Feb 2025</span></div></div></div></div></div>
}

// ---- generic tables ---------------------------------------------------------
function GenericView({ view, demo, openModal, notify }: {
  view: 'customers' | 'vehicles' | 'inventory' | 'invoices' | 'reminders'; demo: Demo
  openModal: (v: View) => void; notify: (m: string) => void
}) {
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const d = demo.state

  const config: {
    title: string; desc: string; addLabel: string; headers: string[]
    rows: string[][]; grid: string; csv: () => void
  } = (() => {
    const grid = (n: number, extra = 0) => `minmax(130px,1.3fr) ${Array(Math.max(0, n - 1) + extra).fill('minmax(90px,1fr)').join(' ')} 20px`
    switch (view) {
      case 'customers': {
        const rows = d.customers.filter(c => `${c.name} ${c.phone} ${c.vehicles}`.toLowerCase().includes(q))
        return { title: 'Customers', desc: 'Build lasting relationships with every driver.', addLabel: 'Add customer', headers: ['Customer', 'Phone', 'Vehicles', 'Total spending', 'Outstanding', 'Last service'], grid: grid(6), rows: rows.map(c => [c.name, c.phone, c.vehicles, ksh(c.spent), ksh(c.outstanding), c.lastService]), csv: () => downloadCSV('customers.csv', ['Customer', 'Phone', 'Vehicles', 'Total spending', 'Outstanding', 'Last service'], rows.map(c => [c.name, c.phone, c.vehicles, String(c.spent), String(c.outstanding), c.lastService])) }
      }
      case 'vehicles': {
        const rows = d.vehicles.filter(v => `${v.reg} ${v.makeModel} ${v.owner}`.toLowerCase().includes(q))
        return { title: 'Vehicles', desc: 'A complete service history for every vehicle.', addLabel: 'Add vehicle', headers: ['Registration', 'Make / model', 'Year', 'Owner', 'Mileage', 'Last service'], grid: grid(6), rows: rows.map(v => [v.reg, v.makeModel, v.year, v.owner, v.mileage, v.lastService]), csv: () => downloadCSV('vehicles.csv', ['Registration', 'Make / model', 'Year', 'Owner', 'Mileage', 'Last service'], rows.map(v => [v.reg, v.makeModel, v.year, v.owner, v.mileage, v.lastService])) }
      }
      case 'inventory': {
        const rows = d.stock.filter(s => `${s.name} ${s.partNo} ${s.supplier} ${s.location}`.toLowerCase().includes(q))
        return { title: 'Inventory', desc: 'Know what is on the shelf before you promise the job.', addLabel: 'Add stock', headers: ['Part name', 'Part number', 'Supplier', 'Buy price', 'Sell price', 'In stock', 'Location'], grid: grid(7), rows: rows.map(s => [s.name, s.partNo, s.supplier, ksh(s.buy), ksh(s.sell), `${s.qty}${s.unit}`, s.location]), csv: () => downloadCSV('inventory.csv', ['Part name', 'Part number', 'Supplier', 'Buy price', 'Sell price', 'In stock', 'Location'], rows.map(s => [s.name, s.partNo, s.supplier, String(s.buy), String(s.sell), String(s.qty), s.location])) }
      }
      case 'invoices': {
        const rows = d.invoices.filter(i => `${i.id} ${i.customer} ${i.vehicle}`.toLowerCase().includes(q))
        return { title: 'Invoices', desc: 'Stay on top of every shilling that moves through the workshop.', addLabel: 'New invoice', headers: ['Invoice #', 'Customer', 'Vehicle', 'Date', 'Grand total', 'Balance', 'Status'], grid: grid(7), rows: rows.map(i => [i.id, i.customer, i.vehicle, i.date, ksh(i.total), ksh(i.total - i.paid), i.paid >= i.total ? 'Paid' : i.paid > 0 ? 'Partial' : 'Unpaid']), csv: () => downloadCSV('invoices.csv', ['Invoice #', 'Customer', 'Vehicle', 'Date', 'Grand total', 'Balance', 'Status'], rows.map(i => [i.id, i.customer, i.vehicle, i.date, String(i.total), String(i.total - i.paid), i.paid >= i.total ? 'Paid' : i.paid > 0 ? 'Partial' : 'Unpaid'])) }
      }
      default: {
        const rows = d.reminders.filter(r => `${r.text} ${r.customer} ${r.vehicle} ${r.channel}`.toLowerCase().includes(q))
        return { title: 'Reminders', desc: 'The right message, at exactly the right time.', addLabel: 'New reminder', headers: ['Reminder', 'Customer', 'Vehicle', 'Due date', 'Channel', 'Action'], grid: grid(6), rows: rows.map(r => [r.text, r.customer, r.vehicle, r.due, r.channel, r.sent ? 'Sent' : 'Send']), csv: () => downloadCSV('reminders.csv', ['Reminder', 'Customer', 'Vehicle', 'Due date', 'Channel', 'Status'], rows.map(r => [r.text, r.customer, r.vehicle, r.due, r.channel, r.sent ? 'Sent' : 'Pending'])) }
      }
    }
  })()

  const entities: Record<'customers' | 'vehicles' | 'inventory' | 'invoices' | 'reminders', React.ReactNode[]> = {
    customers: d.customers.filter(c => `${c.name} ${c.phone} ${c.vehicles}`.toLowerCase().includes(q)).map(c => <div className="wide-row" key={c.name} style={{ gridTemplateColumns: config.grid, minWidth: 760 }}><span className="strong-cell">{c.name}</span><span>{c.phone}</span><span>{c.vehicles}</span><span>{ksh(c.spent)}</span><span className={cn(c.outstanding > 0 && 'text-red-500')}>{ksh(c.outstanding)}</span><span>{c.lastService}</span><ChevronRight className="size-4 text-slate-300" /></div>),
    vehicles: d.vehicles.filter(v => `${v.reg} ${v.makeModel} ${v.owner}`.toLowerCase().includes(q)).map(v => <div className="wide-row" key={v.reg} style={{ gridTemplateColumns: config.grid, minWidth: 760 }}><span className="strong-cell">{v.reg}</span><span>{v.makeModel}</span><span>{v.year}</span><span>{v.owner}</span><span>{v.mileage}</span><span>{v.lastService}</span><ChevronRight className="size-4 text-slate-300" /></div>),
    inventory: d.stock.filter(s => `${s.name} ${s.partNo} ${s.supplier} ${s.location}`.toLowerCase().includes(q)).map(s => { const low = s.qty > 0 && s.qty <= s.min; const out = s.qty === 0; return <div className="wide-row" key={s.partNo} style={{ gridTemplateColumns: config.grid, minWidth: 760 }}><span className="strong-cell">{s.name}</span><span>{s.partNo}</span><span>{s.supplier}</span><span>{ksh(s.buy)}</span><span>{ksh(s.sell)}</span><span className={cn('font-bold', out ? 'text-red-500' : low ? 'text-amber-600' : 'text-emerald-600')}><span className="inline-flex items-center gap-1.5"><button aria-label="Reduce stock" className="grid size-6 place-items-center rounded border border-slate-200 text-slate-500 hover:bg-slate-100" onClick={() => demo.adjustStock(s.partNo, -1)}><Minus className="size-3" /></button>{s.qty}{s.unit}<button aria-label="Increase stock" className="grid size-6 place-items-center rounded border border-slate-200 text-slate-500 hover:bg-slate-100" onClick={() => demo.adjustStock(s.partNo, 1)}><Plus className="size-3" /></button></span></span><span>{s.location}</span><ChevronRight className="size-4 text-slate-300" /></div> }),
    invoices: d.invoices.filter(i => `${i.id} ${i.customer} ${i.vehicle}`.toLowerCase().includes(q)).map(i => { const due = i.total - i.paid; return <div className="wide-row" key={i.id} style={{ gridTemplateColumns: config.grid, minWidth: 760 }}><span className="strong-cell">{i.id}</span><span>{i.customer}</span><span>{i.vehicle}</span><span>{i.date}</span><span>{ksh(i.total)}</span><span className={cn(due > 0 && 'text-red-500')}>{ksh(due)}</span><span className="flex items-center gap-2">{due <= 0 ? <Status>Paid</Status> : <Status tone={i.paid > 0 ? 'amber' : 'red'}>{i.paid > 0 ? 'Partial' : 'Unpaid'}</Status>}{due > 0 && <button className="rounded-md bg-emerald-600 px-2.5 py-1.5 text-[10px] font-bold text-white hover:bg-emerald-700" onClick={() => { demo.recordPayment(i.id); notify(`Payment of ${ksh(due)} recorded on ${i.id}.`) }}>Record payment</button>}</span><ChevronRight className="size-4 text-slate-300" /></div> }),
    reminders: d.reminders.filter(r => `${r.text} ${r.customer} ${r.vehicle} ${r.channel}`.toLowerCase().includes(q)).map(r => <div className="wide-row" key={r.id} style={{ gridTemplateColumns: config.grid, minWidth: 760 }}><span className="strong-cell">{r.text}</span><span>{r.customer}</span><span>{r.vehicle}</span><span>{r.due}</span><span>{r.channel}</span><span>{r.sent ? <Status>Sent</Status> : <button className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-1.5 text-[10px] font-bold text-white hover:bg-slate-700" onClick={() => { demo.sendReminder(r.id); notify(`${r.channel} reminder sent to ${r.customer}.`) }}><Send className="size-3" /> Send</button>}</span><ChevronRight className="size-4 text-slate-300" /></div>),
  }

  return <div className="generic-view"><div className="welcome-row"><div><p className="page-kicker">WORKSHOP MANAGEMENT</p><h2>{config.title}</h2><p>{config.desc}</p></div><div className="quick-actions"><ExportButtons csv={() => config.csv()} pdf={() => downloadPDF(`${config.title.toLowerCase().replace(/ /g, '-')}.pdf`, `${config.title} — SmartGarage 360`, config.headers, config.rows)} notify={notify} /><button className="primary-button" onClick={() => openModal(view)}><Plus className="size-4" /> {config.addLabel}</button></div></div><div className="data-card full-table-card"><div className="list-toolbar"><div className="search-field"><Search className="size-4" /><input id="global-search" placeholder={`Search ${config.title.toLowerCase()}...`} value={query} onChange={e => setQuery(e.target.value)} /></div><span className="text-xs text-slate-400">{config.rows.length} records</span></div><div className="wide-table"><div className="wide-row wide-header" style={{ gridTemplateColumns: config.grid, minWidth: 760 }}>{config.headers.map(h => <span key={h}>{h}</span>)}</div>{entities[view].length ? entities[view] : <div className="wide-row" style={{ gridTemplateColumns: config.grid, minWidth: 760 }}><span className="col-span-full py-3 text-center text-slate-400" style={{ gridColumn: '1 / -1' }}>No records match your search.</span></div>}</div></div></div>
}

// ---- reports & settings -----------------------------------------------------
function Reports({ demo, setView, notify }: { demo: Demo; setView: (v: View) => void; notify: (m: string) => void }) {
  const d = demo.state
  const usage = useMemo(() => {
    const map: Record<string, number> = {}
    for (const job of d.jobs) for (const part of job.parts) map[part.name] = (map[part.name] || 0) + (parseFloat(part.qty) || 1)
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 4)
  }, [d.jobs])
  const outstanding = outstandingTotal(d)
  const open = openInvoices(d)
  const weekData = [['Mon', 62, 24], ['Tue', 78, 18], ['Wed', 54, 30], ['Thu', 88, 14], ['Fri', 72, 22], ['Sat', 64, 28], ['Sun', 40, 12]] as [string, number, number][]
  return <div className="generic-view"><div className="welcome-row"><div><p className="page-kicker">INSIGHTS</p><h2>Reports</h2><p>Turn workshop activity into better business decisions.</p></div><ExportButtons csv={() => downloadCSV('revenue-report.csv', ['Invoice #', 'Customer', 'Vehicle', 'Date', 'Total', 'Paid', 'Balance'], d.invoices.map(i => [i.id, i.customer, i.vehicle, i.date, String(i.total), String(i.paid), String(i.total - i.paid)]))} pdf={() => downloadPDF('revenue-report.pdf', 'Revenue Report — SmartGarage 360', ['Invoice #', 'Customer', 'Vehicle', 'Date', 'Total', 'Paid', 'Balance'], d.invoices.map(i => [i.id, i.customer, i.vehicle, i.date, ksh(i.total), ksh(i.paid), ksh(i.total - i.paid)]))} notify={notify} /></div><div className="report-grid"><div className="data-card report-revenue"><div className="card-head"><div><h3>Revenue trend</h3><p>Last 7 days</p></div><span className="text-[10px] font-bold text-slate-400">{TODAY}</span></div><div className="report-total">{ksh(revenueTotal(d))} <span>+24.8%</span></div><svg className="big-chart" viewBox="0 0 700 170" preserveAspectRatio="none"><path d="M0 140 C45 132 70 138 110 116 S175 124 220 102 S280 112 320 118 S390 70 430 84 S500 65 550 42 S620 67 700 20" /><path className="area" d="M0 140 C45 132 70 138 110 116 S175 124 220 102 S280 112 320 118 S390 70 430 84 S500 65 550 42 S620 67 700 20 V170 H0Z" /></svg></div><div className="data-card report-bars"><div className="card-head"><div><h3>Jobs overview</h3><p>Completed vs pending</p></div></div><div className="bar-chart">{weekData.map(r => <div key={r[0]}><div className="bar-pair"><i style={{ height: `${r[1]}%` }} /><i style={{ height: `${r[2]}%` }} /></div><small>{r[0]}</small></div>)}</div><div className="chart-legend"><span><i className="legend-green" /> Completed · {completedCount(d)}</span><span><i className="legend-amber" /> Pending · {activeCount(d)}</span></div></div><div className="data-card parts-used"><div className="card-head"><div><h3>Most-used parts</h3><p>This month</p></div></div>{usage.map(([name, count], i) => <div className="used-part" key={name}><span className="used-rank">0{i + 1}</span><b>{name}</b><small>{count} uses</small><div><i style={{ width: `${Math.max(20, 90 - i * 17)}%` }} /></div></div>)}</div><div className="data-card outstanding-card"><div className="card-head"><div><h3>Outstanding balances</h3><p>Requires follow-up</p></div><CreditCard className="size-5 text-red-500" /></div><strong>{ksh(outstanding)}</strong><p>Across {open} unpaid invoice{open === 1 ? '' : 's'}</p><button className="full-button" onClick={() => setView('invoices')}>View invoices <ArrowRight className="size-4" /></button></div></div></div>
}

function SettingsView({ demo, notify }: { demo: Demo; notify: (m: string) => void }) {
  const p = demo.state.profile
  const [form, setForm] = useState(p)
  useEffect(() => setForm(demo.state.profile), [demo.state.profile])
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value })
  return <div className="generic-view"><div className="welcome-row"><div><p className="page-kicker">CONFIGURATION</p><h2>Settings</h2><p>Make SmartGarage 360 work your way.</p></div></div><div className="settings-grid"><div className="data-card settings-card"><h3>Workshop profile</h3><p>Keep your garage information up to date.</p><label>Workshop name<input value={form.workshop} onChange={set('workshop')} /></label><label>Phone number<input value={form.phone} onChange={set('phone')} /></label><label>Location<input value={form.location} onChange={set('location')} /></label><label>Default currency<input value={form.currency} onChange={set('currency')} /></label><button className="primary-button" onClick={() => { demo.saveProfile(form); notify('Workshop profile saved.') }}>Save changes</button></div><div className="data-card settings-card"><h3>Team & permissions</h3><p>Manage who can access your workshop data.</p>{['Peter Wambui · Owner', 'David Kariuki · Mechanic', 'Joyce Njeri · Receptionist'].map(x => <div className="team-row" key={x}><div className="user-avatar">{initialsOf(x.split(' · ')[0])}</div><b>{x}</b><MoreHorizontal className="ml-auto size-4" /></div>)}</div></div></div>
}

// ---- modals -----------------------------------------------------------------
function AddModal({ view, demo, notify, onClose }: { view: View; demo: Demo; notify: (m: string) => void; onClose: () => void }) {
  switch (view) {
    case 'job-cards': return <AddJobModal demo={demo} notify={notify} onClose={onClose} />
    case 'customers': return <AddCustomerModal demo={demo} notify={notify} onClose={onClose} />
    case 'vehicles': return <AddVehicleModal demo={demo} notify={notify} onClose={onClose} />
    case 'inventory': return <AddStockModal demo={demo} notify={notify} onClose={onClose} />
    case 'invoices': return <AddInvoiceModal demo={demo} notify={notify} onClose={onClose} />
    default: return <AddReminderModal demo={demo} notify={notify} onClose={onClose} />
  }
}

function AddJobModal({ demo, notify, onClose }: { demo: Demo; notify: (m: string) => void; onClose: () => void }) {
  const [customer, setCustomer] = useState('')
  const [vehicle, setVehicle] = useState('')
  const [reg, setReg] = useState('')
  const [complaint, setComplaint] = useState('')
  const [amount, setAmount] = useState('')
  const submit = () => {
    if (!customer || !vehicle) { notify('Customer and vehicle are required.'); return }
    const id = demo.createJob({ customer, vehicle, reg, complaint: complaint || 'General check-up', amount: parseInt(amount, 10) || 0 })
    notify(`Job card ${id} created for ${customer}.`); onClose()
  }
  return <Modal title="New job card" onClose={onClose}><Field label="Customer name"><input className={inputCls} placeholder="e.g. John Kamau" value={customer} onChange={e => setCustomer(e.target.value)} /></Field><Field label="Vehicle"><input className={inputCls} placeholder="e.g. Toyota Axio" value={vehicle} onChange={e => setVehicle(e.target.value)} /></Field><Field label="Registration"><input className={inputCls} placeholder="e.g. KDA 123A" value={reg} onChange={e => setReg(e.target.value)} /></Field><Field label="Customer complaint"><input className={inputCls} placeholder="e.g. Engine noise and vibration" value={complaint} onChange={e => setComplaint(e.target.value)} /></Field><Field label="Estimated amount (KSh)"><input className={inputCls} type="number" min={0} placeholder="e.g. 12000" value={amount} onChange={e => setAmount(e.target.value)} /></Field><SubmitRow onCancel={onClose}><button className="rounded-md bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700" onClick={submit}>Create job card</button></SubmitRow></Modal>
}

function AddCustomerModal({ demo, notify, onClose }: { demo: Demo; notify: (m: string) => void; onClose: () => void }) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const submit = () => {
    if (!name) { notify('Customer name is required.'); return }
    demo.addCustomer({ name, phone }); notify(`${name} added as a customer.`); onClose()
  }
  return <Modal title="Add customer" onClose={onClose}><Field label="Full name"><input className={inputCls} placeholder="e.g. Faith Chebet" value={name} onChange={e => setName(e.target.value)} /></Field><Field label="Phone number"><input className={inputCls} placeholder="e.g. 0711 234 567" value={phone} onChange={e => setPhone(e.target.value)} /></Field><SubmitRow onCancel={onClose}><button className="rounded-md bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700" onClick={submit}>Add customer</button></SubmitRow></Modal>
}

function AddVehicleModal({ demo, notify, onClose }: { demo: Demo; notify: (m: string) => void; onClose: () => void }) {
  const [reg, setReg] = useState(''); const [makeModel, setMakeModel] = useState(''); const [year, setYear] = useState(''); const [owner, setOwner] = useState(''); const [mileage, setMileage] = useState('')
  const submit = () => {
    if (!reg || !makeModel) { notify('Registration and make/model are required.'); return }
    demo.addVehicle({ reg, makeModel, year: year || '—', owner, mileage: mileage ? `${mileage} km` : '—' }); notify(`${reg} added to the fleet.`); onClose()
  }
  return <Modal title="Add vehicle" onClose={onClose}><Field label="Registration"><input className={inputCls} placeholder="e.g. KDM 910Z" value={reg} onChange={e => setReg(e.target.value)} /></Field><Field label="Make / model"><input className={inputCls} placeholder="e.g. Toyota Hilux" value={makeModel} onChange={e => setMakeModel(e.target.value)} /></Field><div className="grid grid-cols-2 gap-2"><Field label="Year"><input className={inputCls} placeholder="e.g. 2019" value={year} onChange={e => setYear(e.target.value)} /></Field><Field label="Owner"><input className={inputCls} placeholder="e.g. Faith Chebet" value={owner} onChange={e => setOwner(e.target.value)} /></Field></div><Field label="Mileage (km)"><input className={inputCls} placeholder="e.g. 88,000" value={mileage} onChange={e => setMileage(e.target.value)} /></Field><SubmitRow onCancel={onClose}><button className="rounded-md bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700" onClick={submit}>Add vehicle</button></SubmitRow></Modal>
}

function AddStockModal({ demo, notify, onClose }: { demo: Demo; notify: (m: string) => void; onClose: () => void }) {
  const [name, setName] = useState(''); const [partNo, setPartNo] = useState(''); const [supplier, setSupplier] = useState(''); const [buy, setBuy] = useState(''); const [sell, setSell] = useState(''); const [qty, setQty] = useState(''); const [unit, setUnit] = useState(''); const [location, setLocation] = useState('')
  const submit = () => {
    if (!name || !partNo) { notify('Part name and part number are required.'); return }
    const min = Math.max(1, Math.ceil((parseInt(qty, 10) || 0) / 3))
    demo.addStock({ name, partNo, supplier: supplier || '—', buy: parseInt(buy, 10) || 0, sell: parseInt(sell, 10) || 0, qty: parseInt(qty, 10) || 0, unit, location: location || '—', min }); notify(`${name} added to inventory.`); onClose()
  }
  return <Modal title="Add stock" onClose={onClose}><Field label="Part name"><input className={inputCls} placeholder="e.g. Brake Pads" value={name} onChange={e => setName(e.target.value)} /></Field><div className="grid grid-cols-2 gap-2"><Field label="Part number"><input className={inputCls} placeholder="e.g. BP-UNI-01" value={partNo} onChange={e => setPartNo(e.target.value)} /></Field><Field label="Supplier"><input className={inputCls} placeholder="e.g. BrakePro KE" value={supplier} onChange={e => setSupplier(e.target.value)} /></Field></div><div className="grid grid-cols-2 gap-2"><Field label="Buy price (KSh)"><input className={inputCls} type="number" value={buy} onChange={e => setBuy(e.target.value)} /></Field><Field label="Sell price (KSh)"><input className={inputCls} type="number" value={sell} onChange={e => setSell(e.target.value)} /></Field></div><div className="grid grid-cols-2 gap-2"><Field label="Quantity"><input className={inputCls} type="number" value={qty} onChange={e => setQty(e.target.value)} /></Field><Field label="Unit"><input className={inputCls} placeholder="e.g. L, pcs" value={unit} onChange={e => setUnit(e.target.value)} /></Field></div><Field label="Shelf location"><input className={inputCls} placeholder="e.g. Shelf A1" value={location} onChange={e => setLocation(e.target.value)} /></Field><SubmitRow onCancel={onClose}><button className="rounded-md bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700" onClick={submit}>Add stock</button></SubmitRow></Modal>
}

function AddInvoiceModal({ demo, notify, onClose }: { demo: Demo; notify: (m: string) => void; onClose: () => void }) {
  const [customer, setCustomer] = useState(''); const [vehicle, setVehicle] = useState(''); const [total, setTotal] = useState('')
  const submit = () => {
    if (!customer || !total) { notify('Customer and amount are required.'); return }
    const id = (() => { const n = nextSeq(demo.state.invoices.map(i => i.id)); return 'INV-' + String(n).padStart(6, '0') })()
    demo.addInvoice({ customer, vehicle, total: parseInt(total, 10) || 0 }); notify(`Invoice ${id} created for ${ksh(parseInt(total, 10) || 0)}.`); onClose()
  }
  return <Modal title="New invoice" onClose={onClose}><Field label="Customer"><input className={inputCls} placeholder="e.g. Faith Chebet" value={customer} onChange={e => setCustomer(e.target.value)} /></Field><Field label="Vehicle"><input className={inputCls} placeholder="e.g. KDM 910Z" value={vehicle} onChange={e => setVehicle(e.target.value)} /></Field><Field label="Grand total (KSh)"><input className={inputCls} type="number" placeholder="e.g. 18500" value={total} onChange={e => setTotal(e.target.value)} /></Field><SubmitRow onCancel={onClose}><button className="rounded-md bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700" onClick={submit}>Create invoice</button></SubmitRow></Modal>
}

function AddReminderModal({ demo, notify, onClose }: { demo: Demo; notify: (m: string) => void; onClose: () => void }) {
  const [text, setText] = useState(''); const [customer, setCustomer] = useState(''); const [vehicle, setVehicle] = useState(''); const [due, setDue] = useState(''); const [channel, setChannel] = useState('WhatsApp')
  const submit = () => {
    if (!text || !customer) { notify('Reminder text and customer are required.'); return }
    demo.addReminder({ text, customer, vehicle, due: due || 'Today', channel }); notify('Reminder scheduled.') ; onClose()
  }
  return <Modal title="New reminder" onClose={onClose}><Field label="Reminder text"><input className={inputCls} placeholder="e.g. Service due" value={text} onChange={e => setText(e.target.value)} /></Field><div className="grid grid-cols-2 gap-2"><Field label="Customer"><input className={inputCls} placeholder="e.g. Faith Chebet" value={customer} onChange={e => setCustomer(e.target.value)} /></Field><Field label="Vehicle"><input className={inputCls} placeholder="e.g. KDM 910Z" value={vehicle} onChange={e => setVehicle(e.target.value)} /></Field></div><Field label="Due date"><input className={inputCls} placeholder="e.g. Tomorrow" value={due} onChange={e => setDue(e.target.value)} /></Field><Field label="Channel"><select className={inputCls} value={channel} onChange={e => setChannel(e.target.value)}><option>WhatsApp</option><option>SMS</option><option>Email</option></select></Field><SubmitRow onCancel={onClose}><button className="rounded-md bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700" onClick={submit}>Schedule reminder</button></SubmitRow></Modal>
}

// ---- presentation layer -----------------------------------------------------
function PresentationLayer({ demo, view, setView, onExit, notify, onFlagship }: {
  demo: Demo; view: View; setView: (v: View) => void; onExit: () => void; notify: (m: string) => void; onFlagship: () => void
}) {
  const [tourOpen, setTourOpen] = useState(false)
  const [tourStep, setTourStep] = useState(0)
  const steps = [{ view: 'dashboard' as View, title: 'Start with the command centre', copy: 'Lead with the numbers shareholders care about: vehicles, jobs, revenue and payment risk.' }, { view: 'job-cards' as View, title: 'Show every repair clearly', copy: 'Open a live job card to demonstrate traceability from diagnosis to payment.' }, { view: 'inventory' as View, title: 'Prevent delays before they happen', copy: 'Low-stock signals help managers protect turnaround time and margins.' }, { view: 'reports' as View, title: 'Turn activity into decisions', copy: 'Reports turn daily workshop activity into a clear growth story.' }]
  const current = steps[tourStep]
  const startTour = () => { setTourStep(0); setView('dashboard'); setTourOpen(true) }
  const next = () => { if (tourStep === steps.length - 1) { setTourOpen(false); setView('job-cards') } else { const nextStep = tourStep + 1; setTourStep(nextStep); setView(steps[nextStep].view) } }
  const advanceWorkflow = () => {
    const job = demo.state.jobs.find(j => j.status !== 'Completed' && j.status !== 'Delivered')
    if (!job) { notify('All jobs are complete. Reset demo data to start again.'); return }
    const next = STAGES[STAGES.indexOf(job.status) + 1]
    const willCreate = next === 'Completed' && !demo.state.invoices.some(i => i.id === invIdForJob(job.id))
    demo.advanceJob(job.id)
    if (next === 'Completed') notify(`Demo workflow: ${job.customer}\u2019s ${job.vehicle} completed — ${willCreate ? `invoice ${invIdForJob(job.id)} generated.` : `invoice ${invIdForJob(job.id)} awaiting payment.`}`)
    else notify(`Demo workflow: ${job.customer}\u2019s ${job.vehicle} → ${next}.`)
  }
  return <>
    <div className="presentation-bar"><div className="presentation-status"><span className="live-dot" /> Presentation demo <small>Safe mock data · resets on exit</small></div><div className="presentation-actions"><button onClick={startTour}><Sparkles className="size-3.5" /> Start guided tour</button><button onClick={onFlagship}>Show flagship job card</button><button onClick={() => setView('reports')}>Show reports</button><button onClick={advanceWorkflow}>Advance sample workflow</button><button onClick={() => { demo.reset(); notify('Demo data reset to the clean presentation state.') }}>Reset demo data</button><button className="presentation-exit" onClick={onExit}>Exit demo</button></div></div>
    <div className="demo-state-chip"><span className="live-dot" /> Live demo state <b>{completedCount(demo.state)} completed jobs</b><b>{demo.state.invoices.filter(i => i.paid >= i.total).length} paid invoices</b><b>{remindersDue(demo.state)} reminders pending</b></div>
    {tourOpen && <div className="tour-backdrop"><div className="tour-card" role="dialog" aria-modal="true" aria-labelledby="tour-title"><div className="tour-progress">SHAREHOLDER WALKTHROUGH <span>{tourStep + 1} / {steps.length}</span></div><div className="tour-icon"><Sparkles className="size-5" /></div><h2 id="tour-title">{current.title}</h2><p>{current.copy}</p><div className="tour-dots">{steps.map((step, index) => <button aria-label={`Go to step ${index + 1}`} key={step.title} onClick={() => { setTourStep(index); setView(step.view) }} className={cn(index === tourStep && 'active')} />)}</div><div className="tour-footer"><button className="tour-skip" onClick={() => setTourOpen(false)}>Skip tour</button><div className="tour-nav">{tourStep > 0 && <button onClick={() => { const previous = tourStep - 1; setTourStep(previous); setView(steps[previous].view) }}>Back</button>}<button className="primary-button" onClick={next}>{tourStep === steps.length - 1 ? 'Open job card' : 'Next step'} <ArrowRight className="size-4" /></button></div></div></div></div>}
  </>
}

// ---- root -------------------------------------------------------------------
export default function Page() {
  const demo = useGarageDemo()
  const [screen, setScreen] = useState<'landing' | 'login' | 'app'>('landing')
  const [view, setView] = useState<View>('dashboard')
  const [role, setRole] = useState<Role>('Owner')
  const [activeJobId, setActiveJobId] = useState<string | null>(null)
  const [modalView, setModalView] = useState<View | null>(null)
  const [notice, setNotice] = useState('')
  const notify = (message: string) => { setNotice(message); window.setTimeout(() => setNotice(''), 2600) }
  useEffect(() => {
    const handler = (event: Event) => setRole((event as CustomEvent<string>).detail as Role)
    window.addEventListener('smartgarage-role', handler)
    return () => window.removeEventListener('smartgarage-role', handler)
  }, [])
  const openJob = (id: string) => { setActiveJobId(id); setView('job-cards') }
  const enterApp = (selectedRole: Role) => { setRole(selectedRole); setActiveJobId(null); setView('dashboard'); setScreen('app') }
  if (screen === 'landing') return <Landing onDemo={() => setScreen('login')} />
  if (screen === 'login') return <Login onLogin={enterApp} onBack={() => setScreen('landing')} />
  return <>
    <AppShell demo={demo} view={view} setView={setView} role={role} onLogout={() => setScreen('landing')} openJob={openJob} activeJobId={activeJobId} setActiveJobId={setActiveJobId} openModal={setModalView} notify={notify} />
    {modalView && <AddModal view={modalView} demo={demo} notify={notify} onClose={() => setModalView(null)} />}
    <PresentationLayer demo={demo} view={view} setView={setView} onExit={() => { demo.reset(); setView('dashboard'); setScreen('landing') }} notify={notify} onFlagship={() => { setActiveJobId(demo.state.jobs[0].id); setView('job-cards') }} />
    {notice && <div className="demo-notice"><CheckCircle2 className="size-4" />{notice}</div>}
  </>
}
