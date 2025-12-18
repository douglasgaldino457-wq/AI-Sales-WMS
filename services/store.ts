
import { 
  Appointment, 
  ClientBaseRow, 
  SystemUser, 
  ManualDemand, 
  RegistrationRequest, 
  LogisticsTask, 
  PosDevice, 
  SupportTicket, 
  KnowledgeBaseItem, 
  ClientNote,
  VisitReport,
  AppNotification,
  SupportMessage,
  Vehicle,
  TripLog,
  CostStructure,
  RateRangesConfig,
  TpvRange,
  Expense,
  ExpenseReport,
  FinanceConfig,
  UserRole,
  IntegrationConfig,
  SalesGoal,
  FinancialTerms,
  MaterialRequestData
} from '../types';
import { MOCK_CLIENT_BASE, MOCK_USERS } from '../constants';

const INTERNAL_CACHE_KEY = 'v1.9.8';
const DB_NAME = 'car10_db';
const STORE_NAME = 'app_store';

const idb = {
  async get() {
    if (typeof indexedDB === 'undefined') return null;
    return new Promise<any>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onerror = () => resolve(null);
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        try {
            const transaction = db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const getRequest = store.get('root');
            getRequest.onsuccess = () => resolve(getRequest.result);
            getRequest.onerror = () => resolve(null);
        } catch (e) {
            resolve(null);
        }
      };
    });
  },
  async put(data: any) {
    if (typeof indexedDB === 'undefined') return;
    return new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onerror = () => reject('Could not open DB');
      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const putRequest = store.put(data, 'root');
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject('Put failed');
      };
    });
  }
};

class Store {
  private appointments: Appointment[] = [];
  private clients: ClientBaseRow[] = [];
  private users: SystemUser[] = [];
  private demands: ManualDemand[] = [];
  private registrationRequests: RegistrationRequest[] = [];
  private logisticsTasks: LogisticsTask[] = [];
  private posInventory: PosDevice[] = [];
  private supportTickets: SupportTicket[] = [];
  private kbItems: KnowledgeBaseItem[] = [];
  private clientNotes: ClientNote[] = [];
  private myVehicle: Vehicle | null = null;
  private tripLogs: TripLog[] = [];
  private notifications: AppNotification[] = []; 
  private expenses: Expense[] = [];
  private expenseReports: ExpenseReport[] = [];
  private salesGoals: SalesGoal[] = [];
  private lastSynced: string | null = null;
  private listeners: (() => void)[] = []; 
  private isLoaded: boolean = false;
  
  private visitReasons: string[] = ['Apresentação', 'Negociação', 'Treinamento', 'Retirada', 'Instalação', 'Visita de Cortesia'];
  private leadOrigins: string[] = ['SIR', 'SIN', 'CAM', 'Indicação', 'Prospecção'];
  private withdrawalReasons: string[] = ['Baixo Faturamento', 'Fechamento do Estabelecimento', 'Troca de Adquirente', 'Insatisfação com Taxas'];
  private swapReasons: string[] = ['Defeito Técnico', 'Upgrade de Modelo', 'Conectividade', 'Bateria'];

  private costConfig: CostStructure = {
      debitCost: 0.50,
      creditSightCost: 1.80,
      installment2to6Cost: 2.20,
      installment7to12Cost: 2.40,
      installment13to18Cost: 2.60,
      anticipationCost: 0.90,
      taxRate: 11.25,
      fixedCostPerTx: 0.15,
      financialTerms: {
          debit: 0,
          credit1x: 1,
          credit2to6: 4,
          credit7to12: 9.5,
          credit13to18: 15.5
      },
      lastUpdated: new Date().toISOString(),
      updatedBy: 'Sistema'
  };

  private rateRangesConfig: RateRangesConfig = {
      full: {},
      simples: {}
  };

  private financeConfig: FinanceConfig = {
      kmRate: 0.58,
      expenseCategories: ['Combustível', 'Estacionamento', 'Pedágio', 'Uber/Táxi', 'Hospedagem', 'Alimentação', 'Outros'],
      policyText: "Política de Reembolso...",
      policy: {
          kmRate: 0.58,
          foodLimitPerDay: 80.00,
          hotelLimitPerNight: 250.00,
          corporateCardLimit: 5000.00,
          updatedAt: new Date().toISOString()
      }
  };

  private integrationConfig: IntegrationConfig = {
      sicBaseUrl: 'https://sic3.car10.net/',
      syncInterval: 60,
      active: false
  };

