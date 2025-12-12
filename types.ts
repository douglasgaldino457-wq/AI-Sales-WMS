
export enum UserRole {
  INSIDE_SALES = 'Inside Sales',
  FIELD_SALES = 'Field Sales',
  GESTOR = 'Gestão Comercial',
  PRICING_MANAGER = 'Gestão de Pricing',
  LOGISTICA = 'Logística',
  ADMIN = 'Gestão Administrativa',
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
  CADASTRO = 'Cadastro', // Sales (Submit only)
  AJUDA = 'Ajuda & IA', // New Page
  PRICING_DASHBOARD = 'Dash Pricing', // New
  MESA_NEGOCIACAO = 'Mesa Negociação', // New
  CONFIG_TAXAS = 'Config. Taxas', // New
  PAINEL_LEADS = 'Painel de Leads', // New Page for Services Intelligence
  LOGISTICA_DASHBOARD = 'Dashboard Logística', // KPIs
  LOGISTICA_ATIVACOES = 'Ativações', // New Page: Gsurf Flow
  LOGISTICA_SUPORTE = 'Gestão de Suporte', // New Page: Tickets & KB
  ADMIN_DEMANDS = 'Cadastros & Demandas', // New Page for Admin
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
  contato: string; // "Telefone"
  regiaoAgrupada: string; // "Região Agrupada"
  fieldSales: string; // "Consultor Field"
  insideSales: string; // "Inside Sales"
  status?: 'Active' | 'Lead'; // New field for Lead Management
  leadMetadata?: {
      revenuePotential?: number;
      competitorAcquirer?: string;
      outcome?: string; // 'Convertido', 'Em negociação', etc.
      lastInteractionDate?: string;
  };
  hasPagmotors?: boolean; // Mock field for Painel Leads (Partner)
  latitude?: number;
  longitude?: number;
  cnpj?: string; // Added for auto-fill features
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
  insideSalesName?: string; // Optional
  date?: string; // YYYY-MM-DD
  period?: VisitPeriod;
  status: 'Scheduled' | 'Completed' | 'Cancelled';
  leadOrigins: LeadOrigin[];
  isWallet: boolean; // True if created from BaseClientes (Management), False if New Business
  visitReason?: string; // If isWallet is true
  inRoute?: boolean; // If added to Route
  visitReport?: VisitReport; // Attached report after completion
  fieldObservation?: string; // Observation from Field Sales
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
    // New Business Data
    revenuePotential?: number;
    competitorAcquirer?: string;
    hadRateQuote?: boolean;
}

export type VisitOutcome = 'Convertido' | 'Em negociação' | 'Sem interesse' | 'Fidelidade com adquirente' | 'Taxas altas';
export type WalletAction = 'Retirada de POS' | 'Troca de POS' | 'Suporte pós-venda' | 'Engajamento sem uso' | 'Negociação de taxas';
export type WithdrawalReason = string; // Dynamic from Config
export type SwapReason = string; // Dynamic from Config

export interface ClientNote {
    id: string;
    clientId: string;
    authorName: string;
    date: string;
    content: string;
}

// --- NEW TYPES FOR PRICING & REGISTRATION ---

export interface ManualDemand {
    id: string;
    type: string; // 'Alteração de Domicílio', 'Venda Taxa Full', etc.
    clientName: string;
    date: string;
    status: 'Pendente' | 'Em Análise' | 'Concluído' | 'Rejeitado' | 'Aprovado Pricing';
    result?: string; // Outcome message
    requester: string;
    description?: string;
    // Pricing Specifics
    pricingData?: {
        competitorRates: { debit: number, credit1x: number, credit12x: number };
        proposedRates: { debit: number, credit1x: number, credit12x: number };
        approvedRates?: { debit: number, credit1x: number, credit12x: number }; // Final approved
        financials?: { spread: number, mcf2: number };
        evidenceUrl?: string; // Link to image
        context?: {
            potentialRevenue: number;
            minAgreed: number;
        };
    };
}

export interface BankAccount {
    tempId?: string; // UI Helper
    bankCode: string;
    agency: string;
    accountNumber: string;
    holderName: string;
    holderType: 'PF' | 'PJ';
    accountType: 'Corrente' | 'Poupança';
    isThirdParty: boolean;
    proofFile?: File | null; // For upload logic
    proofUrl?: string; // For display
}

export type RegistrationStatus = 'PENDING_ANALYSIS' | 'APPROVED' | 'MISSING_DOCS' | 'REJECTED';

// NEW: POS Request Item for multiple devices
export interface PosRequestItem {
    id: string;
    model: string;
    type: 'STOCK' | 'REQUEST'; // STOCK = From User Inventory, REQUEST = New Shipment
    serialNumber?: string; // Mandatory if STOCK
    rcNumber?: string; // NEW: Patrimonial RC Number
    otp?: string; // Filled by Logistics
    linkedAccountIndex?: number; // Index of the bankAccount in the RegistrationRequest list
}

