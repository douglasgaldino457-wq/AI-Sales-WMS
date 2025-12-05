
import { Client, Visit, SalesData, SystemUser, ClientBaseRow, UserRole } from './types';

// Mock Data for Dashboard
export const MOCK_SALES_DATA: SalesData[] = [
  { name: 'Seg', value: 4000 },
  { name: 'Ter', value: 3000 },
  { name: 'Qua', value: 2000 },
  { name: 'Qui', value: 2780 },
  { name: 'Sex', value: 1890 },
  { name: 'Sab', value: 2390 },
  { name: 'Dom', value: 3490 },
];

export const MOCK_STATUS_DATA = [
  { name: 'Fechado', value: 400 },
  { name: 'Em Aberto', value: 300 },
  { name: 'Perdido', value: 100 },
];

export const MOCK_CLIENTS: Client[] = [
  { id: '1', name: 'Oficina do Zé', address: 'Rua das Flores, 123, São Paulo', status: 'Active', lastVisit: '2023-10-15' },
  { id: '2', name: 'Auto Center Premium', address: 'Av. Paulista, 900, São Paulo', status: 'Lead' },
  { id: '3', name: 'Mecânica Rápida', address: 'Rua Augusta, 500, São Paulo', status: 'Active', lastVisit: '2023-10-20' },
  { id: '4', name: 'Pneus & Cia', address: 'Rua da Mooca, 45, São Paulo', status: 'Inactive', lastVisit: '2023-09-01' },
];

export const MOCK_VISITS: Visit[] = [
  { id: '1', clientName: 'Oficina do Zé', date: '2023-10-27 09:00', status: 'Scheduled', address: 'Rua das Flores, 123' },
  { id: '2', clientName: 'Mecânica Rápida', date: '2023-10-27 14:00', status: 'Completed', address: 'Rua Augusta, 500' },
  { id: '3', clientName: 'Auto Center Premium', date: '2023-10-28 10:30', status: 'Scheduled', address: 'Av. Paulista, 900' },
];

export const MOCK_USERS: SystemUser[] = [
  { id: '1', name: 'Cleiton Freitas', role: UserRole.FIELD_SALES, email: 'cleiton.freitas@car10.com.br', whatsapp: '11 98940-7547', active: true, managerName: 'Douglas Galdino' },
  { id: '2', name: 'Samuel de Paula', role: UserRole.FIELD_SALES, email: 'samuel.paula@car10.com.br', whatsapp: '11 97848-6449', active: true, managerName: 'Douglas Galdino' },
  { id: '3', name: 'Douglas Galdino', role: UserRole.GESTOR, email: 'douglas.galdino@car10.com.br', whatsapp: '11 99293-9597', active: true },
  { id: '4', name: 'Maicon Garcia', role: UserRole.FIELD_SALES, email: 'maicon.garcia@car10.com.br', whatsapp: '51 99004-3630', active: true, managerName: 'Douglas Galdino' },
  { id: '5', name: 'Jorge Jr', role: UserRole.FIELD_SALES, email: 'jorge.paulo@car10.com.br', whatsapp: '11 93279-4944', active: true, managerName: 'Douglas Galdino' },
  { id: '6', name: 'Luiz Neto', role: UserRole.FIELD_SALES, email: 'luiz.neto@car10.com.br', whatsapp: '11 97844-6444', active: true, managerName: 'Ligia Rosa' },
  { id: '7', name: 'Liziana Mata', role: UserRole.FIELD_SALES, email: 'liziana.mata@car10.com.br', whatsapp: '11 99310-7452', active: true, managerName: 'Ligia Rosa' },
  { id: '8', name: 'Cauana Sousa', role: UserRole.INSIDE_SALES, email: 'cauana.sousa@car10.com.br', whatsapp: '11 98869-4402', active: true, managerName: 'Ligia Rosa' },
  { id: '9', name: 'Marcos Oliveira', role: UserRole.INSIDE_SALES, email: 'marcos.oliveira@car10.com.br', whatsapp: '11 91363-1319', active: true, managerName: 'Ligia Rosa' },
  { id: '10', name: 'Jussara Oliveira', role: UserRole.INSIDE_SALES, email: 'jussara.oliveira@car10.com.br', whatsapp: '11 94009-0735', active: true, managerName: 'Douglas Galdino' },
  { id: '11', name: 'Beatriz Santos', role: UserRole.INSIDE_SALES, email: 'beatriz.santos@car10.com.br', whatsapp: '11 99381-9083', active: true, managerName: 'Douglas Galdino' },
  { id: '12', name: 'Bruno Batista', role: UserRole.INSIDE_SALES, email: 'bruno.batista@car10.com.br', whatsapp: '11 93946-8320', active: true, managerName: 'Douglas Galdino' },
  { id: '13', name: 'Ligia Rosa', role: UserRole.GESTOR, email: 'ligia.rosa@car10.com.br', whatsapp: '11 97817-6134', active: true },
];

