'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle, ArrowLeft, ArrowRight, BarChart3, Bell, Car, Check, CheckCircle2, ChevronRight,
  CircleDollarSign, ClipboardCheck, ClipboardList, Clock3, Cog, CreditCard, Download, FileText, Gauge,
  Layers3, LogOut, Mail, MapPin, Menu, Minus, MoreHorizontal, Package, Phone, Plus, Search, Send, Settings,
  Share2, ShieldCheck, Sparkles, TrendingUp, Users, Wrench, X,
} from 'lucide-react'
import { cn, ksh, initialsOf } from '@/lib/utils'
import {
  addActionForView, can, CHANNEL_LABELS, PERSONA, ROLE_INFO, ROLE_LABELS, ROLE_VIEWS,
  STAFF_ROLES, type StaffRole, type View,
} from '@/lib/contracts'
import {
  DONE_STATUSES, JOB_STATUSES, JOB_STATUS_LABELS,
  type Customer, type Invoice, type JobCard, type JobStatus, type Vehicle,
} from '@/lib/types'
import {
  useDemoRepository, type DemoRepository,
  activeCount, completedCount, jobConsumables, jobLabour, jobParts, jobPartsTotal, jobTotal,
  labourTotal, lowStockCount, openInvoices, outStockCount, outstandingTotal, paidTodayCount,
  readyForCollection, remindersDue, revenueToday, revenueTotal, stockScore, vehiclesToday, waitingPartsCount,
} from '@/lib/demo/store'

const navItems: { id: View; label: string; icon: typeof Gauge }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: Gauge }, { id: 'customers', label: 'Customers', icon: Users },
  { id: 'vehicles', label: 'Vehicles', icon: Car }, { id: 'job-cards', label: 'Job Cards', icon: ClipboardList },
  { id: 'inventory', label: 'Inventory', icon: Package }, { id: 'invoices', label: 'Invoices', icon: FileText },
  { id: 'reports', label: 'Reports', icon: BarChart3 }, { id: 'reminders', label: 'Reminders', icon: Bell },
  { id: 'settings', label: 'Settings', icon: Settings },
]

const TODAY = '14 Aug 2024'
const invIdForJob = (jobId: string) => 'INV-' + jobId.replace(/^SG360-/, '')

function statusMeta(s: JobStatus): { tone: string; label: string } {
  const tones: Record<JobStatus, string> = {
    received: 'purple', inspection: 'purple', diagnosis: 'purple',
    'waiting-customer-approval': 'amber', 'waiting-parts': 'amber',
    repairing: 'blue', 'quality-check': 'blue',
    completed: 'green', paid: 'green', delivered: 'green',
  }
  return { tone: tones[s], label: JOB_STATUS_LABELS[s] }
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
    <div className="max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl" onClick={e => e.stopPropagation()}>
      <div className="mb-4 flex items-center justify-between"><h3 className="text-base font-bold">{title}</h3><button aria-label="Close" onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100"><X className="size-4" /></button></div>
      {children}
    </div>
  </div>
}

function SubmitRow({ onCancel, children }: { onCancel: () => void; children: React.ReactNode }) {
  return <div className="mt-5 flex items-center justify-end gap-2">{children}<button className="rounded-md border border-slate-200 px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50" onClick={onCancel}>Cancel</button></div>
}

