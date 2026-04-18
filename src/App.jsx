import { useState, useEffect } from "react";

const ANTHROPIC_MODEL = "claude-sonnet-4-20250514";

// ── Palette & tokens ──────────────────────────────────────────────────────────
const C = {
  bg:      "#0b0c10",
  surface: "#13151c",
  card:    "#1a1d27",
  border:  "#252836",
  accent:  "#6EE7B7",
  accentD: "#059669",
  text:    "#F1F0EC",
  muted:   "#7a7d8c",
  danger:  "#F87171",
  warn:    "#FBBF24",
  info:    "#60A5FA",
};

// ── Tiny UI helpers ───────────────────────────────────────────────────────────
const Badge = ({ color = C.accent, children }) => (
  <span style={{ background: color + "22", color, fontSize: 11, fontWeight: 600,
    padding: "2px 8px", borderRadius: 20, letterSpacing: "0.04em" }}>
    {children}
  </span>
);

const Btn = ({ onClick, children, variant = "primary", small, disabled, style = {} }) => {
  const base = {
    cursor: disabled ? "not-allowed" : "pointer",
    border: "none", borderRadius: 8, fontFamily: "inherit",
    fontWeight: 600, transition: "all .15s", opacity: disabled ? 0.5 : 1,
    fontSize: small ? 12 : 14, padding: small ? "6px 14px" : "10px 22px",
  };
  const variants = {
    primary:  { background: C.accent,   color: "#0b0c10" },
    ghost:    { background: "transparent", color: C.text, border: `1px solid ${C.border}` },
    danger:   { background: C.danger + "22", color: C.danger, border: `1px solid ${C.danger}44` },
    success:  { background: C.accentD + "22", color: C.accent, border: `1px solid ${C.accent}44` },
  };
  return (
    <button onClick={disabled ? undefined : onClick}
      style={{ ...base, ...variants[variant], ...style }}>
      {children}
    </button>
  );
};

const Input = ({ label, value, onChange, placeholder, type = "text", multiline, rows = 3 }) => (
  <div style={{ marginBottom: 14 }}>
    {label && <div style={{ fontSize: 12, color: C.muted, marginBottom: 5, fontWeight: 600,
      letterSpacing: "0.05em", textTransform: "uppercase" }}>{label}</div>}
    {multiline
      ? <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows}
          style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`,
            borderRadius: 8, color: C.text, fontSize: 13, padding: "10px 12px",
            fontFamily: "inherit", resize: "vertical", boxSizing: "border-box" }} />
      : <input type={type} value={value} onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`,
            borderRadius: 8, color: C.text, fontSize: 13, padding: "10px 12px",
            fontFamily: "inherit", boxSizing: "border-box" }} />
    }
  </div>
);

const Card = ({ children, style = {} }) => (
  <div style={{ background: C.card, border: `1px solid ${C.border}`,
    borderRadius: 14, padding: "20px 22px", ...style }}>
    {children}
  </div>
);

