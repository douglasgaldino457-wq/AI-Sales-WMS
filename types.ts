
export enum UserRole {
  INSIDE_SALES = 'Inside Sales',
  FIELD_SALES = 'Field Sales',
  GESTOR = 'Gestão Comercial', // Updated from 'Gestor'
  ESTRATEGIA = 'Estratégia',
  PRICING_MANAGER = 'Gestão de Pricing',
  LOGISTICA = 'Logística' // New Role
}

export enum Page {
  DASHBOARD = 'Dashboard',
  AGENDAMENTOS = 'Agendamentos', // Inside & Field
  VISITAS = 'Visitas', // Field
  ROTAS = 'Rotas', // Field
  CONFIGURACAO = 'Configuração', // Gestor
  USUARIOS = 'Usuários', // Gestor
  BASE_CLIENTES = 'Base de Clientes', // All
  DASHBOARD_GERAL = 'Dashboard Geral', // Gestor
  MAPA_GESTAO = 'Mapa de Gestão', // Gestor
  PRICING = 'Pricing',
  CADASTRO = 'Cadastro', // New Page
  METAS = 'Metas & KPI', // New Page for Estrategia
  AJUDA = 'Ajuda & IA', // New Page
  PRICING_DASHBOARD = 'Dash Pricing', // New
  MESA_NEGOCIACAO = 'Mesa Negociação', // New
  CONFIG_TAXAS = 'Config. Taxas', // New
  LOGISTICA_DASHBOARD = 'Dash Logística', // New
}

export interface Client {
  id: string;
  name: string;
  address: string;
  status: 'Active' | 'Lead' | 'Inactive';
  lastVisit?: string;
}

export interface Visit {
  id: string;
  clientName: string;
  date: string;
  status: 'Scheduled' | 'Completed' | 'Cancelled';
  address: string;
}

export interface SalesData {
  name: string;
  value: number;
}

export interface SystemUser {
  id: string; // Added ID
  name: string;
  role: UserRole;
  email: string;
  whatsapp: string;
  active: boolean; // Added status
  managerName?: string; // Added Manager
}

export interface ClientBaseRow {
  id: string; // "Id"
  nomeEc: string; // "Nome do EC"
  tipoSic: string; // "Tipo SIC"
  endereco: string; // "Endereço"
  responsavel: string; // "Nome Responsável"
  contato: string; // "Contato"
  regiaoAgrupada: string; // "Reg. Agrupada"
  fieldSales: string; // "Field Sales"
  insideSales: string; // "Inside Sales"
  latitude?: number; // New: For Map
  longitude?: number; // New: For Map
  status?: 'Active' | 'Lead'; // New: To distinguish Wallet vs New Business
  leadMetadata?: { // New: To store data captured during prospection
     revenuePotential?: number;
     competitorAcquirer?: string;
     outcome?: string;
     lastInteractionDate?: string;
  };
}

export type LeadOrigin = 'SIR' | 'SIN' | 'CAM' | 'Indicação' | 'Prospecção';
export type VisitPeriod = 'Manhã' | 'Tarde' | 'Horário Comercial';

// --- VISIT REPORT TYPES ---
export type VisitOutcome = 'Convertido' | 'Em negociação' | 'Sem interesse' | 'Fidelidade com adquirente' | 'Taxas altas';
export type WalletAction = 'Retirada de POS' | 'Troca de POS' | 'Suporte pós-venda' | 'Engajamento sem uso' | 'Negociação de taxas';

// Updated Reason Types
export type WithdrawalReason = 
  | 'Baixo Faturamento' 
  | 'Não recebe Leads' 
  | 'Problema com Repasse' 
  | 'Falta de suporte' 
  | 'Taxas' 
  | 'Contratou Credito no Banco' 
  | 'Outro';

export type SwapReason = 
  | 'Bateria' 
  | 'POS Antiga' 
  | 'Erro na POS' 
  | 'Não liga' 
  | 'Carregador com problema';

export interface VisitReport {
  checkInTime?: string;
  checkOutTime?: string;
  
  // For New Clients
  outcome?: VisitOutcome;
  revenuePotential?: number; // Valor em Reais
  competitorAcquirer?: string; // Adquirente Concorrente
  hadRateQuote?: boolean; // Teve cotação de taxa?

  // For Wallet Clients
  walletAction?: WalletAction;
  withdrawalReason?: WithdrawalReason;
  withdrawalReasonDetail?: string; // For "Outro" input
  swapReason?: SwapReason;
  
  observation?: string;
}

export interface Appointment {
  id: string; // AGD-XXXX
  leadOrigins: LeadOrigin[];
  clientId: string;
  clientName: string; // Nome do EC
  responsible: string; // Nome do Responsável
  whatsapp: string;
  address: string;
  observation: string;
  fieldSalesName: string;
  insideSalesName?: string; // Added to track Inside Sales performance
  date?: string; // Optional for Wallet flow
  period?: VisitPeriod; // Optional for Wallet flow
  status: 'Scheduled' | 'Completed';
  visitReason?: string; // New field for Wallet flow
  isWallet?: boolean; // To distinguish flow type
  fieldObservation?: string; // New: Observation made by Field Sales upon completion
  
  visitReport?: VisitReport; // Linked Report
  inRoute?: boolean; // New: Indicates if added to the daily route
}

export interface ClientNote {
  id: string;
  clientId: string;
  authorName: string;
  date: string; // ISO string
  content: string;
}

// --- MANUAL DEMANDS / PRICING REQUESTS ---
export interface PricingRequestData {
    competitorRates: { debit: number; credit1x: number; credit12x: number };
    proposedRates: { debit: number; credit1x: number; credit12x: number };
    approvedRates?: { debit: number; credit1x: number; credit12x: number };
    financials?: { spread: number; mcf2: number };
    evidenceUrl?: string;
    context?: {
        potentialRevenue: number;
        minAgreed: number;
    };
}

export interface ManualDemand {
    id: string;
    type: string; // "Venda Taxa Full", "Venda Taxa Simples", etc.
    clientId?: string;
    clientName: string;
    date: string; // ISO Date
    status: 'Concluído' | 'Em Análise' | 'Pendente' | 'Rejeitado' | 'Aprovado Pricing';
    description?: string;
    result?: string;
    requester: string;
    pricingData?: PricingRequestData; // New for Pricing Flow
}
