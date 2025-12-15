
export enum UserRole {
  INSIDE_SALES = 'Inside Sales',
  FIELD_SALES = 'Field Sales',
  GESTOR = 'Gestão Comercial',
  PRICING_MANAGER = 'Gestão de Pricing',
  LOGISTICA = 'Logística',
  ADMIN = 'Backoffice',
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
  LOGISTICA_ESTOQUE = 'Estoque Global', // New Page: Inventory Management
  LOGISTICA_SUPORTE = 'Gestão de Suporte', // New Page: Tickets & KB
  ADMIN_DEMANDS = 'Cadastros & Demandas', // New Page for Admin
  PEDIDOS_RASTREIO = 'Pedidos & Rastreio', // New Page for Sales Tracking
  PERFIL = 'Meu Perfil', // New Page: User Profile & Vehicle
  DESPESAS = 'Despesas & Reembolso', // Restored
}

export interface CostStructure {
    debitCost: number;
    creditSightCost: number;
    // Granular Installment Costs
    installment2to6Cost: number;
    installment7to12Cost: number;
    installment13to18Cost: number;
    anticipationCost: number; // Custo CDI/Funding a.m.
    taxRate: number; // Impostos (PIS/COFINS/ISS)
    fixedCostPerTx: number; // Custo fixo por transação
    // Audit
    lastUpdated?: string;
    updatedBy?: string;
}

// --- NEW: RATE RANGE CONFIGURATION TYPES ---
export interface TpvRange {
    id: number;
    label: string;
}

export interface FullRangeRates {
    debit: number;
    credit1x: number;
    installments: number[]; // Array 0 = 2x, 1 = 3x ... 16 = 18x
    lastUpdated?: string; // ISO String
    updatedBy?: string;
}

export interface SimplesRangeRates {
    debit: number;
    credit1x: number;
    credit2x6x: number;
    credit7x12x: number;
    credit13x18x: number;
    lastUpdated?: string; // ISO String
    updatedBy?: string;
}

export interface RateRangesConfig {
    full: Record<number, FullRangeRates>;
    simples: Record<number, SimplesRangeRates>;
}

export interface AppNotification {
    id: string;
    type: 'RATE_APPROVED' | 'OTP_ISSUED' | 'INFO';
    title: string;
    message: string;
    date: string;
    targetId?: string; // ID of the Demand to open
    read: boolean;
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

// --- NEW TYPES FOR ROUTES & TRACKING ---
export interface Vehicle {
    plate: string;
    model: string;
    make: string;
    year: string;
    color: string;
}

export interface SystemUser {
  id: string; // Added ID
  name: string;
  role: UserRole;
  email: string;
  whatsapp: string;
  active: boolean; // Added status
  managerName?: string; // Added Manager
  password?: string; // Mock password field
  vehicle?: Vehicle; // User's vehicle for GPS logs
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

export type DemandActionType = 'Desativação de POS' | 'Troca de POS' | 'Alteração Bancária' | 'Alteração de Taxas' | 'Alteração Cadastral' | 'Outros';

export interface HistoryLog {
    date: string;
    user: string;
    action: string;
    details?: string;
}

export interface ManualDemand {
    id: string;
    type: string; // Legacy string or DemandActionType
    actionCategory?: DemandActionType; // Structured Type
    clientName: string;
    date: string;
    status: 'Pendente' | 'Em Análise' | 'Concluído' | 'Rejeitado' | 'Aprovado Pricing';
    adminStatus?: 'Pendente ADM' | 'Em Processamento' | 'Finalizado ADM'; // New Admin Status
    otp?: string; // New Logistics OTP
    result?: string; // Outcome message
    requester: string;
    description?: string;
    changeLog?: HistoryLog[]; // History of changes
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
        approvalMetadata?: {
            approvedBy: string;
            approvedAt: string;
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
        contract?: boolean; // Legacy
        idCard?: boolean;
        idCardFile?: File;
        addressProof?: boolean;
        addressProofFile?: File;
        facade?: boolean; // New
        facadeFile?: File; // New
        interiorFiles?: File[]; // New (Array)
    };
    requesterName: string;
    requesterRole: string;
    dateSubmitted: string;
    status: RegistrationStatus;
    