const Stat = ({ label, value, color = C.text }) => (
  <div style={{ background: C.surface, borderRadius: 10, padding: "14px 16px" }}>
    <div style={{ fontSize: 12, color: C.muted, marginBottom: 6, fontWeight: 600,
      textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
    <div style={{ fontSize: 26, fontWeight: 700, color, fontVariantNumeric: "tabular-nums" }}>{value}</div>
  </div>
);

// ── Sample data ───────────────────────────────────────────────────────────────
const SAMPLE_INVOICES = [
  { id: "INV-001", client: "Acme Corp",      amount: 2400, status: "paid",    due: "2026-03-01", desc: "Website redesign" },
  { id: "INV-002", client: "Nova Studios",   amount: 1850, status: "pending", due: "2026-04-05", desc: "Brand identity" },
  { id: "INV-003", client: "Bright Futures", amount: 950,  status: "overdue", due: "2026-03-10", desc: "SEO audit" },
  { id: "INV-004", client: "Orbit Labs",     amount: 3200, status: "paid",    due: "2026-02-20", desc: "Mobile app UI" },
  { id: "INV-005", client: "Zenith Media",   amount: 780,  status: "pending", due: "2026-04-15", desc: "Social media kit" },
];

const SAMPLE_CLIENTS = [
  { id: 1, name: "Acme Corp",      email: "billing@acme.com",    total: 6400  },
  { id: 2, name: "Nova Studios",   email: "finance@nova.io",     total: 3700  },
  { id: 3, name: "Bright Futures", email: "pay@brightfutures.co",total: 950   },
  { id: 4, name: "Orbit Labs",     email: "accounts@orbit.dev",  total: 9600  },
];

// ── Status helpers ────────────────────────────────────────────────────────────
const statusColor = s => ({ paid: C.accent, pending: C.warn, overdue: C.danger }[s] || C.muted);
const statusLabel = s => ({ paid: "Paid", pending: "Pending", overdue: "Overdue" }[s] || s);
const fmt = n => "$" + Number(n).toLocaleString();

// ════════════════════════════════════════════════════════════════════════════
// SCREENS
// ════════════════════════════════════════════════════════════════════════════

// ── Dashboard ────────────────────────────────────────────────────────────────
function Dashboard({ invoices, onNav }) {
  const paid    = invoices.filter(i => i.status === "paid").reduce((s, i) => s + i.amount, 0);
  const pending = invoices.filter(i => i.status === "pending").reduce((s, i) => s + i.amount, 0);
  const overdue = invoices.filter(i => i.status === "overdue").reduce((s, i) => s + i.amount, 0);
  const recent  = [...invoices].slice(0, 4);

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: C.text }}>Dashboard</h2>
        <p style={{ margin: "4px 0 0", color: C.muted, fontSize: 14 }}>Welcome back — here's your money overview</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 24 }}>
        <Stat label="Total earned" value={fmt(paid)}    color={C.accent} />
        <Stat label="Outstanding"  value={fmt(pending)} color={C.warn} />
        <Stat label="Overdue"      value={fmt(overdue)} color={C.danger} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
        <Card style={{ cursor: "pointer" }} onClick={() => onNav("proposal")}>
          <div style={{ fontSize: 28, marginBottom: 10 }}>✨</div>
          <div style={{ fontWeight: 700, fontSize: 15, color: C.text, marginBottom: 4 }}>AI Proposal Writer</div>
          <div style={{ fontSize: 13, color: C.muted }}>Describe your project — Claude writes a professional proposal in seconds</div>
          <div style={{ marginTop: 14 }}>
            <Btn small variant="success" onClick={() => onNav("proposal")}>Generate proposal →</Btn>
          </div>
        </Card>
        <Card style={{ cursor: "pointer" }} onClick={() => onNav("new-invoice")}>
          <div style={{ fontSize: 28, marginBottom: 10 }}>🧾</div>
          <div style={{ fontWeight: 700, fontSize: 15, color: C.text, marginBottom: 4 }}>New Invoice</div>
          <div style={{ fontSize: 13, color: C.muted }}>Create and send a professional invoice with a Stripe payment link</div>
          <div style={{ marginTop: 14 }}>
            <Btn small onClick={() => onNav("new-invoice")}>Create invoice →</Btn>
          </div>
        </Card>
      </div>

      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: C.text }}>Recent invoices</div>
          <Btn small variant="ghost" onClick={() => onNav("invoices")}>View all</Btn>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ color: C.muted, textAlign: "left" }}>
              {["Invoice","Client","Amount","Due","Status"].map(h => (
                <th key={h} style={{ padding: "6px 0", fontWeight: 600, fontSize: 11,
                  textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: `1px solid ${C.border}` }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {recent.map((inv, i) => (
              <tr key={inv.id} style={{ borderBottom: i < recent.length - 1 ? `1px solid ${C.border}` : "none" }}>
                <td style={{ padding: "10px 0", color: C.info, fontWeight: 600 }}>{inv.id}</td>
                <td style={{ padding: "10px 0", color: C.text }}>{inv.client}</td>
                <td style={{ padding: "10px 0", color: C.text, fontWeight: 600 }}>{fmt(inv.amount)}</td>
                <td style={{ padding: "10px 0", color: C.muted }}>{inv.due}</td>
                <td style={{ padding: "10px 0" }}><Badge color={statusColor(inv.status)}>{statusLabel(inv.status)}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// ── AI Proposal Writer ────────────────────────────────────────────────────────
function ProposalWriter() {
  const [project,   setProject]   = useState("");
  const [client,    setClient]    = useState("");
  const [budget,    setBudget]    = useState("");
  const [timeline,  setTimeline]  = useState("");
  const [proposal,  setProposal]  = useState("");
  const [loading,   setLoading]   = useState(false);
  const [copied,    setCopied]    = useState(false);
  const [error,     setError]     = useState("");

  async function generate() {
      if (!project.trim()) { setError("Please describe your project first."); return; }
      setError(""); setLoading(true); setProposal("");
      try {
        const res = await fetch("/api/generate-proposal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            description: project,
            clientName: client,
            budget,
            timeline,
          })
        });
        const data = await res.json();
        setProposal(data.proposal || "Could not generate proposal. Check your API key.");
      } catch {
        setProposal("Network error. Please try again.");
      } finally {
        setLoading(false);
      }
  
  

  function copy() {
    navigator.clipboard.writeText(proposal);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: C.text }}>✨ AI Proposal Writer</h2>
        <p style={{ margin: "4px 0 0", color: C.muted, fontSize: 14 }}>Describe your project — Claude writes a ready-to-send proposal</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <Card>
          <div style={{ fontWeight: 700, fontSize: 14, color: C.text, marginBottom: 16 }}>Project details</div>
          <Input label="Project description *" value={project} onChange={setProject}
            placeholder="e.g. Redesign the homepage and product pages for an e-commerce brand..."
            multiline rows={4} />
          <Input label="Client name" value={client} onChange={setClient} placeholder="e.g. Acme Corp" />
          <Input label="Budget range" value={budget} onChange={setBudget} placeholder="e.g. $2,000 – $4,000" />
          <Input label="Timeline" value={timeline} onChange={setTimeline} placeholder="e.g. 3 weeks" />
          {error && <div style={{ color: C.danger, fontSize: 13, marginBottom: 12 }}>{error}</div>}
          <Btn onClick={generate} disabled={loading}>
            {loading ? "Writing proposal..." : "✨ Generate proposal"}
          </Btn>
        </Card>

        <Card style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: C.text }}>Generated proposal</div>
            {proposal && <Btn small variant="ghost" onClick={copy}>{copied ? "Copied!" : "Copy"}</Btn>}
          </div>
          {loading && (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
              flexDirection: "column", gap: 12, color: C.muted }}>
              <div style={{ width: 32, height: 32, border: `2px solid ${C.border}`,
                borderTop: `2px solid ${C.accent}`, borderRadius: "50%",
                animation: "spin 1s linear infinite" }} />
              <div style={{ fontSize: 13 }}>Claude is writing your proposal...</div>
            </div>
          )}
          {!loading && !proposal && (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
              color: C.muted, fontSize: 13, textAlign: "center" }}>
              Fill in the project details and click<br />"Generate proposal" to get started
            </div>
          )}
          {!loading && proposal && (
            <div style={{ flex: 1, whiteSpace: "pre-wrap", fontSize: 13, color: C.text,
              lineHeight: 1.7, overflowY: "auto", maxHeight: 420 }}>
              {proposal}
            </div>
          )}
        </Card>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ── Invoice List ──────────────────────────────────────────────────────────────