  public readonly TPV_RANGES: TpvRange[] = [
    { id: 0, label: 'Balcão (Padrão)' },
    { id: 1, label: '5k - 10k' },
    { id: 2, label: '10k - 20k' },
    { id: 3, label: '20k - 50k' },
    { id: 4, label: '50k - 100k' },
    { id: 5, label: '100k - 150k' },
    { id: 6, label: '+150k' },
  ];

  constructor() {
    this.initAsync();
  }

  public subscribe(listener: () => void) {
      this.listeners.push(listener);
      if (this.isLoaded) listener();
      return () => {
          this.listeners = this.listeners.filter(l => l !== listener);
      };
  }

  private notifyListeners() {
      this.listeners.forEach(l => l());
  }

  private async initAsync() {
      await this.loadFromStorage();
      this.isLoaded = true;
      this.notifyListeners(); 
  }

  private saveToStorage() {
    this.lastSynced = new Date().toISOString();
    const data = {
        _version: INTERNAL_CACHE_KEY,
        appointments: this.appointments,
        clients: this.clients,
        users: this.users,
        demands: this.demands,
        registrationRequests: this.registrationRequests,
        logisticsTasks: this.logisticsTasks,
        posInventory: this.posInventory,
        supportTickets: this.supportTickets,
        kbItems: this.kbItems,
        clientNotes: this.clientNotes,
        myVehicle: this.myVehicle,
        tripLogs: this.tripLogs,
        notifications: this.notifications,
        expenses: this.expenses,
        expenseReports: this.expenseReports,
        costConfig: this.costConfig,
        rateRangesConfig: this.rateRangesConfig,
        financeConfig: this.financeConfig,
        integrationConfig: this.integrationConfig,
        salesGoals: this.salesGoals,
        visitReasons: this.visitReasons,
        leadOrigins: this.leadOrigins,
        withdrawalReasons: this.withdrawalReasons,
        swapReasons: this.swapReasons,
        lastSynced: this.lastSynced
    };
    idb.put(data).catch(err => console.error("Failed to save", err));
    this.notifyListeners();
  }

  private async loadFromStorage() {
    const data = await idb.get();
    if (data && data._version === INTERNAL_CACHE_KEY) {
        this.appointments = data.appointments || [];
        this.clients = data.clients || [];
        this.users = data.users || [];
        this.demands = data.demands || [];
        this.registrationRequests = data.registrationRequests || [];
        this.logisticsTasks = data.logisticsTasks || [];
        this.posInventory = data.posInventory || [];
        this.supportTickets = data.supportTickets || [];
        this.kbItems = data.kbItems || [];
        this.clientNotes = data.clientNotes || [];
        this.myVehicle = data.myVehicle || null;
        this.tripLogs = data.tripLogs || [];
        this.notifications = data.notifications || [];
        this.expenses = data.expenses || [];
        this.expenseReports = data.expenseReports || []; 
        this.salesGoals = data.salesGoals || [];
        if (data.costConfig) this.costConfig = data.costConfig;
        if (data.financeConfig) this.financeConfig = data.financeConfig;
        if (data.integrationConfig) this.integrationConfig = data.integrationConfig;
        if (data.rateRangesConfig) this.rateRangesConfig = data.rateRangesConfig;
        if (data.visitReasons) this.visitReasons = data.visitReasons;
        if (data.leadOrigins) this.leadOrigins = data.leadOrigins;
        if (data.withdrawalReasons) this.withdrawalReasons = data.withdrawalReasons;
        if (data.swapReasons) this.swapReasons = data.swapReasons;
        this.lastSynced = data.lastSynced || new Date().toISOString();
    } else {
        this.initMockData();
        this.initRateRangesMock();
        this.saveToStorage(); 
    }
  }

  getAppointments() { return this.appointments; }
  getClients() { return this.clients; }
  getUsers() { return this.users; }
  getDemands() { return this.demands; }
  getRegistrationRequests() { return this.registrationRequests; }
  getLogisticsTasks() { return this.logisticsTasks; }
  getPosInventory() { return this.posInventory; }
  getSupportTickets() { return this.supportTickets; }
  getKnowledgeBase() { return this.kbItems; }
  getMyVehicle() { return this.myVehicle; }
  getTripLogs() { return this.tripLogs; }
  getExpenses() { return this.expenses; }
  getExpenseReports() { return this.expenseReports; }
  getCostConfig() { return this.costConfig; }
  getRateRangesConfig() { return this.rateRangesConfig; }
  getFinanceConfig() { return this.financeConfig; }
  getLastSynced() { return this.lastSynced; }
  getIntegrationConfig() { return this.integrationConfig; }
  getNotifications() { return this.notifications; }

