import React, { useCallback, useEffect, useState } from "react";
import {
  Activity, ArrowRight, ArrowUpRight, Bell, Building2, CalendarDays,
  Check, CheckCheck, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, ClipboardList,
  Clock3, Download, Ellipsis, FileBarChart, Filter, Flame, LayoutDashboard, Leaf, LogOut, Mail,
  MapPin, Menu, MessageCircle, MoreHorizontal, Phone, Plus, Search, Settings2, ShieldCheck,
  SlidersHorizontal, Sun, Users, X, Zap,
} from "lucide-react";
import {
  Area, AreaChart, CartesianGrid, Cell, ComposedChart, Line, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { api } from "./api.js";

const STATUS_OPTIONS = [
  "New Enquiry", "Contacted", "Site Visit Scheduled", "Site Visit Completed", "Quotation Sent",
  "Negotiation", "Approved", "Installation In Progress", "Installation Completed", "Rejected",
];
const NAV_ITEMS = [
  { label: "Overview", icon: LayoutDashboard },
  { label: "Enquiries", icon: ClipboardList, count: true },
  { label: "Follow-ups", icon: CalendarDays },
  { label: "Customers", icon: Users },
  { label: "Employees", icon: Building2 },
  { label: "Reports", icon: FileBarChart },
];
const STATUS_COLORS = {
  "New Enquiry": "#ef9e3b", Contacted: "#4b8af5", "Site Visit Scheduled": "#8b6ce2",
  "Site Visit Completed": "#7162c6", "Quotation Sent": "#11a8a1", Negotiation: "#e08a3c",
  Approved: "#218c62", "Installation In Progress": "#3787c7", "Installation Completed": "#26754f",
  Rejected: "#d45d63",
};
const emptyEnquiry = () => ({
  customer_name: "", mobile: "", email: "", address: "", city: "", state: "", consumer_number: "",
  capacity_kw: "", monthly_bill: "", property_type: "Residential", source: "Website",
  enquiry_date: new Date().toISOString().slice(0, 10), assigned_employee_id: "", status: "New Enquiry", remarks: "",
});
const initialForm = { name: "", email: "", phone: "", password: "" };

function niceDate(value, options = { month: "short", day: "numeric", year: "numeric" }) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? value : date.toLocaleDateString("en-IN", options);
}

function money(value) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(value || 0));
}

function StatusBadge({ status }) {
  const color = STATUS_COLORS[status] || "#718096";
  return <span className="status-badge" style={{ "--status-color": color }}><i />{status}</span>;
}

function Modal({ title, subtitle, onClose, children, wide = false }) {
  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className={`modal ${wide ? "modal-wide" : ""}`}>
        <header className="modal-header"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div><button className="icon-btn" onClick={onClose} aria-label="Close"><X size={19} /></button></header>
        {children}
      </section>
    </div>
  );
}

