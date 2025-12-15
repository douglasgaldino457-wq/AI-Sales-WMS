
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
  FinanceConfig
} from '../types';
import { MOCK_CLIENT_BASE, MOCK_USERS } from '../constants';

const DB_NAME = 'Car10_DB';
const DB_VERSION = 1;
const STORE_NAME = 'app_state';
const DATA_KEY = 'root_store';
const INTERNAL_CACHE_KEY = 'car10_db_v7'; // Version bump to force new rates load

// --- INDEXED DB ADAPTER ---
// Allows storage of huge amounts of data (GBs) instead of MBs
const idb = {
    open: (): Promise<IDBDatabase> => {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME);
                }
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },
    put: async (data: any) => {
        const db = await idb.open();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const request = store.put(data, DATA_KEY);
            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
    },
    get: async () => {
        const db = await idb.open();
        return new Promise<any>((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const request = store.get(DATA_KEY);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
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
  
  // Cache Metadata & Reactivity
  private lastSynced: string | null = null;
  private listeners: (() => void)[] = []; // Observers array
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
  private demandTypes: string[] = ['Alteração Cadastral', 'Antecipação', 'Isenção de Aluguel', 'Material de Merchandising', 'Negociação de Taxas', 'Troca de POS', 'Desativação de POS', 'Outros'];

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

  // --- REACTIVITY METHODS ---
  public subscribe(listener: () => void) {
      this.listeners.push(listener);
      // If loaded, trigger immediately
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
      this.notifyListeners(); // Initial render with data
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
        costConfig: this.costConfig,
        rateRangesConfig: this.rateRangesConfig,
        notifications: this.notifications,
        expenses: this.expenses,
        financeConfig: this.financeConfig,
        lastSynced: this.lastSynced
    };

    // Fire and forget (async) to not block UI
    idb.put(data).catch(err => console.error("Failed to save to IndexedDB", err));
    
    // Notify UI immediately (Optimistic UI)
    this.notifyListeners();
  }

  private async loadFromStorage() {
    try {
        const data = await idb.get();
        
        // Version check to force update of Rate Tables if schema changed
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
            if (data.costConfig) this.costConfig = data.costConfig;
            if (data.financeConfig) this.financeConfig = data.financeConfig;
            
            this.lastSynced = data.lastSynced || new Date().toISOString();
            
            if (data.rateRangesConfig && Object.keys(data.rateRangesConfig.full).length >= this.TPV_RANGES.length) {
                this.rateRangesConfig = data.rateRangesConfig;
            } else {
                this.initRateRangesMock();
            }
        } else {
            console.log("No compatible IDB data found (or version mismatch), initializing mocks.");
            this.initMockData();
            this.initRateRangesMock();
            this.lastSynced = new Date().toISOString();
            this.saveToStorage(); // Save initial mock state to DB
        }
    } catch (e) {
        console.error("Error loading offline data from IDB, reverting to mocks", e);
        this.initMockData();
        this.initRateRangesMock();
    }
  }

  // ... (GETTERS - Unchanged) ...
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
  
  getCostConfig() { return this.costConfig; }
  getRateRangesConfig() { return this.rateRangesConfig; }
  getFinanceConfig() { return this.financeConfig; }
  
  getLastSynced() { return this.lastSynced; }

  // ... (ACTIONS - Unchanged) ...
  
  setMyVehicle(vehicle: Vehicle) {
      this.myVehicle = vehicle;
      this.saveToStorage();
  }

  addTripLog(log: TripLog) {
      this.tripLogs.push(log);
      this.saveToStorage();
  }

  updateTripLog(log: TripLog) {
      const idx = this.tripLogs.findIndex(t => t.id === log.id);
      if (idx !== -1) {
          this.tripLogs[idx] = log;
          this.saveToStorage();
      }
  }

  addExpense(expense: Expense) {
      this.expenses.push(expense);
      this.saveToStorage();
  }

  updateExpense(expense: Expense) {
      const idx = this.expenses.findIndex(e => e.id === expense.id);
      if (idx !== -1) {
          this.expenses[idx] = expense;
          this.saveToStorage();
      }
  }

  setFinanceConfig(config: FinanceConfig) {
      this.financeConfig = config;
      this.saveToStorage();
  }
  
  setCostConfig(config: CostStructure) {
      this.costConfig = config;
      this.saveToStorage();
  }

  setRateRangesConfig(config: RateRangesConfig) {
      this.rateRangesConfig = config;
      this.saveToStorage();
  }

  addAppointment(appt: Appointment) {
      this.appointments.push(appt);
      this.saveToStorage();
  }
  
  getAppointmentsByFieldSales(name: string) {
      return this.appointments.filter(a => a.fieldSalesName === name);
  }

  getRouteAppointments(fieldSalesName: string) {
      return this.appointments.filter(a => a.fieldSalesName === fieldSalesName && a.inRoute);
  }

  checkInAppointment(id: string) {
      const appt = this.appointments.find(a => a.id === id);
      if (appt) {
          if (!appt.visitReport) appt.visitReport = {};
          appt.visitReport.checkInTime = new Date().toISOString();
          this.saveToStorage();
      }
  }

  submitVisitReport(id: string, report: VisitReport) {
      const appt = this.appointments.find(a => a.id === id);
      if (appt) {
          appt.status = 'Completed';
          appt.visitReport = { ...appt.visitReport, ...report, checkOutTime: new Date().toISOString() };
          this.saveToStorage();
      }
  }

  toggleRouteStatus(id: string) {
      const appt = this.appointments.find(a => a.id === id);
      if (appt) {
          appt.inRoute = !appt.inRoute;
          this.saveToStorage();
      }
  }

  setClients(clients: ClientBaseRow[]) {
      this.clients = clients;
      this.saveToStorage();
  }

  addClientNote(note: ClientNote) {
      this.clientNotes.push(note);
      this.saveToStorage();
  }

  getClientNotes(clientId: string) {
      return this.clientNotes.filter(n => n.clientId === clientId);
  }

  getLeadServices(clientId: string): LeadServiceItem[] {
      return [
          { id: '1', flow: 'SIN', serviceType: 'Reparo Colisão', date: '2023-10-01', licensePlate: 'ABC-1234', value: 2500, status: 'Realizado' },
          { id: '2', flow: 'CAM', serviceType: 'Revisão', date: '2023-10-05', licensePlate: 'XYZ-9876', value: 450, status: 'Realizado' },
          { id: '3', flow: 'SIR', serviceType: 'Guincho', date: '2023-10-10', licensePlate: 'DEF-5678', value: 300, status: 'Realizado' },
      ];
  }

  addUser(user: SystemUser) { 
      this.users.push(user); 
      this.saveToStorage();
  }
  
  updateUser(user: SystemUser) { 
      const idx = this.users.findIndex(u => u.id === user.id);
      if (idx !== -1) {
          this.users[idx] = { ...this.users[idx], ...user };
          if (user.vehicle) {
              this.myVehicle = user.vehicle;
          }
          this.saveToStorage();
      }
  }
  
  toggleUserStatus(id: string) {
      const user = this.users.find(u => u.id === id);
      if (user) {
          user.active = !user.active;
          this.saveToStorage();
      }
  }

  addDemand(demand: ManualDemand) { 
      this.demands.push(demand);
      
      if (demand.type === 'Troca de POS' || demand.type === 'Desativação de POS') {
          const isExchange = demand.type === 'Troca de POS';
          const taskType = isExchange ? 'POS_EXCHANGE' : 'POS_RETRIEVAL';
          
          const newTask: LogisticsTask = {
              id: `TASK-${Math.floor(Math.random() * 90000) + 10000}`,
              type: taskType as any,
              status: 'READY_FOR_GSURF',
              clientName: demand.clientName,
              internalId: demand.id,
              details: demand.description || (isExchange ? 'Troca solicitada' : 'Desativação solicitada'),
              requesterName: demand.requester,
              requesterRole: 'Field Sales',
              date: new Date().toISOString(),
              address: 'Consultar Cadastro',
              documentNumber: '',
              posData: { serialNumber: 'N/A', rcNumber: 'N/A', model: 'N/A' }
          };
          this.addLogisticsTask(newTask);
      }

      this.saveToStorage();
  }

  updateDemand(demand: ManualDemand) {
      const idx = this.demands.findIndex(d => d.id === demand.id);
      if (idx !== -1) {
          const prevStatus = this.demands[idx].status;
          
          if (demand.status === 'Aprovado Pricing' && prevStatus !== 'Aprovado Pricing') {
              this.createNotification({
                  type: 'RATE_APPROVED',
                  title: 'Taxa Aprovada!',
                  message: `As condições para ${demand.clientName} foram aprovadas pela mesa.`,
                  targetId: demand.id
              });
          }

          this.demands[idx] = demand;
          this.saveToStorage();
      }
  }

  addRegistrationRequest(req: RegistrationRequest) { 
      this.registrationRequests.push(req); 
      this.saveToStorage();
  }

  updateRegistrationRequest(req: RegistrationRequest) {
      const idx = this.registrationRequests.findIndex(r => r.id === req.id);
      if (idx !== -1) {
          this.registrationRequests[idx] = req;
          this.saveToStorage();
      }
  }

  approveRegistration(req: RegistrationRequest): void {
      const approvedReq: RegistrationRequest = { 
          ...req, 
          status: 'APPROVED', 
          notes: req.notes ? req.notes + ' \n[Backoffice] Validado. Enviado para Logística (GSurf).' : '[Backoffice] Validado. Enviado para Logística (GSurf).' 
      };
      this.updateRegistrationRequest(approvedReq);

      const requestedItems = req.requestedEquipments || [];
      const needsShipment = requestedItems.some(i => i.type === 'REQUEST');
      const taskType = needsShipment ? 'POS_SHIPMENT' : 'FIELD_ACTIVATION';
      const initialStatus = needsShipment ? 'PENDING_SHIPMENT' : 'READY_FOR_GSURF';
      
      let detailsText = `Cadastro aprovado (ID: ${req.finalClientId}). `;
      if (needsShipment) {
          const itemsToSend = requestedItems.filter(i => i.type === 'REQUEST').map(i => i.model).join(', ');
          detailsText += `Necessário envio de: ${itemsToSend}.`;
      } else {
          detailsText += `Equipamentos já em posse do consultor.`;
      }

      const newTask: LogisticsTask = {
          id: `TASK-${Math.floor(Math.random() * 90000) + 10000}`,
          type: taskType as any,
          status: initialStatus as any,
          clientName: req.clientName,
          legalName: req.razaoSocial,
          internalId: req.finalClientId,
          documentNumber: req.documentNumber,
          address: req.address,
          responsibleName: req.responsibleName,
          contactPhone: req.contactPhones?.[0],
          email: req.email,
          requesterName: req.requesterName,
          requesterRole: req.requesterRole,
          date: new Date().toISOString(),
          details: detailsText,
          posData: req.posData,
          allocatedPosList: req.requestedEquipments
      };

      this.addLogisticsTask(newTask);
      this.logHistory(req.id, 'BACKOFFICE', 'Cadastro Aprovado e ID Gerado. Enviado para Logística.');
  }

  completeGsurfActivation(taskId: string, otp: string, posData: {serial: string, rc: string}) {
      const task = this.logisticsTasks.find(t => t.id === taskId);
      if (!task) return;

      task.status = 'COMPLETED';
      task.otp = otp;
      task.posData = { serialNumber: posData.serial, rcNumber: posData.rc, model: 'P2 Smart' };
      this.updateLogisticsTask(task);

      if (task.type === 'FIELD_ACTIVATION' || task.type === 'POS_SHIPMENT') {
          const reg = this.registrationRequests.find(r => 
              (task.internalId && r.finalClientId === task.internalId) || 
              r.clientName === task.clientName
          );
          if (reg) {
              this.logHistory(reg.id, 'LOGISTICA', `Ativação GSurf Realizada.\nOTP: ${otp}\nS/N: ${posData.serial}\nRC: ${posData.rc}`);
              
              const notificationDemand: ManualDemand = {
                  id: `NOTIF-${task.id}`,
                  clientName: reg.clientName,
                  type: 'Cadastro/Ativação',
                  date: new Date().toISOString(),
                  status: 'Concluído',
                  adminStatus: 'Finalizado ADM',
                  requester: reg.requesterName,
                  description: `Cadastro finalizado. Use o OTP para ativar a máquina.`,
                  otp: otp,
                  result: `POS Vinculada: ${posData.serial} (RC ${posData.rc})`
              };
              this.addDemand(notificationDemand);

              this.createNotification({
                  type: 'OTP_ISSUED',
                  title: 'OTP Disponível',
                  message: `Código de ativação gerado para ${reg.clientName}: ${otp}`,
                  targetId: notificationDemand.id
              });
          }
      } else if (task.type === 'POS_EXCHANGE') {
          const demand = this.demands.find(d => d.id === task.internalId || d.clientName === task.clientName);
          if (demand) {
              demand.otp = otp;
              demand.status = 'Concluído';
              demand.result = `Logística: GSurf atualizado. OTP: ${otp}. Aguardando validação final Backoffice.`;
              demand.adminStatus = 'Pendente ADM';
              this.updateDemand(demand);
              this.logHistory(demand.id, 'LOGISTICA', `Troca GSurf Realizada. OTP Gerado: ${otp}`);

              this.createNotification({
                  type: 'OTP_ISSUED',
                  title: 'Troca Aprovada',
                  message: `OTP de troca para ${demand.clientName}: ${otp}`,
                  targetId: demand.id
              });
          }
      }
  }

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

  addLogisticsTask(task: LogisticsTask) { 
      this.logisticsTasks.push(task); 
      this.saveToStorage();
  }
  updateLogisticsTask(task: LogisticsTask) {
      const idx = this.logisticsTasks.findIndex(t => t.id === task.id);
      if (idx !== -1) {
          this.logisticsTasks[idx] = task;
          this.saveToStorage();
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

  addVisitReason(val: string) { if (!this.visitReasons.includes(val)) { this.visitReasons.push(val); this.saveToStorage(); } }
  removeVisitReason(val: string) { this.visitReasons = this.visitReasons.filter(i => i !== val); this.saveToStorage(); }
  
  addLeadOrigin(val: string) { if (!this.leadOrigins.includes(val)) { this.leadOrigins.push(val); this.saveToStorage(); } }
  removeLeadOrigin(val: string) { this.leadOrigins = this.leadOrigins.filter(i => i !== val); this.saveToStorage(); }

  addWithdrawalReason(val: string) { if (!this.withdrawalReasons.includes(val)) { this.withdrawalReasons.push(val); this.saveToStorage(); } }
  removeWithdrawalReason(val: string) { this.withdrawalReasons = this.withdrawalReasons.filter(i => i !== val); this.saveToStorage(); }

  addSwapReason(val: string) { if (!this.swapReasons.includes(val)) { this.swapReasons.push(val); this.saveToStorage(); } }
  removeSwapReason(val: string) { this.swapReasons = this.swapReasons.filter(i => i !== val); this.saveToStorage(); }

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

  getNotifications(): AppNotification[] {
      return this.notifications.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  markNotificationAsRead(id: string) {
      const notif = this.notifications.find(n => n.id === id);
      if (notif) {
          notif.read = true;
          this.saveToStorage();
      }
  }

  markAllNotificationsAsRead() {
      this.notifications.forEach(n => n.read = true);
      this.saveToStorage();
  }

  clearNotifications() {
      this.notifications = [];
      this.saveToStorage();
  }

  concludeDemand(id: string, finalResult: string, executorName: string) {
      const demand = this.demands.find(d => d.id === id);
      if (!demand) return;

      demand.status = 'Concluído';
      demand.result = finalResult;
      demand.adminStatus = 'Finalizado ADM';
      this.updateDemand(demand);
      this.logHistory(demand.id, 'BACKOFFICE', `Processo Finalizado. ${finalResult}`);
  }

  // --- UPDATED RATE RANGES INITIALIZATION ---
  initRateRangesMock() {
      const fullRates: Record<number, FullRangeRates> = {};
      const simplesRates: Record<number, SimplesRangeRates> = {};
      const now = new Date().toISOString();

      // MAPPING FROM IMAGE DATA
      
      // --- FULL BALCÃO & RANGES ---
      // Range 0: Balcão (Standard)
      fullRates[0] = { debit: 2.06, credit1x: 6.74, installments: [8.10, 10.65, 12.04, 13.44, 14.06, 14.51, 15.78, 17.08, 18.36, 19.65, 20.94, 22.43, 23.94, 25.46, 26.99, 28.53, 30.07], lastUpdated: now, updatedBy: 'Sistema' };
      
      // Range 1: 5-10k
      fullRates[1] = { debit: 2.01, credit1x: 5.08, installments: [6.39, 8.52, 9.80, 11.07, 11.72, 12.22, 13.39, 14.58, 15.77, 16.96, 18.14, 19.51, 20.92, 22.34, 23.79, 25.25, 26.61], lastUpdated: now, updatedBy: 'Sistema' };

      // Range 2: 10-20k
      fullRates[2] = { debit: 1.95, credit1x: 4.38, installments: [5.42, 7.37, 8.83, 10.10, 10.75, 11.25, 13.12, 14.57, 15.63, 16.69, 17.74, 18.84, 19.96, 21.92, 23.08, 24.27, 26.28], lastUpdated: now, updatedBy: 'Sistema' };

      // Range 3: 20-50k
      fullRates[3] = { debit: 1.81, credit1x: 3.73, installments: [4.78, 6.07, 7.29, 8.75, 9.80, 10.85, 12.72, 13.77, 14.83, 16.69, 17.74, 18.84, 19.96, 21.11, 22.27, 24.27, 25.47], lastUpdated: now, updatedBy: 'Sistema' };

      // Range 4: 50-100k
      fullRates[4] = { debit: 1.26, credit1x: 3.17, installments: [4.62, 5.83, 7.05, 8.26, 9.39, 10.85, 12.31, 13.36, 14.83, 15.88, 16.93, 18.43, 19.55, 21.11, 22.27, 23.87, 24.66], lastUpdated: now, updatedBy: 'Sistema' };

      // Range 5: 100-150k
      fullRates[5] = { debit: 1.16, credit1x: 3.09, installments: [4.53, 5.75, 6.97, 8.18, 9.31, 10.77, 12.23, 13.28, 14.75, 15.80, 16.85, 18.35, 19.47, 21.03, 22.19, 23.79, 24.58], lastUpdated: now, updatedBy: 'Sistema' };

      // Range 6: +150k
      fullRates[6] = { debit: 1.06, credit1x: 3.01, installments: [4.45, 5.67, 6.89, 8.10, 9.23, 10.69, 12.15, 13.20, 14.67, 15.72, 16.77, 18.27, 19.39, 20.95, 22.11, 23.70, 24.50], lastUpdated: now, updatedBy: 'Sistema' };


      // --- SIMPLES BALCÃO & RANGES ---
      // Range 0: Balcão
      simplesRates[0] = { debit: 2.00, credit1x: 2.95, credit2x6x: 3.65, credit7x12x: 4.10, credit13x18x: 4.40, lastUpdated: now, updatedBy: 'Sistema' };

      // Range 1: 5-10k
      simplesRates[1] = { debit: 2.00, credit1x: 2.85, credit2x6x: 3.55, credit7x12x: 4.00, credit13x18x: 4.20, lastUpdated: now, updatedBy: 'Sistema' };

      // Range 2: 10-20k
      simplesRates[2] = { debit: 1.81, credit1x: 2.65, credit2x6x: 3.35, credit7x12x: 3.80, credit13x18x: 4.10, lastUpdated: now, updatedBy: 'Sistema' };

      // Range 3: 20-50k
      simplesRates[3] = { debit: 1.61, credit1x: 2.45, credit2x6x: 3.15, credit7x12x: 3.60, credit13x18x: 3.80, lastUpdated: now, updatedBy: 'Sistema' };

      // Range 4: 50-100k
      simplesRates[4] = { debit: 1.26, credit1x: 2.15, credit2x6x: 2.85, credit7x12x: 3.30, credit13x18x: 3.50, lastUpdated: now, updatedBy: 'Sistema' };

      // Range 5: 100-150k
      simplesRates[5] = { debit: 1.16, credit1x: 2.05, credit2x6x: 2.75, credit7x12x: 3.20, credit13x18x: 3.40, lastUpdated: now, updatedBy: 'Sistema' };

      // Range 6: +150k
      simplesRates[6] = { debit: 1.06, credit1x: 1.95, credit2x6x: 2.65, credit7x12x: 3.10, credit13x18x: 3.30, lastUpdated: now, updatedBy: 'Sistema' };

      this.rateRangesConfig = { full: fullRates, simples: simplesRates };
      this.saveToStorage();
  }

  initMockData() {
      this.clients = [...MOCK_CLIENT_BASE];
      this.users = [...MOCK_USERS];
      
      const visit1: Appointment = {
          id: 'VIS-001',
          clientId: '1001',
          clientName: 'Auto Center Porto Real',
          responsible: 'Carlos Eduardo',
          whatsapp: '11988881234',
          address: 'Av. Paulista, 1000 - Bela Vista, São Paulo - SP',
          fieldSalesName: 'Cleiton Freitas',
          insideSalesName: 'Cauana Sousa',
          date: new Date().toISOString().split('T')[0],
          period: 'Manhã',
          status: 'Scheduled',
          leadOrigins: ['Prospecção'],
          isWallet: false,
          inRoute: true
      };

      const visit2: Appointment = {
          id: 'VIS-002',
          clientId: '1003',
          clientName: 'Pneus & Cia Mooca',
          responsible: 'Fernanda Santos',
          whatsapp: '11977774321',
          address: 'Rua da Mooca, 123 - Mooca, São Paulo - SP',
          fieldSalesName: 'Samuel de Paula',
          insideSalesName: 'Marcos Oliveira',
          date: new Date(Date.now() + 86400000).toISOString().split('T')[0], 
          period: 'Tarde',
          status: 'Scheduled',
          leadOrigins: [],
          isWallet: true,
          visitReason: 'Negociação de Taxas'
      };

      this.appointments = [visit1, visit2];

      const demand1: ManualDemand = {
          id: 'DEM-PRICING-01',
          clientName: 'Mecânica do Alemão',
          type: 'Negociação de Taxas',
          date: new Date().toISOString(),
          status: 'Em Análise',
          requester: 'Cleiton Freitas',
          description: 'Cliente solicita redução de taxas para migrar da Stone. Volume TPV 45k.',
          pricingData: {
              competitorRates: { debit: 1.19, credit1x: 3.49, credit12x: 12.99 },
              proposedRates: { debit: 0, credit1x: 0, credit12x: 0 },
              context: { potentialRevenue: 45000, minAgreed: 0 },
              evidenceUrl: 'https://via.placeholder.com/300?text=Evidencia+Stone'
          }
      };
      this.demands = [demand1];

      const logisticsTask1: LogisticsTask = {
          id: 'LOG-TASK-01',
          type: 'FIELD_ACTIVATION',
          status: 'READY_FOR_GSURF',
          clientName: 'Oficina Premium Barra',
          documentNumber: '33.444.555/0001-67',
          address: 'Av. das Américas, 500 - Barra da Tijuca, RJ',
          responsibleName: 'Marcelo Rio',
          contactPhone: '21 96666-8888',
          internalId: 'EC-998877',
          requesterName: 'Jorge Jr',
          requesterRole: 'Field Sales',
          date: new Date().toISOString(),
          details: 'Equipamento já entregue pelo consultor. Realizar ativação GSurf.',
          posData: { serialNumber: 'SN998877', rcNumber: 'RC5544', model: 'P2 Smart' }
      };
      this.logisticsTasks = [logisticsTask1];

      const ticket1: SupportTicket = {
          id: 'TKT-1001',
          clientId: '1001',
          clientName: 'Auto Center Porto Real',
          requesterName: 'Cleiton Freitas',
          requesterRole: 'Field Sales',
          status: 'OPEN',
          priority: 'HIGH',
          category: 'Conectividade',
          messages: [{
              id: 'msg-1',
              sender: 'user',
              text: 'A máquina apresenta erro de conexão GPRS intermitente. Preciso de suporte urgente.',
              timestamp: new Date().toISOString()
          }],
          createdAt: new Date().toISOString()
      };
      this.supportTickets = [ticket1];

      this.posInventory = [
          { serialNumber: 'SN123456', rcNumber: 'RC001', model: 'P2 Smart', status: 'InStock', currentHolder: 'Logística Central', lastUpdated: new Date().toISOString(), history: [] },
          { serialNumber: 'SN654321', rcNumber: 'RC002', model: 'P2 Smart', status: 'WithField', currentHolder: 'Cleiton Freitas', lastUpdated: new Date().toISOString(), history: [] },
          { serialNumber: 'SN998877', rcNumber: 'RC5544', model: 'P2 Smart', status: 'WithField', currentHolder: 'Jorge Jr', lastUpdated: new Date().toISOString(), history: [] }
      ];

      const sampleExpense: Expense = {
          id: 'EXP-DEMO-01',
          date: new Date().toISOString(),
          amount: 150.00,
          category: 'Alimentação',
          establishment: 'Restaurante Exemplo',
          requesterName: 'Cleiton Freitas',
          status: 'PENDING',
          isCorporateCard: true,
          notes: 'Almoço com cliente (Cartão Corp)'
      };
      this.expenses = [sampleExpense];

      this.saveToStorage();
  }
}

export const appStore = new Store();