  getVisitReasons() { return this.visitReasons; }
  addVisitReason(val: string) { this.visitReasons.push(val); this.saveToStorage(); }
  removeVisitReason(val: string) { this.visitReasons = this.visitReasons.filter(v => v !== val); this.saveToStorage(); }

  getLeadOrigins() { return this.leadOrigins; }
  addLeadOrigin(val: string) { this.leadOrigins.push(val); this.saveToStorage(); }
  removeLeadOrigin(val: string) { this.leadOrigins = this.leadOrigins.filter(v => v !== val); this.saveToStorage(); }

  getWithdrawalReasons() { return this.withdrawalReasons; }
  addWithdrawalReason(val: string) { this.withdrawalReasons.push(val); this.saveToStorage(); }
  removeWithdrawalReason(val: string) { this.withdrawalReasons = this.withdrawalReasons.filter(v => v !== val); this.saveToStorage(); }

  getSwapReasons() { return this.swapReasons; }
  addSwapReason(val: string) { this.swapReasons.push(val); this.saveToStorage(); }
  removeSwapReason(val: string) { this.swapReasons = this.swapReasons.filter(v => v !== val); this.saveToStorage(); }

  getDemandTypes() { return ['Alteração Cadastral', 'Alteração Bancária', 'Alteração de Taxas', 'Troca de POS', 'Desativação de POS', 'Outros']; }

  addDemand(demand: ManualDemand) { this.demands.push(demand); this.saveToStorage(); }
  updateDemand(demand: ManualDemand) {
      const idx = this.demands.findIndex(d => d.id === demand.id);
      if (idx !== -1) { this.demands[idx] = demand; this.saveToStorage(); }
  }
  concludeDemand(id: string, details: string, user: string) {
      const idx = this.demands.findIndex(d => d.id === id);
      if (idx !== -1) {
          this.demands[idx].status = 'Concluído';
          this.demands[idx].result = details;
          if (!this.demands[idx].changeLog) this.demands[idx].changeLog = [];
          this.demands[idx].changeLog?.push({ date: new Date().toISOString(), user, action: 'Conclusão', details });
          this.saveToStorage();
      }
  }

  addRegistrationRequest(req: RegistrationRequest) { this.registrationRequests.push(req); this.saveToStorage(); }
  updateRegistrationRequest(req: RegistrationRequest) {
      const idx = this.registrationRequests.findIndex(r => r.id === req.id);
      if (idx !== -1) { this.registrationRequests[idx] = req; this.saveToStorage(); }
  }
  approveRegistration(req: RegistrationRequest) {
      const idx = this.registrationRequests.findIndex(r => r.id === req.id);
      if (idx !== -1) {
          this.registrationRequests[idx] = { ...req, status: 'APPROVED' };
          this.saveToStorage();
      }
  }

  addLogisticsTask(task: LogisticsTask) { this.logisticsTasks.push(task); this.saveToStorage(); }
  updateLogisticsTask(task: LogisticsTask) {
      const idx = this.logisticsTasks.findIndex(t => t.id === task.id);
      if (idx !== -1) { this.logisticsTasks[idx] = task; this.saveToStorage(); }
  }

  completeGsurfActivation(taskId: string, otp: string, posData: any) { 
      const task = this.logisticsTasks.find(t => t.id === taskId);
      if (task) {
          task.status = 'COMPLETED';
          task.otp = otp;
          task.posData = posData;
          
          if (task.type === 'POS_RETRIEVAL') {
              const client = this.clients.find(c => c.nomeEc === task.clientName);
              if (client) { client.hasPagmotors = false; }
          }
          if (task.type === 'FIELD_ACTIVATION' || task.type === 'POS_EXCHANGE') {
              const client = this.clients.find(c => c.nomeEc === task.clientName);
              if (client) { client.hasPagmotors = true; }
          }
          this.saveToStorage();
      }
  }

  setClients(clients: ClientBaseRow[]) { this.clients = clients; this.saveToStorage(); }
  addClientNote(note: ClientNote) { this.clientNotes.push(note); this.saveToStorage(); }
  getClientNotes(clientId: string) { return this.clientNotes.filter(n => n.clientId === clientId); }
  getLeadServices(clientId: string) { return [{ id: '1', flow: 'SIN', serviceType: 'Reparo Colisão', date: '2023-10-01', licensePlate: 'ABC-1234', value: 2500, status: 'Realizado' }]; }
  
