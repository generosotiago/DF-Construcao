import { create } from 'zustand';
import { User, Project, Transaction, DashboardData, Category } from '../types';
import { storage } from '../utils/storage';

// Conexão centralizada do Supabase
import { supabase } from '../services/supabaseClient';

// ==========================================
// 1. AUTH STORE
// ==========================================
interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (userData: { nome: string; email: string }, token: string) => Promise<void>;
  loginWithGoogle: (token: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  loadFromStorage: () => Promise<void>;
  updateUser: (updates: Partial<Pick<User, 'name' | 'email'>>) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,

  loadFromStorage: async () => {
    try {
      const token = await storage.getItem('df_token');
      const userStr = await storage.getItem('df_user');

      if (!token || !userStr) {
        set({ isLoading: false });
        return;
      }

      const cachedUser: User = JSON.parse(userStr);

      // Valida no Supabase se o usuário ainda existe. Evita "logado como
      // usuário fantasma" quando o registro foi removido ou os dados locais
      // ficaram divergentes do banco.
      try {
        const { data, error } = await supabase
          .from('usuarios')
          .select('id, nome, email')
          .eq('email', cachedUser.email)
          .maybeSingle();

        if (error) {
          // Falha de rede: mantém sessão para não bloquear o app offline.
          set({ token, user: cachedUser, isAuthenticated: true, isLoading: false });
          return;
        }

        if (!data) {
          // Usuário não existe mais no banco. Limpa a sessão.
          await storage.removeItem('df_token');
          await storage.removeItem('df_user');
          set({ user: null, token: null, isAuthenticated: false, isLoading: false });
          return;
        }

        // Sincroniza dados locais com o que está no banco
        const syncedUser: User = {
          ...cachedUser,
          id: String(data.id ?? cachedUser.id),
          name: data.nome ?? cachedUser.name,
          email: data.email ?? cachedUser.email,
        };
        await storage.setItem('df_user', JSON.stringify(syncedUser));
        set({ token, user: syncedUser, isAuthenticated: true, isLoading: false });
      } catch {
        // Erro de rede inesperado: mantém sessão para uso offline.
        set({ token, user: cachedUser, isAuthenticated: true, isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  login: async (userData, token) => {
    const sessionUser: User = {
      id: userData.email, 
      name: userData.nome,
      email: userData.email,
      role: 'admin',
      createdAt: new Date().toISOString(),
    };

    await storage.setItem('df_token', token);
    await storage.setItem('df_user', JSON.stringify(sessionUser));
    
    set({ user: sessionUser, token: token, isAuthenticated: true });
  },

  loginWithGoogle: async (token: string, user: User) => {
    await storage.setItem('df_token', token);
    await storage.setItem('df_user', JSON.stringify(user));
    set({ user, token, isAuthenticated: true });
  },

  logout: async () => {
    await storage.removeItem('df_token');
    await storage.removeItem('df_user');
    
    set({ user: null, token: null, isAuthenticated: false });

    useProjectStore.setState({ projects: [], selectedProject: null });
    useTransactionStore.setState({ transactions: [], total: 0 });
    useDashboardStore.setState({ data: null });
  },

  updateUser: async (updates) => {
    const current = useAuthStore.getState().user;
    if (!current) return;

    // Sincroniza com Supabase usando o email atual como chave (assim
    // mantém o vínculo mesmo que o email seja alterado).
    const payload: Record<string, any> = {};
    if (updates.name !== undefined) payload.nome = updates.name;
    if (updates.email !== undefined) payload.email = updates.email;

    if (Object.keys(payload).length > 0) {
      const { error } = await supabase
        .from('usuarios')
        .update(payload)
        .eq('email', current.email);

      if (error) throw error;
    }

    const updated: User = { ...current, ...updates };
    await storage.setItem('df_user', JSON.stringify(updated));
    set({ user: updated });
  },
}));

// ==========================================
// 2. DASHBOARD STORE
// ==========================================
interface DashboardState {
  data: DashboardData | null;
  isLoading: boolean;
  error: string | null;
  fetch: () => Promise<void>;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  data: null,
  isLoading: false,
  error: null,
  fetch: async () => {
    set({ isLoading: true, error: null });
    try {
      // 1. Busca transações para calcular totais
      const { data: txs, error: txsError } = await supabase
        .from('transacoes')
        .select('valor, tipo_transacao, id, obra_id, descricao, data, categoria, forma_pagamento, status, obras(nome_da_obra)')
        .order('data', { ascending: false });

      if (txsError) throw txsError;

      // 2. Busca obras para calcular projetos ativos
      const { data: obras, error: obrasError } = await supabase
        .from('obras')
        .select('status');

      if (obrasError) throw obrasError;

      let receitas = 0;
      let despesas = 0;

      txs?.forEach((t: any) => {
        const valor = Number(t.valor) || 0;
        // Transforma tudo em minúsculo e tira espaços perdidos nas bordas
        const tipoLimpo = String(t.tipo_transacao || '').trim().toLowerCase();
        
        if (tipoLimpo === 'receita' || tipoLimpo === 'revenue') {
          receitas += valor;
        } else if (tipoLimpo === 'despesa' || tipoLimpo === 'expense') {
          despesas += valor;
        }
      });

      const lucro = receitas - despesas;
      const margemCalculada = receitas > 0 ? ((lucro / receitas) * 100).toFixed(1) : '0.0';

      // Filtra de acordo com o enum estrito definido no types.ts
      const activeProjectsCount = obras?.filter(
        (o: any) => o.status === 'em_andamento' || o.status === 'orcamento'
      ).length || 0;

      // 3. Mapeia as transações recentes com fallbacks e enums válidos em minúsculo
      const mappedRecent: Transaction[] = (txs || []).slice(0, 6).map((t: any): Transaction => {
        const safePaymentMethod = String(t.forma_pagamento || 'dinheiro').toLowerCase() as Transaction['payment_method'];
        const safeStatus = String(t.status || 'pago').toLowerCase() as Transaction['status'];

        return {
          id: String(t.id),
          project_id: t.obra_id ? String(t.obra_id) : undefined,
          project_name: t.obras?.nome_da_obra || 'Geral', // <--- ADICIONE ESTA LINHA AQUI
          amount: Number(t.valor),
          type: t.tipo_transacao === 'receita' ? 'receita' : 'despesa',
          date: t.data || new Date().toISOString().split('T')[0],
          description: t.descricao || '',
          user_id: 'sistema',
          createdAt: t.data || new Date().toISOString(),
          payment_method: ['dinheiro', 'pix', 'transferencia', 'boleto', 'cartao', 'cheque', 'outro'].includes(safePaymentMethod) ? safePaymentMethod : 'outro',
          status: ['pendente', 'pago', 'cancelado', 'atrasado'].includes(safeStatus) ? safeStatus : 'pago',
        };
      });

      set({
        data: {
          month: {
            receita: receitas,
            despesa: despesas,
            lucro: lucro,
            margem: margemCalculada,
            revenue: receitas,
            expense: despesas,
            profit: lucro,
          },
          lastMonth: {
            receita: 0,
            despesa: 0,
            lucro: 0,
            revenue: 0,
            expense: 0,
            profit: 0,
          },
          growth: {
            receita: '0%',
            despesa: '0%',
            revenue: '0%',
            expense: '0%',
          },
          activeProjects: activeProjectsCount,
          recentTransactions: mappedRecent,
        },
        isLoading: false,
      });
    } catch (e: any) {
      set({ error: e.message, isLoading: false });
    }
  },
}));

// ==========================================
// FUNÇÕES AUXILIARES DE MAPEAMENTO ESTRETO
// ==========================================
const mapProject = (o: any): Project => {
  const allowedStatus: Project['status'][] = ['orcamento', 'em_andamento', 'concluido', 'cancelado', 'pausado'];
  const allowedTypes: Project['type'][] = ['fundacao', 'alvenaria', 'levantamento_paredes', 'cobertura', 'reboco', 'completo', 'outro'];

  const safeStatus = (String(o.status || '').toLowerCase()) as Project['status'];
  const safeType = (String(o.tipo_de_obra || '').toLowerCase()) as Project['type'];

  return {
    id: String(o.id || ''),
    name: o.nome_da_obra || 'Obra sem nome',
    client: o.cliente || 'Cliente não informado',
    address: o.endereco || undefined,
    description: o.descricao || undefined,
    status: allowedStatus.includes(safeStatus) ? safeStatus : 'em_andamento',
    type: allowedTypes.includes(safeType) ? safeType : 'outro',
    budget: Number(o.orçamento_total) || 0,
    user_id: String(o.user_id || 'sistema'),
    createdAt: o.data_inicio || new Date().toISOString(),
    
    // A MÁGICA AQUI: Mapeando os totais (com fallback para variações de nome no banco)
    total_receita: Number(o.total_receita || o.receita || o.receitas || 0),
    total_despesa: Number(o.total_despesa || o.despesa || o.despesas || 0),
    lucro: Number(o.lucro || 0),
  };
};

const mapTransaction = (t: any): Transaction => {
  const safePaymentMethod = String(t.forma_pagamento || 'dinheiro').toLowerCase() as Transaction['payment_method'];
  const safeStatus = String(t.status || 'pago').toLowerCase() as Transaction['status'];

  return {
    id: String(t.id),
    project_id: t.obra_id ? String(t.obra_id) : undefined,
    // Aqui está a mágica: pegamos o nome da obra via join (t.obras.nome_da_obra)
    project_name: t.obras?.nome_da_obra || 'Geral', 
    amount: Number(t.valor),
    type: t.tipo_transacao === 'receita' ? 'receita' : 'despesa',
    date: t.data || new Date().toISOString().split('T')[0],
    description: t.descricao || '',
    user_id: 'sistema',
    createdAt: t.data || new Date().toISOString(),
    payment_method: ['dinheiro', 'pix', 'transferencia', 'boleto', 'cartao', 'cheque', 'outro'].includes(safePaymentMethod) ? safePaymentMethod : 'outro',
    status: ['pendente', 'pago', 'cancelado', 'atrasado'].includes(safeStatus) ? safeStatus : 'pago',
  };
};

// ==========================================
// 3. PROJECT STORE
// ==========================================
interface ProjectState {
  projects: Project[];
  selectedProject: Project | null;
  isLoading: boolean;
  error: string | null;
  fetchAll: (params?: Record<string, any>) => Promise<void>;
  fetchOne: (id: string) => Promise<void>;
  create: (data: Record<string, any>) => Promise<Project>;
  update: (id: string, data: Record<string, any>) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  selectedProject: null,
  isLoading: false,
  error: null,

  fetchAll: async (params?: Record<string, any>) => {
    set({ isLoading: true, error: null });
    try {
      // 1. Busca todas as obras
      let query = supabase.from('obras').select('*').order('id', { ascending: false });

      if (params?.status) query = query.eq('status', params.status);
      if (params?.search) query = query.ilike('nome_da_obra', `%${params.search}%`);

      const { data: obras, error: obrasError } = await query;
      if (obrasError) throw obrasError;

      // 2. Busca todas as transações de uma vez para calcular os totais
      const { data: transacoes, error: txError } = await supabase
        .from('transacoes')
        .select('obra_id, valor, tipo_transacao');
      
      if (txError) throw txError;

      // 3. Mapeia e calcula os totais para cada obra
      const mappedProjects: Project[] = (obras || []).map((o: any) => {
        const txsDaObra = (transacoes || []).filter(t => String(t.obra_id) === String(o.id));
        
        let receita = 0;
        let despesa = 0;
        
        txsDaObra.forEach(t => {
          const valor = Number(t.valor) || 0;
          if (t.tipo_transacao === 'receita') receita += valor;
          else if (t.tipo_transacao === 'despesa') despesa += valor;
        });

        // Retorna o objeto mapeado com os totais calculados
        return {
          ...mapProject(o),
          total_receita: receita,
          total_despesa: despesa,
          lucro: receita - despesa
        };
      });

      set({ projects: mappedProjects, isLoading: false });
    } catch (e: any) {
      set({ error: e.message, isLoading: false });
    }
  },

  fetchOne: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data: obra, error: obraError } = await supabase
        .from('obras')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (obraError) throw obraError;

      const { data: txs, error: txsError } = await supabase
        .from('transacoes')
        .select('*')
        .eq('obra_id', id);

      if (txsError) throw txsError;

      const mappedObra = obra ? mapProject(obra) : null;
      const mappedTransactions = (txs || []).map(mapTransaction);

      // CÁLCULO DINÂMICO À PROVA DE FALHAS:
      // Se a tabela 'obras' estiver zerada, o app calcula os totais reais somando as transações.
      if (mappedObra) {
        let receitaReal = 0;
        let despesaReal = 0;
        
        mappedTransactions.forEach(t => {
            if (t.type === 'receita') receitaReal += t.amount;
            else if (t.type === 'despesa') despesaReal += t.amount;
        });

        // Força a exibição dos cálculos exatos baseados nas transações vinculadas
        mappedObra.total_receita = receitaReal;
        mappedObra.total_despesa = despesaReal;
        mappedObra.lucro = receitaReal - despesaReal;
      }

      set({ 
        selectedProject: mappedObra ? { ...mappedObra, transactions: mappedTransactions } : null, 
        isLoading: false 
      });
    } catch (e: any) {
      set({ error: e.message, isLoading: false });
    }
  },

  create: async (data: Record<string, any>) => {
    const payload = {
      nome_da_obra: data.name,
      cliente: data.client,
      status: data.status || 'em_andamento',
      orçamento_total: data.budget || 0,
      endereco: data.address || '',
      tipo_de_obra: data.type || 'outro',
      data_inicio: data.startDate || new Date().toISOString().split('T')[0],
    };

    const { data: res, error } = await supabase
      .from('obras')
      .insert([payload])
      .select()
      .single();

    if (error) throw error;

    const newProject = mapProject(res);
    set((state: ProjectState) => ({ projects: [newProject, ...state.projects] }));
    return newProject;
  },

  update: async (id: string, data: Record<string, any>) => {
    const payload: Record<string, any> = {};
    if (data.name) payload.nome_da_obra = data.name;
    if (data.client) payload.cliente = data.client;
    if (data.status) payload.status = data.status;
    if (data.budget) payload.orçamento_total = data.budget;

    const { error } = await supabase
      .from('obras')
      .update(payload)
      .eq('id', id);

    if (error) throw error;
    await get().fetchAll();
  },

  remove: async (id: string) => {
    const { error } = await supabase
      .from('obras')
      .delete()
      .eq('id', id);

    if (error) throw error;
    set((state: ProjectState) => ({ projects: state.projects.filter((p: Project) => p.id !== id) }));
  },
}));

