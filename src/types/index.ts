export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'viewer';
  avatar?: string;
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  client: string;
  address?: string;
  description?: string;
  status: 'orcamento' | 'em_andamento' | 'concluido' | 'cancelado' | 'pausado';
  type: 'fundacao' | 'alvenaria' | 'levantamento_paredes' | 'cobertura' | 'reboco' | 'completo' | 'outro';
  budget: number;
  start_date?: string;
  end_date?: string;
  estimated_end_date?: string;
  notes?: string;
  user_id: string;
  total_receita?: number;
  total_despesa?: number;
  lucro?: number;
  percentual_orcamento?: number;
  createdAt: string;
  transactions?: Transaction[]; // Campo opcional para carregar detalhes adicionais
}

export interface Category {
  id: string;
  name: string;
  type: 'receita' | 'despesa';
  icon: string;
  color: string;
  is_system: boolean;
}

export interface Transaction {
  id: string;
  type: 'receita' | 'despesa';
  amount: number;
  description: string;
  date: string;
  due_date?: string;
  payment_method: 'dinheiro' | 'pix' | 'transferencia' | 'boleto' | 'cartao' | 'cheque' | 'outro';
  status: 'pendente' | 'pago' | 'cancelado' | 'atrasado';
  notes?: string;
  project_id?: string;
  project_name?: string;
  category_id?: string;
  user_id: string;
  category?: Category;
  project?: Pick<Project, 'id' | 'name' | 'client'>;
  createdAt: string;
}

export interface DashboardData {
  month: {
    receita: number;
    despesa: number;
    lucro: number;
    margem: string;
    revenue?: number;   // Adicionado
    expense?: number;   // Adicionado
    profit?: number;    // Adicionado
  };
  lastMonth: {
    receita: number;
    despesa: number;
    lucro: number;
    revenue?: number;   // Adicionado
    expense?: number;   // Adicionado
    profit?: number;    // Adicionado
  };
  growth: {
    receita: string;
    despesa: string;
    revenue?: string;   // Adicionado
    expense?: string;   // Adicionado
  };
  activeProjects: number;
  recentTransactions: Transaction[];
}

export interface CashflowItem {
  month: string;
  year: number;
  monthIndex: number;
  receita: number;
  despesa: number;
  lucro: number;
}