  addUser(user: SystemUser) { this.users.push(user); this.saveToStorage(); }
  updateUser(user: SystemUser) { 
    const idx = this.users.findIndex(u => u.id === user.id); 
    if (idx !== -1) { this.users[idx] = user; this.saveToStorage(); }
  }
  toggleUserStatus(id: string) { 
    const user = this.users.find(u => u.id === id); 
    if (user) { user.active = !user.active; this.saveToStorage(); }
  }

  addAppointment(appt: Appointment) { this.appointments.push(appt); this.saveToStorage(); }
  getAppointmentsByFieldSales(name: string) { return this.appointments.filter(a => a.fieldSalesName === name); }
  checkInAppointment(id: string) { 
    const appt = this.appointments.find(a => a.id === id); 
    if (appt) { if (!appt.visitReport) appt.visitReport = {}; appt.visitReport.checkInTime = new Date().toISOString(); this.saveToStorage(); }
  }
  submitVisitReport(id: string, report: VisitReport) { 
    const appt = this.appointments.find(a => a.id === id); 
    if (appt) { appt.status = 'Completed'; appt.visitReport = { ...appt.visitReport, ...report, checkOutTime: new Date().toISOString() }; this.saveToStorage(); }
  }
  toggleRouteStatus(id: string) { 
    const appt = this.appointments.find(a => a.id === id); 
    if (appt) { appt.inRoute = !appt.inRoute; this.saveToStorage(); }
  }

  addExpense(expense: Expense) { this.expenses.push(expense); this.saveToStorage(); }
  addTripLog(log: TripLog) { this.tripLogs.push(log); this.saveToStorage(); }
  submitExpenseReport(user: string, items: any) {
    const report: ExpenseReport = {
        id: `REP-${Math.floor(Math.random()*1000)}`, requesterName: user, period: '2023-10', createdDate: new Date().toISOString(),
        status: 'SUBMITTED_GESTOR', totalAmount: 0, totalReimbursable: 0, itemCount: 0, history: []
    };
    this.expenseReports.push(report);
    this.saveToStorage();
  }
  processReportByManager(id: string, act: any, user: string) {
    const r = this.expenseReports.find(x => x.id === id);
    if(r) { r.status = act === 'APPROVE' ? 'APPROVED_GESTOR' : 'REJECTED'; this.saveToStorage(); }
  }
  finalizeReportByFinance(id: string, user: string) {
    const r = this.expenseReports.find(x => x.id === id);
    if(r) { r.status = 'APPROVED_FINANCEIRO'; this.saveToStorage(); }
  }

  addSupportTicket(t: SupportTicket) { this.supportTickets.push(t); this.saveToStorage(); }
  addMessageToTicket(id: string, m: SupportMessage) {
    const t = this.supportTickets.find(x => x.id === id);
    if(t) { t.messages.push(m); this.saveToStorage(); }
  }
  addKbItem(i: KnowledgeBaseItem) { this.kbItems.push(i); this.saveToStorage(); }

  requestMaterials(user: string, data: MaterialRequestData) {
      const task: LogisticsTask = {
          id: `MAT-${Date.now()}`,
          type: 'MATERIAL_REQUEST',
          status: 'PENDING_SHIPMENT',
          clientName: 'Solicitação de Material',
          address: 'Estoque do Consultor',
          requesterName: user,
          date: new Date().toISOString(),
          details: `Qtd: ${data.posQuantity}, Bobinas: ${data.coils}, Carregadores: ${data.chargers}, Brindes: ${data.gifts}`
      };
      this.logisticsTasks.push(task);
      this.saveToStorage();
  }

  reportPosIssue(serial: string, type: string, desc: string, user: string) {
      const device = this.posInventory.find(p => p.serialNumber === serial);
      if (device) {
          device.status = 'Defective';
          if (!device.history) device.history = [];
          device.history.push({ date: new Date().toISOString(), holder: user, status: 'Defective', description: `Reportado: ${type} - ${desc}` });
          this.saveToStorage();
      }
  }

  markNotificationAsRead(id: string) {
      const n = this.notifications.find(x => x.id === id);
      if (n) { n.read = true; this.saveToStorage(); }
  }
  clearNotifications() { this.notifications = []; this.saveToStorage(); }
  markAllNotificationsAsRead() { this.notifications.forEach(n => n.read = true); this.saveToStorage(); }

  addPosDevice(device: PosDevice) { this.posInventory.push(device); this.saveToStorage(); }
  removePosDevice(serial: string) { this.posInventory = this.posInventory.filter(p => p.serialNumber !== serial); this.saveToStorage(); }

