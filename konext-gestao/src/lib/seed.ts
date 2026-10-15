import { type Dados } from './types';
import { hojeISO, somarDias } from './util';

// Dados de exemplo para conhecer o sistema. O botão "Começar do zero" apaga tudo.
export const criarDadosExemplo = (hoje = hojeISO()): Dados => {
  const d = (dias: number) => somarDias(hoje, dias);
  const mes = (deslocamento: number, dia: number) => {
    const [a, m] = hoje.split('-').map(Number);
    const data = new Date(Date.UTC(a, m - 1 + deslocamento, dia));
    return data.toISOString().slice(0, 10);
  };

  const clientes: Dados['clientes'] = [
    {
      id: 'c-padaria',
      nome: 'Padaria Pão Dourado',
      empresa: 'Pão Dourado Alimentos LTDA',
      segmento: 'Alimentação / varejo local',
      status: 'ativo',
      cor: '#f59e0b',
      clienteDesde: d(-210),
      contato: {
        nome: 'Marina Souza',
        whatsapp: '(11) 98888-1020',
        email: 'marina@paodourado.com.br',
        instagram: '@paodourado',
        site: 'paodourado.com.br',
      },
      documento: '12.345.678/0001-90',
      briefing: {
        publico: 'Famílias do bairro, 25 a 55 anos, que compram café da manhã e encomendas para festas.',
        tomDeVoz: 'Acolhedor, próximo, cheiro de pão quentinho.',
        objetivos: '60 pedidos por mês no WhatsApp e +30% em encomendas de festa até dezembro.',
        concorrentes: 'Padaria Central, Doce Pão Artesanal',
        identidade: 'Marrom #7A4B1E · Amarelo #F2C14E · Fonte Poppins',
        observacoes: 'Aprovação de criativos sempre com a Marina, às terças.',
      },
      acessos: [
        { id: 'a1', plataforma: 'Instagram', login: '@paodourado', link: 'https://instagram.com/paodourado', ondeSenha: 'Cofre › Pão Dourado' },
        { id: 'a2', plataforma: 'Meta Ads (BM)', login: 'Acesso de parceiro', link: 'https://business.facebook.com', ondeSenha: 'BM da agência' },
        { id: 'a3', plataforma: 'Hospedagem do site', login: 'marina@paodourado.com.br', link: 'https://hpanel.hostinger.com', ondeSenha: 'Cofre › Pão Dourado' },
      ],
      metaContaId: 'act_100200300400',
      notasReuniao: 'Cliente quer reforçar encomendas de Natal. Combinar envio das fotos do cardápio até sexta.',
      criadoEm: d(-210),
    },
    {
      id: 'c-clinica',
      nome: 'Clínica Sorriso Leve',
      empresa: 'Sorriso Leve Odontologia',
      segmento: 'Saúde / odontologia',
      status: 'ativo',
      cor: '#14b8a6',
      clienteDesde: d(-95),
      contato: { nome: 'Dr. Paulo Lima', whatsapp: '(11) 97777-3344', email: 'contato@sorrisoleve.com', instagram: '@sorrisoleve', site: 'sorrisoleve.com' },
      documento: '98.765.432/0001-10',
      briefing: {
        publico: 'Adultos de 30 a 60 anos interessados em implantes e lentes.',
        tomDeVoz: 'Confiável, técnico sem ser frio.',
        objetivos: '25 avaliações agendadas por mês pelo site.',
        concorrentes: 'OdontoPrime, Clínica Branca',
        identidade: 'Verde-água #14B8A6 · Branco · Fonte Nunito',
        observacoes: 'Seguir regras do CFO para anúncios.',
      },
      acessos: [{ id: 'a4', plataforma: 'Google Ads', login: 'ads@sorrisoleve.com', link: 'https://ads.google.com', ondeSenha: 'Cofre › Sorriso Leve' }],
      metaContaId: 'act_500600700800',
      notasReuniao: '',
      criadoEm: d(-95),
    },
    {
      id: 'c-studio',
      nome: 'Studio Move Fit',
      empresa: 'Move Fit Academia',
      segmento: 'Fitness',
      status: 'onboarding',
      cor: '#8b5cf6',
      clienteDesde: d(-6),
      contato: { nome: 'Carla Mendes', whatsapp: '(21) 96666-5566', email: 'carla@movefit.com', instagram: '@studiomovefit', site: '' },
      documento: '',
      briefing: { publico: 'Mulheres de 25 a 45 anos.', tomDeVoz: 'Energético e motivador.', objetivos: 'Lotar turmas da manhã.', concorrentes: '', identidade: '', observacoes: '' },
      acessos: [],
      metaContaId: '',
      notasReuniao: '',
      criadoEm: d(-6),
    },
    {
      id: 'c-loja',
      nome: 'Ateliê Flor de Lis',
      empresa: 'Flor de Lis Moda',
      segmento: 'Moda / e-commerce',
      status: 'lead',
      cor: '#ec4899',
      clienteDesde: d(-2),
      contato: { nome: 'Juliana Rocha', whatsapp: '(31) 95555-7788', email: 'ju@flordelis.com', instagram: '@ateliefloredelis', site: '' },
      documento: '',
      briefing: { publico: '', tomDeVoz: '', objetivos: 'Começar vendas pelo site.', concorrentes: '', identidade: '', observacoes: 'Proposta enviada, aguardando retorno.' },
      acessos: [],
      metaContaId: '',
      notasReuniao: '',
      criadoEm: d(-2),
    },
  ];

  const servicos: Dados['servicos'] = [
    { id: 's-1', clienteId: 'c-padaria', tipo: 'Marketing / Tráfego', nome: 'Tráfego pago + social media', valor: 2500, recorrencia: 'mensal', diaPagamento: 10, inicio: d(-210), status: 'ativo', escopo: '12 posts/mês, 8 stories, gestão de Meta Ads, relatório mensal.' },
    { id: 's-2', clienteId: 'c-padaria', tipo: 'Sites / Sistemas', nome: 'Cardápio digital + site', valor: 4800, recorrencia: 'pontual', diaPagamento: 5, inicio: d(-20), status: 'ativo', escopo: 'Site institucional com cardápio e pedidos via WhatsApp.' },
    { id: 's-3', clienteId: 'c-clinica', tipo: 'Marketing / Tráfego', nome: 'Google Ads + landing page', valor: 3200, recorrencia: 'mensal', diaPagamento: 15, inicio: d(-95), status: 'ativo', escopo: 'Campanhas de pesquisa, LP de implantes, otimização semanal.' },
    { id: 's-4', clienteId: 'c-studio', tipo: 'Consultoria / Mentoria', nome: 'Mentoria de posicionamento', valor: 1500, recorrencia: 'mensal', diaPagamento: 20, inicio: d(-6), status: 'ativo', escopo: '4 encontros/mês e plano de ação.' },
    { id: 's-5', clienteId: 'c-loja', tipo: 'Sites / Sistemas', nome: 'Loja virtual', valor: 6500, recorrencia: 'pontual', diaPagamento: 10, inicio: '', status: 'proposta', escopo: 'Loja Shopify com 40 produtos.' },
  ];

  const entregas: Dados['entregas'] = [
    { id: 'e-1', clienteId: 'c-padaria', servicoId: 's-1', titulo: 'Criativos da semana do pão de queijo', descricao: '3 reels + 2 carrosséis', status: 'produzindo', prioridade: 'alta', prazo: d(2), responsavel: 'Ana', link: '', entregueEm: '', ordem: 1 },
    { id: 'e-2', clienteId: 'c-padaria', servicoId: 's-1', titulo: 'Relatório mensal de resultados', descricao: '', status: 'a_fazer', prioridade: 'urgente', prazo: d(-2), responsavel: 'Bruno', link: '', entregueEm: '', ordem: 2 },
    { id: 'e-3', clienteId: 'c-padaria', servicoId: 's-2', titulo: 'Layout da home do site', descricao: '', status: 'revisao', prioridade: 'media', prazo: d(5), responsavel: 'Salomão', link: '', entregueEm: '', ordem: 3 },
    { id: 'e-4', clienteId: 'c-padaria', servicoId: 's-2', titulo: 'Textos e fotos do cardápio', descricao: 'Cliente precisa enviar as fotos', status: 'aguardando_cliente', prioridade: 'media', prazo: d(-1), responsavel: 'Marina (cliente)', link: '', entregueEm: '', ordem: 4 },
    { id: 'e-5', clienteId: 'c-padaria', servicoId: 's-1', titulo: 'Campanha Dia das Crianças', descricao: '', status: 'entregue', prioridade: 'media', prazo: d(-8), responsavel: 'Ana', link: '', entregueEm: d(-9), ordem: 5 },
    { id: 'e-6', clienteId: 'c-clinica', servicoId: 's-3', titulo: 'Nova landing page de lentes', descricao: '', status: 'produzindo', prioridade: 'alta', prazo: d(4), responsavel: 'Salomão', link: '', entregueEm: '', ordem: 6 },
    { id: 'e-7', clienteId: 'c-clinica', servicoId: 's-3', titulo: 'Otimização semanal das campanhas', descricao: '', status: 'a_fazer', prioridade: 'media', prazo: d(1), responsavel: 'Bruno', link: '', entregueEm: '', ordem: 7 },
    { id: 'e-8', clienteId: 'c-clinica', servicoId: 's-3', titulo: 'Relatório de setembro', descricao: '', status: 'entregue', prioridade: 'media', prazo: d(-12), responsavel: 'Bruno', link: '', entregueEm: d(-12), ordem: 8 },
    { id: 'e-9', clienteId: 'c-studio', servicoId: 's-4', titulo: 'Diagnóstico inicial', descricao: '', status: 'a_fazer', prioridade: 'alta', prazo: d(3), responsavel: 'Salomão', link: '', entregueEm: '', ordem: 9 },
    { id: 'e-10', clienteId: 'c-studio', servicoId: 's-4', titulo: 'Ideias de conteúdo para aulas experimentais', descricao: '', status: 'backlog', prioridade: 'baixa', prazo: '', responsavel: '', link: '', entregueEm: '', ordem: 10 },
  ];

  const lancamentos: Dados['lancamentos'] = [];
  for (let m = -5; m <= 0; m += 1) {
    const atual = m === 0;
    lancamentos.push(
      { id: `l-p${m}`, tipo: 'entrada', descricao: 'Pão Dourado · Tráfego + social', categoria: 'Mensalidade', valor: 2500, data: mes(m, 10), pago: !atual || Number(hoje.slice(8)) > 10, clienteId: 'c-padaria', servicoId: 's-1' },
      { id: `l-sw${m}`, tipo: 'saida', descricao: 'Ferramentas (Canva, Meta Verified, Google Workspace)', categoria: 'Ferramentas', valor: 420, data: mes(m, 5), pago: true, clienteId: null, servicoId: null },
      { id: `l-fl${m}`, tipo: 'saida', descricao: 'Freelancer de design', categoria: 'Equipe', valor: 1200, data: mes(m, 25), pago: !atual, clienteId: null, servicoId: null },
    );
    if (m >= -3) {
      lancamentos.push({ id: `l-c${m}`, tipo: 'entrada', descricao: 'Sorriso Leve · Google Ads', categoria: 'Mensalidade', valor: 3200, data: mes(m, 15), pago: !atual || Number(hoje.slice(8)) > 15, clienteId: 'c-clinica', servicoId: 's-3' });
    }
  }
  lancamentos.push(
    { id: 'l-site1', tipo: 'entrada', descricao: 'Pão Dourado · Site (entrada 50%)', categoria: 'Projeto', valor: 2400, data: d(-20), pago: true, clienteId: 'c-padaria', servicoId: 's-2' },
    { id: 'l-site2', tipo: 'entrada', descricao: 'Pão Dourado · Site (entrega 50%)', categoria: 'Projeto', valor: 2400, data: d(25), pago: false, clienteId: 'c-padaria', servicoId: 's-2' },
    { id: 'l-vps', tipo: 'saida', descricao: 'VPS Hostinger', categoria: 'Infraestrutura', valor: 89.9, data: mes(0, 3), pago: true, clienteId: null, servicoId: null },
  );

  const processos: Dados['processos'] = [
    {
      id: 'p-onboarding',
      nome: 'Onboarding de novo cliente',
      area: 'Atendimento',
      objetivo: 'Do contrato assinado à primeira entrega em até 7 dias.',
      etapas: [
        { id: 'p1', titulo: 'Contrato e 1º pagamento', descricao: 'Enviar contrato, confirmar Pix/boleto.', responsavel: 'Comercial', prazo: 'Dia 1' },
        { id: 'p2', titulo: 'Coletar acessos', descricao: 'Instagram, BM, Google, site. Registrar no Konext.', responsavel: 'Atendimento', prazo: 'Dia 2' },
        { id: 'p3', titulo: 'Reunião de briefing', descricao: 'Preencher o briefing na ficha do cliente.', responsavel: 'Salomão', prazo: 'Dia 3' },
        { id: 'p4', titulo: 'Estratégia no quadro', descricao: 'Montar funil e plano no quadro branco do cliente.', responsavel: 'Estratégia', prazo: 'Dia 4–5' },
        { id: 'p5', titulo: 'Apresentar plano', descricao: 'Reunião usando o modo apresentação.', responsavel: 'Salomão', prazo: 'Dia 6' },
        { id: 'p6', titulo: 'Primeiras entregas', descricao: 'Cadastrar entregas no quadro de entregas.', responsavel: 'Produção', prazo: 'Dia 7' },
      ],
    },
    {
      id: 'p-criativos',
      nome: 'Produção de criativos',
      area: 'Produção',
      objetivo: 'Criativos aprovados sem retrabalho.',
      etapas: [
        { id: 'c1', titulo: 'Pauta', descricao: 'Definir tema, oferta e formato.', responsavel: 'Estratégia', prazo: 'Seg' },
        { id: 'c2', titulo: 'Roteiro / copy', descricao: '', responsavel: 'Redação', prazo: 'Ter' },
        { id: 'c3', titulo: 'Design / edição', descricao: '', responsavel: 'Design', prazo: 'Qua' },
        { id: 'c4', titulo: 'Revisão interna', descricao: '', responsavel: 'Salomão', prazo: 'Qui' },
        { id: 'c5', titulo: 'Aprovação do cliente', descricao: 'Enviar no WhatsApp do cliente.', responsavel: 'Atendimento', prazo: 'Qui' },
        { id: 'c6', titulo: 'Publicar / subir anúncio', descricao: '', responsavel: 'Tráfego', prazo: 'Sex' },
      ],
    },
    {
      id: 'p-fechamento',
      nome: 'Fechamento financeiro do mês',
      area: 'Financeiro',
      objetivo: 'Caixa conferido até o dia 5.',
      etapas: [
        { id: 'f1', titulo: 'Gerar cobranças do mês', descricao: 'Botão no Caixa.', responsavel: 'Financeiro', prazo: 'Dia 1' },
        { id: 'f2', titulo: 'Conferir recebimentos', descricao: 'Marcar como pago.', responsavel: 'Financeiro', prazo: 'Diário' },
        { id: 'f3', titulo: 'Cobrar atrasados', descricao: 'Mensagem padrão no WhatsApp.', responsavel: 'Atendimento', prazo: 'Dia +3' },
        { id: 'f4', titulo: 'Pagar fornecedores', descricao: '', responsavel: 'Financeiro', prazo: 'Dia 5' },
      ],
    },
  ];

  const quadros: Dados['quadros'] = [
    { id: 'q-funil', titulo: 'Funil de vendas — Pão Dourado', clienteId: 'c-padaria', cena: { elements: [], files: {} }, miniatura: '', atualizadoEm: d(-1), modelo: 'funil' },
    { id: 'q-mapa', titulo: 'Mapa mental — campanha de Natal', clienteId: 'c-padaria', cena: { elements: [], files: {} }, miniatura: '', atualizadoEm: d(-3), modelo: 'mapa' },
    { id: 'q-jornada', titulo: 'Jornada do paciente', clienteId: 'c-clinica', cena: { elements: [], files: {} }, miniatura: '', atualizadoEm: d(-5), modelo: 'jornada' },
  ];

  return {
    clientes,
    servicos,
    entregas,
    quadros,
    lancamentos,
    processos,
    config: {
      empresa: 'Konext',
      logo: '',
      tiposServico: ['Marketing / Tráfego', 'Sites / Sistemas', 'Consultoria / Mentoria', 'Social media', 'Identidade visual'],
      categoriasEntrada: ['Mensalidade', 'Projeto', 'Consultoria', 'Outros'],
      categoriasSaida: ['Ferramentas', 'Equipe', 'Infraestrutura', 'Impostos', 'Marketing próprio', 'Outros'],
      areasProcesso: ['Comercial', 'Atendimento', 'Produção', 'Financeiro', 'Estratégia'],
    },
  };
};
