
export enum UserRole {
  INSIDE_SALES = 'Inside Sales',
  FIELD_SALES = 'Field Sales',
  GESTOR = 'Gestão Comercial',
  PRICING_MANAGER = 'Gestão de Pricing',
  LOGISTICA = 'Logística',
  ADMIN = 'Backoffice',
  FINANCEIRO = 'Financeiro',
  ESTRATEGIA = 'Estratégia',
}

export enum Page {
  DASHBOARD = 'Dashboard',
  AGENDAMENTOS = 'Agendamentos',
  ROTAS = 'Rotas',
  CONFIGURACAO = 'Configuração',
  USUARIOS = 'Usuários',
  BASE_CLIENTES = 'Base de Clientes',
  DASHBOARD_GERAL = 'Dashboard Geral',
  MAPA_GESTAO = 'Mapa de Gestão',
  CADASTRO_PRICING = 'Cadastro & Pricing',
  AJUDA = 'Ajuda & IA',
  PRICING_DASHBOARD = 'Dash Pricing',
  MESA_NEGOCIACAO = 'Mesa Negociação',
  CONFIG_TAXAS = 'Config. Taxas',
  PAINEL_LEADS = 'Painel de Leads',
  LOGISTICA_DASHBOARD = 'Dashboard Logística',
  LOGISTICA_ATIVACOES = 'Ativações',
  LOGISTICA_ESTOQUE = 'Estoque Global',
  LOGISTICA_SUPORTE = 'Gestão de Suporte',
  ADMIN_DEMANDS = 'Cadastros & Demandas',
  PEDIDOS_RASTREIO = 'Pedidos & Rastreio',
  PERFIL = 'Meu Perfil',
  DESPESAS = 'Despesas & Reembolso',
  CONCILIACAO = 'Conciliação Cartão',
  ESTRATEGIA_HOME = 'Planejamento Estratégico',
}

export interface ClientBaseRow {
  id: string;
  nomeEc: string;
  tipoSic: string;
  endereco: string;
  responsavel: string;
  contato: string;
  regiaoAgrupada: string;
  fieldSales: string;
  insideSales: string;
  status?: 'Active' | 'Lead';
  leadMetadata?: {
      revenuePotential?: number;
      competitorAcquirer?: string;
      outcome?: string;
      lastInteractionDate?: string;
  };
  hasPagmotors?: boolean;
  latitude?: number;
  longitude?: number;
  cnpj?: string;
  // Campos de Histórico Comercial
  historicalRates?: {
    debit: number;
    credit1x: number;
    credit12x: number;
    plan: string;
    date: string;
  };
  historicalBank?: {
    bank: string;
    agency: string;
    account: string;
  };
}

export interface Appointment {
  id: string;
  clientId: string;
  clientName: string;
  responsible: string;
  whatsapp: string;
  address: string;
  observation?: string;
  fieldSalesName: string;
  insideSalesName?: string;
  date?: string;
  period?: VisitPeriod;
  status: 'Scheduled' | 'Completed' | 'Cancelled';
  leadOrigins: LeadOrigin[];
  isWallet: boolean;
  visitReason?: string;
  inRoute?: boolean;
  visitReport?: VisitReport;
  fieldObservation?: string;
}

export type VisitPeriod = 'Manhã' | 'Tarde' | 'Horário Comercial';
export type LeadOrigin = 'SIR' | 'SIN' | 'CAM' | 'Indicação' | 'Prospecção';

export interface VisitReport {
    checkInTime?: string;
    checkOutTime?: string;
    outcome?: VisitOutcome;
    walletAction?: WalletAction;
    withdrawalReason?: WithdrawalReason;
    swapReason?: SwapReason;
    observation?: string;
    revenuePotential?: number;
    competitorAcquirer?: string;
    hadRateQuote?: boolean;
}

export type VisitOutcome = 'Convertido' | 'Em negociação' | 'Sem interesse' | 'Fidelidade com adquirente' | 'Taxas altas';
export type WalletAction = 'Retirada de POS' | 'Troca de POS' | 'Suporte pós-venda' | 'Engajamento sem uso' | 'Negociação de taxas';
export type WithdrawalReason = string;
export type SwapReason = string;

