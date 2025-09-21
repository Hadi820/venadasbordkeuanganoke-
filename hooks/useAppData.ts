import { useState, useCallback } from 'react';

interface AppDataState {
  clients: any[];
  projects: any[];
  teamMembers: any[];
  contracts: any[];
  sops: any[];
  transactions: any[];
  loading: {
    clients: boolean;
    projects: boolean;
    teamMembers: boolean;
    contracts: boolean;
    sops: boolean;
    transactions: boolean;
  };
  loaded: {
    clients: boolean;
    projects: boolean;
    teamMembers: boolean;
    contracts: boolean;
    sops: boolean;
    transactions: boolean;
  };
}

export function useAppData() {
  const [state, setState] = useState<AppDataState>({
    clients: [],
    projects: [],
    teamMembers: [],
    contracts: [],
    sops: [],
    transactions: [],
    loading: {
      clients: false,
      projects: false,
      teamMembers: false,
      contracts: false,
      sops: false,
      transactions: false,
    },
    loaded: {
      clients: false,
      projects: false,
      teamMembers: false,
      contracts: false,
      sops: false,
      transactions: false,
    }
  });

  // Load clients lazily
  const loadClients = useCallback(async () => {
    if (state.loading.clients || state.loaded.clients) return;

    setState(prev => ({
      ...prev,
      loading: { ...prev.loading, clients: true }
    }));

    try {
      const { listClients } = await import('../services/clients');
      const clients = await listClients({ limit: 50 });
      
      setState(prev => ({
        ...prev,
        clients,
        loading: { ...prev.loading, clients: false },
        loaded: { ...prev.loaded, clients: true }
      }));
    } catch (error) {
      console.warn('[Supabase] Failed to fetch clients:', error);
      setState(prev => ({
        ...prev,
        loading: { ...prev.loading, clients: false }
      }));
    }
  }, [state.loading.clients, state.loaded.clients]);

  // Load projects lazily
  const loadProjects = useCallback(async () => {
    if (state.loading.projects || state.loaded.projects) return;

    setState(prev => ({
      ...prev,
      loading: { ...prev.loading, projects: true }
    }));

    try {
      const { listProjects } = await import('../services/projects');
      const projects = await listProjects({ limit: 50 });
      
      setState(prev => ({
        ...prev,
        projects,
        loading: { ...prev.loading, projects: false },
        loaded: { ...prev.loaded, projects: true }
      }));
    } catch (error) {
      console.warn('[Supabase] Failed to fetch projects:', error);
      setState(prev => ({
        ...prev,
        loading: { ...prev.loading, projects: false }
      }));
    }
  }, [state.loading.projects, state.loaded.projects]);

  // Load team members lazily
  const loadTeamMembers = useCallback(async () => {
    if (state.loading.teamMembers || state.loaded.teamMembers) return;

    setState(prev => ({
      ...prev,
      loading: { ...prev.loading, teamMembers: true }
    }));

    try {
      const { listTeamMembers } = await import('../services/teamMembers');
      const teamMembers = await listTeamMembers({ limit: 50 });
      
      setState(prev => ({
        ...prev,
        teamMembers,
        loading: { ...prev.loading, teamMembers: false },
        loaded: { ...prev.loaded, teamMembers: true }
      }));
    } catch (error) {
      console.warn('[Supabase] Failed to fetch team members:', error);
      setState(prev => ({
        ...prev,
        loading: { ...prev.loading, teamMembers: false }
      }));
    }
  }, [state.loading.teamMembers, state.loaded.teamMembers]);

  // Load contracts lazily
  const loadContracts = useCallback(async () => {
    if (state.loading.contracts || state.loaded.contracts) return;

    setState(prev => ({
      ...prev,
      loading: { ...prev.loading, contracts: true }
    }));

    try {
      const { listContracts } = await import('../services/contracts');
      const contracts = await listContracts();
      
      setState(prev => ({
        ...prev,
        contracts,
        loading: { ...prev.loading, contracts: false },
        loaded: { ...prev.loaded, contracts: true }
      }));
    } catch (error) {
      console.warn('[Supabase] Failed to fetch contracts:', error);
      setState(prev => ({
        ...prev,
        loading: { ...prev.loading, contracts: false }
      }));
    }
  }, [state.loading.contracts, state.loaded.contracts]);

  // Load SOPs lazily
  const loadSOPs = useCallback(async () => {
    if (state.loading.sops || state.loaded.sops) return;

    setState(prev => ({
      ...prev,
      loading: { ...prev.loading, sops: true }
    }));

    try {
      const { listSOPs } = await import('../services/sops');
      const sops = await listSOPs();
      
      setState(prev => ({
        ...prev,
        sops,
        loading: { ...prev.loading, sops: false },
        loaded: { ...prev.loaded, sops: true }
      }));
    } catch (error) {
      console.warn('[Supabase] Failed to fetch SOPs:', error);
      setState(prev => ({
        ...prev,
        loading: { ...prev.loading, sops: false }
      }));
    }
  }, [state.loading.sops, state.loaded.sops]);

  // Load transactions lazily
  const loadTransactions = useCallback(async () => {
    if (state.loading.transactions || state.loaded.transactions) return;

    setState(prev => ({
      ...prev,
      loading: { ...prev.loading, transactions: true }
    }));

    try {
      const { listTransactions } = await import('../services/transactions');
      const transactions = await listTransactions();
      
      setState(prev => ({
        ...prev,
        transactions,
        loading: { ...prev.loading, transactions: false },
        loaded: { ...prev.loaded, transactions: true }
      }));
    } catch (error) {
      console.warn('[Supabase] Failed to fetch transactions:', error);
      setState(prev => ({
        ...prev,
        loading: { ...prev.loading, transactions: false }
      }));
    }
  }, [state.loading.transactions, state.loaded.transactions]);

  return {
    ...state,
    loadClients,
    loadProjects,
    loadTeamMembers,
    loadContracts,
    loadSOPs,
    loadTransactions
  };
}