function GlobalSearch({ demo, onClose, openJob, setView, views }: {
  demo: DemoRepository; onClose: () => void; openJob: (id: string) => void; setView: (v: View) => void; views: View[]
}) {
  const [q, setQ] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    inputRef.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  const d = demo.getState()
  const query = q.trim().toLowerCase()
  const results = useMemo(() => {
    if (!query) return { jobs: [], customers: [], vehicles: [], invoices: [] } as { jobs: JobCard[]; customers: Customer[]; vehicles: Vehicle[]; invoices: Invoice[] }
    return {
      jobs: views.includes('job-cards') ? d.jobs.filter(j => `${j.id} ${j.customerName} ${j.vehicleName} ${j.reg}`.toLowerCase().includes(query)).slice(0, 5) : [],
      customers: views.includes('customers') ? d.customers.filter(c => `${c.name} ${c.phone}`.toLowerCase().includes(query)).slice(0, 4) : [],
      vehicles: views.includes('vehicles') ? d.vehicles.filter(v => `${v.reg} ${v.makeModel} ${v.ownerName}`.toLowerCase().includes(query)).slice(0, 4) : [],
      invoices: views.includes('invoices') ? d.invoices.filter(i => `${i.id} ${i.customerName} ${i.vehicleReg}`.toLowerCase().includes(query)).slice(0, 4) : [],
    }
  }, [query, d, views])
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
        {results.jobs.length > 0 && <p className="px-4 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">Job cards</p>}{results.jobs.map(j => <Row key={j.id} icon={<ClipboardList className="size-4" />} primary={`${j.id} · ${j.customerName}`} secondary={`${j.vehicleName} ${j.reg} — ${statusMeta(j.status).label}`} onClick={() => openJob(j.id)} />)}
        {results.customers.length > 0 && <p className="px-4 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">Customers</p>}{results.customers.map(c => <Row key={c.name} icon={<Users className="size-4" />} primary={c.name} secondary={`${c.phone} · ${c.spent > 0 ? ksh(c.spent) : 'New customer'} total spending`} onClick={() => setView('customers')} />)}
        {results.vehicles.length > 0 && <p className="px-4 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">Vehicles</p>}{results.vehicles.map(v => <Row key={v.reg} icon={<Car className="size-4" />} primary={`${v.reg} · ${v.makeModel}`} secondary={`${v.ownerName} · ${v.mileage}`} onClick={() => setView('vehicles')} />)}
        {results.invoices.length > 0 && <p className="px-4 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">Invoices</p>}{results.invoices.map(i => <Row key={i.id} icon={<FileText className="size-4" />} primary={`${i.id} · ${i.customerName}`} secondary={`${ksh(i.total)} · ${i.paid >= i.total ? 'Paid' : 'Balance due'}`} onClick={() => setView('invoices')} />)}
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

function Login({ onLogin, onBack }: { onLogin: (role: StaffRole) => void; onBack: () => void }) {
  const [role, setRole] = useState<StaffRole>('owner')
  return <main className="login-page"><div className="login-glow" /><div className="login-card"><button onClick={onBack} className="back-link"><ArrowRight className="size-4 rotate-180" /> Back to website</button><Logo light /><div className="login-heading"><div className="eyebrow"><span className="live-dot" /> Demo workspace</div><h1>Welcome back.</h1><p>Choose a workspace view for this presentation.</p></div><label>Email address<input key={role} defaultValue={PERSONA[role].email} type="email" /></label><label>Password<input defaultValue="••••••••••••" type="password" /></label><label>Role<select value={role} onChange={e => setRole(e.target.value as StaffRole)}>{STAFF_ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}</select></label><button className="login-button" onClick={() => onLogin(role)}>Enter as {PERSONA[role].name.split(' ')[0]} ({ROLE_LABELS[role]}) <ArrowRight className="size-4" /></button><div className="demo-garage"><MapPin className="size-4 text-emerald-500" /><div><b>SmartGarage 360 Demo Garage</b><span>Warehouse Road, Industrial Area, Nairobi</span></div></div></div></main>
}

// ---- app shell --------------------------------------------------------------
function AppShell({ demo, view, setView, role, onLogout, openJob, activeJobId, setActiveJobId, openModal, notify }: {
  demo: DemoRepository; view: View; setView: (v: View) => void; role: StaffRole; onLogout: () => void
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
  const activeJob = activeJobId ? demo.listJobs().find(j => j.id === activeJobId) : undefined
  const visibleNav = navItems.filter(n => ROLE_VIEWS[role].includes(n.id))
  const allowedView = ROLE_VIEWS[role].includes(view) ? view : 'dashboard'
  return <div className="app-shell"><aside className={cn('app-sidebar', mobileOpen && 'open')}><div className="sidebar-head"><Logo /><button className="mobile-close" onClick={() => setMobileOpen(false)}><X className="size-5" /></button></div><div className="workspace-switch"><div className="workspace-avatar">SG</div><div><b>SmartGarage 360</b><span>Demo Garage <ChevronRight className="size-3" /></span></div></div><nav className="app-nav">{visibleNav.map(item => <button key={item.id} onClick={() => { setView(item.id); setActiveJobId(null); setMobileOpen(false) }} className={cn(view === item.id && 'active')}><item.icon className="size-[18px]" />{item.label}{item.id === 'reminders' && <em>{remindersDue(demo.getState())}</em>}</button>)}</nav><div className="sidebar-bottom"><div className="help-card"><Sparkles className="size-4 text-emerald-500" /><b>Need a hand?</b><span>Visit our help centre</span></div><button onClick={onLogout} className="user-row"><div className="user-avatar">{PERSONA[role].initials}</div><div><b>{PERSONA[role].name}</b><span>{PERSONA[role].title}</span></div><MoreHorizontal className="ml-auto size-4 text-slate-400" /></button></div></aside>{mobileOpen && <button aria-label="Close menu" className="sidebar-overlay" onClick={() => setMobileOpen(false)} />}<div className="app-content"><header className="app-header"><button className="mobile-menu" onClick={() => setMobileOpen(true)}><Menu className="size-5" /></button><div className="header-title"><span>Wednesday, 14 August 2024</span><h1>{visibleNav.find(n => n.id === allowedView)?.label}</h1></div><div className="header-actions"><button aria-label="Search" className="icon-button" onClick={() => { setSearchOpen(true); setMobileOpen(false) }}><Search className="size-4" /></button>{ROLE_VIEWS[role].includes('reminders') && <button aria-label="Notifications" className="icon-button notification" onClick={() => { setView('reminders'); setMobileOpen(false) }}><Bell className="size-4" /><i /></button>}<div className="header-user-wrap relative"><button aria-label="Profile menu" className="header-user border-0 bg-transparent cursor-pointer" onClick={() => { setProfileOpen(v => !v); setMobileOpen(false) }}><div className="user-avatar">{PERSONA[role].initials}</div><div><b>{PERSONA[role].name}</b><span>{ROLE_LABELS[role]}</span></div><ChevronRight className={cn('size-4 rotate-90 text-slate-400 transition-transform', profileOpen && '-rotate-90')} /></button>{profileOpen && <><button aria-label="Close profile menu" className="fixed inset-0 z-40 cursor-default" onClick={() => setProfileOpen(false)} /><div className="absolute right-0 top-[calc(100%+10px)] z-50 w-56 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl"><p className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">Signed in as</p><div className="px-2 pb-2"><b className="block text-xs">{PERSONA[role].name}</b><span className="block text-[10px] text-slate-500">{ROLE_LABELS[role]} · SmartGarage 360 Demo Garage</span></div><div className="my-1 border-t border-slate-100" />{can(role, 'settings') && <button className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-xs font-semibold hover:bg-slate-50" onClick={() => { setProfileOpen(false); setView('settings') }}><Settings className="size-3.5 text-slate-500" /> My profile & settings</button>}<button className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-xs font-semibold text-red-600 hover:bg-red-50" onClick={() => { setProfileOpen(false); onLogout() }}><LogOut className="size-3.5" /> Log out</button></div></>}</div></div></header><main className="app-main">
      {allowedView === 'dashboard' && <div className="app-dashboard-host"><Dashboard demo={demo} role={role} setView={setView} openJob={openJob} openModal={openModal} notify={notify} /></div>}
      {allowedView === 'job-cards' && (activeJob && ROLE_VIEWS[role].includes('job-cards')
        ? <JobCardView job={activeJob} demo={demo} setView={setView} onBack={() => setActiveJobId(null)} notify={notify} role={role} />
        : <JobCardsView demo={demo} onOpen={openJob} openModal={openModal} notify={notify} role={role} />)}
      {allowedView === 'reports' && <Reports demo={demo} setView={setView} notify={notify} />}
      {allowedView === 'settings' && can(role, 'settings') && <SettingsView demo={demo} notify={notify} />}
      {['customers', 'vehicles', 'inventory', 'invoices', 'reminders'].includes(allowedView) && <GenericView view={allowedView as 'customers' | 'vehicles' | 'inventory' | 'invoices' | 'reminders'} demo={demo} openModal={openModal} notify={notify} role={role} />}
    </main></div>{searchOpen && <GlobalSearch demo={demo} onClose={() => setSearchOpen(false)} openJob={openJob} setView={setView} views={ROLE_VIEWS[role]} />}</div>
}

// ---- dashboard --------------------------------------------------------------
function Dashboard({ demo, role, setView, openJob, openModal, notify }: {
  demo: DemoRepository; role: StaffRole; setView: (v: View) => void; openJob: (id: string) => void; openModal: (v: View) => void; notify: (m: string) => void
}) {
  const info = ROLE_INFO[role]
  const d = demo.getState()
  const metrics: { num: string; label: string; change: string; tone: string; icon: typeof Gauge }[] = (() => {
    switch (role) {
      case 'owner': return [
        { num: ksh(revenueToday(d)), label: 'Today\u2019s revenue', change: '+24.8%', tone: 'green', icon: CircleDollarSign },
        { num: ksh(outstandingTotal(d)), label: 'Outstanding payments', change: `${openInvoices(d)} invoices`, tone: 'red', icon: CreditCard },
        { num: String(lowStockCount(d) + outStockCount(d)), label: 'Low-stock parts', change: 'Needs attention', tone: 'amber', icon: Package },
        { num: String(completedCount(d)), label: 'Jobs completed', change: '+18.4%', tone: 'green', icon: CheckCircle2 },
      ]
      case 'manager': return [
        { num: String(vehiclesToday(d)), label: 'Vehicles received today', change: '+12.5%', tone: 'blue', icon: Car },
        { num: String(activeCount(d)), label: 'Jobs in progress', change: '+8.2%', tone: 'purple', icon: Wrench },
        { num: String(waitingPartsCount(d)), label: 'Waiting for parts', change: 'Needs attention', tone: 'amber', icon: Clock3 },
        { num: String(lowStockCount(d) + outStockCount(d)), label: 'Low-stock parts', change: 'Needs attention', tone: 'amber', icon: Package },
      ]
      case 'mechanic': return [
        { num: String(d.jobs.filter(j => !DONE_STATUSES.includes(j.status)).length), label: 'Jobs assigned today', change: '2 due soon', tone: 'blue', icon: ClipboardList },
        { num: String(d.jobs.filter(j => j.status === 'quality-check').length), label: 'Quality checks', change: 'Ready', tone: 'green', icon: ShieldCheck },
        { num: String(completedCount(d)), label: 'Tasks completed', change: 'This week', tone: 'green', icon: CheckCircle2 },
        { num: String(waitingPartsCount(d)), label: 'Parts to collect', change: 'From stores', tone: 'amber', icon: Package },
      ]
      case 'receptionist': return [
        { num: String(vehiclesToday(d)), label: 'Vehicles received today', change: '4 arrivals next', tone: 'blue', icon: Car },
        { num: String(remindersDue(d)), label: 'Reminders due', change: 'Send now', tone: 'amber', icon: Bell },
        { num: String(readyForCollection(d)), label: 'Vehicles ready', change: 'Collection', tone: 'green', icon: Clock3 },
        { num: ksh(outstandingTotal(d)), label: 'Payments to follow up', change: `${openInvoices(d)} customers`, tone: 'red', icon: CreditCard },
      ]
      case 'accountant': return [
        { num: ksh(revenueToday(d)), label: 'Today\u2019s revenue', change: '+24.8%', tone: 'green', icon: CircleDollarSign },
        { num: ksh(outstandingTotal(d)), label: 'Outstanding balance', change: `${openInvoices(d)} invoices`, tone: 'red', icon: CreditCard },
        { num: String(paidTodayCount(d)), label: 'Paid in full today', change: `${paidTodayCount(d)} invoices`, tone: 'green', icon: CheckCircle2 },
        { num: ksh(labourTotal(d)), label: 'Labour income', change: 'All jobs', tone: 'purple', icon: Wrench },
      ]
    }
  })()
  const score = stockScore(d)
  const inventoryList = [['Healthy stock', lowStockCount(d) > 0 ? String(d.stock.length - lowStockCount(d) - outStockCount(d)) : String(d.stock.length), 'green'], ['Low stock', String(lowStockCount(d)), 'amber'], ['Out of stock', String(outStockCount(d)), 'red']] as [string, string, string][]
  return <div className="dashboard-view"><div className="welcome-row"><div><p className="page-kicker">{role.toUpperCase()} WORKSPACE</p><h2>{info.title} <span className="wave">✦</span></h2><p>{info.welcome}</p></div><div className="quick-actions"><label className="dashboard-role-switcher">Role<select value={role} onChange={e => window.dispatchEvent(new CustomEvent('smartgarage-role', { detail: e.target.value }))}>{STAFF_ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}</select></label><ExportButtons csv={() => downloadCSV('jobs.csv', ['Job card', 'Customer', 'Vehicle', 'Status', 'Amount', 'Assigned'], d.jobs.map(j => [j.id, j.customerName, j.reg, j.status, ksh(jobTotal(j)), j.mechanicName]))} pdf={() => downloadPDF('jobs.pdf', 'Job Cards — SmartGarage 360', ['Job card', 'Customer', 'Vehicle', 'Status', 'Amount', 'Assigned'], d.jobs.map(j => [j.id, j.customerName, j.reg, j.status, ksh(jobTotal(j)), j.mechanicName]))} notify={notify} />{can(role, 'create-job') && <button onClick={() => { setView('job-cards'); openModal('job-cards') }} className="primary-button"><Plus className="size-4" /> New job card</button>}</div></div><div className="metric-grid">{metrics.map(m => <div className="metric-card" key={m.label}><div className={cn('metric-icon', `metric-${m.tone}`)}><m.icon className="size-4" /></div><small>{m.label}</small><strong>{m.num}</strong><span className={cn(m.tone === 'amber' || m.tone === 'red' ? 'change-warn' : 'change-up')}>{m.change}</span></div>)}</div><div className="content-grid"><div className={cn('data-card recent-jobs', !ROLE_VIEWS[role].includes('inventory') && 'col-span-full')}><div className="card-head"><div><h3>Recent job cards</h3><p>Latest activity from your workshop</p></div><button onClick={() => setView('job-cards')} className="text-button">View all <ArrowRight className="size-4" /></button></div><div className="jobs-table"><div className="table-row table-header"><span>Customer & vehicle</span><span>Status</span><span>Amount</span><span /></div>{d.jobs.slice(0, 5).map((job, i) => <button onClick={() => openJob(job.id)} className="table-row" key={job.id}><span className="customer-cell"><i className={cn('customer-avatar', `avatar-${i}`)}>{job.customerInitials}</i><b>{job.customerName}<small>{job.vehicleName} · {job.reg}</small></b></span><Status tone={statusMeta(job.status).tone}>{statusMeta(job.status).label}</Status><strong>{ksh(jobTotal(job))}</strong><ChevronRight className="size-4 text-slate-400" /></button>)}</div></div>{ROLE_VIEWS[role].includes('inventory') && <div className="data-card inventory-alert"><div className="card-head"><div><h3>Inventory health</h3><p>Parts needing attention</p></div><button onClick={() => setView('inventory')} className="icon-button"><ArrowRight className="size-4" /></button></div><div className="inventory-score"><div className="score-ring"><strong>{score}</strong><span>/100</span></div><div><b>{score > 60 ? 'Good shape' : 'Needs attention'}</b><p>Stock levels across {d.stock.length} tracked parts</p></div></div><div className="stock-list">{inventoryList.map(([label, num, dot]) => <div key={label}><span><i className={cn('stock-dot', dot)} /> {label}</span><b>{num} items</b></div>)}</div><button onClick={() => setView('inventory')} className="full-button">Review inventory <ArrowRight className="size-4" /></button></div>}</div><div className="bottom-grid"><div className={cn('data-card revenue-card', !ROLE_VIEWS[role].includes('reminders') && 'col-span-full')}><div className="card-head"><div><h3>Revenue overview</h3><p>Total revenue captured</p></div></div><div className="revenue-value">{ksh(revenueTotal(d))} <span><TrendingUp className="size-3" /> {outstandingTotal(d) > 0 ? 'open invoices' : 'on track'}</span></div><svg className="big-chart" viewBox="0 0 700 150" preserveAspectRatio="none"><path d="M0 124 C35 116 62 122 90 104 S135 106 165 112 S216 82 255 92 S302 68 340 80 S390 48 430 66 S470 55 510 36 S570 52 610 28 S660 35 700 12" /><path className="area" d="M0 124 C35 116 62 122 90 104 S135 106 165 112 S216 82 255 92 S302 68 340 80 S390 48 430 66 S470 55 510 36 S570 52 610 28 S660 35 700 12 V150 H0Z" /></svg><div className="chart-labels"><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Today</span></div></div>{ROLE_VIEWS[role].includes('reminders') && <div className="data-card reminders-card"><div className="card-head"><div><h3>Today&apos;s reminders</h3><p>Stay ahead of your customers</p></div><button onClick={() => setView('reminders')} className="text-button">View all <ArrowRight className="size-4" /></button></div>{d.reminders.filter(r => r.status === 'pending').slice(0, 3).map((r, i) => <button className="reminder-item cursor-pointer w-full text-left border-0 bg-transparent p-0" onClick={() => setView('reminders')} key={r.id}><div className={cn('reminder-icon', i === 0 ? 'amber' : i === 1 ? 'blue' : 'red')}><Bell className="size-4" /></div><div><b>{r.text}</b><span>{r.customerName} · {r.vehicleReg}</span></div><small>{r.due}</small></button>)}</div>}</div></div>
}

// ---- job cards --------------------------------------------------------------
function JobCardsView({ demo, onOpen, openModal, notify, role }: {
  demo: DemoRepository; onOpen: (id: string) => void; openModal: (v: View) => void; notify: (m: string) => void; role: StaffRole
}) {
  const [query, setQuery] = useState('')
  const d = demo.getState()
  const rows = useMemo(() => d.jobs.filter(j => `${j.id} ${j.customerName} ${j.vehicleName} ${j.reg} ${j.status}`.toLowerCase().includes(query.toLowerCase())), [d.jobs, query])
  return <div className="generic-view"><div className="welcome-row"><div><p className="page-kicker">WORKSHOP MANAGEMENT</p><h2>Job Cards</h2><p>Every repair, documented from intake to handover.</p></div><div className="quick-actions"><ExportButtons csv={() => downloadCSV('job-cards.csv', ['Job card', 'Customer', 'Vehicle', 'Status', 'Amount', 'Assigned'], d.jobs.map(j => [j.id, j.customerName, j.reg, j.status, ksh(jobTotal(j)), j.mechanicName]))} pdf={() => downloadPDF('job-cards.pdf', 'Job Cards — SmartGarage 360', ['Job card', 'Customer', 'Vehicle', 'Status', 'Amount', 'Assigned'], d.jobs.map(j => [j.id, j.customerName, j.reg, j.status, ksh(jobTotal(j)), j.mechanicName]))} notify={notify} />{can(role, 'create-job') && <button className="primary-button" onClick={() => openModal('job-cards')}><Plus className="size-4" /> New job card</button>}</div></div><div className="data-card full-table-card"><div className="list-toolbar"><div className="search-field"><Search className="size-4" /><input id="global-search" placeholder="Search job cards..." value={query} onChange={e => setQuery(e.target.value)} /></div><span className="text-xs text-slate-400">{rows.length} records</span></div><div className="wide-table"><div className="wide-row wide-header" style={{ gridTemplateColumns: '1.3fr 1fr 1fr 1fr 0.9fr 1fr 20px', minWidth: 780 }}><span>Job card</span><span>Customer</span><span>Vehicle</span><span>Status</span><span>Amount</span><span>Assigned</span><span /></div>{rows.map(j => <button className="wide-row" key={j.id} onClick={() => onOpen(j.id)} style={{ gridTemplateColumns: '1.3fr 1fr 1fr 1fr 0.9fr 1fr 20px', minWidth: 780 }}><span className="strong-cell">{j.id}</span><span>{j.customerName}</span><span>{j.vehicleName} · {j.reg}</span><span><Status tone={statusMeta(j.status).tone}>{statusMeta(j.status).label}</Status></span><span>{ksh(jobTotal(j))}</span><span>{j.mechanicName}</span><ChevronRight className="size-4 text-slate-300" /></button>)}</div></div></div>
}

function JobCardView({ job, demo, setView, onBack, notify, role }: {
  job: JobCard; demo: DemoRepository; setView: (v: View) => void; onBack: () => void; notify: (m: string) => void; role: StaffRole
}) {
  const [shared, setShared] = useState(false)
  const [addingPart, setAddingPart] = useState(false)
  const [partName, setPartName] = useState('')
  const [partQty, setPartQty] = useState('1')
  const [partAmount, setPartAmount] = useState('')
  const [editNote, setEditNote] = useState(false)
  const [draftNote, setDraftNote] = useState(job.note)
  useEffect(() => { setDraftNote(job.note); setEditNote(false) }, [job.id, job.note])
  const invoice = demo.getState().invoices.find(i => i.id === invIdForJob(job.id))
  const done = DONE_STATUSES.includes(job.status)
  const stageIndex = JOB_STATUSES.indexOf(job.status)
  const meta = statusMeta(job.status)
  const partsTotal = jobPartsTotal(job)
  const total = jobTotal(job)
  const balance = invoice ? invoice.total - invoice.paid : total
  const share = () => {
    const text = `SmartGarage 360 job card ${job.id} — ${job.customerName}, ${job.vehicleName} ${job.reg} (${meta.label}). ${ksh(total)}`
    try { navigator.clipboard?.writeText(text) } catch { /* clipboard unavailable */ }
    setShared(true); notify(`Job card link copied for ${job.customerName}.`)
  }
  const advance = () => {
    const next = JOB_STATUSES[Math.min(stageIndex + 1, JOB_STATUSES.length - 1)]
    const willCreate = next === 'completed' && !invoice
    const actual = demo.advanceJob(job.id)
    if (actual === 'completed') notify(willCreate ? `Job completed — invoice ${invIdForJob(job.id)} generated and awaiting payment.` : `Job completed — invoice ${invIdForJob(job.id)} is already on file.`)
    else if (actual === 'paid') notify(`Invoice settled — ${job.customerName}\u2019s ${job.vehicleName} marked as paid.`)
    else notify(`Sample workflow advanced: ${job.customerName}\u2019s ${job.vehicleName} → ${JOB_STATUS_LABELS[actual]}.`)
  }
  return <div className="job-card-view"><div className="detail-toolbar"><div><p className="page-kicker">JOB CARD</p><h2>{job.id} <Status tone={meta.tone}>{meta.label}</Status></h2></div><div className="quick-actions">
    <button className="text-button" onClick={onBack}><ArrowLeft className="size-4" /> Back to list</button>
    {!done && can(role, 'advance-job') && <button className="secondary-button" onClick={advance}>Advance stage <ArrowRight className="size-4" /></button>}
    {ROLE_VIEWS[role].includes('invoices') && <button className="secondary-button" onClick={() => { if (invoice) { setView('invoices'); notify(`Invoice ${invoice.id} already exists for this job.`) } else if (can(role, 'add-invoice')) { demo.createInvoice(job.id); setView('invoices'); notify(`Invoice ${invIdForJob(job.id)} generated for ${ksh(total)}.`) } else { setView('invoices'); notify(`Invoice ${invIdForJob(job.id)} is on file.`) } }}><Download className="size-4" /> {invoice ? 'View invoice' : 'Generate invoice'}</button>}
    <button className="primary-button" onClick={share}><Share2 className="size-4" /> {shared ? 'Link copied' : 'Share job card'}</button>
  </div></div>
    <div className="job-hero-card"><div className="customer-profile"><div className="large-avatar">{job.customerInitials}</div><div><p className="page-kicker">CUSTOMER</p><h3>{job.customerName}</h3><div className="contact-line">{job.customerPhone ? <><Phone className="size-3.5" /> {job.customerPhone}</> : <><Phone className="size-3.5" /> 0712 345 678</>}{job.customerEmail && <><Mail className="ml-3 size-3.5" /> {job.customerEmail}</>}</div><div className="contact-line"><MapPin className="size-3.5" /> Westlands, Nairobi</div></div></div><div className="vehicle-profile"><div className="vehicle-icon"><Car className="size-7" /></div><div><p className="page-kicker">VEHICLE</p><h3>{job.vehicleName} <span>{job.reg}</span></h3><div className="contact-line">{job.year} <i /> {job.mileage} <i /> Silver</div></div></div></div>
    <div className="job-timeline-card"><div className="card-head"><div><h3>Job progress</h3><p>{done ? `Completed on ${job.createdAt}` : `Currently: ${meta.label}`}</p></div><Status tone={done ? 'green' : meta.tone}>{job.status === 'delivered' ? 'Delivered' : job.status === 'paid' ? 'Ready for delivery' : done ? 'Ready for collection' : meta.label}</Status></div><div className="job-timeline">{JOB_STATUSES.map((s, i) => <div className="job-step" key={s}><div className={cn('job-step-dot', i > stageIndex && 'opacity-30')}>{i <= stageIndex ? <Check className="size-3.5" /> : null}</div><div className="job-step-line" /><b>{JOB_STATUS_LABELS[s]}</b><small>{i < stageIndex ? 'done' : i === stageIndex ? 'current' : 'pending'}</small></div>)}</div></div>
    <div className="job-columns"><div className="job-main-column"><div className="data-card"><div className="card-head"><div><h3>Service details</h3><p>What brought this vehicle in</p></div></div><div className="detail-block"><small>Customer complaint</small><p>{job.complaint}</p></div><div className="detail-block"><small>Diagnosis</small><p>{job.diagnosis}</p></div><div className="detail-block"><small>Work completed</small><div className="check-list">{jobParts(job).map(p => <span key={p.description}><CheckCircle2 className="size-4 text-emerald-500" />{p.description}</span>)}</div></div><div className="assigned-mechanic"><div className="mechanic-avatar">{initialsOf(job.mechanicName)}</div><div><small>MECHANIC ASSIGNED</small><b>{job.mechanicName}</b></div><ShieldCheck className="ml-auto size-5 text-emerald-500" /></div></div><div className="data-card parts-card"><div className="card-head"><div><h3>Parts & materials</h3><p>{job.items.length} items on this job</p></div>{can(role, 'add-part') && <button className="text-button" onClick={() => setAddingPart(v => !v)}>{addingPart ? 'Done' : 'Add part'} {addingPart ? <X className="size-4" /> : <Plus className="size-4" />}</button>}</div>{addingPart && <div className="mb-3 grid grid-cols-[1.5fr_0.6fr_0.8fr_auto] items-end gap-2">{['Part name', 'Qty', 'Amount'].map(l => <span key={l} className="text-[10px] font-bold uppercase text-slate-400">{l}</span>)}<span />{/* placeholder row for header alignment */}<input placeholder="e.g. Air Filter" value={partName} onChange={e => setPartName(e.target.value)} className={inputCls} /><input placeholder="1" value={partQty} onChange={e => setPartQty(e.target.value)} className={inputCls} /><input placeholder="1200" value={partAmount} onChange={e => setPartAmount(e.target.value)} className={inputCls} /><button className="rounded-md bg-emerald-600 px-3 py-2 text-xs font-bold text-white" onClick={() => { const amt = parseInt(partAmount, 10) || 0; const q = parseInt(partQty, 10) || 1; if (!partName || !amt) { notify('Add a part name and amount first.'); return } demo.addJobItem(job.id, { kind: 'part', description: partName, qty: q, unitPrice: amt }); setPartName(''); setPartQty('1'); setPartAmount(''); setAddingPart(false); notify(`${partName} added to job card.`) }}>Add</button></div>}<div className="parts-table"><div className="parts-row parts-header"><span>Item</span><span>Qty</span><span>Unit price</span><span>Total</span></div>{jobParts(job).map(r => <div className="parts-row" key={r.description}><span><i className="part-icon"><Wrench className="size-3" /></i>{r.description}</span><span>{r.qty}</span><span>{ksh(r.unitPrice)}</span><b>{ksh(r.amount)}</b></div>)}<div className="parts-total"><span>Parts subtotal</span><b>{ksh(partsTotal)}</b></div></div></div></div><div className="job-side-column"><div className="data-card financial-card"><div className="card-head"><div><h3>Financial summary</h3><p>{invoice ? `Invoice ${invoice.id}` : 'No invoice yet'}</p></div><CreditCard className="size-5 text-emerald-500" /></div><div className="finance-lines"><span>Parts & materials <b>{ksh(partsTotal)}</b></span><span>Labour <b>{ksh(jobLabour(job))}</b></span><span>Workshop consumables <b>{ksh(jobConsumables(job))}</b></span></div><div className="grand-total"><span>Grand total</span><strong>{ksh(total)}</strong></div>{invoice ? (invoice.paid >= invoice.total ? <div className="paid-banner"><CheckCircle2 className="size-5" /><div><b>PAID IN FULL</b><span>Payment received · M-Pesa</span></div></div> : <div className="paid-banner !bg-amber-50 !text-amber-700" style={{ background: '#fff7e6', color: '#b45309' }}><Clock3 className="size-5" /><div><b>BALANCE DUE</b><span>{ksh(balance)} outstanding</span></div></div>) : null}{invoice && <div className="paid-detail"><span>Amount paid <b>{ksh(invoice.paid)}</b></span><span>Balance <b className={invoice.paid >= invoice.total ? 'text-emerald-600' : 'text-red-500'}>{ksh(Math.max(0, balance))}</b></span></div>}</div><div className="data-card note-card"><div className="card-head"><h3>Internal note</h3>{can(role, 'edit-note') && <button className="text-button" onClick={() => { if (editNote && draftNote !== job.note) { demo.updateJobNote(job.id, draftNote); notify('Internal note saved.') } setEditNote(v => !v) }}>{editNote ? 'Save' : 'Edit'} {editNote ? <Check className="size-4" /> : <MoreHorizontal className="size-4" />}</button>}</div>{editNote ? <textarea value={draftNote} onChange={e => setDraftNote(e.target.value)} className={cn(inputCls, 'h-20 resize-none')} /> : <p>{job.note}</p>}<div className="note-author"><div className="mechanic-avatar">{PERSONA[role].initials}</div><span>Added by {PERSONA[role].name} · Today, 3:20 PM</span></div></div><div className="next-service"><AlertTriangle className="size-5" /><div><b>Next service due</b><span>At 134,500 km or Feb 2025</span></div></div></div></div></div>
}

// ---- generic tables ---------------------------------------------------------
function GenericView({ view, demo, openModal, notify, role }: {
  view: 'customers' | 'vehicles' | 'inventory' | 'invoices' | 'reminders'; demo: DemoRepository
  openModal: (v: View) => void; notify: (m: string) => void; role: StaffRole
}) {
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const d = demo.getState()

  const config: {
    title: string; desc: string; addLabel: string; headers: string[]
    rows: string[][]; grid: string; csv: () => void
  } = (() => {
    const grid = (n: number, extra = 0) => `minmax(130px,1.3fr) ${Array(Math.max(0, n - 1) + extra).fill('minmax(90px,1fr)').join(' ')} 20px`
    switch (view) {
      case 'customers': {
        const rows = d.customers.filter(c => `${c.name} ${c.phone} ${c.vehicleCount}`.toLowerCase().includes(q))
        return { title: 'Customers', desc: 'Build lasting relationships with every driver.', addLabel: 'Add customer', headers: ['Customer', 'Phone', 'Vehicles', 'Total spending', 'Outstanding', 'Last service'], grid: grid(6), rows: rows.map(c => [c.name, c.phone, c.vehicleCount, ksh(c.spent), ksh(c.outstanding), c.lastService]), csv: () => downloadCSV('customers.csv', ['Customer', 'Phone', 'Vehicles', 'Total spending', 'Outstanding', 'Last service'], rows.map(c => [c.name, c.phone, c.vehicleCount, String(c.spent), String(c.outstanding), c.lastService])) }
      }
      case 'vehicles': {
        const rows = d.vehicles.filter(v => `${v.reg} ${v.makeModel} ${v.ownerName}`.toLowerCase().includes(q))
        return { title: 'Vehicles', desc: 'A complete service history for every vehicle.', addLabel: 'Add vehicle', headers: ['Registration', 'Make / model', 'Year', 'Owner', 'Mileage', 'Last service'], grid: grid(6), rows: rows.map(v => [v.reg, v.makeModel, v.year, v.ownerName, v.mileage, v.lastService]), csv: () => downloadCSV('vehicles.csv', ['Registration', 'Make / model', 'Year', 'Owner', 'Mileage', 'Last service'], rows.map(v => [v.reg, v.makeModel, v.year, v.ownerName, v.mileage, v.lastService])) }
      }
      case 'inventory': {
        const rows = d.stock.filter(s => `${s.name} ${s.partNo} ${s.supplier} ${s.location}`.toLowerCase().includes(q))
        return { title: 'Inventory', desc: 'Know what is on the shelf before you promise the job.', addLabel: 'Add stock', headers: ['Part name', 'Part number', 'Supplier', 'Buy price', 'Sell price', 'In stock', 'Location'], grid: grid(7), rows: rows.map(s => [s.name, s.partNo, s.supplier, ksh(s.buyPrice), ksh(s.sellPrice), `${s.qty}${s.unit}`, s.location]), csv: () => downloadCSV('inventory.csv', ['Part name', 'Part number', 'Supplier', 'Buy price', 'Sell price', 'In stock', 'Location'], rows.map(s => [s.name, s.partNo, s.supplier, String(s.buyPrice), String(s.sellPrice), String(s.qty), s.location])) }
      }
      case 'invoices': {
        const rows = d.invoices.filter(i => `${i.id} ${i.customerName} ${i.vehicleReg}`.toLowerCase().includes(q))
        return { title: 'Invoices', desc: 'Stay on top of every shilling that moves through the workshop.', addLabel: 'New invoice', headers: ['Invoice #', 'Customer', 'Vehicle', 'Date', 'Grand total', 'Balance', 'Status'], grid: grid(7), rows: rows.map(i => [i.id, i.customerName, i.vehicleReg, i.date, ksh(i.total), ksh(i.total - i.paid), i.paid >= i.total ? 'Paid' : i.paid > 0 ? 'Partial' : 'Unpaid']), csv: () => downloadCSV('invoices.csv', ['Invoice #', 'Customer', 'Vehicle', 'Date', 'Grand total', 'Balance', 'Status'], rows.map(i => [i.id, i.customerName, i.vehicleReg, i.date, String(i.total), String(i.total - i.paid), i.paid >= i.total ? 'Paid' : i.paid > 0 ? 'Partial' : 'Unpaid'])) }
      }
      default: {
        const rows = d.reminders.filter(r => `${r.text} ${r.customerName} ${r.vehicleReg} ${CHANNEL_LABELS[r.channel]}`.toLowerCase().includes(q))
        return { title: 'Reminders', desc: 'The right message, at exactly the right time.', addLabel: 'New reminder', headers: ['Reminder', 'Customer', 'Vehicle', 'Due date', 'Channel', 'Action'], grid: grid(6), rows: rows.map(r => [r.text, r.customerName, r.vehicleReg, r.due, CHANNEL_LABELS[r.channel], r.status === 'sent' ? 'Sent' : 'Send']), csv: () => downloadCSV('reminders.csv', ['Reminder', 'Customer', 'Vehicle', 'Due date', 'Channel', 'Status'], rows.map(r => [r.text, r.customerName, r.vehicleReg, r.due, CHANNEL_LABELS[r.channel], r.status === 'sent' ? 'Sent' : 'Pending'])) }
      }
    }
  })()

  const entities: Record<'customers' | 'vehicles' | 'inventory' | 'invoices' | 'reminders', React.ReactNode[]> = {
    customers: d.customers.filter(c => `${c.name} ${c.phone} ${c.vehicleCount}`.toLowerCase().includes(q)).map(c => <div className="wide-row" key={c.name} style={{ gridTemplateColumns: config.grid, minWidth: 760 }}><span className="strong-cell">{c.name}</span><span>{c.phone}</span><span>{c.vehicleCount}</span><span>{ksh(c.spent)}</span><span className={cn(c.outstanding > 0 && 'text-red-500')}>{ksh(c.outstanding)}</span><span>{c.lastService}</span><ChevronRight className="size-4 text-slate-300" /></div>),
    vehicles: d.vehicles.filter(v => `${v.reg} ${v.makeModel} ${v.ownerName}`.toLowerCase().includes(q)).map(v => <div className="wide-row" key={v.reg} style={{ gridTemplateColumns: config.grid, minWidth: 760 }}><span className="strong-cell">{v.reg}</span><span>{v.makeModel}</span><span>{v.year}</span><span>{v.ownerName}</span><span>{v.mileage}</span><span>{v.lastService}</span><ChevronRight className="size-4 text-slate-300" /></div>),
    inventory: d.stock.filter(s => `${s.name} ${s.partNo} ${s.supplier} ${s.location}`.toLowerCase().includes(q)).map(s => { const low = s.qty > 0 && s.qty <= s.min; const out = s.qty === 0; return <div className="wide-row" key={s.partNo} style={{ gridTemplateColumns: config.grid, minWidth: 760 }}><span className="strong-cell">{s.name}</span><span>{s.partNo}</span><span>{s.supplier}</span><span>{ksh(s.buyPrice)}</span><span>{ksh(s.sellPrice)}</span><span className={cn('font-bold', out ? 'text-red-500' : low ? 'text-amber-600' : 'text-emerald-600')}><span className="inline-flex items-center gap-1.5">{can(role, 'adjust-stock') && <button aria-label="Reduce stock" className="grid size-6 place-items-center rounded border border-slate-200 text-slate-500 hover:bg-slate-100" onClick={() => demo.adjustStock(s.partNo, -1, 'Manual adjustment')}><Minus className="size-3" /></button>}{s.qty}{s.unit}{can(role, 'adjust-stock') && <button aria-label="Increase stock" className="grid size-6 place-items-center rounded border border-slate-200 text-slate-500 hover:bg-slate-100" onClick={() => demo.adjustStock(s.partNo, 1, 'Manual adjustment')}><Plus className="size-3" /></button>}</span></span><span>{s.location}</span><ChevronRight className="size-4 text-slate-300" /></div> }),
    invoices: d.invoices.filter(i => `${i.id} ${i.customerName} ${i.vehicleReg}`.toLowerCase().includes(q)).map(i => { const due = i.total - i.paid; return <div className="wide-row" key={i.id} style={{ gridTemplateColumns: config.grid, minWidth: 760 }}><span className="strong-cell">{i.id}</span><span>{i.customerName}</span><span>{i.vehicleReg}</span><span>{i.date}</span><span>{ksh(i.total)}</span><span className={cn(due > 0 && 'text-red-500')}>{ksh(due)}</span><span className="flex items-center gap-2">{due <= 0 ? <Status>Paid</Status> : <Status tone={i.paid > 0 ? 'amber' : 'red'}>{i.paid > 0 ? 'Partial' : 'Unpaid'}</Status>}{due > 0 && can(role, 'record-payment') && <button className="rounded-md bg-emerald-600 px-2.5 py-1.5 text-[10px] font-bold text-white hover:bg-emerald-700" onClick={() => { demo.recordPayment(i.id, { amount: due, method: 'cash' }); notify(`Payment of ${ksh(due)} recorded on ${i.id}.`) }}>Record payment</button>}</span><ChevronRight className="size-4 text-slate-300" /></div> }),
    reminders: d.reminders.filter(r => `${r.text} ${r.customerName} ${r.vehicleReg} ${CHANNEL_LABELS[r.channel]}`.toLowerCase().includes(q)).map(r => <div className="wide-row" key={r.id} style={{ gridTemplateColumns: config.grid, minWidth: 760 }}><span className="strong-cell">{r.text}</span><span>{r.customerName}</span><span>{r.vehicleReg}</span><span>{r.due}</span><span>{CHANNEL_LABELS[r.channel]}</span><span>{r.status === 'sent' ? <Status>Sent</Status> : can(role, 'send-reminder') && <button className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-1.5 text-[10px] font-bold text-white hover:bg-slate-700" onClick={() => { demo.sendReminder(r.id); notify(`${CHANNEL_LABELS[r.channel]} reminder sent to ${r.customerName}.`) }}><Send className="size-3" /> Send</button>}</span><ChevronRight className="size-4 text-slate-300" /></div>),
  }

  return <div className="generic-view"><div className="welcome-row"><div><p className="page-kicker">WORKSHOP MANAGEMENT</p><h2>{config.title}</h2><p>{config.desc}</p></div><div className="quick-actions"><ExportButtons csv={() => config.csv()} pdf={() => downloadPDF(`${config.title.toLowerCase().replace(/ /g, '-')}.pdf`, `${config.title} — SmartGarage 360`, config.headers, config.rows)} notify={notify} />{addActionForView[view] && can(role, addActionForView[view]) && <button className="primary-button" onClick={() => openModal(view)}><Plus className="size-4" /> {config.addLabel}</button>}</div></div><div className="data-card full-table-card"><div className="list-toolbar"><div className="search-field"><Search className="size-4" /><input id="global-search" placeholder={`Search ${config.title.toLowerCase()}...`} value={query} onChange={e => setQuery(e.target.value)} /></div><span className="text-xs text-slate-400">{config.rows.length} records</span></div><div className="wide-table"><div className="wide-row wide-header" style={{ gridTemplateColumns: config.grid, minWidth: 760 }}>{config.headers.map(h => <span key={h}>{h}</span>)}</div>{entities[view].length ? entities[view] : <div className="wide-row" style={{ gridTemplateColumns: config.grid, minWidth: 760 }}><span className="col-span-full py-3 text-center text-slate-400" style={{ gridColumn: '1 / -1' }}>No records match your search.</span></div>}</div></div></div>
}

// ---- reports & settings -----------------------------------------------------
function Reports({ demo, setView, notify }: { demo: DemoRepository; setView: (v: View) => void; notify: (m: string) => void }) {
  const d = demo.getState()
  const usage = useMemo(() => {
    const map: Record<string, number> = {}
    for (const job of d.jobs) for (const item of job.items) if (item.kind === 'part') map[item.description] = (map[item.description] || 0) + item.qty
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 4)
  }, [d.jobs])
  const outstanding = outstandingTotal(d)
  const open = openInvoices(d)
  const weekData = [['Mon', 62, 24], ['Tue', 78, 18], ['Wed', 54, 30], ['Thu', 88, 14], ['Fri', 72, 22], ['Sat', 64, 28], ['Sun', 40, 12]] as [string, number, number][]
  return <div className="generic-view"><div className="welcome-row"><div><p className="page-kicker">INSIGHTS</p><h2>Reports</h2><p>Turn workshop activity into better business decisions.</p></div><ExportButtons csv={() => downloadCSV('revenue-report.csv', ['Invoice #', 'Customer', 'Vehicle', 'Date', 'Total', 'Paid', 'Balance'], d.invoices.map(i => [i.id, i.customerName, i.vehicleReg, i.date, String(i.total), String(i.paid), String(i.total - i.paid)]))} pdf={() => downloadPDF('revenue-report.pdf', 'Revenue Report — SmartGarage 360', ['Invoice #', 'Customer', 'Vehicle', 'Date', 'Total', 'Paid', 'Balance'], d.invoices.map(i => [i.id, i.customerName, i.vehicleReg, i.date, ksh(i.total), ksh(i.paid), ksh(i.total - i.paid)]))} notify={notify} /></div><div className="report-grid"><div className="data-card report-revenue"><div className="card-head"><div><h3>Revenue trend</h3><p>Last 7 days</p></div><span className="text-[10px] font-bold text-slate-400">{TODAY}</span></div><div className="report-total">{ksh(revenueTotal(d))} <span>+24.8%</span></div><svg className="big-chart" viewBox="0 0 700 170" preserveAspectRatio="none"><path d="M0 140 C45 132 70 138 110 116 S175 124 220 102 S280 112 320 118 S390 70 430 84 S500 65 550 42 S620 67 700 20" /><path className="area" d="M0 140 C45 132 70 138 110 116 S175 124 220 102 S280 112 320 118 S390 70 430 84 S500 65 550 42 S620 67 700 20 V170 H0Z" /></svg></div><div className="data-card report-bars"><div className="card-head"><div><h3>Jobs overview</h3><p>Completed vs pending</p></div></div><div className="bar-chart">{weekData.map(r => <div key={r[0]}><div className="bar-pair"><i style={{ height: `${r[1]}%` }} /><i style={{ height: `${r[2]}%` }} /></div><small>{r[0]}</small></div>)}</div><div className="chart-legend"><span><i className="legend-green" /> Completed · {completedCount(d)}</span><span><i className="legend-amber" /> Pending · {activeCount(d)}</span></div></div><div className="data-card parts-used"><div className="card-head"><div><h3>Most-used parts</h3><p>This month</p></div></div>{usage.map(([name, count], i) => <div className="used-part" key={name}><span className="used-rank">0{i + 1}</span><b>{name}</b><small>{count} uses</small><div><i style={{ width: `${Math.max(20, 90 - i * 17)}%` }} /></div></div>)}</div><div className="data-card outstanding-card"><div className="card-head"><div><h3>Outstanding balances</h3><p>Requires follow-up</p></div><CreditCard className="size-5 text-red-500" /></div><strong>{ksh(outstanding)}</strong><p>Across {open} unpaid invoice{open === 1 ? '' : 's'}</p><button className="full-button" onClick={() => setView('invoices')}>View invoices <ArrowRight className="size-4" /></button></div></div></div>
}

function SettingsView({ demo, notify }: { demo: DemoRepository; notify: (m: string) => void }) {
  const p = demo.getState().garage
  const [form, setForm] = useState(p)
  useEffect(() => setForm(demo.getState().garage), [demo.getState().garage])
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value })
  return <div className="generic-view"><div className="welcome-row"><div><p className="page-kicker">CONFIGURATION</p><h2>Settings</h2><p>Make SmartGarage 360 work your way.</p></div></div><div className="settings-grid"><div className="data-card settings-card"><h3>Workshop profile</h3><p>Keep your garage information up to date.</p><label>Workshop name<input value={form.name} onChange={set('name')} /></label><label>Phone number<input value={form.phone} onChange={set('phone')} /></label><label>Location<input value={form.location} onChange={set('location')} /></label><label>Default currency<input value={form.currency} onChange={set('currency')} /></label><button className="primary-button" onClick={() => { demo.saveGarage(form); notify('Workshop profile saved.') }}>Save changes</button></div><div className="data-card settings-card"><h3>Team & permissions</h3><p>Manage who can access your workshop data.</p>{['Peter Wambui · Owner', 'Brian Otieno · Manager', 'David Kariuki · Mechanic', 'Joyce Njeri · Receptionist', 'Faith Wanjiku · Accountant'].map(x => <div className="team-row" key={x}><div className="user-avatar">{initialsOf(x.split(' · ')[0])}</div><b>{x}</b><MoreHorizontal className="ml-auto size-4" /></div>)}</div></div></div>
}

// ---- modals -----------------------------------------------------------------
function AddModal({ view, demo, notify, onClose }: { view: View; demo: DemoRepository; notify: (m: string) => void; onClose: () => void }) {
  switch (view) {
    case 'job-cards': return <AddJobModal demo={demo} notify={notify} onClose={onClose} />
    case 'customers': return <AddCustomerModal demo={demo} notify={notify} onClose={onClose} />
    case 'vehicles': return <AddVehicleModal demo={demo} notify={notify} onClose={onClose} />
    case 'inventory': return <AddStockModal demo={demo} notify={notify} onClose={onClose} />
    case 'invoices': return <AddInvoiceModal demo={demo} notify={notify} onClose={onClose} />
    default: return <AddReminderModal demo={demo} notify={notify} onClose={onClose} />
  }
}

function AddJobModal({ demo, notify, onClose }: { demo: DemoRepository; notify: (m: string) => void; onClose: () => void }) {
  const [customerId, setCustomerId] = useState('')
  const [vehicleId, setVehicleId] = useState('')
  const [complaint, setComplaint] = useState('')
  const [amount, setAmount] = useState('')
  const customers = demo.listCustomers()
  const vehicles = demo.listVehicles().filter(v => v.customerId === customerId)
  const submit = () => {
    if (!customerId || !vehicleId) { notify('Customer and vehicle are required.'); return }
    const id = demo.createJob({ customerId, vehicleId, complaint: complaint || 'General check-up', estimatedAmount: parseInt(amount, 10) || 0 })
    const customer = customers.find(c => c.id === customerId)
    notify(`Job card ${id} created for ${customer?.name ?? 'customer'}.`); onClose()
  }
  return <Modal title="New job card" onClose={onClose}><Field label="Customer"><select className={inputCls} value={customerId} onChange={e => { setCustomerId(e.target.value); setVehicleId('') }}><option value="" disabled>Select a customer…</option>{customers.map(c => <option key={c.id} value={c.id}>{c.name} · {c.phone}</option>)}</select></Field><Field label="Vehicle"><select className={inputCls} value={vehicleId} onChange={e => setVehicleId(e.target.value)} disabled={!customerId}><option value="" disabled>{customerId ? 'Select a vehicle…' : 'Select a customer first'}</option>{vehicles.map(v => <option key={v.id} value={v.id}>{v.makeModel} · {v.reg}</option>)}</select></Field><Field label="Customer complaint"><input className={inputCls} placeholder="e.g. Engine noise and vibration" value={complaint} onChange={e => setComplaint(e.target.value)} /></Field><Field label="Estimated amount (KSh)"><input className={inputCls} type="number" min={0} placeholder="e.g. 12000" value={amount} onChange={e => setAmount(e.target.value)} /></Field><SubmitRow onCancel={onClose}><button className="rounded-md bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700" onClick={submit}>Create job card</button></SubmitRow></Modal>
}

function AddCustomerModal({ demo, notify, onClose }: { demo: DemoRepository; notify: (m: string) => void; onClose: () => void }) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const submit = () => {
    if (!name) { notify('Customer name is required.'); return }
    demo.addCustomer({ name, phone, email }); notify(`${name} added as a customer.`); onClose()
  }
  return <Modal title="Add customer" onClose={onClose}><Field label="Full name"><input className={inputCls} placeholder="e.g. Faith Chebet" value={name} onChange={e => setName(e.target.value)} /></Field><Field label="Phone number"><input className={inputCls} placeholder="e.g. 0711 234 567" value={phone} onChange={e => setPhone(e.target.value)} /></Field><Field label="Email (optional)"><input className={inputCls} placeholder="e.g. faith@example.com" value={email} onChange={e => setEmail(e.target.value)} /></Field><SubmitRow onCancel={onClose}><button className="rounded-md bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700" onClick={submit}>Add customer</button></SubmitRow></Modal>
}

