
  // ... imports unchanged
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
  LeadServiceItem,
  FullRangeRates,
  SimplesRangeRates,
  Expense,
  ExpenseReport,
  FinanceConfig,
  UserRole
} from '../types';
import { MOCK_CLIENT_BASE, MOCK_USERS } from '../constants';

const INTERNAL_CACHE_KEY = 'v1.9.0';
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
  
  private lastSynced: string | null = null;
  private listeners: (() => void)[] = []; 
  private isLoaded: boolean = false;
  
  private costConfig: CostStructure = {
      debitCost: 0.50,
      creditSightCost: 1.80,
      installment2to6Cost: 2.20,
      installment7to12Cost: 2.40,
      installment13to18Cost: 2.60,
      anticipationCost: 0.90,
      taxRate: 11.25,
      fixedCostPerTx: 0.15,
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
      policyText: "Política de Reembolso:\n1. Alimentação: Limite de R$ 80,00 por dia.\n2. KM: Valor fixo conforme tabela."
  };

  private visitReasons: string[] = ['Apresentação', 'Negociação', 'Treinamento', 'Retirada', 'Instalação', 'Visita de Cortesia'];
  private leadOrigins: string[] = ['Indicação', 'Prospecção', 'Google Ads', 'Instagram', 'Feira/Evento'];
  private withdrawalReasons: string[] = ['Baixo Faturamento', 'Fechamento do Estabelecimento', 'Troca de Adquirente', 'Insatisfação com Taxas'];
  private swapReasons: string[] = ['Defeito Técnico', 'Upgrade de Modelo', 'Conectividade', 'Bateria'];
  private demandTypes: string[] = ['Alteração Cadastral', 'Alteração Bancária', 'Alteração de Taxas', 'Troca de POS', 'Desativação de POS', 'Outros'];

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

  // ... (subscribe, notifyListeners, initAsync, saveToStorage, loadFromStorage, getters... UNCHANGED)
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
        lastSynced: this.lastSynced
    };

    idb.put(data).catch(err => console.error("Failed to save to IndexedDB", err));
    this.notifyListeners();
  }

  private async loadFromStorage() {
    try {
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
            if (data.costConfig) this.costConfig = data.costConfig;
            if (data.financeConfig) this.financeConfig = data.financeConfig;
            this.lastSynced = data.lastSynced || new Date().toISOString();
            
            if (data.rateRangesConfig && Object.keys(data.rateRangesConfig.full).length >= this.TPV_RANGES.length) {
                this.rateRangesConfig = data.rateRangesConfig;
            } else {
                this.initRateRangesMock();
            }
        } else {
            console.log("No compatible IDB data found, initializing mocks.");
            this.initMockData();
            this.initRateRangesMock();
            this.lastSynced = new Date().toISOString();
            this.saveToStorage(); 
        }
    } catch (e) {
        console.error("Error loading offline data", e);
        this.initMockData();
        this.initRateRangesMock();
    }
  }

  // --- GETTERS ---
  getAppointments() { return this.appointments; }
  getClients() { return this.clients; }
  getUsers() { return this.users; }
  getDemands() { return this.demands; }
  getRegistrationRequests() { return this.registrationRequests; }
  getLogisticsTasks() { return this.logisticsTasks; }
  getPosInventory() { return this.posInventory; }
  getSupportTickets() { return this.supportTickets; }
  getKnowledgeBase() { return this.kbItems; }
  getVisitReasons() { return this.visitReasons; }
  getLeadOrigins() { return this.leadOrigins; }
  getWithdrawalReasons() { return this.withdrawalReasons; }
  getSwapReasons() { return this.swapReasons; }
  getDemandTypes() { return this.demandTypes; }
  getMyVehicle() { return this.myVehicle; }
  getTripLogs() { return this.tripLogs; }
  getExpenses() { return this.expenses; }
  getExpenseReports() { return this.expenseReports; }
  getCostConfig() { return this.costConfig; }
  getRateRangesConfig() { return this.rateRangesConfig; }
  getFinanceConfig() { return this.financeConfig; }
  getLastSynced() { return this.lastSynced; }

  // ... (Expense Reporting Logic) ...
  addExpense(expense: Expense) {
      expense.status = 'OPEN'; 
      this.expenses.push(expense); 
      this.saveToStorage(); 
  }

  addTripLog(log: TripLog) {
      log.status = 'OPEN'; 
      this.tripLogs.push(log); 
      this.saveToStorage(); 
  }

  submitExpenseReport(user: string, items: { expenseIds: string[], logIds: string[] }) {
      const reportId = `REP-${Math.floor(Math.random() * 100000)}`;
      const now = new Date();
      const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2,'0')}`;

      let total = 0;
      let totalReimbursable = 0;

      items.expenseIds.forEach(id => {
          const exp = this.expenses.find(e => e.id === id);
          if (exp) {
              exp.status = 'WAITING_MANAGER';
              exp.reportId = reportId;
              total += exp.amount;
              if (exp.reimbursable) totalReimbursable += exp.amount;
          }
      });

      items.logIds.forEach(id => {
          const log = this.tripLogs.find(l => l.id === id);
          if (log) {
              log.status = 'WAITING_MANAGER';
              log.reportId = reportId;
              total += log.valueEarned;
              totalReimbursable += log.valueEarned;
          }
      });

      const report: ExpenseReport = {
          id: reportId,
          requesterName: user,
          period: period,
          createdDate: now.toISOString(),
          status: 'SUBMITTED_GESTOR',
          totalAmount: total,
          totalReimbursable: totalReimbursable,
          itemCount: items.expenseIds.length + items.logIds.length,
          history: [{ date: now.toISOString(), action: 'Enviado para Aprovação', user }]
      };

      this.expenseReports.push(report);
      this.saveToStorage();
  }

  processReportByManager(reportId: string, action: 'APPROVE' | 'REJECT', user: string, rejectionItems?: string[]) {
      const report = this.expenseReports.find(r => r.id === reportId);
      if (!report) return;

      const now = new Date().toISOString();

      if (action === 'APPROVE') {
          report.status = 'APPROVED_GESTOR';
          this.expenses.forEach(e => { if (e.reportId === reportId) e.status = 'WAITING_FINANCE'; });
          this.tripLogs.forEach(l => { if (l.reportId === reportId) l.status = 'WAITING_FINANCE'; });
          report.history.push({ date: now, action: 'Aprovado pelo Gestor', user });
      } else {
          report.status = 'REJECTED';
          this.expenses.forEach(e => { 
              if (e.reportId === reportId) {
                  e.status = 'REJECTED';
                  e.reportId = undefined;
                  e.rejectionReason = "Rejeitado pelo Gestor no Relatório " + reportId;
              }
          });
          this.tripLogs.forEach(l => { 
              if (l.reportId === reportId) {
                  l.status = 'REJECTED'; 
                  l.reportId = undefined;
              }
          });
          report.history.push({ date: now, action: 'Rejeitado pelo Gestor', user });
      }
      this.saveToStorage();
  }

  finalizeReportByFinance(reportId: string, user: string) {
      const report = this.expenseReports.find(r => r.id === reportId);
      if (!report) return;

      const now = new Date().toISOString();
      const token = btoa(`${reportId}-${Date.now()}-${Math.random()}`).substring(0, 16).toUpperCase();

      report.status = 'APPROVED_FINANCEIRO';
      report.validationToken = token;
      
      this.expenses.forEach(e => { if (e.reportId === reportId) e.status = 'PAID'; });
      this.tripLogs.forEach(l => { if (l.reportId === reportId) l.status = 'PAID'; });

      report.history.push({ date: now, action: `Aprovado Final (Financeiro). Token: ${token}`, user });
      
      this.saveToStorage();
  }

  // --- LOGGING & HISTORY ---
  logHistory(entityId: string, dept: string, message: string) {
      const note: ClientNote = {
          id: `LOG-${Math.floor(Math.random() * 10000)}`,
          clientId: entityId, 
          authorName: dept,
          date: new Date().toISOString(),
          content: message
      };
      this.clientNotes.push(note);
      this.saveToStorage();
  }

  // --- DEMAND / REQUESTS LOGIC ---
  addDemand(demand: ManualDemand) { 
      this.demands.push(demand);
      this.saveToStorage();
  }
  updateDemand(demand: ManualDemand) {
      const idx = this.demands.findIndex(d => d.id === demand.id);
      if (idx !== -1) {
          this.demands[idx] = demand;
          this.saveToStorage();
      }
  }
  concludeDemand(id: string, finalResult: string, executorName: string) {
      const demand = this.demands.find(d => d.id === id);
      if (!demand) return;
      demand.status = 'Concluído';
      demand.result = finalResult;
      demand.adminStatus = 'Finalizado ADM';
      this.updateDemand(demand);
      this.logHistory(demand.id, 'BACKOFFICE', `Processo Finalizado por ${executorName}. ${finalResult}`);
  }

  // --- NEW: POS ISSUES & MATERIALS ---
  reportPosIssue(serial: string, type: string, description: string, user: string) {
      const device = this.posInventory.find(p => p.serialNumber === serial);
      if (device) {
          device.status = 'Defective'; // Or Triage
          device.problemReport = {
              date: new Date().toISOString(),
              type: type as any,
              description,
              reportedBy: user
          };
          device.history?.push({
              date: new Date().toISOString(),
              status: 'Defective',
              holder: user,
              description: `Reportado: ${type} - ${description}`
          });
          this.saveToStorage();
      }
  }

  requestMaterials(requester: string, items: any) {
      const task: LogisticsTask = {
          id: `MAT-${Math.floor(Math.random()*10000)}`,
          type: 'MATERIAL_REQUEST',
          status: 'PENDING_SHIPMENT',
          clientName: 'Estoque do Consultor',
          requesterName: requester,
          requesterRole: 'Field Sales',
          date: new Date().toISOString(),
          details: `Material: ${JSON.stringify(items)}`,
          address: 'Endereço do Consultor', // Simplification
          materialData: items
      };
      this.addLogisticsTask(task);
  }

  addLogisticsTask(task: LogisticsTask) { this.logisticsTasks.push(task); this.saveToStorage(); }
  updateLogisticsTask(task: LogisticsTask) {
      const idx = this.logisticsTasks.findIndex(t => t.id === task.id);
      if (idx !== -1) {
          this.logisticsTasks[idx] = task;
          this.saveToStorage();
      }
  }
  completeGsurfActivation(taskId: string, otp: string, posData: any) { 
      const task = this.logisticsTasks.find(t => t.id === taskId);
      if (task) {
          task.status = 'COMPLETED';
          task.otp = otp;
          task.posData = posData;
          this.saveToStorage();
          
          // --- UPDATED LOGIC: LINK TO DEMAND & SEND TO BACKOFFICE ---
          // Use internalId (which stores Demand ID) to find the linked demand
          const demand = this.demands.find(d => 
              (task.internalId && d.id === task.internalId) || 
              (d.clientName === task.clientName && d.adminStatus === 'Aguardando Logística')
          );

          if (demand) {
              demand.otp = otp;
              demand.result = `Logística Finalizada. OTP: ${otp}. Serial: ${posData.serial}`;
              // FLIP TO BACKOFFICE QUEUE
              demand.adminStatus = 'Pendente ADM'; 
              this.updateDemand(demand);
              
              // Optional: Log history
              this.logHistory(demand.id, 'LOGÍSTICA', `Ativação/Troca concluída no GSurf. OTP: ${otp}`);
          }
      }
  }

  addSupportTicket(ticket: SupportTicket) { this.supportTickets.push(ticket); this.saveToStorage(); }
  addMessageToTicket(ticketId: string, message: SupportMessage) {
      const ticketIndex = this.supportTickets.findIndex(t => t.id === ticketId);
      if (ticketIndex !== -1) {
          this.supportTickets[ticketIndex].messages.push(message);
          this.saveToStorage();
      }
  }
  addKbItem(item: KnowledgeBaseItem) { this.kbItems.push(item); this.saveToStorage(); }
  generateId() { return Math.random().toString(36).substr(2, 9).toUpperCase(); }
  
  createNotification(data: { type: 'RATE_APPROVED' | 'OTP_ISSUED' | 'INFO', title: string, message: string, targetId?: string }) {
      const newNotif: AppNotification = {
          id: `NOTIF-${Date.now()}`,
          date: new Date().toISOString(),
          read: false,
          ...data
      };
      const duplicate = this.notifications.find(n => n.targetId === data.targetId && n.type === data.type && !n.read);
      if (!duplicate) {
          this.notifications.unshift(newNotif);
          this.saveToStorage();
      }
  }
  getNotifications() { return this.notifications; }
  markNotificationAsRead(id: string) {
      const notif = this.notifications.find(n => n.id === id);
      if (notif) { notif.read = true; this.saveToStorage(); }
  }
  markAllNotificationsAsRead() { this.notifications.forEach(n => n.read = true); this.saveToStorage(); }
  clearNotifications() { this.notifications = []; this.saveToStorage(); }

  setMyVehicle(vehicle: Vehicle) { this.myVehicle = vehicle; this.saveToStorage(); }
  updateTripLog(log: TripLog) { const idx = this.tripLogs.findIndex(t => t.id === log.id); if (idx !== -1) { this.tripLogs[idx] = log; this.saveToStorage(); }}
  updateExpense(expense: Expense) { const idx = this.expenses.findIndex(e => e.id === expense.id); if (idx !== -1) { this.expenses[idx] = expense; this.saveToStorage(); }}
  setFinanceConfig(config: FinanceConfig) { this.financeConfig = config; this.saveToStorage(); }
  setCostConfig(config: CostStructure) { this.costConfig = config; this.saveToStorage(); }
  setRateRangesConfig(config: RateRangesConfig) { this.rateRangesConfig = config; this.saveToStorage(); }
  addAppointment(appt: Appointment) { this.appointments.push(appt); this.saveToStorage(); }
  getAppointmentsByFieldSales(name: string) { return this.appointments.filter(a => a.fieldSalesName === name); }
  getRouteAppointments(fieldSalesName: string) { return this.appointments.filter(a => a.fieldSalesName === fieldSalesName && a.inRoute); }
  checkInAppointment(id: string) { const appt = this.appointments.find(a => a.id === id); if (appt) { if (!appt.visitReport) appt.visitReport = {}; appt.visitReport.checkInTime = new Date().toISOString(); this.saveToStorage(); }}
  submitVisitReport(id: string, report: VisitReport) { const appt = this.appointments.find(a => a.id === id); if (appt) { appt.status = 'Completed'; appt.visitReport = { ...appt.visitReport, ...report, checkOutTime: new Date().toISOString() }; this.saveToStorage(); }}
  toggleRouteStatus(id: string) { const appt = this.appointments.find(a => a.id === id); if (appt) { appt.inRoute = !appt.inRoute; this.saveToStorage(); }}
  setClients(clients: ClientBaseRow[]) { this.clients = clients; this.saveToStorage(); }
  addClientNote(note: ClientNote) { this.clientNotes.push(note); this.saveToStorage(); }
  getClientNotes(clientId: string) { return this.clientNotes.filter(n => n.clientId === clientId); }
  getLeadServices(clientId: string) { return [{ id: '1', flow: 'SIN', serviceType: 'Reparo Colisão', date: '2023-10-01', licensePlate: 'ABC-1234', value: 2500, status: 'Realizado' }]; }
  addUser(user: SystemUser) { this.users.push(user); this.saveToStorage(); }
  updateUser(user: SystemUser) { const idx = this.users.findIndex(u => u.id === user.id); if (idx !== -1) { this.users[idx] = { ...this.users[idx], ...user }; if (user.vehicle) this.myVehicle = user.vehicle; this.saveToStorage(); }}
  toggleUserStatus(id: string) { const user = this.users.find(u => u.id === id); if (user) { user.active = !user.active; this.saveToStorage(); }}
  addVisitReason(val: string) { if (!this.visitReasons.includes(val)) { this.visitReasons.push(val); this.saveToStorage(); } }
  removeVisitReason(val: string) { this.visitReasons = this.visitReasons.filter(i => i !== val); this.saveToStorage(); }
  addLeadOrigin(val: string) { if (!this.leadOrigins.includes(val)) { this.leadOrigins.push(val); this.saveToStorage(); } }
  removeLeadOrigin(val: string) { this.leadOrigins = this.leadOrigins.filter(i => i !== val); this.saveToStorage(); }
  addWithdrawalReason(val: string) { if (!this.withdrawalReasons.includes(val)) { this.withdrawalReasons.push(val); this.saveToStorage(); } }
  removeWithdrawalReason(val: string) { this.withdrawalReasons = this.withdrawalReasons.filter(i => i !== val); this.saveToStorage(); }
  addSwapReason(val: string) { if (!this.swapReasons.includes(val)) { this.swapReasons.push(val); this.saveToStorage(); } }
  removeSwapReason(val: string) { this.swapReasons = this.swapReasons.filter(i => i !== val); this.saveToStorage(); }
  addRegistrationRequest(req: RegistrationRequest) { this.registrationRequests.push(req); this.saveToStorage(); }
  updateRegistrationRequest(req: RegistrationRequest) { const idx = this.registrationRequests.findIndex(r => r.id === req.id); if (idx !== -1) { this.registrationRequests[idx] = req; this.saveToStorage(); }}
  approveRegistration(req: RegistrationRequest) { this.updateRegistrationRequest({...req, status: 'APPROVED'}); this.saveToStorage(); }
  addPosDevice(device: PosDevice) { this.posInventory.push(device); this.saveToStorage(); }
  removePosDevice(serial: string) { this.posInventory = this.posInventory.filter(p => p.serialNumber !== serial); this.saveToStorage(); }
  updateInventoryStatus(serial: string, status: string, holder: string) { /* ... */ }

  initRateRangesMock() {
      // Mock Data for Rate Ranges (Full & Simples)
      const mockFull: Record<number, FullRangeRates> = {};
      const mockSimples: Record<number, SimplesRangeRates> = {};
      
      this.TPV_RANGES.forEach(range => {
          mockFull[range.id] = {
              debit: 0.99,
              credit1x: 2.89,
              installments: Array(17).fill(0).map((_, i) => 2.89 + ((i+2)*1.5)), // Mock linear progression
              lastUpdated: new Date().toISOString(),
              updatedBy: 'Sistema'
          };
          mockSimples[range.id] = {
              debit: 1.19,
              credit1x: 3.29,
              credit2x6x: 8.99,
              credit7x12x: 12.99,
              credit13x18x: 18.99,
              lastUpdated: new Date().toISOString(),
              updatedBy: 'Sistema'
          };
      });
      this.rateRangesConfig = { full: mockFull, simples: mockSimples };
  }

  initMockData() {
      this.clients = MOCK_CLIENT_BASE;
      this.users = MOCK_USERS;
      this.posInventory = [
          { serialNumber: 'SN123456', rcNumber: 'RC001', model: 'P2 Smart', status: 'InStock', currentHolder: 'Logística Central', lastUpdated: new Date().toISOString() },
          { serialNumber: 'SN654321', rcNumber: 'RC002', model: 'MP35', status: 'WithField', currentHolder: 'Cleiton Freitas', lastUpdated: new Date().toISOString() },
          { serialNumber: 'SN789012', rcNumber: 'RC003', model: 'X990', status: 'Active', currentHolder: 'Auto Center Porto Real', lastUpdated: new Date().toISOString() }
      ];
      this.supportTickets = [];
      this.kbItems = [
          { id: '1', errorPattern: 'Erro 05', solution: 'Transação não autorizada pelo banco emissor. Pedir para cliente contatar o banco.', keywords: ['05', 'não autorizada', 'negada'] },
          { id: '2', errorPattern: 'Sem sinal', solution: 'Reiniciar a máquina. Verificar se o chip está bem encaixado.', keywords: ['sinal', 'conectividade', 'chip'] }
      ];
  }
}

export const appStore = new Store();