function LoginScreen({ onLogin }) {
  const [registering, setRegistering] = useState(false);
  const [form, setForm] = useState({ ...initialForm, email: "admin@solarflow.in", password: "Solar@123" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const result = registering ? await api.register(form) : await api.login({ email: form.email, password: form.password });
      onLogin(result);
    } catch (reason) {
      setError(reason.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-art">
        <div className="auth-brand"><span className="brand-mark"><Sun size={20} /></span> solarflow</div>
        <div className="auth-message"><span className="eyebrow light-eyebrow"><span /> BUILT FOR A BRIGHTER TOMORROW</span><h1>Turn every enquiry<br />into <em>clean energy.</em></h1><p>One thoughtful conversation at a time, build a brighter future for every customer you serve.</p></div>
        <div className="auth-art-footer"><div className="sun-orbit"><Sun size={25} /></div><div><b>Powering progress, together.</b><span>Your solar journey starts here.</span></div></div>
      </div>
      <div className="auth-form-wrap">
        <div className="auth-form">
          <div className="auth-mobile-brand"><span className="brand-mark"><Sun size={18} /></span> solarflow</div>
          <span className="eyebrow">WELCOME {registering ? "ABOARD" : "BACK"}</span>
          <h2>{registering ? "Create your account" : "Sign in to SolarFlow"}</h2>
          <p className="auth-intro">{registering ? "Get your team moving toward a brighter future." : "Your team's next big project is just a sign-in away."}</p>
          <form onSubmit={submit} className="auth-fields">
            {registering && <label>Full name<input required minLength="2" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Alex Morgan" autoComplete="name" /></label>}
            <label>Work email<div className="input-icon"><Mail size={17} /><input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@company.com" autoComplete="email" /></div></label>
            {registering && <label>Phone number<input required minLength="7" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 98765 43210" /></label>}
            <label>Password<input type="password" required minLength="8" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Enter your password" autoComplete={registering ? "new-password" : "current-password"} /></label>
            {error && <div className="form-error"><CircleHelp size={15} />{error}</div>}
            <button className="primary-btn auth-submit" disabled={busy}>{busy ? <span className="spinner" /> : null}{registering ? "Create account" : "Sign in"}<ArrowRight size={17} /></button>
          </form>
          <p className="auth-switch">{registering ? "Already have an account?" : "New to SolarFlow?"} <button onClick={() => { setRegistering(!registering); setError(""); }}>{registering ? "Sign in" : "Create an account"}</button></p>
          {!registering && <div className="demo-hint"><ShieldCheck size={16} /><span>Demo access</span><b>admin@solarflow.in</b><span>·</span><b>Solar@123</b></div>}
          <p className="auth-legal">By continuing, you agree to our Terms of Service and Privacy Policy.</p>
        </div>
      </div>
    </main>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [page, setPage] = useState("Overview");
  const [data, setData] = useState({ dashboard: null, enquiries: [], followups: [], customers: [], employees: [], reports: null });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [search, setSearch] = useState("");
  const [enquiryStatus, setEnquiryStatus] = useState("All statuses");
  const [sort, setSort] = useState("newest");
  const [modal, setModal] = useState(null);
  const [mobileNav, setMobileNav] = useState(false);
  const isAdmin = user?.role === "Admin";

  const refresh = useCallback(async (includeSearch = page === "Enquiries") => {
    setBusy(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (includeSearch && search.trim()) params.set("search", search.trim());
      if (includeSearch && enquiryStatus !== "All statuses") params.set("status", enquiryStatus);
      if (includeSearch) params.set("sort", sort);
      const [dashboard, enquiries, followups, customers, employees, reports] = await Promise.all([
        api.dashboard(),
        api.enquiries(includeSearch ? params.toString() : ""),
        api.followups(true),
        api.customers(),
        api.employees(),
        api.reports(),
      ]);
      setData({ dashboard, enquiries, followups, customers, employees, reports });
    } catch (reason) {
      if (reason.message.includes("session")) {
        localStorage.removeItem("solarflow-token");
        setUser(null);
      } else setError(reason.message);
    } finally {
      setBusy(false);
    }
  }, [search, enquiryStatus, sort, page]);

  useEffect(() => {
    const token = localStorage.getItem("solarflow-token");
    if (!token) { setAuthChecked(true); return; }
    api.me().then((profile) => setUser(profile)).catch(() => localStorage.removeItem("solarflow-token")).finally(() => setAuthChecked(true));
  }, []);

  useEffect(() => { if (user) refresh(); }, [user, page, refresh]);
  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(""), 3200);
    return () => clearTimeout(timer);
  }, [toast]);

  async function login(result) {
    localStorage.setItem("solarflow-token", result.token);
    setUser(result.user);
  }

  async function logout() {
    try { await api.logout(); } catch { /* Local sign-out must still complete if the session has expired. */ }
    localStorage.removeItem("solarflow-token");
    setUser(null);
    setData({ dashboard: null, enquiries: [], followups: [], customers: [], employees: [], reports: null });
  }

  async function act(action, successMessage) {
    try {
      await action();
      setModal(null);
      setToast(successMessage);
      await refresh(page === "Enquiries");
    } catch (reason) {
      setError(reason.message);
    }
  }

  const dashboard = data.dashboard;
  const filtered = data.enquiries;

  if (!authChecked) return <div className="page-loading"><span className="spinner" /></div>;
  if (!user) return <LoginScreen onLogin={login} />;

  return (
    <div className="app-shell">
      {mobileNav && <button className="mobile-scrim" onClick={() => setMobileNav(false)} aria-label="Close navigation" />}
      <aside className={`sidebar ${mobileNav ? "sidebar-open" : ""}`}>
        <div className="sidebar-brand"><span className="brand-mark"><Sun size={18} /></span><span>solarflow<small>INSTALLATION CRM</small></span><button className="close-nav icon-btn" onClick={() => setMobileNav(false)}><X size={18} /></button></div>
        <div className="workspace-switch"><span className="workspace-avatar"><Sun size={17} /></span><span><b>SunPeak Energy</b><small>Workspace</small></span><ChevronDown size={15} /></div>
        <div className="nav-caption">WORKSPACE</div>
        <nav className="main-nav">
          {NAV_ITEMS.map(({ label, icon: Icon, count }) => <button key={label} className={`nav-item ${page === label ? "active" : ""}`} onClick={() => { setPage(label); setMobileNav(false); }}>
            <Icon size={18} strokeWidth={1.8} /><span>{label}</span>{count && dashboard?.new > 0 && <small className="nav-count">{dashboard.new}</small>}
          </button>)}
        </nav>
        <div className="sidebar-bottom">
          <div className="solar-tip"><span className="tip-icon"><Zap size={16} /></span><b>Small steps, big impact.</b><p>Every enquiry is a chance to help someone go solar.</p><div className="tip-progress"><span /></div></div>
          <button className="nav-item support-item" onClick={() => setToast("Reach your workspace administrator for support.")}><CircleHelp size={18} /><span>Help & support</span></button>
          <div className="sidebar-divider" />
          <button className="user-profile" onClick={logout}><span className="user-avatar">{user.name.split(" ").map((word) => word[0]).slice(0, 2).join("")}</span><span className="user-meta"><b>{user.name}</b><small>{user.role}</small></span><LogOut size={16} className="logout-icon" /></button>
        </div>
      </aside>
      <main className="main-area">
        <header className="topbar">
          <button className="mobile-menu icon-btn" onClick={() => setMobileNav(true)} aria-label="Open navigation"><Menu size={21} /></button>
          <div className="breadcrumb"><span>Workspace</span><ChevronRight size={14} /><b>{page}</b></div>
          <div className="topbar-actions"><div className="global-search"><Search size={16} /><input placeholder="Search anything..." value={search} onChange={(event) => { setSearch(event.target.value); setPage("Enquiries"); }} onKeyDown={(event) => event.key === "Enter" && refresh(true)} /><kbd>⌘ K</kbd></div><button className="icon-btn notification-btn" aria-label="Notifications" onClick={() => setPage("Follow-ups")}><Bell size={18} />{dashboard?.followups > 0 && <i />}</button><span className="topbar-divider" /><span className="topbar-avatar">{user.name.split(" ").map((word) => word[0]).slice(0, 2).join("")}</span></div>
        </header>
        <div className="page-content">
          {error && <div className="error-banner"><CircleHelp size={17} /><span>{error}</span><button onClick={() => setError("")}><X size={16} /></button></div>}
          {page === "Overview" && <DashboardPage dashboard={dashboard} busy={busy} onAdd={() => setModal({ type: "enquiry" })} onNavigate={setPage} onDetails={(record) => setModal({ type: "details", record })} />}
          {page === "Enquiries" && <EnquiriesPage
            enquiries={filtered} employees={data.employees} busy={busy} search={search} status={enquiryStatus} sort={sort}
            setSearch={setSearch} setStatus={setEnquiryStatus} setSort={setSort}
            onAdd={() => setModal({ type: "enquiry" })} onEdit={(record) => setModal({ type: "enquiry", record })}
            onDetails={(record) => setModal({ type: "details", record })} onDelete={(record) => setModal({ type: "delete-enquiry", record })}
          />}
          {page === "Follow-ups" && <FollowupsPage followups={data.followups} busy={busy} onAdd={() => setModal({ type: "followup" })}
            onComplete={(item) => act(() => api.completeFollowup(item.id, !item.completed), item.completed ? "Follow-up marked as upcoming" : "Follow-up completed")}
            onDelete={(item) => setModal({ type: "delete-followup", record: item })} />}
          {page === "Customers" && <CustomersPage customers={data.customers} busy={busy} onDetails={(record) => setModal({ type: "details", record })} />}
          {page === "Employees" && <EmployeesPage employees={data.employees} busy={busy} isAdmin={isAdmin}
            onAdd={() => setModal({ type: "employee" })} onDelete={(record) => setModal({ type: "delete-employee", record })} />}
          {page === "Reports" && <ReportsPage reports={data.reports} busy={busy} onExport={async () => {
            try { const blob = await api.exportReports(); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = "solar-enquiries.csv"; link.click(); URL.revokeObjectURL(url); }
            catch (reason) { setError(reason.message); }
          }} />}
        </div>
      </main>
      {modal?.type === "enquiry" && <EnquiryModal record={modal.record} employees={data.employees} onClose={() => setModal(null)} onSave={(payload) => act(() => api.saveEnquiry(payload, modal.record?.id), modal.record ? "Enquiry updated successfully" : "New enquiry added")} />}
      {modal?.type === "details" && <DetailsModal record={modal.record} onClose={() => setModal(null)} onEdit={(record) => setModal({ type: "enquiry", record })} />}
      {modal?.type === "followup" && <FollowupModal enquiries={data.enquiries} onClose={() => setModal(null)} onSave={(payload) => act(() => api.addFollowup(payload), "Follow-up scheduled")} />}
      {modal?.type === "employee" && <EmployeeModal onClose={() => setModal(null)} onSave={(payload) => act(() => api.addEmployee(payload), "Employee added to your team")} />}
      {modal?.type?.startsWith("delete-") && <DeleteModal record={modal.record} type={modal.type.replace("delete-", "")} onClose={() => setModal(null)} onConfirm={() => {
        const { type, record } = modal;
        const calls = { "delete-enquiry": () => api.deleteEnquiry(record.id), "delete-followup": () => api.deleteFollowup(record.id), "delete-employee": () => api.deleteEmployee(record.id) };
        const messages = { "delete-enquiry": "Enquiry deleted", "delete-followup": "Follow-up deleted", "delete-employee": "Employee removed" };
        act(calls[type], messages[type]);
      }} />}
      {toast && <div className="toast"><CheckCircle2 size={18} />{toast}</div>}
    </div>
  );
}

function PageTitle({ eyebrow, title, description, action }) {
  return <div className="page-title-row"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>{action}</div>;
}

function DashboardPage({ dashboard, busy, onAdd, onNavigate, onDetails }) {
  const greeting = new Date().getHours() < 12 ? "Good morning" : new Date().getHours() < 18 ? "Good afternoon" : "Good evening";
  const monthly = dashboard?.monthly || [];
  const statusData = Object.entries(dashboard?.status_counts || {}).map(([name, value]) => ({ name, value })).filter((item) => item.value);
  const metrics = [
    { label: "Total enquiries", value: dashboard?.total ?? "—", icon: ClipboardList, color: "green", change: "+12.8%", note: "vs. last month" },
    { label: "New enquiries", value: dashboard?.new ?? "—", icon: Flame, color: "amber", change: "+8.2%", note: "vs. last month" },
    { label: "Pending follow-ups", value: dashboard?.followups ?? "—", icon: Clock3, color: "violet", change: "Needs attention", note: "across your team" },
    { label: "Site visits", value: dashboard?.site_visits ?? "—", icon: MapPin, color: "blue", change: "+3 this week", note: "on the calendar" },
  ];
  return (
    <>
      <PageTitle eyebrow={new Date().toLocaleDateString("en", { weekday: "long", month: "long", day: "numeric" }).toUpperCase()} title={`${greeting}, team ✦`} description="Here’s what’s happening across your solar pipeline." action={<button className="primary-btn" onClick={onAdd}><Plus size={17} /> New enquiry</button>} />
      <div className="welcome-strip"><div className="welcome-icon"><Sun size={22} /></div><div><b>Another day, another chance to make an impact.</b><span>Your pipeline is looking bright. Keep the momentum going.</span></div><button onClick={() => onNavigate("Reports")}>View performance <ArrowRight size={15} /></button><div className="welcome-sun"><Sun size={96} /></div></div>
      <section className="metric-grid">
        {metrics.map(({ label, value, icon: Icon, color, change, note }) => <article className="metric-card" key={label}><div className={`metric-icon ${color}`}><Icon size={18} /></div><span className="metric-menu"><Ellipsis size={18} /></span><p>{label}</p><div className="metric-value">{value}</div><div className={`metric-trend ${color === "amber" ? "trend-warm" : ""}`}><span>{change.startsWith("+") ? <ArrowUpRight size={13} /> : null}{change}</span><small>{note}</small></div></article>)}
      </section>
      <div className="dashboard-charts">
        <section className="panel trend-panel">
          <div className="panel-heading"><div><h2>Enquiry activity</h2><p>Track how your pipeline is growing</p></div><button className="select-button">Last 6 months <ChevronDown size={14} /></button></div>
          <div className="chart-legend"><span><i className="legend-dot green-dot" /> Enquiries received</span><span><i className="legend-dot navy-dot" /> Installations completed</span></div>
          <div className="chart-area"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={monthly} margin={{ top: 10, right: 12, left: -22, bottom: 0 }}>
            <defs><linearGradient id="receivedFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#52aa77" stopOpacity={0.19} /><stop offset="100%" stopColor="#52aa77" stopOpacity={0} /></linearGradient></defs>
            <CartesianGrid vertical={false} stroke="#edf1ee" /><XAxis dataKey="month" tickFormatter={(value) => new Date(`${value}-01`).toLocaleDateString("en", { month: "short" })} axisLine={false} tickLine={false} tick={{ fill: "#98a49d", fontSize: 11 }} dy={10} /><YAxis axisLine={false} tickLine={false} tick={{ fill: "#98a49d", fontSize: 11 }} /><Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e8eee9", boxShadow: "0 8px 26px #18352712" }} /><Area type="monotone" dataKey="count" name="Enquiries" stroke="#328c5b" strokeWidth={2.5} fill="url(#receivedFill)" />            <Line type="monotone" dataKey="completed" name="Installations" stroke="#193e36" strokeWidth={2} dot={{ r: 3, fill: "#193e36", strokeWidth: 0 }} />
          </ComposedChart></ResponsiveContainer></div>
          <div className="chart-footer"><span><span className="chart-footer-icon"><Activity size={16} /></span> <b>{dashboard?.total || 0} enquiries</b> tracked so far</span><button onClick={() => onNavigate("Reports")}>See full report <ArrowRight size={14} /></button></div>
        </section>
        <section className="panel distribution-panel">
          <div className="panel-heading"><div><h2>Enquiry status</h2><p>Where your opportunities stand</p></div><button className="icon-btn subtle"><MoreHorizontal size={18} /></button></div>
          <div className="donut-wrap"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={statusData} dataKey="value" nameKey="name" innerRadius={69} outerRadius={91} paddingAngle={3} stroke="none">{statusData.map((item) => <Cell key={item.name} fill={STATUS_COLORS[item.name] || "#aaa"} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer><div className="donut-center"><b>{dashboard?.total || 0}</b><span>enquiries</span></div></div>
          <div className="status-legend">{statusData.slice(0, 5).map((item) => <div key={item.name}><span><i style={{ background: STATUS_COLORS[item.name] }} />{item.name}</span><b>{item.value}</b></div>)}</div>
          <button className="text-link status-link" onClick={() => onNavigate("Enquiries")}>View all statuses <ArrowRight size={14} /></button>
        </section>
      </div>
      <div className="dashboard-lower">
        <section className="panel recent-panel"><div className="panel-heading"><div><h2>Recent enquiries</h2><p>Your latest customer conversations</p></div><button className="text-link" onClick={() => onNavigate("Enquiries")}>View all <ArrowRight size={14} /></button></div>
          {busy && !dashboard ? <LoadingRows /> : <div className="table-scroll"><table><thead><tr><th>CUSTOMER</th><th>SYSTEM SIZE</th><th>STATUS</th><th>ENQUIRY DATE</th><th /></tr></thead><tbody>{(dashboard?.recent || []).map((item) => <tr key={item.id} onClick={() => onDetails(item)}><td><div className="table-customer"><span className="customer-avatar">{item.customer_name.split(" ").map((n) => n[0]).slice(0, 2).join("")}</span><span><b>{item.customer_name}</b><small>{item.city || "—"}</small></span></div></td><td>{item.capacity_kw} kW</td><td><StatusBadge status={item.status} /></td><td>{niceDate(item.enquiry_date, { month: "short", day: "numeric" })}</td><td><ChevronRight size={16} className="row-chevron" /></td></tr>)}</tbody></table>{dashboard?.recent?.length === 0 && <EmptyState icon={ClipboardList} title="No enquiries yet" text="Add your first enquiry to get started." />}</div>}
        </section>
        <section className="panel follow-preview"><div className="panel-heading"><div><h2>Coming up</h2><p>Customer follow-ups to stay on top of</p></div><button className="icon-btn subtle" onClick={() => onNavigate("Follow-ups")}><ArrowRight size={17} /></button></div>
          <div className="preview-list">{(dashboard?.upcoming_followups || []).slice(0, 4).map((item) => <div className="preview-item" key={item.id}><div className="preview-date"><b>{new Date(item.scheduled_at).getDate()}</b><span>{new Date(item.scheduled_at).toLocaleDateString("en", { month: "short" })}</span></div><div className="preview-details"><b>{item.customer_name}</b><span>{item.notes || "Follow-up call"} · {new Date(item.scheduled_at).toLocaleTimeString("en", { hour: "numeric", minute: "2-digit" })}</span></div><button className="icon-btn mini-action" onClick={() => onNavigate("Follow-ups")} aria-label="Open follow-ups"><ArrowRight size={15} /></button></div>)}
            {!dashboard?.upcoming_followups?.length && <EmptyState icon={CheckCheck} title="All caught up!" text="No upcoming follow-ups scheduled." />}</div>
          <button className="follow-all" onClick={() => onNavigate("Follow-ups")}>See all follow-ups <ArrowRight size={14} /></button>
        </section>
      </div>
    </>
  );
}

function LoadingRows() {
  return <div className="loading-rows"><span /><span /><span /><span /></div>;
}

function EmptyState({ icon: Icon, title, text, action }) {
  return <div className="empty-state"><span className="empty-icon"><Icon size={22} /></span><b>{title}</b><p>{text}</p>{action}</div>;
}

function EnquiriesPage({ enquiries, employees, busy, search, status, sort, setSearch, setStatus, setSort, onAdd, onEdit, onDetails, onDelete }) {
  return <>
    <PageTitle eyebrow="PIPELINE" title="Enquiries" description="Every great solar project starts with a conversation." action={<button className="primary-btn" onClick={onAdd}><Plus size={17} /> Add enquiry</button>} />
    <section className="panel data-panel">
      <div className="data-toolbar"><div className="data-heading"><h2>All enquiries <span>{enquiries.length}</span></h2><p>Manage and follow your sales pipeline.</p></div>
        <div className="table-tools"><div className="table-search"><Search size={16} /><input placeholder="Search customers..." value={search} onChange={(event) => setSearch(event.target.value)} /></div><label className="filter-select"><Filter size={15} /><select value={status} onChange={(event) => setStatus(event.target.value)}><option>All statuses</option>{STATUS_OPTIONS.map((option) => <option key={option}>{option}</option>)}</select></label><label className="filter-select sort-select"><SlidersHorizontal size={15} /><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select></label></div>
      </div>
      <div className="table-scroll full-table"><table><thead><tr><th>ENQUIRY</th><th>CONTACT</th><th>SYSTEM SIZE</th><th>STATUS</th><th>ASSIGNED TO</th><th>DATE ADDED</th><th /></tr></thead><tbody>
        {enquiries.map((item) => <tr key={item.id}><td><button className="id-button" onClick={() => onDetails(item)}>{item.id}</button><small className="cell-sub">{item.city || item.property_type}</small></td><td><div className="contact-cell"><b>{item.customer_name}</b><span>{item.mobile}</span></div></td><td><b>{item.capacity_kw} kW</b><small className="cell-sub">{money(item.monthly_bill)}/mo bill</small></td><td><StatusBadge status={item.status} /></td><td>{item.assigned_employee || "Unassigned"}</td><td>{niceDate(item.enquiry_date, { month: "short", day: "numeric", year: "numeric" })}</td><td><div className="row-actions"><button title="View details" onClick={() => onDetails(item)}><Search size={15} /></button><button title="Edit enquiry" onClick={() => onEdit(item)}><Settings2 size={15} /></button><button title="Delete enquiry" onClick={() => onDelete(item)}><X size={15} /></button></div></td></tr>)}
      </tbody></table>
      {!enquiries.length && <EmptyState icon={Search} title="No enquiries found" text={busy ? "Loading your pipeline…" : "Try another search or add a new enquiry."} action={!busy && <button className="text-link" onClick={onAdd}>Add an enquiry <ArrowRight size={14} /></button>} />}
      </div>
      <div className="table-pagination"><span>Showing <b>{enquiries.length}</b> enquiries</span><div><button className="icon-btn" disabled><ChevronLeft size={17} /></button><button className="page-number">1</button><button className="icon-btn" disabled><ChevronRight size={17} /></button></div></div>
    </section>
    <div className="info-note"><span className="note-icon"><Sun size={16} /></span><span><b>A little follow-up goes a long way.</b> Keep your enquiry statuses up to date to make sure no opportunity gets left behind.</span></div>
  </>;
}

function FollowupsPage({ followups, busy, onAdd, onComplete, onDelete }) {
  const upcoming = followups.filter((item) => !item.completed && new Date(item.scheduled_at) >= new Date());
  const overdue = followups.filter((item) => !item.completed && new Date(item.scheduled_at) < new Date());
  const completed = followups.filter((item) => item.completed);
  return <>
    <PageTitle eyebrow="CUSTOMER CARE" title="Follow-ups" description="The right conversation, at just the right time." action={<button className="primary-btn" onClick={onAdd}><Plus size={17} /> Schedule follow-up</button>} />
    <div className="followup-summary"><div className="summary-card"><span className="summary-icon amber"><Clock3 size={18} /></span><span><small>UPCOMING</small><b>{upcoming.length}</b></span></div><div className="summary-card"><span className="summary-icon red"><Flame size={18} /></span><span><small>OVERDUE</small><b>{overdue.length}</b></span></div><div className="summary-card"><span className="summary-icon green"><CheckCircle2 size={18} /></span><span><small>COMPLETED</small><b>{completed.length}</b></span></div></div>
    {overdue.length > 0 && <section className="followup-section"><div className="section-title"><h2>Needs your attention</h2><span className="overdue-count">{overdue.length} overdue</span></div>{overdue.map((item) => <FollowupCard key={item.id} item={item} overdue onComplete={onComplete} onDelete={onDelete} />)}</section>}
    <section className="followup-section"><div className="section-title"><h2>Upcoming</h2><span>{upcoming.length} scheduled</span></div>{upcoming.map((item) => <FollowupCard key={item.id} item={item} onComplete={onComplete} onDelete={onDelete} />)}
      {!upcoming.length && !overdue.length && <div className="panel"><EmptyState icon={CalendarDays} title="Your calendar is clear" text="Schedule a follow-up to keep customer conversations moving." action={<button className="primary-btn" onClick={onAdd}><Plus size={16} /> Schedule follow-up</button>} /> </div>}</section>
    <section className="followup-section"><div className="section-title"><h2>Recently completed</h2><span>{completed.length} completed</span></div>{completed.slice(0, 5).map((item) => <FollowupCard key={item.id} item={item} onComplete={onComplete} onDelete={onDelete} />)}
      {busy && !followups.length && <div className="panel"><LoadingRows /></div>}</section>
  </>;
}

function FollowupCard({ item, overdue = false, onComplete, onDelete }) {
  const date = new Date(item.scheduled_at);
  return <article className={`follow-card ${overdue ? "is-overdue" : ""} ${item.completed ? "is-completed" : ""}`}><div className="follow-card-date"><b>{date.toLocaleDateString("en", { day: "2-digit" })}</b><span>{date.toLocaleDateString("en", { month: "short" })}</span></div><div className="follow-card-main"><div className="follow-card-head"><b>{item.customer_name}</b><StatusBadge status={item.enquiry_status} /><span className="follow-ref">{item.enquiry_id}</span></div><p>{item.notes || "Customer follow-up"}</p><div className="follow-contact"><span><Phone size={13} />{item.mobile}</span>{item.email && <span><Mail size={13} />{item.email}</span>}<span><Clock3 size={13} />{date.toLocaleTimeString("en", { hour: "numeric", minute: "2-digit" })}</span></div></div><div className="follow-card-actions">{!item.completed && <button className="complete-btn" onClick={() => onComplete(item)}><Check size={15} /> Complete</button>}{item.completed && <span className="completed-label"><CheckCircle2 size={15} /> Done</span>}<button className="icon-btn" title="Delete follow-up" onClick={() => onDelete(item)}><X size={16} /></button></div></article>;
}

function CustomersPage({ customers, busy, onDetails }) {
  const capacity = customers.reduce((sum, item) => sum + Number(item.capacity_kw || 0), 0);
  return <>
    <PageTitle eyebrow="RELATIONSHIPS" title="Customers" description="A growing community choosing a brighter way to power." />
    <div className="customer-summary"><div className="customer-summary-card"><span className="summary-icon green"><Users size={19} /></span><div><small>ACTIVE CUSTOMERS</small><b>{customers.length}</b></div></div><div className="customer-summary-card"><span className="summary-icon amber"><Zap size={19} /></span><div><small>CAPACITY REQUESTED</small><b>{capacity.toLocaleString("en-IN")} <small>kW</small></b></div></div><div className="customer-summary-card"><span className="summary-icon blue"><Sun size={19} /></span><div><small>INSTALLATIONS COMPLETE</small><b>{customers.filter((item) => item.status === "Installation Completed").length}</b></div></div></div>
    <section className="panel data-panel"><div className="data-toolbar"><div className="data-heading"><h2>Customer directory <span>{customers.length}</span></h2><p>Customers with approved or active solar projects.</p></div></div>
      <div className="table-scroll"><table><thead><tr><th>CUSTOMER</th><th>CONTACT</th><th>INSTALLATION ADDRESS</th><th>CAPACITY</th><th>PROJECT STATUS</th><th /></tr></thead><tbody>{customers.map((item) => <tr key={item.id} onClick={() => onDetails(item)}><td><div className="table-customer"><span className="customer-avatar">{item.customer_name.split(" ").map((n) => n[0]).slice(0, 2).join("")}</span><span><b>{item.customer_name}</b><small>{item.id}</small></span></div></td><td><div className="contact-cell"><b>{item.mobile}</b><span>{item.email || "No email provided"}</span></div></td><td><div className="contact-cell"><b>{item.city || "—"}</b><span>{item.address || item.state}</span></div></td><td><b>{item.capacity_kw} kW</b></td><td><StatusBadge status={item.status} /></td><td><button className="icon-btn" onClick={(event) => { event.stopPropagation(); onDetails(item); }}><ChevronRight size={16} /></button></td></tr>)}</tbody></table>
      {!customers.length && <EmptyState icon={Users} title={busy ? "Loading customers…" : "Your customer list is ready to grow"} text="Approved enquiries and active projects will appear here." />}</div>
    </section>
  </>;
}

function EmployeesPage({ employees, busy, isAdmin, onAdd, onDelete }) {
  const assigned = employees.reduce((sum, item) => sum + Number(item.assigned_enquiries || 0), 0);
  const converted = employees.reduce((sum, item) => sum + Number(item.conversions || 0), 0);
  return <>
    <PageTitle eyebrow="YOUR PEOPLE" title="Team" description="Good things happen when great people work together." action={isAdmin && <button className="primary-btn" onClick={onAdd}><Plus size={17} /> Add employee</button>} />
    <div className="customer-summary"><div className="customer-summary-card"><span className="summary-icon blue"><Users size={19} /></span><div><small>TEAM MEMBERS</small><b>{employees.length}</b></div></div><div className="customer-summary-card"><span className="summary-icon green"><ClipboardList size={19} /></span><div><small>ASSIGNED ENQUIRIES</small><b>{assigned}</b></div></div><div className="customer-summary-card"><span className="summary-icon amber"><CheckCircle2 size={19} /></span><div><small>COMPLETED PROJECTS</small><b>{converted}</b></div></div></div>
    <section className="panel data-panel"><div className="data-toolbar"><div className="data-heading"><h2>Team performance <span>{employees.length}</span></h2><p>Enquiry assignments and completed installations by employee.</p></div></div>
      <div className="table-scroll"><table><thead><tr><th>EMPLOYEE</th><th>CONTACT</th><th>ASSIGNED ENQUIRIES</th><th>INSTALLATIONS</th><th>CONVERSION RATE</th><th>{isAdmin ? "ACTIONS" : ""}</th></tr></thead><tbody>{employees.map((employee) => { const rate = employee.assigned_enquiries ? Math.round(employee.conversions * 100 / employee.assigned_enquiries) : 0; return <tr key={employee.id}><td><div className="table-customer"><span className="employee-avatar">{employee.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}</span><span><b>{employee.name}</b><small>Sales consultant</small></span></div></td><td><div className="contact-cell"><b>{employee.email}</b><span>{employee.phone}</span></div></td><td>{employee.assigned_enquiries}</td><td>{employee.conversions}</td><td><div className="rate-cell"><div><i style={{ width: `${rate}%` }} /></div><b>{rate}%</b></div></td><td>{isAdmin && <button className="icon-btn danger-hover" title="Remove employee" onClick={() => onDelete(employee)}><X size={16} /></button>}</td></tr>; })}</tbody></table>
      {!employees.length && <EmptyState icon={Users} title={busy ? "Loading team…" : "Bring your team together"} text={isAdmin ? "Add employees so you can assign enquiries and track performance." : "No employees have been added to the workspace yet."} action={isAdmin && <button className="primary-btn" onClick={onAdd}><Plus size={16} /> Add employee</button>} />}</div>
      {!isAdmin && <div className="permission-note"><ShieldCheck size={16} /> Only workspace admins can add or remove team members.</div>}
    </section>
  </>;
}

function ReportsPage({ reports, busy, onExport }) {
  const statusData = reports?.statuses || [];
  const monthly = reports?.monthly || [];
  const performance = reports?.employees || [];
  return <>
    <PageTitle eyebrow="INSIGHTS & IMPACT" title="Reports" description="See the momentum behind every project and every customer." action={<button className="secondary-btn" onClick={onExport}><Download size={16} /> Export CSV</button>} />
    <div className="report-kpis"><div className="report-kpi"><span>Total enquiries</span><b>{reports?.total ?? "—"}</b><small><ClipboardList size={14} /> All time</small></div><div className="report-kpi"><span>Conversion rate</span><b>{reports ? `${reports.conversion_rate}%` : "—"}</b><small><ArrowUpRight size={14} /> Completed projects</small></div><div className="report-kpi"><span>Solar capacity</span><b>{reports ? <>{Number(reports.capacity || 0).toLocaleString("en-IN")} <small>kW</small></> : "—"}</b><small><Zap size={14} /> Requested by customers</small></div><div className="report-kpi"><span>Approved projects</span><b>{reports?.approved ?? "—"}</b><small><CheckCircle2 size={14} /> {reports?.rejected ?? 0} rejected</small></div></div>
    <div className="reports-grid"><section className="panel report-chart-panel"><div className="panel-heading"><div><h2>Enquiries over time</h2><p>New opportunities added each month</p></div><span className="report-chart-badge"><Activity size={14} /> Monthly</span></div><div className="report-chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={monthly} margin={{ top: 14, right: 10, left: -22, bottom: 0 }}><defs><linearGradient id="reportFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#328c5b" stopOpacity={0.22} /><stop offset="100%" stopColor="#328c5b" stopOpacity={0.01} /></linearGradient></defs><CartesianGrid vertical={false} stroke="#edf1ee" /><XAxis dataKey="month" tickFormatter={(value) => new Date(`${value}-01`).toLocaleDateString("en", { month: "short", year: "2-digit" })} axisLine={false} tickLine={false} tick={{ fill: "#98a49d", fontSize: 11 }} dy={8} /><YAxis axisLine={false} tickLine={false} tick={{ fill: "#98a49d", fontSize: 11 }} /><Tooltip /><Area dataKey="count" name="Enquiries" type="monotone" stroke="#328c5b" strokeWidth={2.5} fill="url(#reportFill)" /></AreaChart></ResponsiveContainer></div></section>
      <section className="panel report-status-panel"><div className="panel-heading"><div><h2>Pipeline breakdown</h2><p>Enquiries by current status</p></div></div><div className="report-status-list">{statusData.map((item) => <div key={item.status}><span><i style={{ background: STATUS_COLORS[item.status] }} />{item.status}</span><b>{item.count}</b><div className="status-track"><i style={{ width: `${reports?.total ? item.count * 100 / reports.total : 0}%`, background: STATUS_COLORS[item.status] }} /></div></div>)}{!statusData.length && <EmptyState icon={Activity} title={busy ? "Loading report…" : "No data yet"} text="Your enquiry status breakdown will appear here." />}</div></section>
    </div>
    <section className="panel performance-panel"><div className="panel-heading"><div><h2>Employee performance</h2><p>Enquiries handled and installations completed</p></div><span className="report-chart-badge"><Users size={14} /> Team overview</span></div><div className="table-scroll"><table><thead><tr><th>EMPLOYEE</th><th>ENQUIRIES</th><th>COMPLETED</th><th>CONVERSION</th><th>PERFORMANCE</th></tr></thead><tbody>{performance.map((employee) => { const rate = employee.assigned ? Math.round(employee.converted * 100 / employee.assigned) : 0; return <tr key={employee.name}><td><b>{employee.name}</b></td><td>{employee.assigned}</td><td>{employee.converted}</td><td>{rate}%</td><td><div className="rate-cell"><div><i style={{ width: `${rate}%` }} /></div><b>{rate}%</b></div></td></tr>; })}</tbody></table>{!performance.length && <EmptyState icon={Users} title="No team data yet" text="Employee performance will appear once enquiries are assigned." />}</div></section>
  </>;
}

function EnquiryModal({ record, employees, onClose, onSave }) {
  const [form, setForm] = useState(() => record ? { ...emptyEnquiry(), ...record, assigned_employee_id: record.assigned_employee_id || "", capacity_kw: String(record.capacity_kw), monthly_bill: String(record.monthly_bill) } : emptyEnquiry());
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  async function submit(event) {
    event.preventDefault();
    setError("");
    setSaving(true);
    const payload = { ...form, capacity_kw: Number(form.capacity_kw), monthly_bill: Number(form.monthly_bill), assigned_employee_id: form.assigned_employee_id ? Number(form.assigned_employee_id) : null };
    try { await onSave(payload); } catch (reason) { setError(reason.message); } finally { setSaving(false); }
  }
  const field = (name, value) => setForm((current) => ({ ...current, [name]: value }));
  return <Modal title={record ? "Edit enquiry" : "Add a new enquiry"} subtitle={record ? `Update customer details for ${record.customer_name}.` : "Capture a new opportunity for your solar team."} onClose={onClose} wide>
    <form className="modal-form" onSubmit={submit}>
      <div className="form-section-label">CUSTOMER DETAILS</div><div className="form-grid">
        <label>Customer name *<input required minLength="2" value={form.customer_name} onChange={(e) => field("customer_name", e.target.value)} placeholder="Full name" /></label>
        <label>Mobile number *<input required minLength="7" value={form.mobile} onChange={(e) => field("mobile", e.target.value)} placeholder="+91 98765 43210" /></label>
        <label>Email address<input type="email" value={form.email} onChange={(e) => field("email", e.target.value)} placeholder="customer@email.com" /></label>
        <label>Electricity consumer no.<input value={form.consumer_number} onChange={(e) => field("consumer_number", e.target.value)} placeholder="Consumer number" /></label>
        <label className="form-span-2">Installation address<input value={form.address} onChange={(e) => field("address", e.target.value)} placeholder="Street address" /></label>
        <label>City<input value={form.city} onChange={(e) => field("city", e.target.value)} placeholder="City" /></label>
        <label>State<input value={form.state} onChange={(e) => field("state", e.target.value)} placeholder="State" /></label>
      </div>
      <div className="form-section-label form-section-spaced">PROJECT & PIPELINE</div><div className="form-grid">
        <label>System capacity (kW) *<input required type="number" min="0.1" step="0.1" value={form.capacity_kw} onChange={(e) => field("capacity_kw", e.target.value)} placeholder="e.g. 5" /></label>
        <label>Monthly electricity bill (₹)<input type="number" min="0" value={form.monthly_bill} onChange={(e) => field("monthly_bill", e.target.value)} placeholder="e.g. 4500" /></label>
        <label>Property type<select value={form.property_type} onChange={(e) => field("property_type", e.target.value)}>{["Residential", "Commercial", "Industrial"].map((item) => <option key={item}>{item}</option>)}</select></label>
        <label>Enquiry source<select value={form.source} onChange={(e) => field("source", e.target.value)}>{["Website", "Phone", "Referral", "Advertisement"].map((item) => <option key={item}>{item}</option>)}</select></label>
        <label>Enquiry date<input required type="date" value={form.enquiry_date} onChange={(e) => field("enquiry_date", e.target.value)} /></label>
        <label>Assigned employee<select value={form.assigned_employee_id} onChange={(e) => field("assigned_employee_id", e.target.value)}><option value="">Unassigned</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}</select></label>
        <label className="form-span-2">Enquiry status<select value={form.status} onChange={(e) => field("status", e.target.value)}>{STATUS_OPTIONS.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label className="form-span-2">Notes / remarks<textarea rows="3" value={form.remarks} onChange={(e) => field("remarks", e.target.value)} placeholder="Anything your team should know about this opportunity..." /></label>
      </div>
      {error && <div className="form-error"><CircleHelp size={15} />{error}</div>}
      <div className="modal-actions"><button type="button" className="secondary-btn" onClick={onClose}>Cancel</button><button className="primary-btn" disabled={saving}>{saving ? <span className="spinner" /> : <Check size={16} />}{record ? "Save changes" : "Create enquiry"}</button></div>
    </form>
  </Modal>;
}

function DetailsModal({ record, onClose, onEdit }) {
  const [details, setDetails] = useState(record);
  const [error, setError] = useState("");
  useEffect(() => { api.enquiry(record.id).then(setDetails).catch((reason) => setError(reason.message)); }, [record.id]);
  return <Modal title="Enquiry details" subtitle={`${record.id} · Added ${niceDate(record.enquiry_date)}`} onClose={onClose} wide>
    {error && <div className="error-banner compact-error">{error}</div>}
    <div className="details-top"><div className="details-avatar">{record.customer_name.split(" ").map((n) => n[0]).slice(0, 2).join("")}</div><div><h3>{record.customer_name}</h3><span>{record.city || "Location not provided"}{record.state ? `, ${record.state}` : ""}</span></div><StatusBadge status={details.status} /><button className="secondary-btn details-edit" onClick={() => onEdit(details)}><Settings2 size={15} /> Edit</button></div>
    <div className="details-grid"><DetailItem icon={Phone} label="Mobile number" value={record.mobile} /><DetailItem icon={Mail} label="Email address" value={record.email || "Not provided"} /><DetailItem icon={MapPin} label="Installation address" value={[record.address, record.city, record.state].filter(Boolean).join(", ") || "Not provided"} /><DetailItem icon={Zap} label="System capacity" value={`${record.capacity_kw} kW`} /><DetailItem icon={Building2} label="Property type" value={record.property_type} /><DetailItem icon={Activity} label="Monthly electricity bill" value={money(record.monthly_bill)} /><DetailItem icon={Sun} label="Consumer number" value={record.consumer_number || "Not provided"} /><DetailItem icon={Users} label="Assigned employee" value={record.assigned_employee || "Unassigned"} /><DetailItem icon={MessageCircle} label="Source" value={record.source} /><DetailItem icon={CalendarDays} label="Enquiry date" value={niceDate(record.enquiry_date)} /></div>
    <div className="customer-history"><div className="history-title"><h3>Customer enquiry history</h3><span>{details.enquiry_history?.length || 0} enquiries</span></div>{details.enquiry_history?.map((item) => <div className="customer-history-row" key={item.id}><span><b>{item.id}</b><small>{niceDate(item.enquiry_date)}</small></span><StatusBadge status={item.status} /><b>{item.capacity_kw} kW</b></div>) || <p className="muted-text">Loading customer history…</p>}</div>
    {record.remarks && <div className="remarks-box"><b>Notes & remarks</b><p>{record.remarks}</p></div>}
    <div className="history-title"><h3>Status history</h3><span>{details.history?.length || 0} updates</span></div>
    <div className="history-list">{details.history?.map((item, index) => <div className="history-item" key={`${item.changed_at}-${index}`}><span className="history-dot" style={{ "--status-color": STATUS_COLORS[item.status] }} /><div><StatusBadge status={item.status} /><p>{item.note || "Status updated"}{item.changed_by ? ` by ${item.changed_by}` : ""}</p><small>{niceDate(item.changed_at)} · {new Date(item.changed_at).toLocaleTimeString("en", { hour: "numeric", minute: "2-digit" })}</small></div></div>) || <span className="muted-text">Loading status history…</span>}</div>
  </Modal>;
}

function DetailItem({ icon: Icon, label, value }) {
  return <div className="detail-item"><span className="detail-icon"><Icon size={16} /></span><div><small>{label}</small><b>{value}</b></div></div>;
}

function FollowupModal({ enquiries, onClose, onSave }) {
  const [form, setForm] = useState({ enquiry_id: "", scheduled_at: "", notes: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  async function submit(event) {
    event.preventDefault(); setError(""); setSaving(true);
    try { await onSave({ ...form, enquiry_id: Number(form.enquiry_id) }); } catch (reason) { setError(reason.message); } finally { setSaving(false); }
  }
  return <Modal title="Schedule a follow-up" subtitle="A thoughtful check-in can make all the difference." onClose={onClose}>
    <form className="modal-form" onSubmit={submit}>
      <label>Customer enquiry *<select required value={form.enquiry_id} onChange={(e) => setForm({ ...form, enquiry_id: e.target.value })}><option value="">Choose a customer</option>{enquiries.map((item) => <option key={item.id} value={item.id.replace("ENQ-", "")}>{item.customer_name} · {item.id}</option>)}</select></label>
      <label>Date & time *<input required type="datetime-local" value={form.scheduled_at} onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })} /></label>
      <label>Follow-up notes<textarea rows="4" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="What would you like to discuss?" /></label>
      {error && <div className="form-error"><CircleHelp size={15} />{error}</div>}
      <div className="modal-actions"><button type="button" className="secondary-btn" onClick={onClose}>Cancel</button><button className="primary-btn" disabled={saving}>{saving ? <span className="spinner" /> : <CalendarDays size={16} />}Schedule follow-up</button></div>
    </form>
  </Modal>;
}

function EmployeeModal({ onClose, onSave }) {
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  async function submit(event) {
    event.preventDefault(); setError(""); setSaving(true);
    try { await onSave(form); } catch (reason) { setError(reason.message); } finally { setSaving(false); }
  }
  return <Modal title="Add a team member" subtitle="Give a new teammate access to the SolarFlow workspace." onClose={onClose}>
    <form className="modal-form" onSubmit={submit}><label>Full name *<input required minLength="2" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Employee name" /></label><label>Work email *<input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="employee@company.com" /></label><label>Phone number *<input required minLength="7" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 98765 43210" /></label><label>Temporary password *<input required minLength="8" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="At least 8 characters" /></label>{error && <div className="form-error"><CircleHelp size={15} />{error}</div>}<div className="modal-actions"><button type="button" className="secondary-btn" onClick={onClose}>Cancel</button><button className="primary-btn" disabled={saving}>{saving ? <span className="spinner" /> : <Plus size={16} />}Add employee</button></div></form>
  </Modal>;
}

function DeleteModal({ record, type, onClose, onConfirm }) {
  const labels = { enquiry: "enquiry", followup: "follow-up", employee: "employee" };
  const person = record.customer_name || record.name || "this record";
  return <Modal title={`Delete ${labels[type]}`} subtitle="This action cannot be undone." onClose={onClose}>
    <div className="delete-confirm"><span className="delete-icon"><X size={21} /></span><p>Are you sure you want to delete <b>{person}</b>{type === "enquiry" ? "'s enquiry" : ""}? {type === "enquiry" && "Its follow-ups and status history will also be removed."}</p></div>
    <div className="modal-actions"><button className="secondary-btn" onClick={onClose}>Keep it</button><button className="danger-btn" onClick={onConfirm}><X size={16} />Delete {labels[type]}</button></div>
  </Modal>;
}

export default App;
