// Webhooks de saída: avisam outro sistema (n8n, Make, Zapier…) quando algo
// acontece no Konext. Mesmo formato do DeskCRM: POST com {event, occurred_at, data},
// assinatura HMAC-SHA256 do corpo em X-Konext-Signature e até 3 tentativas.
import { createHmac, randomBytes, randomUUID } from 'node:crypto';

import { ocorrenciasDaRotina } from './recorrencia.mjs';

export const EVENTOS = {
  'cobranca.gerada': 'Cobrança gerada no Caixa',
  'cobranca.vencendo': 'Cobrança vence em 3 dias',
  'cobranca.vence_hoje': 'Cobrança vence hoje',
  'cobranca.vencida': 'Cobrança venceu e não foi paga',
  'cobranca.recebida': 'Cobrança marcada como recebida',
  'cliente.criado': 'Cliente novo cadastrado',
  'cliente.status_alterado': 'Status do cliente mudou',
  'entrega.status_alterado': 'Entrega mudou de etapa',
  'entrega.entregue': 'Entrega concluída',
  'rotina.horario': 'Tarefa da rotina chegou no horário',
  'rotina.concluida': 'Tarefa da rotina concluída',
};

const TENTATIVAS_ESPERA = [1000, 5000];
const LIMITE_ATIVIDADE = 300;
const FUSO = process.env.KONEXT_FUSO || 'America/Sao_Paulo';

