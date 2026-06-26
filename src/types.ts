export type ApiStatus = "checking" | "connected" | "error";

export interface HealthResponse {
  ok: boolean;
}

export type InvoiceStatus = "pending" | "paid" | "overdue";

export interface User {
  id: number;
  email: string;
  name: string;
  picture: string;
}

export interface Invoice {
  id: number;
  invoice_number: string;
  client_name: string;
  client_email: string | null;
  amount: number;
  due_date: string | null;
  status: InvoiceStatus;
  description: string | null;
  stripe_payment_link: string | null;
  created_at: string;
}

export interface Proposal {
  id: number;
  project_description: string;
  generated_content: string;
  created_at: string;
}

export interface DashboardStats {
  total_earned: number;
  outstanding: number;
  overdue: number;
  recent_invoices: Invoice[];
}
