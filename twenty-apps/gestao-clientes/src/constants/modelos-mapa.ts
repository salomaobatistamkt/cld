import { type ModeloMapa } from 'src/types/modelo-mapa';

// Modelos iniciais para não começar do zero. Edite à vontade: são só dados.
export const MODELOS_MAPA: ModeloMapa[] = [
  {
    nome: 'Planejamento de tráfego pago',
    descricao: 'Objetivo, público, ofertas, criativos, campanhas e métricas',
    ramos: [
      { texto: 'Objetivo da campanha' },
      {
        texto: 'Público',
        filhos: [
          { texto: 'Interesses' },
          { texto: 'Lookalike' },
          { texto: 'Remarketing' },
        ],
      },
      { texto: 'Ofertas', filhos: [{ texto: 'Oferta principal' }, { texto: 'Isca / lead magnet' }] },
      {
        texto: 'Criativos',
        filhos: [{ texto: 'Vídeos' }, { texto: 'Estáticos' }, { texto: 'Carrossel' }],
      },
      {
        texto: 'Campanhas',
        filhos: [{ texto: 'Topo de funil' }, { texto: 'Meio de funil' }, { texto: 'Fundo de funil' }],
      },
      { texto: 'Métricas', filhos: [{ texto: 'CPL' }, { texto: 'CTR' }, { texto: 'ROAS' }] },
      { texto: 'Relatório mensal' },
    ],
  },
  {
    nome: 'Site / sistema',
    descricao: 'Páginas, conteúdo, integrações, parte técnica e entrega',
    ramos: [
      { texto: 'Objetivo do site' },
      {
        texto: 'Páginas',
        filhos: [{ texto: 'Home' }, { texto: 'Sobre' }, { texto: 'Serviços' }, { texto: 'Contato' }],
      },
      {
        texto: 'Conteúdo',
        filhos: [{ texto: 'Textos' }, { texto: 'Imagens' }, { texto: 'Depoimentos' }],
      },
      {
        texto: 'Integrações',
        filhos: [{ texto: 'WhatsApp' }, { texto: 'CRM / formulários' }, { texto: 'Pixel e Analytics' }],
      },
      {
        texto: 'Técnico',
        filhos: [{ texto: 'Domínio' }, { texto: 'Hospedagem' }, { texto: 'SEO básico' }],
      },
      { texto: 'Entrega e treinamento' },
    ],
  },
  {
    nome: 'Consultoria / mentoria',
    descricao: 'Diagnóstico, metas, plano de ação e acompanhamento',
    ramos: [
      { texto: 'Diagnóstico', filhos: [{ texto: 'Situação atual' }, { texto: 'Gargalos' }] },
      { texto: 'Metas' },
      {
        texto: 'Plano de ação',
        filhos: [{ texto: 'Mês 1' }, { texto: 'Mês 2' }, { texto: 'Mês 3' }],
      },
      { texto: 'Encontros' },
      { texto: 'Tarefas do cliente' },
      { texto: 'Indicadores' },
    ],
  },
  {
    nome: 'Onboarding de cliente',
    descricao: 'Do contrato assinado às primeiras entregas',
    ramos: [
      { texto: 'Contrato e pagamento' },
      { texto: 'Acessos', filhos: [{ texto: 'Redes sociais' }, { texto: 'Contas de anúncio' }, { texto: 'Site / domínio' }] },
      { texto: 'Briefing' },
      { texto: 'Reunião de kickoff' },
      { texto: 'Primeiras entregas' },
    ],
  },
];