export interface ManualDemand {
    id: string;
    type: string;
    actionCategory?: string;
    clientName: string;
    date: string;
    status: 'Pendente' | 'Em Análise' | 'Concluído' | 'Rejeitado' | 'Aprovado Pricing';
    adminStatus?: 'Pendente ADM' | 'Em Processamento' | 'Finalizado ADM' | 'Aguardando Logística';
    otp?: string;
    result?: string;
    requester: string;
    description?: string;
    changeLog?: HistoryLog[];
    pricingData?: {
        competitorRates: { debit: number, credit1x: number, credit12x: number };
        proposedRates: { debit: number, credit1x: number, credit12x: number };
        approvedRates?: { debit: number, credit1x: number, credit12x: number };
        financials?: { spread: number, mcf2: number };
        evidenceUrl?: string;
        context?: { potentialRevenue: number, minAgreed: number };
        approvalMetadata?: {
            approvedBy: string;
            approvedAt: string;
        };
    };
}

export interface LogisticsTask {
    id: string;
    type: 'FIELD_ACTIVATION' | 'POS_SHIPMENT' | 'POS_RETRIEVAL' | 'POS_EXCHANGE' | 'MATERIAL_REQUEST';
    status: 'PENDING_SHIPMENT' | 'SHIPPED' | 'READY_FOR_GSURF' | 'COMPLETED' | 'RETURNED';
    clientName: string;
    internalId?: string;
    documentNumber?: string;
    address: string;
    requesterName: string;
    requesterRole?: string;
    date: string;
    details: string;
    posData?: { serialNumber: string; rcNumber?: string; model?: string; };
    otp?: string;
    contactPhone?: string;
    email?: string;
    allocatedPosList?: PosRequestItem[];
    legalName?: string;
    responsibleName?: string;
}

export interface PosDevice {
    serialNumber: string;
    rcNumber: string;
    model: string;
    status: 'InStock' | 'WithField' | 'Active' | 'Defective' | 'Triage';
    currentHolder: string;
    lastUpdated: string;
    history?: any[];
}

export interface AppNotification {
    id: string;
    type: 'RATE_APPROVED' | 'OTP_ISSUED' | 'INFO';
    title: string;
    message: string;
    date: string;
    targetId?: string;
    read: boolean;
}

export interface SystemUser {
  id: string;
  name: string;
  role: UserRole;
  email: string;
  whatsapp: string;
  active: boolean;
  managerName?: string;
  password?: string;
  vehicle?: Vehicle;
}

export interface CostStructure {
    debitCost: number;
    creditSightCost: number;
    installment2to6Cost: number;
    installment7to12Cost: number;
    installment13to18Cost: number;
    anticipationCost: number;
    taxRate: number;
    fixedCostPerTx: number;
    financialTerms?: FinancialTerms;
    lastUpdated?: string;
    updatedBy?: string;
}

export interface RateRangesConfig {
    full: Record<number, any>;
    simples: Record<number, any>;
}

export interface TpvRange {
    id: number;
    label: string;
}

export interface TripLog {
    id: string;
    date: string;
    startTime: string;
    endTime: string;
    distanceKm: number;
    valueEarned: number;
    vehiclePlate: string;
    status: string;
}

export interface Expense {
    id: string;
    date: string;
    category: ExpenseCategory;
    amount: number;
    establishment: string;
    imageUrl?: string;
    status: string;
    requesterName: string;
    paymentMethod: string;
    reimbursable: boolean;
    notes?: string;
    fuelDetails?: any;
}

export interface ExpenseReport {
    id: string;
    requesterName: string;
    period: string;
    createdDate: string;
    status: string;
    totalAmount: number;
    totalReimbursable: number;
    itemCount: number;
    history: any[];
    validationToken?: string;
}

export interface IntegrationConfig {
    sicBaseUrl: string;
    sicApiKey?: string;
    syncInterval: number;
    lastSync?: string;
    active: boolean;
}

