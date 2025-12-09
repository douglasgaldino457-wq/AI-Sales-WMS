
import { Appointment, ClientBaseRow, SystemUser, ClientNote, VisitReport, ManualDemand } from '../types';
import { MOCK_CLIENT_BASE, MOCK_USERS } from '../constants';

// Simple in-memory storage to simulate database persistence during the session
class StoreService {
  private appointments: Appointment[] = [];
  private clients: ClientBaseRow[] = [];
  private users: SystemUser[] = [...MOCK_USERS];
  private clientNotes: ClientNote[] = [];
  
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
    this.clients = [...MOCK_CLIENT_BASE].map(c => ({...c, status: 'Active'}));

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
      {
        id: 'AGD-2055',
        leadOrigins: [],
        clientId: '1',
        clientName: 'Centro Automotivo Silva',
        responsible: 'Carlos Silva',
        whatsapp: '11999991111',
        address: 'Av. Santo Amaro, 1000',
        observation: 'Problema com maquininha.',
        fieldSalesName: 'Cleiton Freitas',
        insideSalesName: 'Cauana Sousa',
        status: 'Completed',
        isWallet: true,
        visitReason: 'Problema na Pós',
        fieldObservation: 'Resolvido, troquei o equipamento e testei com o cliente.',
        date: lastMonth.toISOString().split('T')[0],
        visitReport: {
           checkInTime: lastMonth.toISOString(),
           walletAction: 'Troca de POS',
           swapReason: 'Bateria',
           observation: 'Resolvido, troquei o equipamento e testei com o cliente.'
        },
        inRoute: false
      },
      {
        id: 'AGD-3102',
        leadOrigins: ['Indicação'],
        clientId: '101',
        clientName: 'Auto Center Fast',
        responsible: 'Maria Souza',
        whatsapp: '11988887777',
        address: 'Rua da Mooca, 500',
        observation: 'Indicado pela loja vizinha.',
        fieldSalesName: 'Samuel de Paula',
        insideSalesName: 'Marcos Oliveira',
        date: twoMonthsAgo.toISOString().split('T')[0],
        period: 'Tarde',
        status: 'Completed',
        isWallet: false,
        fieldObservation: 'Cliente fechou contrato na hora. Muito receptiva.',
        visitReport: {
           checkInTime: twoMonthsAgo.toISOString(),
           outcome: 'Convertido',
           observation: 'Cliente fechou contrato na hora.'
        },
        inRoute: false
      },
      {
        id: 'AGD-4001',
        leadOrigins: [],
        clientId: '2',
        clientName: 'Pneus Express',
        responsible: 'Marcos Pneus',
        whatsapp: '11988882222',
        address: 'Rua Voluntários, 500',
        observation: 'Precisa de treinamento.',
        fieldSalesName: 'Samuel de Paula',
        insideSalesName: 'Marcos Oliveira',
        status: 'Scheduled',
        date: today.toISOString().split('T')[0],
        isWallet: true,
        visitReason: 'Dificuldade de Onboarding',
        inRoute: true
      },
      {
        id: 'AGD-4005',
        leadOrigins: ['SIR'],
        clientId: '105',
        clientName: 'Oficina do Pedro',
        responsible: 'Pedro',
        whatsapp: '11977776666',
        address: 'Av. Lins de Vasconcelos, 200',
        observation: '',
        fieldSalesName: 'Jorge Jr',
        insideSalesName: 'Jussara Oliveira',
        date: today.toISOString().split('T')[0],
        period: 'Manhã',
        status: 'Scheduled',
        isWallet: false,
        inRoute: true
      }
    ];

    // Mock initial notes
    this.clientNotes = [
      {
        id: 'note-1',
        clientId: '1',
        authorName: 'Cauana Sousa',
        date: '2023-10-25T14:30:00.000Z',
        content: 'Entrei em contato para confirmar o recebimento do novo material.'
      }
    ];
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
    // Return all scheduled appointments in route, or completed ones that haven't been removed yet
    // However, business rule says completed wallet visits should disappear from view,
    // but typically they might stay in route until end of day. 
    // For this specific function, we return what is flagged as inRoute.
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