    // Admin Fields
    finalClientId?: string; // The ID created in legacy system (EC)
    approvalData?: {
        date: string;
        approvedBy: string;
    };
    notes?: string;
}

// --- LOGISTICS TYPES ---
export interface LogisticsTask {
    id: string;
    type: 'FIELD_ACTIVATION' | 'POS_SHIPMENT' | 'POS_RETRIEVAL' | 'POS_EXCHANGE';
    status: 'PENDING_SHIPMENT' | 'SHIPPED' | 'READY_FOR_GSURF' | 'COMPLETED' | 'RETURNED';
    
    // Client Info
    clientName: string;
    legalName?: string; // Needed for Gsurf
    internalId?: string; // The "EC" code from Admin
    documentNumber?: string; // CNPJ
    address: string;
    responsibleName?: string;
    contactPhone?: string;
    email?: string;

    // Request Info
    requesterName: string;
    requesterRole: string;
    date: string;
    details: string; // What needs to be done
    
    // Tracking
    trackingCode?: string;
    carrier?: string;
    
    // Execution Data
    posData?: { serialNumber: string; rcNumber?: string; model?: string; }; // Assigned POS
    allocatedPosList?: PosRequestItem[]; // If multiple
    otp?: string; // Generated OTP code from Gsurf
}

export interface PosDevice {
    serialNumber: string;
    rcNumber: string; // Patrimonio
    model: string;
    status: 'InStock' | 'WithField' | 'Active' | 'Defective' | 'Triage';
    currentHolder: string; // Consultant Name or Client Name or 'Logística'
    lastUpdated: string;
    history?: { date: string; status: string; holder: string; description?: string }[];
}

export interface SupportTicket {
    id: string;
    clientId: string;
    clientName: string;
    requesterName: string;
    requesterRole: string;
    status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
    priority: 'LOW' | 'MEDIUM' | 'HIGH';
    category: string;
    messages: SupportMessage[];
    createdAt: string;
}

export interface SupportMessage {
    id: string;
    sender: 'user' | 'support' | 'ai';
    text: string;
    timestamp: string;
    imageUrl?: string;
}

export interface KnowledgeBaseItem {
    id: string;
    errorPattern: string;
    solution: string;
    keywords: string[];
}

export interface TripLog {
    id: string;
    date: string;
    startTime: string;
    endTime: string;
    distanceKm: number;
    valueEarned: number;
    vehiclePlate: string;
    status: 'COMPLETED';
}

export interface LeadServiceItem {
    id: string;
    date: string;
    flow: 'SIN' | 'SIR' | 'CAM';
    serviceType: string;
    licensePlate: string;
    status: 'Realizado' | 'Agendado' | 'Cancelado';
    value: number;
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

// --- EXPENSES & REIMBURSEMENT TYPES ---
export type ExpenseCategory = 'Combustível' | 'Estacionamento' | 'Pedágio' | 'Uber/Táxi' | 'Hospedagem' | 'Alimentação' | 'Outros';

export interface FinanceConfig {
    kmRate: number;
    expenseCategories: string[];
    policyText: string;
}

export interface Expense {
    id: string;
    date: string;
    category: ExpenseCategory;
    amount: number;
    establishment: string;
    imageUrl?: string; // Base64 or URL
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    requesterName: string;
    isCorporateCard?: boolean;
    // Fuel Specifics
    fuelDetails?: {
        fuelType: 'Gasolina' | 'Etanol' | 'Diesel' | 'GNV';
        liters: number;
        pricePerLiter: number;
    };
    notes?: string;
}