const hojeNoFuso = () => new Intl.DateTimeFormat('en-CA', { timeZone: FUSO }).format(new Date());
const horaNoFuso = () => Number(new Intl.DateTimeFormat('en-US', { timeZone: FUSO, hour: 'numeric', hourCycle: 'h23' }).format(new Date()));
const minutosNoFuso = () => {
  const [h, m] = new Intl.DateTimeFormat('en-GB', { timeZone: FUSO, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date()).split(':').map(Number);
  return h * 60 + m;
};
const minutosDe = (hora) => {
  const [h, m] = String(hora).split(':').map(Number);
  return Number.isFinite(h) ? h * 60 + (Number.isFinite(m) ? m : 0) : null;
};
const diasEntre = (de, ate) => Math.round((Date.parse(`${ate}T12:00:00Z`) - Date.parse(`${de}T12:00:00Z`)) / 86400000);

export const criarWebhooks = ({ db, lerChave, gravarChave, log, assinar }) => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS webhook_atividade (
      id TEXT PRIMARY KEY,
      webhook_id TEXT NOT NULL,
      evento TEXT NOT NULL,
      status TEXT NOT NULL,
      resposta INTEGER,
      erro TEXT,
      tentativas INTEGER NOT NULL,
      em TEXT NOT NULL
    );
  `);
  const sql = {
    registrar: db.prepare('INSERT INTO webhook_atividade (id, webhook_id, evento, status, resposta, erro, tentativas, em) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'),
    limpar: db.prepare(`DELETE FROM webhook_atividade WHERE id NOT IN (SELECT id FROM webhook_atividade ORDER BY em DESC LIMIT ${LIMITE_ATIVIDADE})`),
    atividade: db.prepare('SELECT * FROM webhook_atividade ORDER BY em DESC LIMIT 100'),
    registro: db.prepare('SELECT dados FROM registros WHERE colecao = ? AND id = ?'),
    daColecao: db.prepare('SELECT dados FROM registros WHERE colecao = ?'),
    jaAvisou: db.prepare('SELECT 1 FROM chaves WHERE chave = ?'),
  };

  const listar = () => {
    try {
      return JSON.parse(lerChave('webhooks') || '[]');
    } catch {
      return [];
    }
  };
  const gravar = (lista) => gravarChave('webhooks', JSON.stringify(lista));

  const ler = (colecao, id) => {
    if (!id) return null;
    const linha = sql.registro.get(colecao, id);
    return linha ? JSON.parse(linha.dados) : null;
  };

  // Só o que outro sistema precisa: nada de acessos/senhas do cliente.
  const clientePublico = (c) =>
    c && {
      id: c.id,
      nome: c.nome,
      empresa: c.empresa,
      status: c.status,
      segmento: c.segmento,
      contato: c.contato,
    };

  const dadosDaCobranca = (l) => {
    const cliente = ler('clientes', l.clienteId);
    const servico = ler('servicos', l.servicoId);
    return {
      cobranca: { id: l.id, descricao: l.descricao, valor: l.valor, vencimento: l.data, pago: l.pago, categoria: l.categoria },
      cliente: clientePublico(cliente),
      servico: servico && { id: servico.id, nome: servico.nome, tipo: servico.tipo, recorrencia: servico.recorrencia, dia_pagamento: servico.diaPagamento },
    };
  };

  const enviarUm = async (hook, evento, data) => {
    const corpo = JSON.stringify({ event: evento, occurred_at: new Date().toISOString(), data });
    const cabecalhos = {
      'content-type': 'application/json',
      'user-agent': 'Konext-Gestao-Webhook/1.0',
      'x-konext-event': evento,
      'x-konext-delivery': randomUUID(),
      'x-konext-signature': createHmac('sha256', hook.segredo).update(corpo).digest('hex'),
    };
    let erro = '';
    let resposta = null;
    let tentativa = 0;
    for (tentativa = 1; tentativa <= TENTATIVAS_ESPERA.length + 1; tentativa += 1) {
      try {
        const r = await fetch(hook.url, { method: 'POST', headers: cabecalhos, body: corpo, redirect: 'manual', signal: AbortSignal.timeout(10000) });
        resposta = r.status;
        if (r.ok) {
          erro = '';
          break;
        }
        erro = r.status >= 300 && r.status < 400 ? 'O endereço redirecionou (use a URL final)' : `O destino respondeu ${r.status}`;
      } catch (falha) {
        erro = falha?.name === 'TimeoutError' ? 'O destino demorou mais de 10s' : `Não conectou: ${falha?.cause?.code || falha?.message || 'erro'}`;
      }
      const espera = TENTATIVAS_ESPERA[tentativa - 1];
      if (espera !== undefined) await new Promise((ok) => setTimeout(ok, espera));
    }
    const status = erro ? 'falhou' : 'ok';
    const final = Math.min(tentativa, TENTATIVAS_ESPERA.length + 1);
    sql.registrar.run(randomUUID(), hook.id, evento, status, resposta, erro || null, final, new Date().toISOString());
    sql.limpar.run();
    if (erro) log(`webhook "${hook.nome}" falhou em ${evento}: ${erro}`);
    return { ok: !erro, resposta, erro: erro || null, tentativas: final };
  };

  const disparar = (evento, data) => {
    const destinos = listar().filter((h) => h.ativo && h.eventos.includes(evento));
    for (const hook of destinos) enviarUm(hook, evento, data).catch((falha) => log('webhook erro', falha));
    return destinos.length;
  };

  // Compara o registro antes/depois de salvar e avisa o que mudou.
  const aoSalvar = (colecao, antes, depois) => {
    try {
      if (colecao === 'lancamentos' && depois.tipo === 'entrada' && depois.servicoId) {
        if (!antes) disparar('cobranca.gerada', dadosDaCobranca(depois));
        if (depois.pago && !antes?.pago) disparar('cobranca.recebida', dadosDaCobranca(depois));
      }
      if (colecao === 'clientes') {
        if (!antes) disparar('cliente.criado', { cliente: clientePublico(depois) });
        else if (antes.status !== depois.status) disparar('cliente.status_alterado', { cliente: clientePublico(depois), status_anterior: antes.status });
      }
      if (colecao === 'rotina' && !antes) {
        const servico = ler('servicos', depois.servicoId);
        const item = lerConfig().processosServico?.[servico?.tipo]?.rotina?.find((i) => i.id === depois.itemId);
        disparar('rotina.concluida', {
          tarefa: { id: depois.id, titulo: item?.titulo || 'Tarefa da rotina', codigo: item?.codigo || '', data: depois.data, origem: depois.origem, feito_em: depois.feitoEm },
          cliente: clientePublico(ler('clientes', depois.clienteId)),
          servico: servico && { id: servico.id, nome: servico.nome, tipo: servico.tipo },
        });
      }
      if (colecao === 'entregas' && antes && antes.status !== depois.status) {
        const data = {
          entrega: { id: depois.id, titulo: depois.titulo, status: depois.status, status_anterior: antes.status, prazo: depois.prazo, responsavel: depois.responsavel, link: depois.link },
          cliente: clientePublico(ler('clientes', depois.clienteId)),
        };
        disparar('entrega.status_alterado', data);
        if (depois.status === 'entregue') disparar('entrega.entregue', data);
      }
    } catch (falha) {
      log('webhook: erro ao montar evento', falha);
    }
  };

  // Uma vez por hora (das 8h às 20h): avisa cobranças vencendo, vencendo hoje e vencidas.
  // Cada aviso sai uma única vez por cobrança e vencimento.
  const verificarVencimentos = () => {
    try {
      if (!listar().some((h) => h.ativo && h.eventos.some((e) => e.startsWith('cobranca.ven')))) return;
      const hora = horaNoFuso();
      if (hora < 8 || hora >= 20) return;
      const hoje = hojeNoFuso();
      for (const linha of sql.daColecao.all('lancamentos')) {
        const l = JSON.parse(linha.dados);
        if (l.tipo !== 'entrada' || l.pago || !l.data) continue;
        const dias = diasEntre(hoje, l.data);
        const evento = dias === 3 ? 'cobranca.vencendo' : dias === 0 ? 'cobranca.vence_hoje' : dias < 0 && dias >= -30 ? 'cobranca.vencida' : null;
        if (!evento) continue;
        const chave = `aviso:${evento}:${l.id}:${l.data}`;
        if (sql.jaAvisou.get(chave)) continue;
        if (disparar(evento, { ...dadosDaCobranca(l), dias_para_vencer: dias })) gravarChave(chave, hoje);
      }
    } catch (falha) {
      log('webhook: erro ao verificar vencimentos', falha);
    }
  };
  setTimeout(verificarVencimentos, 15000).unref();
  setInterval(verificarVencimentos, 60 * 60 * 1000).unref();

  const lerConfig = () => {
    try {
      return JSON.parse(lerChave('config') || '{}');
    } catch {
      return {};
    }
  };

  // Endereço público do sistema (para o link de "dar baixa" que vai no aviso).
  let origemConhecida = process.env.KONEXT_URL || lerChave('url_publica') || '';
  const registrarOrigem = (req) => {
    if (process.env.KONEXT_URL) return;
    const host = (req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
    if (!host || /^(localhost|127\.|0\.0\.0\.0)/.test(host) && origemConhecida) return;
    const proto = (req.headers['x-forwarded-proto'] || 'http').split(',')[0].trim();
    const origem = `${proto}://${host}`;
    if (origem !== origemConhecida) {
      origemConhecida = origem;
      gravarChave('url_publica', origem);
    }
  };
  const assinaturaRotina = (id) => assinar(`rotina:${id}`);
  const linkConcluir = (id) =>
    origemConhecida ? `${origemConhecida}/api/publico/rotina/concluir?id=${encodeURIComponent(id)}&assinatura=${assinaturaRotina(id)}` : null;

  const dadosDaRotina = (o) => ({
    tarefa: {
      id: o.id,
      titulo: o.item.titulo,
      descricao: o.item.descricao || '',
      codigo: o.item.codigo || '',
      data: o.data,
      hora: o.hora,
      interna: Boolean(o.item.interna),
    },
    cliente: clientePublico(ler('clientes', o.servico.clienteId)),
    servico: { id: o.servico.id, nome: o.servico.nome, tipo: o.servico.tipo },
    concluir_url: linkConcluir(o.id),
  });

  // A cada 5 minutos: tarefas da rotina com "avisar" que chegaram no horário (até 3h de atraso).
  const verificarRotina = () => {
    try {
      const processos = lerConfig().processosServico;
      if (!processos || !listar().some((h) => h.ativo && h.eventos.includes('rotina.horario'))) return;
      const hoje = hojeNoFuso();
      const agora = minutosNoFuso();
      const servicos = sql.daColecao.all('servicos').map((l) => JSON.parse(l.dados));
      for (const o of ocorrenciasDaRotina({ servicos, processos, de: hoje, ate: hoje })) {
        const minuto = minutosDe(o.hora);
        if (!o.item.avisar || minuto === null || minuto > agora || agora - minuto > 180) continue;
        if (ler('rotina', o.id)) continue;
        const chave = `aviso:rotina:${o.id}`;
        if (sql.jaAvisou.get(chave)) continue;
        if (disparar('rotina.horario', dadosDaRotina(o))) gravarChave(chave, new Date().toISOString());
      }
    } catch (falha) {
      log('webhook: erro ao verificar a rotina', falha);
    }
  };
  setTimeout(verificarRotina, 10000).unref();
  setInterval(verificarRotina, 5 * 60 * 1000).unref();

  // Chamado pelo n8n depois de fazer a tarefa: grava como feita.
  const concluirRotina = ({ id, assinatura }) => {
    if (!id || !assinatura) return { status: 400, corpo: { erro: 'Faltou o id ou a assinatura.' } };
    const esperado = assinaturaRotina(id);
    if (assinatura.length !== esperado.length || assinatura !== esperado) return { status: 401, corpo: { erro: 'Assinatura inválida.' } };
    const [servicoId, itemId, data] = String(id).split('~');
    const servico = ler('servicos', servicoId);
    if (!servico || !itemId || !/^\d{4}-\d{2}-\d{2}$/.test(data || '')) return { status: 404, corpo: { erro: 'Tarefa não encontrada.' } };
    if (ler('rotina', id)) return { status: 200, corpo: { ok: true, ja_estava_feita: true } };
    const registro = { id, servicoId, clienteId: servico.clienteId, itemId, data, feitoEm: new Date().toISOString(), origem: 'automacao' };
    db.prepare('INSERT INTO registros (colecao, id, dados, atualizado_em) VALUES (?, ?, ?, ?) ON CONFLICT (colecao, id) DO NOTHING').run(
      'rotina',
      id,
      JSON.stringify(registro),
      registro.feitoEm,
    );
    aoSalvar('rotina', null, registro);
    return { status: 200, corpo: { ok: true, ja_estava_feita: false } };
  };

  const validar = (entrada, existente) => {
    const nome = String(entrada.nome || '').trim().slice(0, 80);
    const url = String(entrada.url || '').trim();
    let endereco;
    try {
      endereco = new URL(url);
    } catch {
      return { erro: 'Endereço inválido. Cole a URL completa (https://…).' };
    }
    if (!['http:', 'https:'].includes(endereco.protocol)) return { erro: 'O endereço precisa começar com https://' };
    const eventos = (Array.isArray(entrada.eventos) ? entrada.eventos : []).filter((e) => e in EVENTOS);
    if (!eventos.length) return { erro: 'Escolha pelo menos um evento.' };
    return {
      hook: {
        id: existente?.id || entrada.id,
        nome: nome || endereco.hostname,
        url,
        eventos,
        ativo: entrada.ativo !== false,
        segredo: existente?.segredo || `whsec_${randomBytes(24).toString('hex')}`,
        criadoEm: existente?.criadoEm || new Date().toISOString(),
      },
    };
  };

  // Rotas /api/webhooks…  (devolve true se tratou o pedido)
  const rotas = async ({ metodo, rota, lerCorpo, responder, res }) => {
    if (rota === '' && metodo === 'GET') {
      responder(res, 200, { webhooks: listar(), eventos: EVENTOS });
      return true;
    }
    if (rota === '/atividade' && metodo === 'GET') {
      const nomes = Object.fromEntries(listar().map((h) => [h.id, h.nome]));
      responder(res, 200, { atividade: sql.atividade.all().map((a) => ({ ...a, webhook: nomes[a.webhook_id] || 'Removido' })) });
      return true;
    }
    const [, id, acao] = rota.split('/');
    if (!id || !/^[\w-]{4,64}$/.test(id)) return false;
    const lista = listar();
    const existente = lista.find((h) => h.id === id);
    if (!acao && metodo === 'PUT') {
      const entrada = await lerCorpo(64 * 1024);
      const { hook, erro } = validar({ ...entrada, id }, existente);
      if (erro) {
        responder(res, 400, { erro });
        return true;
      }
      gravar(existente ? lista.map((h) => (h.id === id ? hook : h)) : [...lista, hook]);
      responder(res, 200, { webhook: hook });
      return true;
    }
    if (!acao && metodo === 'DELETE') {
      gravar(lista.filter((h) => h.id !== id));
      responder(res, 204);
      return true;
    }
    if (acao === 'testar' && metodo === 'POST') {
      if (!existente) {
        responder(res, 404, { erro: 'Webhook não encontrado' });
        return true;
      }
      const resultado = await enviarUm(existente, 'teste', {
        mensagem: 'Teste do Konext Gestão. Se você recebeu isto, o webhook está funcionando.',
        cobranca: { id: 'exemplo', descricao: 'Cliente Exemplo · Tráfego pago', valor: 1500, vencimento: hojeNoFuso(), pago: false, categoria: 'Mensalidade' },
        cliente: { id: 'exemplo', nome: 'Cliente Exemplo', empresa: 'Exemplo LTDA', status: 'ativo', contato: { nome: 'Maria', whatsapp: '(11) 99999-9999', email: 'maria@exemplo.com' } },
      });
      responder(res, 200, resultado);
      return true;
    }
    return false;
  };

  return { aoSalvar, rotas, ler, registrarOrigem, concluirRotina };
};
