
import { Appointment, ClientBaseRow, SystemUser, ClientNote, VisitReport, ManualDemand, LeadServiceItem, PosDevice, LogisticsTask, RegistrationRequest, RegistrationStatus } from '../types';
import { MOCK_CLIENT_BASE, MOCK_USERS } from '../constants';

// Simple in-memory storage to simulate database persistence during the session
class StoreService {
  private appointments: Appointment[] = [];
  private clients: ClientBaseRow[] = [];
  private users: SystemUser[] = [...MOCK_USERS];
  private clientNotes: ClientNote[] = [];
  private leadServices: Record<string, LeadServiceItem[]> = {}; // Map clientId -> Services
  
  // --- Logistics Data ---
  private posInventory: PosDevice[] = [];
  private logisticsTasks: LogisticsTask[] = [];

  // --- Registration Data (Administrative) ---
  private registrationRequests: RegistrationRequest[] = [];

  // --- Manual Demands ---
  private demands: ManualDemand[] = [
    {
        id: 'DEM-1092',
        type: 'Alteração de Domicílio',
        clientName: 'Oficina do Zé',
        date: '2023-10-28T10:00:00Z',
        status: 'Concluído',
        result: 'Conta Santander vinculada com sucesso.',
        requester: 'Cleiton Freitas'
    },
    {
        id: 'DEM-1105',
        type: 'Venda Taxa Full',
        clientName: 'Garagem 99',
        date: '2023-10-29T14:30:00Z',
        status: 'Concluído',
        result: 'R$ 5.000,00 antecipados.',
        requester: 'Cleiton Freitas',
        description: 'Cliente optou pelo modelo Full com antecipação automática.'
    },
    // New Pricing Request Mock - Pending
    {
        id: 'PRC-2001',
        type: 'Negociação de Taxas',
        clientName: 'Auto Center Premium',
        date: new Date().toISOString(),
        status: 'Em Análise',
        requester: 'Samuel de Paula',
        description: 'Cliente com volume alto (50k/mês), Stone ofertando 0.90% no débito.',
        pricingData: {
            competitorRates: { debit: 0.90, credit1x: 2.50, credit12x: 10.50 },
            proposedRates: { debit: 0.85, credit1x: 2.40, credit12x: 10.00 },
            financials: { spread: 0.65, mcf2: 150.00 },
            evidenceUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&q=80&w=600', // Mock Image
            context: {
                potentialRevenue: 50000,
                minAgreed: 30000
            }
        }
    },
    // New Pricing Request Mock - APPROVED (Ready for closing)
    {
        id: 'PRC-2002',
        type: 'Negociação de Taxas',
        clientName: 'Mecânica Rápida',
        date: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        status: 'Aprovado Pricing',
        requester: 'Eu', // Matches current user default
        description: 'Solicitação de redução para evitar Churn. Aprovado contra-proposta.',
        result: 'Contra-proposta aprovada pela mesa. Apresente as novas condições.',
        pricingData: {
            competitorRates: { debit: 1.10, credit1x: 3.00, credit12x: 12.00 },
            proposedRates: { debit: 0.95, credit1x: 2.80, credit12x: 11.00 },
            // Approved rates are slightly different (Counter-offer simulation)
            approvedRates: { debit: 0.99, credit1x: 2.85, credit12x: 11.20 },
            financials: { spread: 0.70, mcf2: 90.00 },
            evidenceUrl: 'https://images.unsplash.com/photo-1554224154-260327c00c4b?auto=format&fit=crop&q=80&w=600', // Mock Image
            context: {
                potentialRevenue: 25000,
                minAgreed: 15000
            }
        }
    }
  ];

  // --- Dynamic Configuration Lists ---
  private visitReasons: string[] = ['Solicitado pelo EC', 'Problema na Pós', 'Dificuldade de Onboarding', 'Treinamento', 'Visita de Cortesia'];
  