function AddVehicleModal({ demo, notify, onClose }: { demo: DemoRepository; notify: (m: string) => void; onClose: () => void }) {
  const [reg, setReg] = useState(''); const [makeModel, setMakeModel] = useState(''); const [year, setYear] = useState(''); const [customerId, setCustomerId] = useState(''); const [mileage, setMileage] = useState('')
  const submit = () => {
    if (!reg || !makeModel) { notify('Registration and make/model are required.'); return }
    if (!customerId) { notify('Choose an owner for this vehicle.'); return }
    demo.addVehicle({ customerId, reg, makeModel, year: year || '—', mileage: mileage ? `${mileage} km` : '—' }); notify(`${reg} added to the fleet.`); onClose()
  }
  return <Modal title="Add vehicle" onClose={onClose}><Field label="Registration"><input className={inputCls} placeholder="e.g. KDM 910Z" value={reg} onChange={e => setReg(e.target.value)} /></Field><Field label="Make / model"><input className={inputCls} placeholder="e.g. Toyota Hilux" value={makeModel} onChange={e => setMakeModel(e.target.value)} /></Field><div className="grid grid-cols-2 gap-2"><Field label="Year"><input className={inputCls} placeholder="e.g. 2019" value={year} onChange={e => setYear(e.target.value)} /></Field><Field label="Owner"><select className={inputCls} value={customerId} onChange={e => setCustomerId(e.target.value)}><option value="" disabled>Select owner…</option>{demo.listCustomers().map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field></div><Field label="Mileage (km)"><input className={inputCls} placeholder="e.g. 88,000" value={mileage} onChange={e => setMileage(e.target.value)} /></Field><SubmitRow onCancel={onClose}><button className="rounded-md bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700" onClick={submit}>Add vehicle</button></SubmitRow></Modal>
}

function AddStockModal({ demo, notify, onClose }: { demo: DemoRepository; notify: (m: string) => void; onClose: () => void }) {
  const [name, setName] = useState(''); const [partNo, setPartNo] = useState(''); const [supplier, setSupplier] = useState(''); const [buy, setBuy] = useState(''); const [sell, setSell] = useState(''); const [qty, setQty] = useState(''); const [unit, setUnit] = useState(''); const [location, setLocation] = useState('')
  const submit = () => {
    if (!name || !partNo) { notify('Part name and part number are required.'); return }
    const min = Math.max(1, Math.ceil((parseInt(qty, 10) || 0) / 3))
    demo.addStock({ name, partNo, supplier: supplier || '—', buyPrice: parseInt(buy, 10) || 0, sellPrice: parseInt(sell, 10) || 0, qty: parseInt(qty, 10) || 0, unit, location: location || '—', min }); notify(`${name} added to inventory.`); onClose()
  }
  return <Modal title="Add stock" onClose={onClose}><Field label="Part name"><input className={inputCls} placeholder="e.g. Brake Pads" value={name} onChange={e => setName(e.target.value)} /></Field><div className="grid grid-cols-2 gap-2"><Field label="Part number"><input className={inputCls} placeholder="e.g. BP-UNI-01" value={partNo} onChange={e => setPartNo(e.target.value)} /></Field><Field label="Supplier"><input className={inputCls} placeholder="e.g. BrakePro KE" value={supplier} onChange={e => setSupplier(e.target.value)} /></Field></div><div className="grid grid-cols-2 gap-2"><Field label="Buy price (KSh)"><input className={inputCls} type="number" value={buy} onChange={e => setBuy(e.target.value)} /></Field><Field label="Sell price (KSh)"><input className={inputCls} type="number" value={sell} onChange={e => setSell(e.target.value)} /></Field></div><div className="grid grid-cols-2 gap-2"><Field label="Quantity"><input className={inputCls} type="number" value={qty} onChange={e => setQty(e.target.value)} /></Field><Field label="Unit"><input className={inputCls} placeholder="e.g. L, pcs" value={unit} onChange={e => setUnit(e.target.value)} /></Field></div><Field label="Shelf location"><input className={inputCls} placeholder="e.g. Shelf A1" value={location} onChange={e => setLocation(e.target.value)} /></Field><SubmitRow onCancel={onClose}><button className="rounded-md bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700" onClick={submit}>Add stock</button></SubmitRow></Modal>
}

function AddInvoiceModal({ demo, notify, onClose }: { demo: DemoRepository; notify: (m: string) => void; onClose: () => void }) {
  const [jobId, setJobId] = useState('')
  const jobs = demo.listJobs()
  const submit = () => {
    if (!jobId) { notify('Choose a job card to invoice.'); return }
    const job = jobs.find(j => j.id === jobId)
    const id = demo.createInvoice(jobId)
    if (!id) { notify('Invoice already exists for this job.'); onClose(); return }
    notify(`Invoice ${id} created for ${ksh(job ? jobTotal(job) : 0)}.`); onClose()
  }
  return <Modal title="New invoice" onClose={onClose}><Field label="Job card"><select className={inputCls} value={jobId} onChange={e => setJobId(e.target.value)}><option value="" disabled>Select a job card…</option>{jobs.map(j => <option key={j.id} value={j.id}>{j.id} · {j.customerName} · {j.reg}</option>)}</select></Field><SubmitRow onCancel={onClose}><button className="rounded-md bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700" onClick={submit}>Create invoice</button></SubmitRow></Modal>
}

function AddReminderModal({ demo, notify, onClose }: { demo: DemoRepository; notify: (m: string) => void; onClose: () => void }) {
  const [text, setText] = useState(''); const [customerId, setCustomerId] = useState(''); const [vehicleId, setVehicleId] = useState(''); const [due, setDue] = useState(''); const [type, setType] = useState<'service-due' | 'vehicle-ready' | 'appointment' | 'balance' | 'approval' | 'low-stock' | 'job-assigned' | 'job-completed'>('service-due'); const [channel, setChannel] = useState<'whatsapp' | 'sms' | 'email' | 'app'>('whatsapp')
  const vehicles = demo.listVehicles().filter(v => v.customerId === customerId)
  const submit = () => {
    if (!text || !customerId) { notify('Reminder text and customer are required.'); return }
    demo.addReminder({ type, channel, text, due: due || 'Today', customerId, vehicleId }); notify('Reminder scheduled.') ; onClose()
  }
  return <Modal title="New reminder" onClose={onClose}><Field label="Reminder text"><input className={inputCls} placeholder="e.g. Service due" value={text} onChange={e => setText(e.target.value)} /></Field><div className="grid grid-cols-2 gap-2"><Field label="Customer"><select className={inputCls} value={customerId} onChange={e => { setCustomerId(e.target.value); setVehicleId('') }}><option value="" disabled>Select customer…</option>{demo.listCustomers().map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field><Field label="Vehicle"><select className={inputCls} value={vehicleId} onChange={e => setVehicleId(e.target.value)} disabled={!customerId}><option value="" disabled>{customerId ? 'Select vehicle…' : 'Select a customer first'}</option>{vehicles.map(v => <option key={v.id} value={v.id}>{v.reg}</option>)}</select></Field></div><Field label="Due date"><input className={inputCls} placeholder="e.g. Tomorrow" value={due} onChange={e => setDue(e.target.value)} /></Field><div className="grid grid-cols-2 gap-2"><Field label="Type"><select className={inputCls} value={type} onChange={e => setType(e.target.value as typeof type)}><option>service-due</option><option>vehicle-ready</option><option>appointment</option><option>balance</option><option>approval</option><option>low-stock</option><option>job-assigned</option><option>job-completed</option></select></Field><Field label="Channel"><select className={inputCls} value={channel} onChange={e => setChannel(e.target.value as typeof channel)}><option>whatsapp</option><option>sms</option><option>email</option><option>app</option></select></Field></div><SubmitRow onCancel={onClose}><button className="rounded-md bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700" onClick={submit}>Schedule reminder</button></SubmitRow></Modal>
}

// ---- presentation layer -----------------------------------------------------
function PresentationLayer({ demo, view, setView, onExit, notify, onFlagship }: {
  demo: DemoRepository; view: View; setView: (v: View) => void; onExit: () => void; notify: (m: string) => void; onFlagship: () => void
}) {
  const [tourOpen, setTourOpen] = useState(false)
  const [tourStep, setTourStep] = useState(0)
  const steps = [{ view: 'dashboard' as View, title: 'Start with the command centre', copy: 'Lead with the numbers shareholders care about: vehicles, jobs, revenue and payment risk.' }, { view: 'job-cards' as View, title: 'Show every repair clearly', copy: 'Open a live job card to demonstrate traceability from diagnosis to payment.' }, { view: 'inventory' as View, title: 'Prevent delays before they happen', copy: 'Low-stock signals help managers protect turnaround time and margins.' }, { view: 'reports' as View, title: 'Turn activity into decisions', copy: 'Reports turn daily workshop activity into a clear growth story.' }]
  const current = steps[tourStep]
  const startTour = () => { setTourStep(0); setView('dashboard'); setTourOpen(true) }
  const next = () => { if (tourStep === steps.length - 1) { setTourOpen(false); setView('job-cards') } else { const nextStep = tourStep + 1; setTourStep(nextStep); setView(steps[nextStep].view) } }
  const advanceWorkflow = () => {
    const job = demo.getState().jobs.find(j => !DONE_STATUSES.includes(j.status))
    if (!job) { notify('All jobs are complete. Reset demo data to start again.'); return }
    const next = JOB_STATUSES[JOB_STATUSES.indexOf(job.status) + 1]
    const willCreate = next === 'completed' && !demo.getState().invoices.some(i => i.id === invIdForJob(job.id))
    const actual = demo.advanceJob(job.id)
    if (actual === 'completed') notify(`Demo workflow: ${job.customerName}\u2019s ${job.vehicleName} completed — ${willCreate ? `invoice ${invIdForJob(job.id)} generated.` : `invoice ${invIdForJob(job.id)} awaiting payment.`}`)
    else if (actual === 'paid') notify(`Demo workflow: ${job.customerName}\u2019s ${job.vehicleName} marked as paid — invoice ${invIdForJob(job.id)} settled.`)
    else notify(`Demo workflow: ${job.customerName}\u2019s ${job.vehicleName} → ${JOB_STATUS_LABELS[actual]}.`)
  }
  return <>
    <div className="presentation-bar"><div className="presentation-status"><span className="live-dot" /> Presentation demo <small>Safe mock data · resets on exit</small></div><div className="presentation-actions"><button onClick={startTour}><Sparkles className="size-3.5" /> Start guided tour</button><button onClick={onFlagship}>Show flagship job card</button><button onClick={() => setView('reports')}>Show reports</button><button onClick={advanceWorkflow}>Advance sample workflow</button><button onClick={() => { demo.reset(); notify('Demo data reset to the clean presentation state.') }}>Reset demo data</button><button className="presentation-exit" onClick={onExit}>Exit demo</button></div></div>
    <div className="demo-state-chip"><span className="live-dot" /> Live demo state <b>{completedCount(demo.getState())} completed jobs</b><b>{demo.getState().invoices.filter(i => i.paid >= i.total).length} paid invoices</b><b>{remindersDue(demo.getState())} reminders pending</b></div>
    {tourOpen && <div className="tour-backdrop"><div className="tour-card" role="dialog" aria-modal="true" aria-labelledby="tour-title"><div className="tour-progress">SHAREHOLDER WALKTHROUGH <span>{tourStep + 1} / {steps.length}</span></div><div className="tour-icon"><Sparkles className="size-5" /></div><h2 id="tour-title">{current.title}</h2><p>{current.copy}</p><div className="tour-dots">{steps.map((step, index) => <button aria-label={`Go to step ${index + 1}`} key={step.title} onClick={() => { setTourStep(index); setView(step.view) }} className={cn(index === tourStep && 'active')} />)}</div><div className="tour-footer"><button className="tour-skip" onClick={() => setTourOpen(false)}>Skip tour</button><div className="tour-nav">{tourStep > 0 && <button onClick={() => { const previous = tourStep - 1; setTourStep(previous); setView(steps[previous].view) }}>Back</button>}<button className="primary-button" onClick={next}>{tourStep === steps.length - 1 ? 'Open job card' : 'Next step'} <ArrowRight className="size-4" /></button></div></div></div></div>}
  </>
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

export default function Page() {
  const demo = useDemoRepository()
  const [screen, setScreen] = useState<'landing' | 'login' | 'app'>('landing')
  const [view, setView] = useState<View>('dashboard')
  const [role, setRole] = useState<StaffRole>('owner')
  const [activeJobId, setActiveJobId] = useState<string | null>(null)
  const [modalView, setModalView] = useState<View | null>(null)
  const [notice, setNotice] = useState('')
  const notify = (message: string) => { setNotice(message); window.setTimeout(() => setNotice(''), 2600) }
  useEffect(() => {
    const handler = (event: Event) => {
      const next = (event as CustomEvent<string>).detail as StaffRole
      setRole(next)
      setView(v => { if (!ROLE_VIEWS[next].includes(v)) { setActiveJobId(null); return 'dashboard' } return v })
    }
    window.addEventListener('smartgarage-role', handler)
    return () => window.removeEventListener('smartgarage-role', handler)
  }, [])
  const openJob = (id: string) => { setActiveJobId(id); setView('job-cards') }
  const enterApp = (selectedRole: StaffRole) => { setRole(selectedRole); setActiveJobId(null); setView('dashboard'); setScreen('app') }
  if (screen === 'landing') return <Landing onDemo={() => setScreen('login')} />
  if (screen === 'login') return <Login onLogin={enterApp} onBack={() => setScreen('landing')} />
  return <>
    <AppShell demo={demo} view={view} setView={setView} role={role} onLogout={() => setScreen('landing')} openJob={openJob} activeJobId={activeJobId} setActiveJobId={setActiveJobId} openModal={setModalView} notify={notify} />
    {modalView && <AddModal view={modalView} demo={demo} notify={notify} onClose={() => setModalView(null)} />}
    <PresentationLayer demo={demo} view={view} setView={setView} onExit={() => { demo.reset(); setView('dashboard'); setScreen('landing') }} notify={notify} onFlagship={() => { setActiveJobId(demo.listJobs()[0].id); setView('job-cards') }} />
    {notice && <div className="demo-notice"><CheckCircle2 className="size-4" />{notice}</div>}
  </>
}