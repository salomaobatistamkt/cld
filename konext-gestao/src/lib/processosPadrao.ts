import { type EtapaModelo, type ItemRotina, type ProcessoServico } from './types';

// Processos que já vêm prontos. Dá para mudar tudo em Configurações → Processo de cada serviço.

const etapa = (id: string, fase: string, titulo: string, dias: number, interna: boolean, descricao = ''): EtapaModelo => ({
  id,
  fase,
  titulo,
  descricao,
  dias,
  interna,
});

const rotina = (item: Omit<ItemRotina, 'descricao'> & { descricao?: string }): ItemRotina => ({ descricao: '', ...item });

export const TIPO_TRAFEGO = 'Gestão de Tráfego';
export const TIPO_CRM = 'Implantação de CRM';

const trafego: ProcessoServico = {
  etapas: [
    etapa(
      'trf-dados',
      'Contrato',
      'Coletar dados do cliente e acessos',
      1,
      true,
      'Dados do contrato: razão social, CNPJ, CPF, endereço e nome do responsável.\nAcessos: BM (Business Manager), conta de anúncios (Meta e/ou Google), Instagram, Facebook e e-mails da empresa.',
    ),
    etapa('trf-contrato', 'Contrato', 'Fazer o contrato', 2, true),
    etapa('trf-envio', 'Contrato', 'Enviar o contrato', 2, true),
    etapa('trf-assinado', 'Contrato', 'Receber o contrato assinado', 4, true),
    etapa('trf-cobranca', 'Contrato', 'Enviar a cobrança ao cliente', 5, true),
    etapa('trf-acessos', 'Implementação', 'Conferir acessos: BM, conta de anúncios, Instagram e Facebook', 5, false),
    etapa('trf-implementacao', 'Implementação', 'Implementação das campanhas', 7, false, 'Estrutura das campanhas, públicos e criativos. Leva cerca de uma semana.'),
  ],
  rotina: [
    rotina({ id: 'trf-relatorio', titulo: 'Enviar relatório de resultados', quando: 'semanal', dias: [1, 4], hora: '09:00', interna: false, avisar: true, codigo: 'relatorio' }),
    rotina({ id: 'trf-pausar', titulo: 'Pausar campanhas e avisar o cliente', quando: 'semanal', dias: [6], hora: '12:00', interna: false, avisar: true, codigo: 'pausar_campanhas' }),
    rotina({ id: 'trf-reativar', titulo: 'Reativar campanhas e avisar o cliente', quando: 'semanal', dias: [1], hora: '06:30', interna: false, avisar: true, codigo: 'reativar_campanhas' }),
    rotina({
      id: 'trf-reuniao',
      titulo: 'Reunião de acompanhamento',
      descricao: 'Métricas, estratégias e novidades.',
      quando: 'mensal',
      dias: [10, 20, 30],
      hora: '10:00',
      interna: false,
      avisar: false,
      codigo: 'reuniao',
    }),
    rotina({ id: 'trf-pagamento', titulo: 'Cobrança da mensalidade', quando: 'mensal', dias: [20], hora: '09:00', interna: true, avisar: false, codigo: 'cobranca' }),
  ],
};

const crm: ProcessoServico = {
  etapas: [
    etapa('crm-acesso', 'Contratação', 'Enviar o acesso para o cliente contratar a plataforma', 1, false),
    etapa('crm-plano', 'Contratação', 'Cliente assina o plano', 3, false),
    etapa('crm-analise', 'Mapa da operação', 'Analisar o processo atual do cliente', 5, false),
    etapa('crm-metas', 'Mapa da operação', 'Definir as metas da equipe comercial', 6, false),
    etapa('crm-produtos', 'Mapa da operação', 'Levantar produtos, serviços e preços', 7, false),
    etapa('crm-gargalos', 'Mapa da operação', 'Diagnóstico de gargalos e tempo de resposta', 8, false, 'O que está atrasando mais e por quê.'),
    etapa('crm-pipelines', 'Configuração', 'Configurar pipelines, etapas e funis', 10, false, 'Funis de vendas alinhados à jornada do cliente.'),
    etapa('crm-tags', 'Configuração', 'Criar as tags de segmentação', 11, false),
    etapa('crm-campos', 'Configuração', 'Campos personalizados', 11, false, 'Ex.: data de agendamento, valor recebido antecipado.'),
    etapa('crm-usuarios', 'Configuração', 'Cadastrar responsáveis e usuários da conta', 12, false),
    etapa('crm-catalogo', 'Configuração', 'Montar o catálogo', 13, false),
    etapa('crm-relatorios', 'Configuração', 'Configurar os relatórios', 14, false),
    etapa('crm-distribuicao', 'Automações e integrações', 'Distribuição automática de leads', 15, false),
    etapa('crm-automacoes', 'Automações e integrações', 'Automações de acordo com os serviços do cliente', 16, false),
    etapa('crm-canais', 'Automações e integrações', 'Integrar canais: WhatsApp, Instagram, TikTok e Google', 17, false),
    etapa('crm-voip', 'Automações e integrações', 'Integrar o VoIP (telefonia)', 18, false),
  ],
  rotina: [],
};

export const processosPadrao = (): Record<string, ProcessoServico> => ({
  [TIPO_TRAFEGO]: structuredClone(trafego),
  [TIPO_CRM]: structuredClone(crm),
});
