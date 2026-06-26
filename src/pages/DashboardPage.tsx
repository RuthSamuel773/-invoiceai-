import { useState, useEffect } from "react";
import type { DashboardStats, Invoice } from "../types";
import { authFetch, formatCurrency, formatDate } from "../lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useNavigate } from "react-router-dom";
import { TrendingUp, Clock, AlertCircle, Sparkles, FileText } from "lucide-react";

const statusConfig: Record<string, { label: string; class: string }> = {
  paid: { label: "Paid", class: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  pending: { label: "Pending", class: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" },
  overdue: { label: "Overdue", class: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
};

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      try {
        const res = await authFetch("/api/dashboard");
        if (res.ok) setStats(await res.json());
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Welcome back — here's your money overview</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}><CardContent className="pt-6"><Skeleton className="h-16 w-full" /></CardContent></Card>
          ))
        ) : (
          <>
            <Card className="border-green-200 dark:border-green-800">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Earned</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(stats?.total_earned ?? 0)}</p>
              </CardContent>
            </Card>
            <Card className="border-yellow-200 dark:border-yellow-800">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">Outstanding</CardTitle>
                <Clock className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-yellow-600">{formatCurrency(stats?.outstanding ?? 0)}</p>
              </CardContent>
            </Card>
            <Card className="border-red-200 dark:border-red-800">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">Overdue</CardTitle>
                <AlertCircle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(stats?.overdue ?? 0)}</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => navigate("/proposals")}>
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="text-3xl"><Sparkles className="h-8 w-8 text-primary" /></div>
            <div>
              <p className="font-semibold text-foreground">AI Proposal Writer</p>
              <p className="text-sm text-muted-foreground">Describe your project — Gemini writes a professional proposal in seconds</p>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => navigate("/invoices")}>
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="text-3xl"><FileText className="h-8 w-8 text-primary" /></div>
            <div>
              <p className="font-semibold text-foreground">New Invoice</p>
              <p className="text-sm text-muted-foreground">Create and send a professional invoice with a Stripe payment link</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Invoices */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Invoices</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => navigate("/invoices")}>View all</Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-32 w-full" />
          ) : (stats?.recent_invoices ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No invoices yet. Create your first one!</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(stats?.recent_invoices ?? []).map((inv: Invoice) => {
                  const sc = statusConfig[inv.status] ?? statusConfig.pending;
                  return (
                    <TableRow key={inv.id}>
                      <TableCell className="font-medium">{inv.invoice_number}</TableCell>
                      <TableCell>{inv.client_name}</TableCell>
                      <TableCell>{formatCurrency(Number(inv.amount))}</TableCell>
                      <TableCell>{formatDate(inv.due_date)}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sc.class}`}>{sc.label}</span>
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
