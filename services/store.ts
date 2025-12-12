import { 
  Appointment, 
  ClientBaseRow, 
  SystemUser, 
  UserRole, 
  ManualDemand, 
  RegistrationRequest, 
  LogisticsTask, 
  PosDevice, 
  SupportTicket, 
  KnowledgeBaseItem,
  ClientNote,
  LogisticsTaskType,
  LogisticsTaskStatus,
  VisitReport
} from '../types';
import { MOCK_CLIENT_BASE, MOCK_VISITS, MOCK_USERS } from '../constants';

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

  // Config lists
  private visitReasons: string[] = ['Apresentação', 'Negociação', 'Treinamento', 'Retirada', 'Instalação', 'Visita de Cortesia'];
  private leadOrigins: string[] = ['Indicação', 'Prospecção', 'Google Ads', 'Instagram', 'Feira/Evento'];
  private withdrawalReasons: string[] = ['Baixo Faturamento', 'Fechamento do Estabelecimento', 'Troca de Adquirente', 'Insatisfação com Taxas'];
  private swapReasons: string[] = ['Defeito Técnico', 'Upgrade de Modelo', 'Conectividade', 'Bateria'];
  private demandTypes: string[] = ['Alteração Cadastral', 'Antecipação', 'Isenção de Aluguel', 'Material de Merchandising', 'Negociação de Taxas', 'Outros'];

  constructor() {
    // Initialize with Mocks
    this.appointments = [...MOCK_VISITS.map(v => ({
       id: v.id,
       clientId: '1', // Mock mapping
       clientName: v.clientName,
       responsible: 'Responsável Mock',
       whatsapp: '11999999999',
       address: v.address,
       fieldSalesName: 'Cleiton Freitas',
       date: v.date.split(' ')[0],
       status: v.status,
       leadOrigins: ['Prospecção'] as any,
       isWallet: false
    }))];
    
    this.clients = [...MOCK_CLIENT_BASE];
    this.users = [...MOCK_USERS];
    
    // Mock Inventory
    this.posInventory = [
        { serialNumber: 'SN123456', rcNumber: 'RC001', model: 'P2 Smart', status: 'InStock', currentHolder: 'Logística Central', lastUpdated: new Date().toISOString() },
        { serialNumber: 'SN654321', rcNumber: 'RC002', model: 'P2 Smart', status: 'WithField', currentHolder: 'Cleiton Freitas', lastUpdated: new Date().toISOString() },
        { serialNumber: 'SN789012', rcNumber: 'RC003', model: 'X990', status: 'Active', currentHolder: 'Oficina do Zé', lastUpdated: new Date().toISOString() },
    ];

    // Mock KB
    this.kbItems = [
        { id: '1', errorPattern: 'Erro 05', solution: 'Cartão não autorizado. Pedir para cliente contatar o banco.', keywords: ['05', 'não autorizada'] },
        { id: '2', errorPattern: 'Sem sinal', solution: 'Reiniciar a máquina e verificar chip de dados.', keywords: ['sinal', 'conexão'] }
    ];
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

  // --- ACTIONS ---
  
  // Appointments
  addAppointment(appt: Appointment) {
      this.appointments.push(appt);
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
      }
  }

  submitVisitReport(id: string, report: VisitReport) {
      const appt = this.appointments.find(a => a.id === id);
      if (appt) {
          appt.status = 'Completed';
          appt.visitReport = { ...appt.visitReport, ...report, checkOutTime: new Date().toISOString() };
      }
  }

  toggleRouteStatus(id: string) {
      const appt = this.appointments.find(a => a.id === id);
      if (appt) appt.inRoute = !appt.inRoute;
  }

  // Clients
  setClients(clients: ClientBaseRow[]) {
      this.clients = clients;
  }

  addClientNote(note: ClientNote) {
      this.clientNotes.push(note);
  }

  getClientNotes(clientId: string) {
      return this.clientNotes.filter(n => n.clientId === clientId);
  }

  getLeadServices(clientId: string) {
      // Mock data generator for graph
      return [
          { id: '1', flow: 'SIN', serviceType: 'Reparo Colisão', date: '2023-10-01', licensePlate: 'ABC-1234', value: 2500, status: 'Realizado' },
          { id: '2', flow: 'CAM', serviceType: 'Revisão', date: '2023-10-05', licensePlate: 'XYZ-9876', value: 450, status: 'Realizado' },
          { id: '3', flow: 'SIR', serviceType: 'Guincho', date: '2023-10-10', licensePlate: 'DEF-5678', value: 300, status: 'Realizado' },
      ] as any[];
  }

  // Users
  addUser(user: SystemUser) { this.users.push(user); }
  updateUser(user: SystemUser) { 
      const idx = this.users.findIndex(u => u.id === user.id);
      if (idx !== -1) this.users[idx] = user;
  }
  toggleUserStatus(id: string) {
      const user = this.users.find(u => u.id === id);
      if (user) user.active = !user.active;
  }

  // Demands & Pricing
  addDemand(demand: ManualDemand) { this.demands.push(demand); }
  updateDemand(demand: ManualDemand) {
      const idx = this.demands.findIndex(d => d.id === demand.id);
      if (idx !== -1) this.demands[idx] = demand;
  }

  // Registration
  addRegistrationRequest(req: RegistrationRequest) { this.registrationRequests.push(req); }
  updateRegistrationRequest(req: RegistrationRequest) {
      const idx = this.registrationRequests.findIndex(r => r.id === req.id);
      if (idx !== -1) this.registrationRequests[idx] = req;
  }

  approveRegistration(req: RegistrationRequest): void {
      // 1. Update Registration Status
      const approvedReq: RegistrationRequest = { ...req, status: 'APPROVED', notes: 'Cadastro aprovado. Enviado para Logística (Gsurf).' };
      this.updateRegistrationRequest(approvedReq);

      // 2. Create Logistics Task
      const taskType: LogisticsTaskType = 'FIELD_ACTIVATION';
      const initialStatus: LogisticsTaskStatus = 'READY_FOR_GSURF';

      const newTask: LogisticsTask = {
          id: `TSK-${Math.floor(Math.random() * 9000) + 1000}`,
          type: taskType,
          status: initialStatus,
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
          details: `Novo credenciamento aprovado. Plano: ${req.planType}.`,
          posData: req.posData
      };

      this.addLogisticsTask(newTask);
  }

  // Logistics
  addLogisticsTask(task: LogisticsTask) { this.logisticsTasks.push(task); }
  updateLogisticsTask(task: LogisticsTask) {
      const idx = this.logisticsTasks.findIndex(t => t.id === task.id);
      if (idx !== -1) this.logisticsTasks[idx] = task;
  }

  initMockExchange() {
      const exchangeTask: LogisticsTask = {
          id: 'TROCA-8899',
          type: 'POS_EXCHANGE',
          status: 'READY_FOR_GSURF',
          clientName: 'Mecânica Rápida',
          legalName: 'Mecânica Rápida Ltda',
          internalId: '1003',
          documentNumber: '11.222.333/0001-99',
          address: 'Rua Augusta, 500, São Paulo - SP',
          responsibleName: 'Carlos Souza',
          contactPhone: '11 98888-7777',
          email: 'contato@mecanicarapida.com.br',
          requesterName: 'Cleiton Freitas',
          requesterRole: 'Field Sales',
          date: new Date().toISOString(),
          details: 'POS com defeito no leitor. Necessário troca urgente.',
          posData: { serialNumber: 'SN-ANTIGO', rcNumber: 'RC-001', model: 'P2 Smart' }
      };
      if (!this.logisticsTasks.find(t => t.id === exchangeTask.id)) {
          this.logisticsTasks.push(exchangeTask);
      }
  }

  // Support & KB
  addSupportTicket(ticket: SupportTicket) { this.supportTickets.push(ticket); }
  addKbItem(item: KnowledgeBaseItem) { this.kbItems.push(item); }

  // Helpers
  generateId() { return Math.random().toString(36).substr(2, 9).toUpperCase(); }

  // Config Methods
  addVisitReason(val: string) { if (!this.visitReasons.includes(val)) this.visitReasons.push(val); }
  removeVisitReason(val: string) { this.visitReasons = this.visitReasons.filter(i => i !== val); }
  
  addLeadOrigin(val: string) { if (!this.leadOrigins.includes(val)) this.leadOrigins.push(val); }
  removeLeadOrigin(val: string) { this.leadOrigins = this.leadOrigins.filter(i => i !== val); }

  addWithdrawalReason(val: string) { if (!this.withdrawalReasons.includes(val)) this.withdrawalReasons.push(val); }
  removeWithdrawalReason(val: string) { this.withdrawalReasons = this.withdrawalReasons.filter(i => i !== val); }

  addSwapReason(val: string) { if (!this.swapReasons.includes(val)) this.swapReasons.push(val); }
  removeSwapReason(val: string) { this.swapReasons = this.swapReasons.filter(i => i !== val); }
}

export const appStore = new Store();
appStore.initMockExchange();