// REALISTIC ADDRESS DATABASE FOR AUTOCOMPLETE & MOCKS
export const REALISTIC_ADDRESS_DB = [
  { street: "Av. Paulista, 1000", neighborhood: "Bela Vista", city: "São Paulo", state: "SP", lat: -23.5657, lng: -46.6513 },
  { street: "Rua Augusta, 1500", neighborhood: "Consolação", city: "São Paulo", state: "SP", lat: -23.5583, lng: -46.6603 },
  { street: "Av. Brigadeiro Faria Lima, 3000", neighborhood: "Itaim Bibi", city: "São Paulo", state: "SP", lat: -23.5804, lng: -46.6811 },
  { street: "Rua da Mooca, 123", neighborhood: "Mooca", city: "São Paulo", state: "SP", lat: -23.5559, lng: -46.6111 },
  { street: "Av. das Américas, 500", neighborhood: "Barra da Tijuca", city: "Rio de Janeiro", state: "RJ", lat: -23.0004, lng: -43.3182 },
  { street: "Rua Voluntários da Pátria, 500", neighborhood: "Santana", city: "São Paulo", state: "SP", lat: -23.5042, lng: -46.6234 },
  { street: "Av. Santo Amaro, 2000", neighborhood: "Vila Olímpia", city: "São Paulo", state: "SP", lat: -23.5975, lng: -46.6748 },
  { street: "Rua Clélia, 800", neighborhood: "Lapa", city: "São Paulo", state: "SP", lat: -23.5251, lng: -46.6917 },
  { street: "Av. Interlagos, 2500", neighborhood: "Interlagos", city: "São Paulo", state: "SP", lat: -23.6749, lng: -46.6919 },
  { street: "Rua Bom Pastor, 400", neighborhood: "Ipiranga", city: "São Paulo", state: "SP", lat: -23.5855, lng: -46.6053 },
  { street: "Av. Rebouças, 1000", neighborhood: "Pinheiros", city: "São Paulo", state: "SP", lat: -23.5655, lng: -46.6698 },
  { street: "Rua Teodoro Sampaio, 500", neighborhood: "Pinheiros", city: "São Paulo", state: "SP", lat: -23.5601, lng: -46.6791 },
  { street: "Rua Heitor Penteado, 1200", neighborhood: "Sumarezinho", city: "São Paulo", state: "SP", lat: -23.5432, lng: -46.6895 },
  { street: "Av. Dr. Ricardo Jafet, 1500", neighborhood: "Vila Mariana", city: "São Paulo", state: "SP", lat: -23.5921, lng: -46.6214 },
  { street: "Rua Vergueiro, 2000", neighborhood: "Vila Mariana", city: "São Paulo", state: "SP", lat: -23.5812, lng: -46.6375 },
  { street: "Av. Celso Garcia, 3000", neighborhood: "Tatuapé", city: "São Paulo", state: "SP", lat: -23.5358, lng: -46.5621 },
  { street: "Rua Tuiuti, 1800", neighborhood: "Tatuapé", city: "São Paulo", state: "SP", lat: -23.5412, lng: -46.5715 },
  { street: "Av. Eng. Caetano Álvares, 4000", neighborhood: "Mandaqui", city: "São Paulo", state: "SP", lat: -23.4912, lng: -46.6432 },
  { street: "Rua Conselheiro Moreira de Barros, 900", neighborhood: "Santana", city: "São Paulo", state: "SP", lat: -23.4934, lng: -46.6321 },
  { street: "Av. Marquês de São Vicente, 1000", neighborhood: "Barra Funda", city: "São Paulo", state: "SP", lat: -23.5187, lng: -46.6623 }
];

const generateMockClients = (): ClientBaseRow[] => {
  const types = ['Mecânica Geral', 'Borracharia', 'Auto Elétrica', 'Funilaria', 'Centro Automotivo'];
  const names = ['Auto Center', 'Mecânica', 'Oficina', 'Centro Automotivo', 'Garagem'];
  const surnames = ['Silva', 'Santos', 'Oliveira', 'Souza', 'Pereira', 'Brasil', 'Express', 'Top', 'Prime'];

  return Array.from({ length: 55 }, (_, i) => {
    // Pick a realistic address cyclically or randomly
    const addr = REALISTIC_ADDRESS_DB[i % REALISTIC_ADDRESS_DB.length];
    
    // Add small random offset to lat/lng so they don't stack perfectly on map
    const latOffset = (Math.random() - 0.5) * 0.005;
    const lngOffset = (Math.random() - 0.5) * 0.005;

    const nome = `${names[i % names.length]} ${surnames[i % surnames.length]}`;

    return {
      id: (1000 + i).toString(),
      nomeEc: nome,
      tipoSic: types[i % types.length],
      endereco: `${addr.street}, ${addr.neighborhood}, ${addr.city} - ${addr.state}`,
      responsavel: `Gerente ${surnames[i % surnames.length]}`,
      contato: `11 9${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`,
      regiaoAgrupada: addr.state === 'RJ' ? 'Zona Oeste RJ' : (i % 2 === 0 ? 'Zona Sul SP' : 'Zona Norte SP'), // Simplified region logic for mock
      fieldSales: i % 3 === 0 ? 'Cleiton Freitas' : (i % 3 === 1 ? 'Samuel de Paula' : 'Jorge Jr'),
      insideSales: i % 2 === 0 ? 'Cauana Sousa' : 'Marcos Oliveira',
      latitude: addr.lat + latOffset,
      longitude: addr.lng + lngOffset
    };
  });
};

export const MOCK_CLIENT_BASE: ClientBaseRow[] = generateMockClients();