export interface RegistrationRequest {
    id: string;
    // Basic Info
    clientName: string;
    documentNumber: string; // CNPJ/CPF
    razaoSocial?: string;
    cnae?: string;
    inscricaoEstadual?: string;
    
    // Contact & Location
    responsibleName: string;
    email: string;
    contactEmails?: string[]; // Multiple Emails
    contactPhones: string[]; // Multiple Phones
    address: string;
    openingHours?: {
        weekdays: { start: string; end: string };
        saturday?: { start: string; end: string };
    };
    
    // Operational
    monthlyVehicleVolume?: number;

    // Commercial
    planType: 'Full' | 'Simples';
    pricingDemandId?: string; // Linked Pricing Negotiation
    bankAccounts: BankAccount[]; // Changed to Array
    
    // Equipment
    requestedEquipments?: PosRequestItem[];
    // Legacy support (optional)
    posData?: { serialNumber: string; rcNumber?: string; model?: string; };

    // Docs & Meta
    docs: {
        contract?: boolean; // Legacy but kept for type compatibility
        contractFile?: File | null;
        idCard?: boolean;
        idCardFile?: File | null;
        addressProof?: boolean;
        addressProofFile?: File | null;
        thirdPartyTerm?: boolean;
        facade?: boolean;
        facadeFile?: File | null;
        interiorFiles?: File[];
    };
    requesterName: string;
    requesterRole: string; // 'Inside Sales' | 'Field Sales'
    dateSubmitted: string;
    status: RegistrationStatus;
    notes?: string;
    
    // Admin Fields
    finalClientId?: string; // The ID filled by Admin (EC Code)
    approvalData?: {
        date: string;
        approvedBy: string;
    };
}

// --- NEW TYPES FOR PAINEL LEADS ---
export interface LeadServiceItem {
    id: string;
    flow: 'SIN' | 'SIR' | 'CAM';
    serviceType: string;
    date: string;
    licensePlate: string;
    value: number;
    status: 'Agendado' | 'Realizado' | 'Cancelado';
}

export interface LeadStats {
    totalServices: number;
    totalValue: number;
    audienceReach: number;
    breakdown: {
        SIN: number;
        SIR: number;
        CAM: number;
    }
}

// --- LOGISTICS TYPES ---
export interface PosDevice {
    serialNumber: string;
    rcNumber: string;
    model: string; // 'P2 Smart', 'X990', etc.
    status: 'InStock' | 'WithField' | 'Active' | 'Defective' | 'Lost' | 'Triage';
    currentHolder: string; // 'Logística Central', 'Nome Consultor', 'Nome EC'
    lastUpdated: string;
    history?: PosHistoryItem[];
}

export interface PosHistoryItem {
    date: string;
    status: string;
    holder: string;
    description: string;
}

export type LogisticsTaskType = 'FIELD_ACTIVATION' | 'POS_EXCHANGE' | 'POS_SHIPMENT' | 'POS_RETRIEVAL' | 'MATERIAL_REQUEST' | 'GIFT_REQUEST';
export type LogisticsTaskStatus = 'PENDING_SHIPMENT' | 'SHIPPED' | 'DELIVERED' | 'READY_FOR_GSURF' | 'WAITING_OTP' | 'COMPLETED' | 'PENDING_RETRIEVAL' | 'SENT_TO_ADMIN';

export interface LogisticsTask {
    id: string;
    type: LogisticsTaskType;
    status: LogisticsTaskStatus;
    
    // Context
    clientName: string;
    legalName?: string;
    internalId?: string;
    documentNumber?: string;
    address: string;
    responsibleName?: string;
    contactPhone?: string;
    email?: string; // Added Email
    
    requesterName: string;
    requesterRole: string;
    date: string; // Creation Date
    
    // Details
    details?: string;
    itemsRequested?: string[];
    
    // POS Specifics
    posData?: { serialNumber: string; rcNumber?: string; model?: string; };
    allocatedPosList?: PosRequestItem[];
    
    otp?: string;
    trackingCode?: string;
    returnLabelUrl?: string;
}

// --- SUPPORT & AI TYPES ---
export interface SupportTicket {
    id: string;
    clientId: string;
    clientName: string;
    requesterName: string;
    requesterRole: string;
    status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
    priority: 'LOW' | 'MEDIUM' | 'HIGH';
    category: 'Erro POS' | 'Troca de Bobina' | 'Conectividade' | 'Outros';
    createdAt: string;
    messages: SupportMessage[];
}

export interface SupportMessage {
    id: string;
    sender: 'user' | 'support' | 'ai';
    text: string;
    imageUrl?: string; // For error screenshots
    timestamp: string;
}

export interface KnowledgeBaseItem {
    id: string;
    errorPattern: string; // e.g. "Erro 99", "Tela Branca"
    solution: string; // Step by step
    keywords: string[];
}
