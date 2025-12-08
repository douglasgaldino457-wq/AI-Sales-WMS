
import { Appointment, ClientBaseRow, SystemUser, ClientNote, VisitReport, ManualDemand, SavedQuote } from '../types';
import { MOCK_CLIENT_BASE, MOCK_USERS } from '../constants';

// Simple in-memory storage to simulate database persistence during the session
class StoreService {
  private appointments: Appointment[] = [];
  private clients: ClientBaseRow[] = [];
  private users: SystemUser[] = [...MOCK_USERS];
  private clientNotes: ClientNote[] = [];
  
  // Storage for temporary quotes/simulations to link Pricing -> Field Report
  private latestQuotes: Map<string, SavedQuote> = new Map();

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
      'Outros'
  ];

  constructor() {
    // Initialize clients with status 'Active'
    this.clients = [...MOCK_CLIENT_BASE].map(c => ({...c, status: 'Active'}));

    // Helper dates
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

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
        date: todayStr, // Force today for demo
        period: 'Manhã',
        status: 'Scheduled',
        isWallet: false,
        inRoute: true
      },
      {
        id: 'AGD-2055',
        leadOrigins: [],
        clientId: '1',
        clientName: 'Centro Automotivo Silva',
        responsible: 'Carlos Silva',
        whatsapp: '11999999998',
        address: 'Av Paulista, 1000, SP',
        observation: 'Visita de rotina.',
        fieldSalesName: 'Cleiton Freitas',
        insideSalesName: 'Cauana Sousa',
        date: todayStr, // Force today for demo
        period: 'Tarde',
        status: 'Scheduled',
        isWallet: true,
        visitReason: 'Suporte pós-venda',
        inRoute: true
      },
      {
        id: 'AGD-3012',
        leadOrigins: ['Indicação'],
        clientId: '1002',
        clientName: 'Oficina Top Gear',
        responsible: 'Mariana',
        whatsapp: '11988887777',
        address: 'Rua Augusta, 1500, SP',
        observation: '',
        fieldSalesName: 'Cleiton Freitas',
        insideSalesName: 'Cauana Sousa',
        date: todayStr,
        period: 'Manhã',
        status: 'Completed',
        isWallet: false,
        inRoute: true,
        visitReport: {
            checkInTime: new Date(today.setHours(9, 30)).toISOString(),
            checkOutTime: new Date(today.setHours(10, 15)).toISOString(),
            outcome: 'Em negociação'
        }
      }
    ];
  }

  // --- Appointments ---
  getAppointments(): Appointment[] {
    return this.appointments;
  }

  // Updated to filter by specific date for the Planner/Route feature
  getRouteAppointments(username: string, date?: string): Appointment[] {
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    // Filter appointments for the specific user and date
    return this.appointments.filter(a => 
        a.fieldSalesName === username && 
        a.date === targetDate && 
        a.status !== 'Cancelled' // Don't show cancelled
    );
  }

  getAppointmentsByFieldSales(name: string): Appointment[] {
    return this.appointments.filter(a => a.fieldSalesName === name);
  }

  addAppointment(appointment: Appointment) {
    this.appointments.push(appointment);
  }

  removeAppointment(id: string) {
    this.appointments = this.appointments.filter(a => a.id !== id);
  }

  checkInAppointment(id: string) {
    const appt = this.appointments.find(a => a.id === id);
    if (appt) {
        if (!appt.visitReport) appt.visitReport = {};
        appt.visitReport.checkInTime = new Date().toISOString();
    }
  }

  toggleRouteStatus(id: string) {
      const appt = this.appointments.find(a => a.id === id);
      if (appt) {
          appt.inRoute = !appt.inRoute;
      }
  }

  submitVisitReport(id: string, report: VisitReport) {
    const appt = this.appointments.find(a => a.id === id);
    if (appt) {
        appt.status = 'Completed';
        appt.visitReport = {
            ...appt.visitReport,
            ...report,
            checkOutTime: new Date().toISOString()
        };
    }
  }

  // --- Quote Integration Logic ---
  saveQuote(data: SavedQuote) {
      // Store by Client ID if available, otherwise by Name (normalized)
      const key = data.clientId ? data.clientId : data.competitorAcquirer + data.revenuePotential; // Fallback key strategy not ideal, prefer ID
      
      // Store primarily by ID
      if (data.clientId) this.latestQuotes.set(data.clientId, data);
      
      // Also map via Client Name for broader hit chance if ID is missing in report context
      // In a real app, we'd handle this more robustly
  }

  getQuote(identifier: string): SavedQuote | undefined {
      return this.latestQuotes.get(identifier);
  }

  // --- Clients ---
  getClients(): ClientBaseRow[] {
    return this.clients;
  }

  setClients(newClients: ClientBaseRow[]) {
    this.clients = newClients;
  }

  addClient(client: ClientBaseRow) {
      this.clients.push(client);
  }

  // --- Users ---
  getUsers(): SystemUser[] {
    return this.users;
  }

  addUser(user: SystemUser) {
    this.users.push(user);
  }

  updateUser(updatedUser: SystemUser) {
    const index = this.users.findIndex(u => u.id === updatedUser.id);
    if (index !== -1) {
      this.users[index] = updatedUser;
    }
  }

  toggleUserStatus(id: string) {
    const user = this.users.find(u => u.id === id);
    if (user) {
      user.active = !user.active;
    }
  }

  // --- Notes ---
  getClientNotes(clientId: string): ClientNote[] {
      return this.clientNotes.filter(n => n.clientId === clientId).sort((a,b) => b.date.localeCompare(a.date));
  }

  addClientNote(note: ClientNote) {
      this.clientNotes.push(note);
  }

  // --- Demands ---
  getDemands(): ManualDemand[] {
      return this.demands;
  }

  addDemand(demand: ManualDemand) {
      this.demands.unshift(demand);
  }

  getDemandTypes(): string[] {
      return this.demandTypes;
  }

  // --- Config Lists ---
  getVisitReasons() { return this.visitReasons; }
  addVisitReason(val: string) { if(!this.visitReasons.includes(val)) this.visitReasons.push(val); }
  removeVisitReason(val: string) { this.visitReasons = this.visitReasons.filter(v => v !== val); }

  getLeadOrigins() { return this.leadOrigins; }
  addLeadOrigin(val: string) { if(!this.leadOrigins.includes(val)) this.leadOrigins.push(val); }
  removeLeadOrigin(val: string) { this.leadOrigins = this.leadOrigins.filter(v => v !== val); }

  getWithdrawalReasons() { return this.withdrawalReasons; }
  addWithdrawalReason(val: string) { if(!this.withdrawalReasons.includes(val)) this.withdrawalReasons.push(val); }
  removeWithdrawalReason(val: string) { this.withdrawalReasons = this.withdrawalReasons.filter(v => v !== val); }

  getSwapReasons() { return this.swapReasons; }
  addSwapReason(val: string) { if(!this.swapReasons.includes(val)) this.swapReasons.push(val); }
  removeSwapReason(val: string) { this.swapReasons = this.swapReasons.filter(v => v !== val); }

  // --- Helpers ---
  // Simple ID generator
  generateId(): string {
      return 'AGD-' + Math.floor(Math.random() * 100000);
  }

  // --- Local Storage Drafts ---
  saveLocalDraft(key: string, data: any) {
      localStorage.setItem(key, JSON.stringify(data));
  }

  getLocalDraft(key: string): any {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
  }

  clearLocalDraft(key: string) {
      localStorage.removeItem(key);
  }
}

export const appStore = new StoreService();