  setIntegrationConfig(c: IntegrationConfig) { this.integrationConfig = c; this.saveToStorage(); }
  setFinanceConfig(c: FinanceConfig) { this.financeConfig = c; this.saveToStorage(); }
  setCostConfig(c: CostStructure) { this.costConfig = c; this.saveToStorage(); }
  setRateRangesConfig(c: RateRangesConfig) { this.rateRangesConfig = c; this.saveToStorage(); }
  
  setSalesGoal(g: SalesGoal) {
      const idx = this.salesGoals.findIndex(x => x.userId === g.userId && x.month === g.month);
      if(idx !== -1) this.salesGoals[idx] = g; else this.salesGoals.push(g);
      this.saveToStorage();
  }
  getSalesGoal(uid: string, m: string) { return this.salesGoals.find(x => x.userId === uid && x.month === m); }
  getTeamGoal(r: any, m: string): SalesGoal { 
    return { id: 'agg', month: m, userId: 'team', userRole: UserRole.GESTOR, tpv: 0, reactivation: 0, newSales: 0, efficiency: 0, updatedAt: '' };
  }

  generateId() { return Math.random().toString(36).substr(2, 9).toUpperCase(); }

  initRateRangesMock() {
      const lastUpdated = new Date().toISOString();
      const updatedBy = 'Sistema';

      // MATRIZ COMPLETA DAS IMAGENS
      const fullDebit = [2.06, 2.01, 1.95, 1.81, 1.26, 1.16, 1.06];
      const full1x = [6.74, 5.08, 4.38, 3.73, 3.17, 3.09, 3.01];
      const full2x = [8.10, 6.39, 5.42, 4.78, 4.62, 4.53, 4.45];
      const full12x = [20.94, 18.14, 17.74, 17.74, 16.93, 16.85, 16.77];
      const full18x = [30.07, 26.61, 26.28, 25.47, 24.66, 24.58, 24.50];

      const simpleDebit = [2.00, 2.00, 1.81, 1.61, 1.26, 1.16, 1.06];
      const simple1x = [2.95, 2.85, 2.65, 2.45, 2.15, 2.05, 1.95];
      const simple2_6x = [3.65, 3.55, 3.35, 3.15, 2.85, 2.75, 2.65];
      const simple7_12x = [4.10, 4.00, 3.80, 3.60, 3.30, 3.20, 3.10];
      const simple13_18x = [4.40, 4.20, 4.10, 3.80, 3.50, 3.40, 3.30];

      this.rateRangesConfig = { full: {}, simples: {} };

      // POPULANDO AS 7 FAIXAS (RANGES 0-6)
      for (let i = 0; i < 7; i++) {
          // FULL
          const installmentsFull = [];
          const step = (full12x[i] - full2x[i]) / 10;
          for(let j=0; j<11; j++) installmentsFull.push(parseFloat((full2x[i] + step*j).toFixed(2)));
          // Add 13-18x extrapolation
          const stepExtra = (full18x[i] - full12x[i]) / 6;
          for(let j=1; j<=6; j++) installmentsFull.push(parseFloat((full12x[i] + stepExtra*j).toFixed(2)));

          this.rateRangesConfig.full[i] = { 
              debit: fullDebit[i], 
              credit1x: full1x[i], 
              installments: installmentsFull,
              lastUpdated, updatedBy 
          };

          // SIMPLES
          this.rateRangesConfig.simples[i] = {
              debit: simpleDebit[i],
              credit1x: simple1x[i],
              credit2x6x: simple2_6x[i],
              credit7x12x: simple7_12x[i],
              credit13x18x: simple13_18x[i],
              lastUpdated, updatedBy
          };
      }
  }

  initMockData() {
      this.clients = MOCK_CLIENT_BASE.map(c => ({
          ...c,
          historicalRates: c.id === '1001' ? {
              debit: 1.29, credit1x: 3.49, credit12x: 14.90, plan: 'Full', date: '2024-01-10'
          } : undefined,
          historicalBank: c.id === '1001' ? {
              bank: '341 - Itaú Unibanco', agency: '1234', account: '56789-0'
          } : undefined
      }));
      this.users = MOCK_USERS;
      this.posInventory = [
          { serialNumber: 'SN123456', rcNumber: 'RC001', model: 'P2 Smart', status: 'InStock', currentHolder: 'Logística Central', lastUpdated: new Date().toISOString() }
      ];
      this.kbItems = [
          { id: '1', errorPattern: 'Erro 05', solution: 'Transação não autorizada.', keywords: ['05'] }
      ];
  }
}

export const appStore = new Store();