export interface SalesGoal {
    id: string;
    month: string;
    userId: string;
    userRole: UserRole;
    tpv: number;
    reactivation: number;
    newSales: number;
    efficiency: number;
    visits?: number;
    appointments?: number;
    updatedAt: string;
}

export interface FinancialTerms {
    debit: number;
    credit1x: number;
    credit2to6: number;
    credit7to12: number;
    credit13to18: number;
}

export interface KnowledgeBaseItem {
    id: string;
    errorPattern: string;
    solution: string;
    keywords: string[];
}

export interface SupportTicket {
    id: string;
    clientId: string;
    clientName: string;
    requesterName: string;
    requesterRole: string;
    status: string;
    priority: string;
    category: string;
    messages: SupportMessage[];
    createdAt: string;
}

export interface SupportMessage {
    id: string;
    sender: string;
    text: string;
    timestamp: string;
    imageUrl?: string;
}

export interface SalesData {
  name: string;
  value: number;
}

export interface Vehicle {
    plate: string;
    make: string;
    model: string;
    year: string;
    color: string;
}

export interface ClientNote {
    id: string;
    clientId: string;
    authorName: string;
    date: string;
    content: string;
}

export type RegistrationStatus = 'PENDING_ANALYSIS' | 'APPROVED' | 'MISSING_DOCS' | 'REJECTED';

export interface RegistrationRequest {
    id: string;
    clientName: string;
    documentNumber: string;
    planType: 'Full' | 'Simples';
    requesterName: string;
    requesterRole: string;
    status: RegistrationStatus;
    dateSubmitted: string;
    address: string;
    responsibleName: string;
    email: string;
    contactPhones: string[];
    bankAccounts: BankAccount[];
    docs: any;
    razaoSocial?: string;
    inscricaoEstadual?: string;
    cnae?: string;
    monthlyVehicleVolume?: number;
    pricingDemandId?: string;
    requestedEquipments?: PosRequestItem[];
    finalClientId?: string;
    approvalData?: {
        date: string;
        approvedBy: string;
    };
    notes?: string;
}

export interface BankAccount {
    tempId?: string;
    bankCode: string;
    agency: string;
    accountNumber: string;
    holderName: string;
    holderType: 'PF' | 'PJ';
    accountType: 'Corrente' | 'Poupança';
    isThirdParty: boolean;
    proofFile: File | null;
}

export interface PosRequestItem {
    id: string;
    type: 'STOCK' | 'REQUEST';
    model: string;
    serialNumber?: string;
    rcNumber?: string;
    linkedAccountIndex?: number;
}

export interface ReimbursementPolicy {
    kmRate: number;
    foodLimitPerDay: number;
    hotelLimitPerNight: number;
    corporateCardLimit: number;
    updatedAt?: string;
    policyFileName?: string;
}

export interface FinanceConfig {
    kmRate: number;
    expenseCategories: string[];
    policyText: string;
    policy: ReimbursementPolicy;
}

export interface HistoryLog {
    date: string;
    user: string;
    action: string;
    details: string;
}

export interface LeadServiceItem {
    id: string;
    flow: string;
    serviceType: string;
    date: string;
    licensePlate: string;
    value: number;
    status: string;
}

export interface LeadStats {
    totalServices: number;
    totalValue: number;
    audienceReach: number;
    breakdown: {
        SIN: number;
        SIR: number;
        CAM: number;
    };
}

export type DemandActionType = 'Troca de POS' | 'Desativação de POS' | 'Alteração Bancária' | 'Alteração Cadastral' | 'Envio de POS (Novo Cliente)' | 'Retirada de POS (Logística)' | 'Solicitação de Material';

export interface MaterialRequestData {
    posQuantity: number;
    coils: boolean;
    chargers: boolean;
    gifts: boolean;
}

export type ExpenseCategory = 'Combustível' | 'Estacionamento' | 'Pedágio' | 'Uber/Táxi' | 'Hospedagem' | 'Alimentação' | 'Outros';
