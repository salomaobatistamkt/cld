// Módulo Anúncios: diagnóstico do acesso à Meta e validação das contas de cada cliente.
// Toda checagem usa IDs oficiais devolvidos pela Meta, nunca só o nome.

const PERMISSOES = [
  { nome: 'ads_read', para: 'Ler campanhas e métricas', obrigatoria: true },
  { nome: 'ads_management', para: 'Criar e editar campanhas, conjuntos e anúncios', obrigatoria: true },
  { nome: 'business_management', para: 'Acessar os ativos do Gerenciador de Negócios', obrigatoria: true },
  { nome: 'pages_show_list', para: 'Listar as páginas dos clientes', obrigatoria: true },
  { nome: 'pages_read_engagement', para: 'Ler dados das páginas usadas nos anúncios', obrigatoria: true },
  { nome: 'pages_manage_ads', para: 'Anunciar em nome das páginas', obrigatoria: true },
  { nome: 'instagram_basic', para: 'Listar os perfis do Instagram', obrigatoria: false },
];

const STATUS_CONTA = { 1: 'Ativa', 2: 'Desativada', 3: 'Pendente de pagamento', 7: 'Em análise de risco', 8: 'Pagamento pendente', 9: 'Em período de carência', 100: 'Encerramento pendente', 101: 'Encerrada', 201: 'Ativa (qualquer)', 202: 'Encerrada (qualquer)' };