function InvoiceList({ invoices, onNew }) {
  const [filter, setFilter] = useState("all");
  const filtered = filter === "all" ? invoices : invoices.filter(i => i.status === filter);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: C.text }}>Invoices</h2>
          <p style={{ margin: "4px 0 0", color: C.muted, fontSize: 14 }}>{invoices.length} total invoices</p>
        </div>
        <Btn onClick={onNew}>+ New invoice</Btn>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {["all","paid","pending","overdue"].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ background: filter === f ? C.accent : C.surface, color: filter === f ? "#0b0c10" : C.muted,
              border: `1px solid ${filter === f ? C.accent : C.border}`, borderRadius: 20,
              padding: "5px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer",
              textTransform: "capitalize", fontFamily: "inherit" }}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <Card style={{ padding: 0 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ color: C.muted }}>
              {["Invoice","Client","Description","Amount","Due date","Status","Action"].map(h => (
                <th key={h} style={{ padding: "14px 16px", textAlign: "left", fontWeight: 600,
                  fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em",
                  borderBottom: `1px solid ${C.border}` }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((inv, i) => (
              <tr key={inv.id} style={{ borderBottom: i < filtered.length-1 ? `1px solid ${C.border}` : "none" }}>
                <td style={{ padding: "12px 16px", color: C.info, fontWeight: 600 }}>{inv.id}</td>
                <td style={{ padding: "12px 16px", color: C.text, fontWeight: 500 }}>{inv.client}</td>
                <td style={{ padding: "12px 16px", color: C.muted }}>{inv.desc}</td>
                <td style={{ padding: "12px 16px", color: C.text, fontWeight: 700 }}>{fmt(inv.amount)}</td>
                <td style={{ padding: "12px 16px", color: C.muted }}>{inv.due}</td>
                <td style={{ padding: "12px 16px" }}><Badge color={statusColor(inv.status)}>{statusLabel(inv.status)}</Badge></td>
                <td style={{ padding: "12px 16px" }}>
                  <Btn small variant="ghost">Send</Btn>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// ── New Invoice ───────────────────────────────────────────────────────────────
function NewInvoice({ onSave, onCancel }) {
  const [client,  setClient]  = useState("");
  const [email,   setEmail]   = useState("");
  const [desc,    setDesc]    = useState("");
  const [amount,  setAmount]  = useState("");
  const [due,     setDue]     = useState("");
  const [notes,   setNotes]   = useState("");
  const [saved,   setSaved]   = useState(false);

  function handleSave() {
    if (!client || !amount) return;
    const inv = {
      id: "INV-" + String(Date.now()).slice(-4),
      client, email, desc, amount: parseFloat(amount), due, notes, status: "pending"
    };
    onSave(inv);
    setSaved(true);
  }

  if (saved) return (
    <div style={{ textAlign: "center", padding: "60px 0" }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 8 }}>Invoice created!</div>
      <div style={{ color: C.muted, fontSize: 14, marginBottom: 24 }}>
        In production this would send a Stripe payment link to {email || "the client"}.
      </div>
      <Btn onClick={onCancel}>Back to invoices</Btn>
    </div>
  );

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: C.text }}>New invoice</h2>
          <p style={{ margin: "4px 0 0", color: C.muted, fontSize: 14 }}>Fill in the details and send to your client</p>
        </div>
        <Btn variant="ghost" onClick={onCancel}>Cancel</Btn>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <Card>
          <div style={{ fontWeight: 700, fontSize: 14, color: C.text, marginBottom: 16 }}>Client details</div>
          <Input label="Client / Company name *" value={client} onChange={setClient} placeholder="Acme Corp" />
          <Input label="Client email" value={email} onChange={setEmail} placeholder="billing@client.com" type="email" />
        </Card>
        <Card>
          <div style={{ fontWeight: 700, fontSize: 14, color: C.text, marginBottom: 16 }}>Invoice details</div>
          <Input label="Description *" value={desc} onChange={setDesc} placeholder="Website redesign — Phase 1" />
          <Input label="Amount ($) *" value={amount} onChange={setAmount} placeholder="2500" type="number" />
          <Input label="Due date" value={due} onChange={setDue} placeholder="2026-05-01" type="date" />
        </Card>
      </div>

      <Card style={{ marginTop: 16 }}>
        <Input label="Notes (optional)" value={notes} onChange={setNotes}
          placeholder="Payment terms, bank details, any extra info..." multiline rows={3} />
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
          <Btn variant="ghost" onClick={onCancel}>Cancel</Btn>
          <Btn onClick={handleSave} disabled={!client || !amount}>
            💳 Create &amp; send invoice
          </Btn>
        </div>
      </Card>
    </div>
  );
}

// ── Clients ───────────────────────────────────────────────────────────────────
function Clients({ clients }) {
  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: C.text }}>Clients</h2>
        <p style={{ margin: "4px 0 0", color: C.muted, fontSize: 14 }}>{clients.length} clients on record</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 14 }}>
        {clients.map(c => (
          <Card key={c.id}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
              <div style={{ width: 42, height: 42, borderRadius: "50%", background: C.accentD + "33",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: C.accent, fontWeight: 700, fontSize: 15 }}>
                {c.name.split(" ").map(w => w[0]).join("").slice(0,2)}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{c.name}</div>
                <div style={{ fontSize: 12, color: C.muted }}>{c.email}</div>
              </div>
            </div>
            <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 12,
              display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 12, color: C.muted }}>Total billed</div>
              <div style={{ fontWeight: 700, color: C.accent }}>{fmt(c.total)}</div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ── Settings ──────────────────────────────────────────────────────────────────
function Settings() {
  const [name,     setName]     = useState("Your Name");
  const [email,    setEmail]    = useState("you@yourbusiness.com");
  const [business, setBusiness] = useState("My Freelance Co");
  const [saved,    setSaved]    = useState(false);

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: C.text }}>Settings</h2>
        <p style={{ margin: "4px 0 0", color: C.muted, fontSize: 14 }}>Your profile and integrations</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <Card>
          <div style={{ fontWeight: 700, fontSize: 14, color: C.text, marginBottom: 16 }}>Profile</div>
          <Input label="Your name" value={name} onChange={setName} />
          <Input label="Email" value={email} onChange={setEmail} type="email" />
          <Input label="Business name" value={business} onChange={setBusiness} />
          <Btn onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 2000); }}>
            {saved ? "Saved!" : "Save changes"}
          </Btn>
        </Card>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {[
            { name: "Stripe", desc: "Collect payments from clients", color: C.info, status: "Connect" },
            { name: "Anthropic API", desc: "Powers the AI proposal writer", color: C.accent, status: "Connected" },
            { name: "SMTP Email", desc: "Send invoices directly from your domain", color: C.warn, status: "Connect" },
          ].map(int => (
            <Card key={int.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{int.name}</div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>{int.desc}</div>
              </div>
              <Badge color={int.status === "Connected" ? C.accent : C.muted}>{int.status}</Badge>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// ROOT APP
// ════════════════════════════════════════════════════════════════════════════
export default function InvoiceAI() {
  const [page,     setPage]     = useState("dashboard");
  const [invoices, setInvoices] = useState(SAMPLE_INVOICES);
  const clients = SAMPLE_CLIENTS;

  const nav = [
    { id: "dashboard",  label: "Dashboard",  icon: "⊞" },
    { id: "invoices",   label: "Invoices",   icon: "🧾" },
    { id: "proposal",   label: "AI Writer",  icon: "✨" },
    { id: "clients",    label: "Clients",    icon: "👥" },
    { id: "settings",   label: "Settings",   icon: "⚙" },
  ];

  function handleNewInvoice(inv) {
    setInvoices(prev => [inv, ...prev]);
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: C.bg,
      fontFamily: "'Sora', 'DM Sans', system-ui, sans-serif", color: C.text }}>

      {/* Sidebar */}
      <div style={{ width: 220, background: C.surface, borderRight: `1px solid ${C.border}`,
        display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ padding: "22px 20px 14px", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.02em" }}>
            Invoice<span style={{ color: C.accent }}>AI</span>
          </div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>Pro plan · Active</div>
        </div>

        <nav style={{ flex: 1, padding: "12px 10px" }}>
          {nav.map(n => (
            <button key={n.id} onClick={() => setPage(n.id)}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 10,
                background: page === n.id ? C.accent + "18" : "transparent",
                color: page === n.id ? C.accent : C.muted,
                border: "none", borderRadius: 8, padding: "10px 12px", cursor: "pointer",
                fontSize: 14, fontFamily: "inherit", fontWeight: page === n.id ? 600 : 400,
                marginBottom: 2, textAlign: "left", transition: "all .15s" }}>
              <span style={{ fontSize: 16 }}>{n.icon}</span>
              {n.label}
            </button>
          ))}
        </nav>

        <div style={{ padding: "14px 16px", borderTop: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 6 }}>Monthly revenue</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: C.accent }}>
            {fmt(invoices.filter(i => i.status === "paid").reduce((s,i) => s + i.amount, 0))}
          </div>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, padding: "32px 36px", overflowY: "auto" }}>
        {page === "dashboard"  && <Dashboard invoices={invoices} onNav={setPage} />}
        {page === "invoices"   && <InvoiceList invoices={invoices} onNew={() => setPage("new-invoice")} />}
        {page === "new-invoice"&& <NewInvoice onSave={handleNewInvoice} onCancel={() => setPage("invoices")} />}
        {page === "proposal"   && <ProposalWriter />}
        {page === "clients"    && <Clients clients={clients} />}
        {page === "settings"   && <Settings />}
      </div>
    </div>
  );
}