// ==========================================
// 4. TRANSACTION STORE
// ==========================================
interface TransactionState {
  transactions: Transaction[];
  isLoading: boolean;
  error: string | null;
  total: number;
  fetchAll: (params?: Record<string, any>) => Promise<void>;
  create: (data: Record<string, any>) => Promise<Transaction>;
  remove: (id: string) => Promise<void>;
}

export const useTransactionStore = create<TransactionState>((set) => ({
  transactions: [],
  isLoading: false,
  error: null,
  total: 0,

  fetchAll: async (params?: Record<string, any>) => {
    set({ isLoading: true, error: null });
    try {
      let query = supabase.from('transacoes').select('*, obras(nome_da_obra)', { count: 'exact' }).order('data', { ascending: false });

      if (params?.type) {
        const dbType = params.type === 'revenue' || params.type === 'receita' ? 'receita' : 'despesa';
        query = query.eq('tipo_transacao', dbType);
      }
      if (params?.project_id) {
        query = query.eq('obra_id', params.project_id);
      }

      const { data, error, count } = await query;
      if (error) throw error;

      const mappedTxs = (data || []).map(mapTransaction);
      set({ transactions: mappedTxs, total: count || 0, isLoading: false });
    } catch (e: any) {
      set({ error: e.message, isLoading: false });
    }
  },

  create: async (data: Record<string, any>) => {
  
  const { supabase: localSupabase } = require('../services/supabaseClient');
    
  if (!data.amount) throw new Error("Valor da transação é obrigatório");

  const payload = {
      tipo_transacao: data.type === 'revenue' || data.type === 'receita' ? 'receita' : 'despesa',
      valor: Number(data.amount) || 0,
      descricao: data.description || 'Transação de Obra',
      data: data.date ? data.date.split('T')[0] : new Date().toISOString().split('T')[0],
      obra_id: data.project_id ? Number(data.project_id) : null,
      status: data.status || 'pago',
      categoria: data.category || 'Geral',
      forma_pagamento: data.payment_method || 'dinheiro'
    };

    try {
      // 2. Usar a instância local forçada
      const { data: res, error } = await localSupabase
        .from('transacoes')
        .insert([payload])
        .select()
        .single();

      if (error) {
        console.error("DEBUG - Erro Supabase no insert:", JSON.stringify(error));
        throw error;
      }

      const newTx = mapTransaction(res);
      set((state: TransactionState) => ({ 
        transactions: [newTx, ...state.transactions] 
      }));
    
    // Atualiza o dashboard após sucesso
    await useDashboardStore.getState().fetch();
    
    return newTx;
    } catch (err) {
      console.error("DEBUG - Erro crítico na TransactionStore:", err);
      throw err;
    }
  },

  remove: async (id: string) => {
    const { error } = await supabase
      .from('transacoes')
      .delete()
      .eq('id', id);

    if (error) throw error;
    set((state: TransactionState) => ({ transactions: state.transactions.filter((t: Transaction) => t.id !== id) }));
    
    useDashboardStore.getState().fetch();
  },
}));

interface CategoryState {
  categories: Category[];
  fetchAll: (params?: Record<string, any>) => Promise<void>;
}

export const useCategoryStore = create<CategoryState>((set) => ({
  categories: [],
  fetchAll: async (params?: Record<string, any>) => {
    try {
      let query = supabase.from('categorias').select('*');
      if (params?.type) {
        query = query.eq('type', params.type);
      }
      const { data, error } = await query;
      if (error) throw error;
      set({ categories: data as Category[] });
    } catch {}
  },
}));