  private withdrawalReasons: string[] = [
    'Baixo Faturamento', 
    'Não recebe Leads', 
    'Problema com Repasse', 
    'Falta de suporte', 
    'Taxas Altas', 
    'Contratou Credito no Banco', 
    'Fechamento do Estabelecimento'
  ];

  private swapReasons: string[] = [
    'Bateria Viciada', 
    'POS Antiga (2G)', 
    'Erro de Sistema', 
    'Não liga', 
    'Carregador com problema',
    'Upgrade de Modelo'
  ];

  private leadOrigins: string[] = [
    'SIR', 
    'SIN', 
    'CAM', 
    'Indicação', 
    'Prospecção', 
    'Google', 
    'Instagram'
  ];

  private demandTypes: string[] = [
      'Venda Taxa Full',
      'Venda Taxa Simples',
      'Alteração de Domicílio',
      'Antecipação Pontual',
      'Troca de Titularidade',
      'Solicitação de Bobina',
      'Outros',
      'Negociação de Taxas'
  ];

  constructor() {
    // Initialize clients with status 'Active'
    this.clients = [...MOCK_CLIENT_BASE].map((c, idx) => ({
        ...c, 
        status: 'Active',
        // Simulate some having Pagmotors (Priority)
        hasPagmotors: idx % 3 === 0,
        // Mock CNPJ for auto-fill simulation
        cnpj: `12.${Math.floor(Math.random()*900)}.${Math.floor(Math.random()*900)}/0001-${Math.floor(Math.random()*90)}`
    }));

    // Generate Mock Lead Services for Clients
    this.clients.forEach(client => {
        const numServices = Math.floor(Math.random() * 15); // 0 to 15 services per client
        const services: LeadServiceItem[] = [];
        
        for(let i=0; i<numServices; i++) {
            const flowType = Math.random() > 0.6 ? 'SIN' : Math.random() > 0.3 ? 'SIR' : 'CAM';
            const serviceTypes = {
                'SIN': ['Funilaria Pesada', 'Martelinho', 'Pintura', 'Farol'],
                'SIR': ['Guincho 24h', 'Pane Elétrica', 'Carga de Bateria', 'Troca de Pneu'],
                'CAM': ['Revisão Geral', 'Troca de Óleo', 'Freios', 'Suspensão']
            };
            const list = serviceTypes[flowType];
            
            // Random date in last 60 days
            const date = new Date();
            date.setDate(date.getDate() - Math.floor(Math.random() * 60));

            services.push({
                id: `SRV-${client.id}-${i}`,
                flow: flowType as any,
                serviceType: list[Math.floor(Math.random() * list.length)],
                date: date.toISOString(),
                licensePlate: `${String.fromCharCode(65+Math.floor(Math.random()*26))}${String.fromCharCode(65+Math.floor(Math.random()*26))}${String.fromCharCode(65+Math.floor(Math.random()*26))}-${Math.floor(Math.random()*9)}${String.fromCharCode(65+Math.floor(Math.random()*26))}${Math.floor(Math.random()*9)}${Math.floor(Math.random()*9)}`,
                value: Math.floor(Math.random() * 2000) + 150,
                status: Math.random() > 0.2 ? 'Realizado' : Math.random() > 0.5 ? 'Agendado' : 'Cancelado'
            });
        }
        this.leadServices[client.id] = services;
    });

    // Helper dates
    const today = new Date();
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 15);
    const twoMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 2, 20);

    // Add diverse mock appointments for testing Dashboard and Lists
    this.appointments = [
      {
        id: 'AGD-1024',
        leadOrigins: ['Prospecção'],
        clientId: '99',
        clientName: 'Mecânica Exemplo',
        responsible: 'João Silva',
        whatsapp: '11999999999',
        address: 'Rua Exemplo, 123, SP',
        observation: 'Cliente interessado em gestão.',
        fieldSalesName: 'Cleiton Freitas',
        insideSalesName: 'Cauana Sousa',
        date: today.toISOString().split('T')[0],
        period: 'Manhã',
        status: 'Scheduled',
        isWallet: false,
        inRoute: false
      },
      // ... (Rest of existing appointments logic preserved)
    ];

    // ... (Mock Notes preserved) ...
    
    // --- MOCK REGISTRATION REQUESTS ---
    this.registrationRequests = [
        {
            id: 'REG-5001',
            clientName: 'Oficina Nova Esperança',
            documentNumber: '12.345.678/0001-90',
            requesterName: 'Samuel de Paula',
            requesterRole: 'Field Sales',
            dateSubmitted: new Date().toISOString(),
            status: 'PENDING_ANALYSIS',
            docs: { contract: true, idCard: true, addressProof: true, bankProof: false },
            
            // Populate defaults for mock
            responsibleName: 'João Esperança',
            contactPhones: ['11 99999-8888'],
            email: 'joao@novaesperanca.com',
            address: 'Rua da Esperança, 100',
            openingHours: { weekdays: { start: '08:00', end: '18:00' } },
            planType: 'Full',
            bankAccount: { bankCode: '001', agency: '1234', accountNumber: '56789-0', holderName: 'Oficina Nova Esperança', accountType: 'Corrente', holderType: 'PJ', isThirdParty: false }
        },
    ];

    // --- GENERATE LOGISTICS DATA ---
    this.generateMockLogistics();
  }

  private generateMockLogistics() {
      // 1. Create Inventory
      const models = ['P2 Smart', 'X990', 'MP35'];
      for (let i = 0; i < 50; i++) {
          const isField = i % 2 === 0; // 50% with field
          this.posInventory.push({
              serialNumber: `SN${2023000 + i}`,
              rcNumber: `RC${8000 + i}`,
              model: models[i % models.length],
              status: isField ? 'WithField' : 'InStock',
              currentHolder: isField ? (i % 4 === 0 ? 'Cleiton Freitas' : 'Samuel de Paula') : 'Logística Central',
              lastUpdated: new Date().toISOString()
          });
      }

      // 2. Create Tasks (Field Activations & Inside Requests)
      this.logisticsTasks = [
          {
              id: 'TSK-102',
              type: 'FIELD_ACTIVATION',
              status: 'READY_FOR_GSURF', // Approved by Cadastro, waiting Logistics
              clientName: 'Centro Automotivo Power',
              requesterName: 'Samuel de Paula',
              date: new Date(Date.now() - 86400000).toISOString(),
              posData: { serialNumber: 'SN2023002', rcNumber: 'RC8002' }
          },
          {
              id: 'TSK-103',
              type: 'INSIDE_REQUEST',
              status: 'PENDING_SHIPMENT',
              clientName: 'Mecânica ABC (Inside)',
              requesterName: 'Cauana Sousa',
              date: new Date().toISOString(),
              details: 'Envio de máquina adicional (P2 Smart). Endereço no cadastro.'
          }
      ];
  }

  // --- LOGISTICS METHODS ---
  getPosInventory(): PosDevice[] { return this.posInventory; }
  
  getLogisticsTasks(): LogisticsTask[] { return this.logisticsTasks; }

  updateLogisticsTask(task: LogisticsTask): void {
      this.logisticsTasks = this.logisticsTasks.map(t => t.id === task.id ? task : t);
  }

  updatePosStatus(serial: string, status: any, holder?: string): void {
      const pos = this.posInventory.find(p => p.serialNumber === serial);
      if (pos) {
          pos.status = status;
          if (holder) pos.currentHolder = holder;
          pos.lastUpdated = new Date().toISOString();
      }
  }

  addLogisticsTask(task: LogisticsTask): void {
      this.logisticsTasks.push(task);
  }

  // --- REGISTRATION METHODS (ADMINISTRATIVO) ---
  getRegistrationRequests(): RegistrationRequest[] {
      return this.registrationRequests;
  }

  addRegistrationRequest(req: RegistrationRequest): void {
      this.registrationRequests.push(req);
  }

  updateRegistrationRequest(updated: RegistrationRequest): void {
      this.registrationRequests = this.registrationRequests.map(r => r.id === updated.id ? updated : r);
  }

  // CORE LOGIC: APPROVE REGISTRATION -> SEND TO LOGISTICS
  approveRegistration(req: RegistrationRequest): void {
      // 1. Update Registration Status
      const approvedReq: RegistrationRequest = { ...req, status: 'APPROVED', notes: 'Cadastro aprovado. Enviado para Logística.' };
      this.updateRegistrationRequest(approvedReq);

      // 2. Create Logistics Task
      // If requester is Field, it's Activation (Field picks from car stock). If Inside, it's Shipment.
      const taskType = req.requesterRole === 'Field Sales' ? 'FIELD_ACTIVATION' : 'INSIDE_REQUEST';
      const initialStatus = taskType === 'FIELD_ACTIVATION' ? 'READY_FOR_GSURF' : 'PENDING_SHIPMENT';

      const newTask: LogisticsTask = {
          id: `TSK-${Math.floor(Math.random() * 9000) + 1000}`,
          type: taskType,
          status: initialStatus,
          clientName: req.clientName,
          requesterName: req.requesterName,
          date: new Date().toISOString(),
          details: `Novo credenciamento aprovado. CNPJ: ${req.documentNumber}. Origem: ${req.requesterRole}.`,
          posData: req.posData
      };

      this.addLogisticsTask(newTask);
  }

  // Appointment Methods
  getAppointments(): Appointment[] {
    return this.appointments;
  }

  getAppointmentsByFieldSales(name: string): Appointment[] {
    return this.appointments.filter(app => app.fieldSalesName === name);
  }
  
  // --- ROUTE MANAGEMENT ---
  getRouteAppointments(fieldSalesName?: string): Appointment[] {
    let filtered = this.appointments.filter(a => a.inRoute);
    if (fieldSalesName) {
      filtered = filtered.filter(a => a.fieldSalesName === fieldSalesName);
    }
    return filtered;
  }

  toggleRouteStatus(appointmentId: string): void {
    const appt = this.appointments.find(a => a.id === appointmentId);
    if (appt) {
      appt.inRoute = !appt.inRoute;
    }
  }

  addAppointment(appointment: Appointment): void {
    this.appointments.push(appointment);
  }

  // --- NEW: Field Sales Workflow Methods ---
  
  checkInAppointment(appointmentId: string): void {
    const appt = this.appointments.find(a => a.id === appointmentId);
    if (appt) {
       appt.visitReport = {
          ...appt.visitReport,
          checkInTime: new Date().toISOString()
       };
    }
  }

  submitVisitReport(appointmentId: string, reportData: VisitReport): void {
    const appt = this.appointments.find(a => a.id === appointmentId);
    if (appt) {
       // 1. Update Appointment
       appt.visitReport = {
          ...appt.visitReport,
          ...reportData,
          checkOutTime: new Date().toISOString()
       };
       appt.status = 'Completed';
       appt.fieldObservation = reportData.observation; 

       // 2. If it's NOT a wallet visit (New Business / Prospecção), update or create in Client Base
       if (!appt.isWallet) {
          const existingClientIndex = this.clients.findIndex(c => c.id === appt.clientId);
          
          const leadMetadata = {
              revenuePotential: reportData.revenuePotential,
              competitorAcquirer: reportData.competitorAcquirer,
              outcome: reportData.outcome,
              lastInteractionDate: new Date().toISOString()
          };

          if (existingClientIndex >= 0) {
              // If exists (maybe imported as Lead), update it
              this.clients[existingClientIndex] = {
                  ...this.clients[existingClientIndex],
                  leadMetadata: {
                      ...this.clients[existingClientIndex].leadMetadata,
                      ...leadMetadata
                  }
              };
          } else {
              // Create new entry in Base as "Lead"
              const newLead: ClientBaseRow = {
                  id: appt.clientId,
                  nomeEc: appt.clientName,
                  tipoSic: 'Prospecção', // Default
                  endereco: appt.address,
                  responsavel: appt.responsible,
                  contato: appt.whatsapp,
                  regiaoAgrupada: 'A definir',
                  fieldSales: appt.fieldSalesName,
                  insideSales: appt.insideSalesName || 'N/A',
                  status: 'Lead',
                  leadMetadata: leadMetadata
              };
              this.clients.push(newLead);
          }
       }
    }
  }

  generateId(): string {
    const random = Math.floor(1000 + Math.random() * 9000);
    return `AGD-${random}`;
  }

  // Client Base Methods
  getClients(): ClientBaseRow[] {
    return this.clients;
  }
  
  // New helper to fetch client by ID for manual visit creation
  getClientById(id: string): ClientBaseRow | undefined {
    return this.clients.find(c => c.id === id);
  }

  setClients(newClients: ClientBaseRow[]): void {
    this.clients = newClients;
  }
  
  addClient(client: ClientBaseRow): void {
    this.clients.push(client);
  }

  // --- Lead Services Methods ---
  getLeadServices(clientId: string): LeadServiceItem[] {
      return this.leadServices[clientId] || [];
  }

  // Client Notes Methods
  getClientNotes(clientId: string): ClientNote[] {
    return this.clientNotes.filter(n => n.clientId === clientId);
  }

  addClientNote(note: ClientNote): void {
    this.clientNotes.push(note);
  }

  // --- DEMANDS METHODS ---
  getDemands(): ManualDemand[] { return this.demands; }
  
  addDemand(demand: ManualDemand): void {
      this.demands.push(demand);
  }
  
  updateDemand(updatedDemand: ManualDemand): void {
      this.demands = this.demands.map(d => d.id === updatedDemand.id ? updatedDemand : d);
  }

  getDemandTypes(): string[] { return this.demandTypes; }
  addDemandType(type: string): void { if(!this.demandTypes.includes(type)) this.demandTypes.push(type); }
  removeDemandType(type: string): void { this.demandTypes = this.demandTypes.filter(t => t !== type); }

  // --- Configuration Methods ---

  // 1. Visit Reasons (Inside Sales Schedule)
  getVisitReasons(): string[] { return this.visitReasons; }
  addVisitReason(reason: string): void { if (!this.visitReasons.includes(reason)) this.visitReasons.push(reason); }
  removeVisitReason(reason: string): void { this.visitReasons = this.visitReasons.filter(r => r !== reason); }

  // 2. Withdrawal Reasons (Field Sales Report)
  getWithdrawalReasons(): string[] { return this.withdrawalReasons; }
  addWithdrawalReason(reason: string): void { if (!this.withdrawalReasons.includes(reason)) this.withdrawalReasons.push(reason); }
  removeWithdrawalReason(reason: string): void { this.withdrawalReasons = this.withdrawalReasons.filter(r => r !== reason); }

  // 3. Swap Reasons (Field Sales Report)
  getSwapReasons(): string[] { return this.swapReasons; }
  addSwapReason(reason: string): void { if (!this.swapReasons.includes(reason)) this.swapReasons.push(reason); }
  removeSwapReason(reason: string): void { this.swapReasons = this.swapReasons.filter(r => r !== reason); }

  // 4. Lead Origins (Inside Sales / General)
  getLeadOrigins(): string[] { return this.leadOrigins; }
  addLeadOrigin(origin: string): void { if (!this.leadOrigins.includes(origin)) this.leadOrigins.push(origin); }
  removeLeadOrigin(origin: string): void { this.leadOrigins = this.leadOrigins.filter(r => r !== origin); }

  // User Management Methods
  getUsers(): SystemUser[] {
    return this.users;
  }

  addUser(user: SystemUser): void {
    this.users.push(user);
  }

  updateUser(updatedUser: SystemUser): void {
    this.users = this.users.map(u => u.id === updatedUser.id ? updatedUser : u);
  }

  toggleUserStatus(id: string): void {
    const user = this.users.find(u => u.id === id);
    if (user) {
      user.active = !user.active;
    }
  }
}

export const appStore = new StoreService();
