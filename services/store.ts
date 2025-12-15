
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
  FinanceConfig,
  UserRole
} from '../types';
import { MOCK_CLIENT_BASE, MOCK_USERS } from '../constants';

const DB_NAME = 'Car10_DB';
const DB_VERSION = 1;
const STORE_NAME = 'app_state';
const DATA_KEY = 'root_store';
const INTERNAL_CACHE_KEY = 'car10_db_v9_full_fix'; // Version bump to force refresh

// --- INDEXED DB ADAPTER ---
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
        costConfig: this.costConfig,
        rateRangesConfig: this.rateRangesConfig,
        notifications: this.notifications,
        expenses: this.expenses,
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
  getCostConfig() { return this.costConfig; }
  getRateRangesConfig() { return this.rateRangesConfig; }
  getFinanceConfig() { return this.financeConfig; }
  getLastSynced() { return this.lastSynced; }

  // --- CORE ACTIONS ---

  // 1. ADD DEMAND (Created by Sales)
  addDemand(demand: ManualDemand) { 
      this.demands.push(demand);
      
      if (['Troca de POS', 'Desativação de POS', 'Adição de POS'].includes(demand.type)) {
          let taskType: any = 'POS_EXCHANGE';
          if (demand.type === 'Desativação de POS') taskType = 'POS_RETRIEVAL';
          if (demand.type === 'Adição de POS') taskType = 'FIELD_ACTIVATION';

          const newTask: LogisticsTask = {
              id: `TASK-${Math.floor(Math.random() * 90000) + 10000}`,
              type: taskType,
              status: 'READY_FOR_GSURF', 
              clientName: demand.clientName,
              internalId: demand.id,
              details: demand.description || demand.type,
              requesterName: demand.requester,
              requesterRole: 'Field Sales',
              date: new Date().toISOString(),
              address: 'Verificar Cadastro',
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
                  message: `As condições para ${demand.clientName} foram aprovadas.`,
                  targetId: demand.id
              });
          }
          this.demands[idx] = demand;
          this.saveToStorage();
      }
  }

  // 2. REGISTRATION (Created by Sales -> Approved by Backoffice)
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

  // 3. BACKOFFICE APPROVAL -> TRIGGERS LOGISTICS
  approveRegistration(req: RegistrationRequest): void {
      const approvedReq: RegistrationRequest = { 
          ...req, 
          status: 'APPROVED', 
          notes: (req.notes || '') + ' \n[Backoffice] Validado. ID Gerado. Enviado para GSurf.' 
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
          detailsText += `Equipamento já com consultor (Estoque).`;
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
      this.logHistory(req.id, 'BACKOFFICE', 'Cadastro Aprovado e ID Gerado. Enviado para fila GSurf/Logística.');
  }

  // 4. LOGISTICS ACTION (GSurf/OTP) -> NOTIFIES SALES
  completeGsurfActivation(taskId: string, otp: string, posData: {serial: string, rc: string}) {
      const task = this.logisticsTasks.find(t => t.id === taskId);
      if (!task) return;

      task.status = 'COMPLETED';
      task.otp = otp;
      task.posData = { serialNumber: posData.serial, rcNumber: posData.rc, model: 'P2 Smart' };
      this.updateLogisticsTask(task);

      // 1. Activate NEW Device
      this.updateInventoryStatus(posData.serial, 'Active', task.clientName);

      // 2. Handle EXCHANGE logic (Old device movement)
      if (task.type === 'POS_EXCHANGE') {
          // Find the device currently active at this client (that isn't the new one)
          const oldDevice = this.posInventory.find(p =>
              p.currentHolder === task.clientName &&
              p.status === 'Active' &&
              p.serialNumber !== posData.serial
          );

          if (oldDevice) {
              // Move old device to Consultant (Requester) with status 'WithField'
              // This simulates: Client -> Consultant (until returned to Logistics)
              this.updateInventoryStatus(oldDevice.serialNumber, 'WithField', task.requesterName);
              
              // Add specific history log for the swap manually if needed, 
              // but updateInventoryStatus handles general logging.
              // We can enhance the log description inside updateInventoryStatus by checking params, 
              // but for now, generic update is sufficient for tracking.
          }
      }

      if (task.type === 'FIELD_ACTIVATION' || task.type === 'POS_SHIPMENT') {
          const reg = this.registrationRequests.find(r => 
              (task.internalId && r.finalClientId === task.internalId) || 
              r.clientName === task.clientName
          );
          
          if (reg) {
              this.logHistory(reg.id, 'LOGISTICA', `Ativação GSurf Realizada.\nOTP: ${otp}\nS/N: ${posData.serial}`);
              
              const notificationDemand: ManualDemand = {
                  id: `NOTIF-${task.id}`,
                  clientName: reg.clientName,
                  type: 'Cadastro/Ativação',
                  date: new Date().toISOString(),
                  status: 'Concluído',
                  adminStatus: 'Finalizado ADM',
                  requester: reg.requesterName, 
                  description: `Cadastro finalizado. Use o OTP para ativar a máquina no cliente.`,
                  otp: otp,
                  result: `POS Vinculada: ${posData.serial} (RC ${posData.rc}). OTP: ${otp}`
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
              demand.result = `Logística: GSurf atualizado. OTP: ${otp}. Troca realizada.`;
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

  // --- INVENTORY MANAGEMENT ACTIONS ---
  
  addPosDevice(device: PosDevice) {
      // Check duplicate
      const exists = this.posInventory.some(p => p.serialNumber === device.serialNumber);
      if (exists) return; // Prevent duplicate

      // Initialize history if empty
      if (!device.history) {
          device.history = [{
              date: new Date().toISOString(),
              status: device.status,
              holder: device.currentHolder,
              description: 'Cadastro inicial no estoque.'
          }];
      }
      
      this.posInventory.push(device);
      this.saveToStorage();
  }

  removePosDevice(serialNumber: string) {
      this.posInventory = this.posInventory.filter(p => p.serialNumber !== serialNumber);
      this.saveToStorage();
  }

  updateInventoryStatus(serial: string, newStatus: string, holder: string) {
      const idx = this.posInventory.findIndex(p => p.serialNumber === serial);
      if (idx !== -1) {
          const item = this.posInventory[idx];
          item.status = newStatus as any;
          item.currentHolder = holder;
          item.lastUpdated = new Date().toISOString();
          if (!item.history) item.history = [];
          item.history.push({
              date: new Date().toISOString(),
              status: newStatus,
              holder: holder,
              description: 'Atualização via Logística/GSurf'
          });
          this.posInventory[idx] = item;
          this.saveToStorage();
      }
  }

  // --- GENERAL HELPERS ---
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

  concludeDemand(id: string, finalResult: string, executorName: string) {
      const demand = this.demands.find(d => d.id === id);
      if (!demand) return;
      demand.status = 'Concluído';
      demand.result = finalResult;
      demand.adminStatus = 'Finalizado ADM';
      this.updateDemand(demand);
      this.logHistory(demand.id, 'BACKOFFICE', `Processo Finalizado por ${executorName}. ${finalResult}`);
  }

  // --- ACTIONS (Other) ---
  setMyVehicle(vehicle: Vehicle) { this.myVehicle = vehicle; this.saveToStorage(); }
  addTripLog(log: TripLog) { this.tripLogs.push(log); this.saveToStorage(); }
  updateTripLog(log: TripLog) { const idx = this.tripLogs.findIndex(t => t.id === log.id); if (idx !== -1) { this.tripLogs[idx] = log; this.saveToStorage(); }}
  addExpense(expense: Expense) { this.expenses.push(expense); this.saveToStorage(); }
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

  // --- MOCK INITIALIZATION ---
  initRateRangesMock() {
      const fullRates: Record<number, FullRangeRates> = {};
      const simplesRates: Record<number, SimplesRangeRates> = {};
      const now = new Date().toISOString();
      fullRates[0] = { debit: 2.06, credit1x: 6.74, installments: [8.10, 10.65, 12.04, 13.44, 14.06, 14.51, 15.78, 17.08, 18.36, 19.65, 20.94, 22.43, 23.94, 25.46, 26.99, 28.53, 30.07], lastUpdated: now, updatedBy: 'Sistema' };
      simplesRates[0] = { debit: 2.00, credit1x: 2.95, credit2x6x: 3.65, credit7x12x: 4.10, credit13x18x: 4.40, lastUpdated: now, updatedBy: 'Sistema' };
      this.rateRangesConfig = { full: fullRates, simples: simplesRates };
      this.saveToStorage();
  }

  initMockData() {
      this.clients = [...MOCK_CLIENT_BASE];
      this.users = [...MOCK_USERS];
      // Sample Inventory
      this.posInventory = [
          { serialNumber: 'SN123456', rcNumber: 'RC001', model: 'P2 Smart', status: 'InStock', currentHolder: 'Logística Central', lastUpdated: new Date().toISOString(), history: [] },
          { serialNumber: 'SN654321', rcNumber: 'RC002', model: 'P2 Smart', status: 'WithField', currentHolder: 'Cleiton Freitas', lastUpdated: new Date().toISOString(), history: [] },
          { serialNumber: 'SN998877', rcNumber: 'RC5544', model: 'MP35', status: 'Defective', currentHolder: 'Logística Central', lastUpdated: new Date().toISOString(), history: [] }
      ];
      
      // MOCK LOGISTICS TASKS
      if (this.logisticsTasks.length === 0) {
          this.logisticsTasks = [
              {
                  id: 'TASK-MOCK-1',
                  type: 'FIELD_ACTIVATION',
                  status: 'READY_FOR_GSURF',
                  clientName: 'Auto Center Paulista',
                  internalId: 'EC998877',
                  documentNumber: '12.345.678/0001-90',
                  address: 'Av. Paulista, 1000 - Bela Vista, SP',
                  responsibleName: 'Carlos Eduardo',
                  contactPhone: '(11) 98888-1234',
                  requesterName: 'Cleiton Freitas',
                  requesterRole: 'Field Sales',
                  date: new Date().toISOString(),
                  details: 'Novo cadastro aprovado. Realizar ativação.',
                  posData: { serialNumber: 'SN123456', rcNumber: 'RC001', model: 'P2 Smart' }
              },
              {
                  id: 'TASK-MOCK-2',
                  type: 'POS_EXCHANGE',
                  status: 'READY_FOR_GSURF',
                  clientName: 'Mecânica do Alemão',
                  internalId: 'EC112233',
                  documentNumber: '98.765.432/0001-10',
                  address: 'Rua Augusta, 1500 - Consolação, SP',
                  responsibleName: 'Roberto Alemão',
                  contactPhone: '(11) 99999-5678',
                  requesterName: 'Cleiton Freitas',
                  requesterRole: 'Field Sales',
                  date: new Date(Date.now() - 86400000).toISOString(),
                  details: 'Troca por defeito na bateria.',
                  posData: { serialNumber: 'SN654321', rcNumber: 'RC002', model: 'P2 Smart' }
              }
          ];
      }

      // MOCK SUPPORT TICKETS
      if (this.supportTickets.length === 0) {
          this.supportTickets = [
              {
                  id: 'TKT-1001',
                  clientId: '1003',
                  clientName: 'Pneus & Cia Mooca',
                  requesterName: 'Samuel de Paula',
                  requesterRole: 'Field Sales',
                  status: 'OPEN',
                  priority: 'HIGH',
                  category: 'Defeito Técnico',
                  createdAt: new Date().toISOString(),
                  messages: [
                      { id: '1', sender: 'user', text: 'Máquina não conecta no 4G, apenas Wi-Fi.', timestamp: new Date().toISOString() }
                  ]
              }
          ];
      }

      // MOCK KB ITEMS
      if (this.kbItems.length === 0) {
          this.kbItems = [
              { id: '1', errorPattern: 'Erro 05', solution: 'Transação não autorizada pelo emissor. Pedir para cliente ligar no banco.', keywords: ['05', 'não autorizada'] },
              { id: '2', errorPattern: 'Sem sinal', solution: 'Reiniciar POS. Se persistir, testar chip em outro slot.', keywords: ['sinal', 'conexão', 'chip'] }
          ];
      }

      // MOCK DEMANDS FOR ADMIN
      if (this.demands.length === 0) {
          this.demands = [
              {
                  id: 'DEM-MOCK-1',
                  clientName: 'Oficina Premium Barra',
                  type: 'Alteração Bancária',
                  date: new Date(Date.now() - 100000000).toISOString(),
                  status: 'Pendente',
                  requester: 'Jorge Jr',
                  description: 'Alteração de domicílio bancário para Itaú.'
              }
          ];
      }

      this.saveToStorage();
  }
}

export const appStore = new Store();
