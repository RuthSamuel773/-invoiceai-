import { useState, useEffect } from "react";
import type { Invoice, InvoiceStatus } from "../types";
import { authFetch, formatCurrency, formatDate } from "../lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Trash2, Link, CheckCircle } from "lucide-react";

const statusConfig: Record<string, { label: string; class: string }> = {
  paid: { label: "Paid", class: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  pending: { label: "Pending", class: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" },
  overdue: { label: "Overdue", class: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
};

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [linkLoading, setLinkLoading] = useState<number | null>(null);

  const [form, setForm] = useState({
    client_name: "",
    client_email: "",
    amount: "",
    due_date: "",
    description: "",
    status: "pending" as InvoiceStatus,
  });

  const fetchInvoices = async () => {
    try {
      const res = await authFetch("/api/invoices");
      if (res.ok) setInvoices(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchInvoices(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await authFetch("/api/invoices", {
        method: "POST",
        body: JSON.stringify({
          client_name: form.client_name,
          client_email: form.client_email || null,
          amount: parseFloat(form.amount),
          due_date: form.due_date || null,
          description: form.description || null,
          status: form.status,
        }),
      });
      if (!res.ok) { toast.error("Failed to create invoice"); return; }
      toast.success("Invoice created!");
      setShowCreate(false);
      setForm({ client_name: "", client_email: "", amount: "", due_date: "", description: "", status: "pending" });
      fetchInvoices();
    } finally {
      setSubmitting(false);
    }
  };

  const markPaid = async (id: number) => {
    const res = await authFetch(`/api/invoices/${id}`, {
      method: "PUT",
      body: JSON.stringify({ status: "paid" }),
    });
    if (res.ok) { toast.success("Marked as paid"); fetchInvoices(); }
    else toast.error("Failed to update");
  };

  const deleteInvoice = async (id: number, num: string) => {
    if (!confirm(`Delete invoice ${num}?`)) return;
    const res = await authFetch(`/api/invoices/${id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Invoice deleted"); fetchInvoices(); }
    else toast.error("Failed to delete");
  };

  const getPaymentLink = async (id: number) => {
    setLinkLoading(id);
    try {
      const res = await authFetch("/api/stripe/payment-link", {
        method: "POST",
        body: JSON.stringify({ invoice_id: id }),
      });
      if (!res.ok) { toast.error("Failed to create payment link"); return; }
      const data = await res.json();
      window.open(data.payment_link_url, "_blank");
      toast.success("Payment link created!");
      fetchInvoices();
    } finally {
      setLinkLoading(null);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Invoices</h1>
          <p className="text-muted-foreground mt-1">Manage your invoices and payments</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />New Invoice</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Invoice</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="client_name">Client Name *</Label>
                <Input id="client_name" required value={form.client_name} onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))} placeholder="Acme Corp" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="client_email">Client Email</Label>
                <Input id="client_email" type="email" value={form.client_email} onChange={e => setForm(f => ({ ...f, client_email: e.target.value }))} placeholder="client@example.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (USD) *</Label>
                <Input id="amount" required type="number" min="0" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="2500.00" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="due_date">Due Date</Label>
                <Input id="due_date" type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as InvoiceStatus }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Project details..." rows={3} />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
                <Button type="submit" disabled={submitting}>{submitting ? "Creating..." : "Create Invoice"}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-40 w-full" />
          ) : invoices.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">No invoices yet. Create your first invoice above.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv) => {
                  const sc = statusConfig[inv.status] ?? statusConfig.pending;
                  return (
                    <TableRow key={inv.id}>
                      <TableCell className="font-medium">{inv.invoice_number}</TableCell>
                      <TableCell>
                        <div>{inv.client_name}</div>
                        {inv.client_email && <div className="text-xs text-muted-foreground">{inv.client_email}</div>}
                      </TableCell>
                      <TableCell>{formatCurrency(Number(inv.amount))}</TableCell>
                      <TableCell>{formatDate(inv.due_date)}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sc.class}`}>{sc.label}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {inv.status !== "paid" && (
                            <Button size="sm" variant="ghost" onClick={() => markPaid(inv.id)} title="Mark as paid">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            </Button>
                          )}
                          {inv.stripe_payment_link ? (
                            <Button size="sm" variant="ghost" onClick={() => window.open(inv.stripe_payment_link!, "_blank")} title="Open payment link">
                              <Link className="h-4 w-4 text-blue-600" />
                            </Button>
                          ) : (
                            <Button size="sm" variant="ghost" disabled={linkLoading === inv.id} onClick={() => getPaymentLink(inv.id)} title="Create Stripe payment link">
                              {linkLoading === inv.id ? (
                                <span className="text-xs">...</span>
                              ) : (
                                <Link className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" onClick={() => deleteInvoice(inv.id, inv.invoice_number)} title="Delete">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
