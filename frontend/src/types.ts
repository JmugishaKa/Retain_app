export type Role = 'user' | 'admin';
export interface User { id: number; name: string; email: string; role: Role }
export interface Category { id: number; name: string; is_default: boolean }
export interface Expense {
  id: number; title: string; amount: number; date: string; payment_method: string;
  notes: string | null; category_id: number; category: string;
}
export interface Paged { items: Expense[]; total: number; page: number; pages: number }
export type Status = 'none' | 'within' | 'approaching' | 'over';
export interface DashboardData {
  month: string; spent: number; budget: number | null; remaining: number | null; status: Status;
  highest: Expense | null; byCategory: { category: string; total: number }[]; recent: Expense[];
}
export interface CatStat { category: string; count: number; total: number }
export interface Insights {
  totalUsers: number; totalExpenses: number; totalValue: number; monthExpenses: number;
  perCategory: CatStat[]; top5: CatStat[]; bottom5: CatStat[];
  recentExpenses: { id: number; title: string; amount: number; date: string; category: string; user_name: string }[];
  recentUsers: { id: number; name: string; email: string; created_at: string }[];
}
export const PAYMENTS = ['Cash', 'Card', 'Mobile Money', 'Bank Transfer'];
