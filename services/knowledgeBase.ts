
import { UserRole } from '../types';

export const BUSINESS_GLOSSARY = `
- **SIC (Sistema Integrado Car10):** ERP legado para consulta de processamento, cadastros e financeiro.
- **TPV (Total Payment Volume):** Volume transacionado nas maquininhas.
- **GSurf:** Provedor de conectividade dos terminais (POS).
- **APR (Assistência Pequeno Reparo):** Fluxo para funilaria e pintura (orçamentos por imagem).
- **SIR (Direcionamento de Pane):** Pane elétrica/mecânica na rua -> Guincho -> Oficina parceira (Check-up).
- **SIN (Sinistro):** Rede complementar/referenciada de seguradoras. Volume alto, mão de obra tabelada.
- **CAM (Webmotors Serviços):** Geração massiva de leads via ecossistema Webmotors.
- **Pagmotors:** Subadquirente do grupo. A única forma de monetização direta da operação Car10.
`;

export const BUSINESS_RULES = `
1. **Política Comercial (O Grande Diferencial):**
   - **Argumento Chave:** Somos uma subadquirente. Nossas taxas podem não ser as menores do mercado, mas a oficina ganha em **VOLUME DE LEADS**.
   - **Regra de Ouro:** Oficina que usa Pagmotors ganha destaque e prioridade no direcionamento de leads (APR, SIR, SIN, CAM).
   - **Substituição:** Se a oficina recebe leads mas se recusa a usar a Pagmotors (devido à taxa), ela deve ser substituída imediatamente por uma que aceite a parceria completa.

2. **Fluxos de Serviço (Leads):**
   - O objetivo da Webmotors Serviços é manter o usuário ativo no ecossistema durante os 2-3 anos que ele não está comprando/vendendo carro.
   - O "pagamento" pelo lead que enviamos é a fidelidade no uso da maquininha.

3. **Política de Pricing:**
   - Alçada 1 (Automática): Spread >= 0.65%.
   - Alçada 2 (Gerência): Spread < 0.65%.
   - Plano Full: Antecipação automática (D+0).
   - Plano Simples: Recebimento conforme parcelas (sem custo funding).

4. **Logística:**
   - Envio Capital: 2 dias úteis. Interior: 5 dias.
   - Troca de POS: Apenas com defeito comprovado ou upgrade autorizado.
`;

export const FAQ_ANSWERS = `
- **Por que a taxa da Stone/Rede é menor?** Eles são adquirentes puros. Nós somos parceiros de negócio. Eles te mandam clientes? Nós mandamos (SIN, SIR, CAM). O lucro que você tem com nossos leads cobre a diferença da taxa.
- **O que é o fluxo SIR?** É quando o segurado tem uma pane na rua, e nós direcionamos o guincho para levar o carro até sua oficina para um check-up.
- **O que é APR?** Orçamentos de funilaria e pintura feitos por imagem (Assistência Pequeno Reparo).
- **Posso ficar sem a máquina e só com os leads?** Não. A parceria é o ecossistema completo. Sem a maquininha, a prioridade de leads vai para o concorrente da sua região.
`;

export const getContextForRole = (role: UserRole | null): string => {
    switch (role) {
        case UserRole.FIELD_SALES:
            return "Seu foco é: Visitas, Conversão de Leads e defesa da carteira. Use o argumento 'Lead vs Taxa'. Se a oficina não transacionar, substitua.";
        case UserRole.INSIDE_SALES:
            return "Seu foco é: Agendamento para o Field e Gestão da Carteira Inativa. Lembre o cliente que ele pode perder o fluxo de Sinistro/Webmotors se não usar a máquina.";
        case UserRole.LOGISTICA:
            return "Seu foco é: Gestão de Estoque, Ativação no GSurf e garantia que a máquina chegue rápido para não perder o lead.";
        default:
            return "Você é um usuário administrativo ou gestor focado na rentabilidade do ecossistema Car10/Webmotors.";
    }
};