export const criarAnuncios = ({ graph, ErroMeta, normalizarConta, usoMeta, tokenMeta, ler, listar, gravar, log }) => {
  const resumoErro = (falha) => ({ mensagem: falha?.message || 'Erro desconhecido', detalhe: falha?.detalhe ?? null });

  const diagnostico = async () => {
    const checks = [];
    const add = (id, titulo, status, detalhe, extra = {}) => checks.push({ id, titulo, status, detalhe, ...extra });

    if (!tokenMeta()) {
      add('token', 'Token da Meta', 'erro', 'Nenhum token salvo. Cole o token em Configurações → Integrações.');
      return { checks, contas: [], permissoes: [], uso: usoMeta };
    }

    // 1. Quem é o token
    try {
      const eu = await graph('me', { fields: 'id,name' });
      add('token', 'Token da Meta', 'ok', `Válido. Pertence a “${eu.name}” (ID ${eu.id}).`);
    } catch (falha) {
      add('token', 'Token da Meta', 'erro', falha.message, { erroMeta: resumoErro(falha) });
      return { checks, contas: [], permissoes: [], uso: usoMeta };
    }

    // 2. Permissões concedidas
    let permissoes = [];
    try {
      const lidas = await graph('me/permissions', {});
      const concedidas = new Set(lidas.data.filter((p) => p.status === 'granted').map((p) => p.permission));
      permissoes = PERMISSOES.map((p) => ({ ...p, concedida: concedidas.has(p.nome) }));
      const faltando = permissoes.filter((p) => p.obrigatoria && !p.concedida);
      add(
        'permissoes',
        'Permissões do token',
        faltando.length ? 'erro' : permissoes.some((p) => !p.concedida) ? 'aviso' : 'ok',
        faltando.length
          ? `Faltam: ${faltando.map((p) => p.nome).join(', ')}. Sem elas, a criação de campanhas não vai funcionar.`
          : permissoes.some((p) => !p.concedida)
            ? `As obrigatórias estão concedidas. Falta a opcional ${permissoes.filter((p) => !p.concedida).map((p) => p.nome).join(', ')} (o Instagram ainda aparece pelas páginas).`
            : 'Todas as permissões necessárias foram concedidas.',
      );
    } catch (falha) {
      add('permissoes', 'Permissões do token', 'aviso', `Não foi possível ler as permissões deste tipo de token. Elas serão testadas na prática. ${falha.message}`, { erroMeta: resumoErro(falha) });
    }

    // 3. Contas de anúncios acessíveis
    let contas = [];
    try {
      const lidas = await graph('me/adaccounts', { fields: 'account_id,name,account_status,currency,timezone_name,business{id,name}', limit: '200' });
      contas = lidas.data.map((c) => ({
        id: `act_${c.account_id}`,
        nome: c.name,
        status: c.account_status,
        statusTexto: STATUS_CONTA[c.account_status] || `Status ${c.account_status}`,
        moeda: c.currency,
        fuso: c.timezone_name,
        negocio: c.business?.name || '',
      }));
      add('contas', 'Contas de anúncios', contas.length ? 'ok' : 'aviso', contas.length ? `${contas.length} conta(s) acessível(is) por este token.` : 'O token não enxerga nenhuma conta de anúncios.');
    } catch (falha) {
      add('contas', 'Contas de anúncios', 'erro', falha.message, { erroMeta: resumoErro(falha) });
    }

    // 4. Cada cliente do Konext x conta informada
    const porId = new Map(contas.map((c) => [c.id, c]));
    const clientes = listar('clientes').filter((c) => c.status !== 'encerrado');
    const itens = clientes.map((c) => {
      if (!c.metaContaId) return { cliente: c.nome, clienteId: c.id, status: 'info', texto: 'Sem conta de anúncios informada.' };
      let act;
      try {
        act = normalizarConta(c.metaContaId);
      } catch {
        return { cliente: c.nome, clienteId: c.id, status: 'erro', texto: `ID inválido: “${c.metaContaId}”. Use o formato act_123456789.` };
      }
      const conta = porId.get(act);
      if (!conta) return { cliente: c.nome, clienteId: c.id, conta: act, status: 'erro', texto: 'O token não tem acesso a esta conta (ou o ID está errado).' };
      if (conta.status !== 1) return { cliente: c.nome, clienteId: c.id, conta: act, status: 'aviso', texto: `Conta “${conta.nome}”: ${conta.statusTexto}.` };
      const validada = c.metaValidacao?.contaId === act;
      return { cliente: c.nome, clienteId: c.id, conta: act, status: validada ? 'ok' : 'aviso', texto: `Conta “${conta.nome}” (${conta.moeda}).${validada ? ' Validada.' : ' Falta validar página e Instagram em Anúncios → Contas.'}` };
    });
    if (clientes.length) {
      const erros = itens.filter((i) => i.status === 'erro').length;
      add('clientes', 'Contas dos clientes', erros ? 'erro' : itens.some((i) => i.status === 'aviso') ? 'aviso' : 'ok', erros ? `${erros} cliente(s) com conta que não confere.` : 'Conferido cliente por cliente.', { itens });
    }

    return { checks, contas, permissoes, uso: usoMeta };
  };

  // Ativos da conta de um cliente: a própria conta, páginas que ela pode anunciar e perfis do Instagram.
  const ativosDoCliente = async (clienteId) => {
    const cliente = ler('clientes', clienteId);
    if (!cliente) throw new ErroMeta('Cliente não encontrado.', 404);
    if (!cliente.metaContaId) throw new ErroMeta('Este cliente não tem conta de anúncios informada. Edite o cliente e preencha o campo “Conta de anúncios do Meta”.', 400);
    const act = normalizarConta(cliente.metaContaId);
    const conta = await graph(act, { fields: 'id,account_id,name,account_status,currency,timezone_name,business{id,name}' });
    if (conta.id !== act) throw new ErroMeta(`A Meta devolveu outra conta (${conta.id}) para ${act}. Operação bloqueada.`, 409);

    const resultado = {
      cliente: { id: cliente.id, nome: cliente.nome },
      conta: { id: conta.id, nome: conta.name, status: conta.account_status, statusTexto: STATUS_CONTA[conta.account_status] || `Status ${conta.account_status}`, moeda: conta.currency, fuso: conta.timezone_name, negocio: conta.business?.name || '' },
      paginas: [],
      instagram: [],
      erros: {},
    };
    try {
      const paginas = await graph(`${act}/promote_pages`, { fields: 'id,name,instagram_business_account{id,username}', limit: '100' });
      resultado.paginas = paginas.data.map((p) => ({ id: p.id, nome: p.name, instagram: p.instagram_business_account ? { id: p.instagram_business_account.id, usuario: p.instagram_business_account.username } : null }));
    } catch (falha) {
      resultado.erros.paginas = resumoErro(falha);
    }
    try {
      const perfis = await graph(`${act}/instagram_accounts`, { fields: 'id,username', limit: '100' });
      resultado.instagram = perfis.data.map((i) => ({ id: i.id, usuario: i.username }));
    } catch (falha) {
      resultado.erros.instagram = resumoErro(falha);
    }
    // Perfis ligados às páginas também servem (alguns tokens não leem a lista da conta).
    for (const p of resultado.paginas) {
      if (p.instagram && !resultado.instagram.some((i) => i.id === p.instagram.id)) resultado.instagram.push({ ...p.instagram, viaPagina: p.nome });
    }
    return resultado;
  };

  // Confere de novo na Meta e grava no cliente a conta, a página e o Instagram escolhidos.
  const validarCliente = async (clienteId, { paginaId, instagramId }) => {
    const ativos = await ativosDoCliente(clienteId);
    if (ativos.conta.status !== 1) throw new ErroMeta(`A conta “${ativos.conta.nome}” não está ativa (${ativos.conta.statusTexto}).`, 409);
    const pagina = paginaId ? ativos.paginas.find((p) => p.id === paginaId) : null;
    if (paginaId && !pagina) throw new ErroMeta('Essa página não está disponível para a conta deste cliente.', 409);
    const instagram = instagramId ? ativos.instagram.find((i) => i.id === instagramId) : null;
    if (instagramId && !instagram) throw new ErroMeta('Esse perfil do Instagram não está disponível para a conta deste cliente.', 409);

    const cliente = ler('clientes', clienteId);
    const atualizado = {
      ...cliente,
      metaPaginaId: pagina?.id || '',
      metaPaginaNome: pagina?.nome || '',
      metaInstagramId: instagram?.id || '',
      metaInstagramUsuario: instagram?.usuario || '',
      metaValidacao: {
        contaId: ativos.conta.id,
        contaNome: ativos.conta.nome,
        moeda: ativos.conta.moeda,
        fuso: ativos.conta.fuso,
        em: new Date().toISOString(),
      },
    };
    gravar('clientes', atualizado);
    log(`conta validada: ${cliente.nome} → ${ativos.conta.id}`);
    return atualizado;
  };

  const rotas = async ({ metodo, rota, lerCorpo, responder, res }) => {
    if (rota === '/diagnostico' && metodo === 'GET') {
      responder(res, 200, await diagnostico());
      return true;
    }
    const ativos = rota.match(/^\/clientes\/([\w-]+)\/ativos$/);
    if (ativos && metodo === 'GET') {
      responder(res, 200, await ativosDoCliente(ativos[1]));
      return true;
    }
    const validar = rota.match(/^\/clientes\/([\w-]+)\/validar$/);
    if (validar && metodo === 'POST') {
      const corpo = await lerCorpo(10 * 1024);
      responder(res, 200, { cliente: await validarCliente(validar[1], { paginaId: String(corpo.paginaId || ''), instagramId: String(corpo.instagramId || '') }) });
      return true;
    }
    return false;
  };

  return { rotas, diagnostico, ativosDoCliente };
};
