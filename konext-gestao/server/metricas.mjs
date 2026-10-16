// Métricas do Meta Ads: coleta (sincronização), histórico diário, relatórios e o
// portal de resultados de cada cliente (link com token individual, só leitura).
//
// Regras de confiabilidade:
// - Nada é inventado: métrica que a Meta não devolve fica null e a tela mostra "indisponível".
// - Alcance nunca é somado entre dias ou campanhas: totais do período vêm da Meta já agregados.
// - Taxas (CTR, CPC, custo por resultado…) são sempre recalculadas a partir das somas.
// - O portal só enxerga a conta do cliente dono do token, validado aqui no servidor.
import { createHash, randomBytes, randomUUID } from 'node:crypto';

const DIA = 24 * 60 * 60 * 1000;
const hoje = () => new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10); // horário de Brasília
const somarDias = (data, dias) => new Date(Date.parse(`${data}T12:00:00Z`) + dias * DIA).toISOString().slice(0, 10);
const diasEntre = (de, ate) => Math.round((Date.parse(`${ate}T12:00:00Z`) - Date.parse(`${de}T12:00:00Z`)) / DIA) + 1;
const dataValida = (d) => /^\d{4}-\d{2}-\d{2}$/.test(d || '') && !Number.isNaN(Date.parse(`${d}T12:00:00Z`));

const num = (v) => {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const somaLista = (lista) => (Array.isArray(lista) ? lista.reduce((t, a) => t + (num(a.value) ?? 0), 0) : null);
const div = (a, b, fator = 1) => (a !== null && a !== undefined && b ? (a / b) * fator : null);

const lerResultado = (lista) => {
  if (!Array.isArray(lista) || !lista.length) return { valor: null, indicador: '' };
  const p = lista[0];
  const valores = Array.isArray(p.values) ? p.values : p.value !== undefined ? [{ value: p.value }] : [];
  return { valor: valores.length ? valores.reduce((t, v) => t + (num(v.value) ?? 0), 0) : null, indicador: p.indicator || '' };
};

export const rotuloResultado = (indicador = '') => {
  if (/messaging_conversation_started/.test(indicador)) return 'Conversas iniciadas';
  if (/profile_visit/.test(indicador)) return 'Visitas ao perfil';
  if (/follow/.test(indicador)) return 'Seguidores';
  if (/lead/.test(indicador)) return 'Leads';
  if (/purchase/.test(indicador)) return 'Compras';
  if (/landing_page_view/.test(indicador)) return 'Visualizações da página';
  if (/link_click/.test(indicador)) return 'Cliques no link';
  if (/thruplay|video/.test(indicador)) return 'Visualizações de vídeo';
  if (/reach/.test(indicador)) return 'Alcance';
  if (/engagement/.test(indicador)) return 'Engajamentos';
  return indicador ? indicador.replace(/^actions:/, '') : 'Resultados';
};

// Ações da Meta que contam como visita ao perfil / seguidor (o tipo exato é guardado como fonte).
const ehVisitaPerfil = (tipo) => /profile_visit/i.test(tipo);
const ehSeguidor = (tipo) => /(^|[._])follow/i.test(tipo) && !/unfollow/i.test(tipo);

// ---------- Normalização de uma linha de insights ----------
const normalizar = (l) => {
  const acoes = {};
  for (const a of Array.isArray(l.actions) ? l.actions : []) {
    const v = num(a.value);
    if (v !== null) acoes[a.action_type] = (acoes[a.action_type] || 0) + v;
  }
  const r = lerResultado(l.results);
  return {
    gasto: num(l.spend) ?? 0,
    impressoes: num(l.impressions) ?? 0,
    alcance: num(l.reach),
    cliques: num(l.clicks),
    cliquesLink: num(l.inline_link_clicks),
    cliquesSaida: somaLista(l.outbound_clicks),
    resultados: r.valor,
    indicador: r.indicador,
    acoes,
    video: {
      reproducoes: somaLista(l.video_play_actions),
      v3s: acoes.video_view ?? null,
      thruplay: somaLista(l.video_thruplay_watched_actions),
      p25: somaLista(l.video_p25_watched_actions),
      p50: somaLista(l.video_p50_watched_actions),
      p75: somaLista(l.video_p75_watched_actions),
      p95: somaLista(l.video_p95_watched_actions),
      p100: somaLista(l.video_p100_watched_actions),
      s30: somaLista(l.video_30_sec_watched_actions),
      tempoMedio: somaLista(l.video_avg_time_watched_actions),
    },
  };
};

// Soma linhas (dias ou objetos). Alcance só sobrevive se houver uma única linha.
const somar = (linhas) => {
  const t = { gasto: 0, impressoes: 0, alcance: null, cliques: null, cliquesLink: null, cliquesSaida: null, resultados: null, indicador: '', acoes: {}, resultadosPorTipo: {}, video: {} };
  const add = (a, b) => (b === null || b === undefined ? a : (a ?? 0) + b);
  for (const n of linhas) {
    t.gasto += n.gasto;
    t.impressoes += n.impressoes;
    t.cliques = add(t.cliques, n.cliques);
    t.cliquesLink = add(t.cliquesLink, n.cliquesLink);
    t.cliquesSaida = add(t.cliquesSaida, n.cliquesSaida);
    for (const [k, v] of Object.entries(n.acoes || {})) t.acoes[k] = (t.acoes[k] || 0) + v;
    if (n.resultados !== null && n.resultados !== undefined) t.resultadosPorTipo[n.indicador || '?'] = (t.resultadosPorTipo[n.indicador || '?'] || 0) + n.resultados;
    for (const [k, v] of Object.entries(n.video || {})) if (k !== 'tempoMedio') t.video[k] = add(t.video[k] ?? null, v);
  }
  if (linhas.length === 1) {
    t.alcance = linhas[0].alcance;
    t.video.tempoMedio = linhas[0].video?.tempoMedio ?? null;
  }
  const tipos = Object.keys(t.resultadosPorTipo);
  if (tipos.length === 1) {
    t.indicador = tipos[0];
    t.resultados = t.resultadosPorTipo[tipos[0]];
  }
  return t;
};

// Métricas calculadas (sempre a partir das somas, com o denominador certo).
const derivar = (n) => {
  if (!n) return null;
  const visitas = Object.entries(n.acoes || {}).filter(([k]) => ehVisitaPerfil(k));
  const seguidores = Object.entries(n.acoes || {}).filter(([k]) => ehSeguidor(k));
  let visitasPerfil = visitas.length ? visitas.reduce((t, [, v]) => t + v, 0) : null;
  if (visitasPerfil === null && /profile_visit/.test(n.indicador || '') && n.resultados !== null) visitasPerfil = n.resultados;
  let seguidoresAnuncios = seguidores.length ? seguidores.reduce((t, [, v]) => t + v, 0) : null;
  if (seguidoresAnuncios === null && /follow/.test(n.indicador || '') && n.resultados !== null) seguidoresAnuncios = n.resultados;
  const v = n.video || {};
  return {
    gasto: n.gasto,
    impressoes: n.impressoes,
    alcance: n.alcance,
    frequencia: div(n.impressoes, n.alcance),
    cpm: div(n.gasto, n.impressoes, 1000),
    cliques: n.cliques,
    ctrTodos: div(n.cliques, n.impressoes, 100),
    cliquesLink: n.cliquesLink,
    ctrLink: div(n.cliquesLink, n.impressoes, 100),
    cpcLink: div(n.gasto, n.cliquesLink),
    cliquesSaida: n.cliquesSaida,
    ctrSaida: div(n.cliquesSaida, n.impressoes, 100),
    cpcSaida: div(n.gasto, n.cliquesSaida),
    resultados: n.resultados,
    tipoResultado: n.indicador ? rotuloResultado(n.indicador) : Object.keys(n.resultadosPorTipo || {}).length > 1 ? 'Resultados (tipos diferentes)' : 'Resultados',
    indicador: n.indicador || '',
    custoPorResultado: div(n.gasto, n.resultados),
    resultadosPorTipo: Object.fromEntries(Object.entries(n.resultadosPorTipo || {}).map(([k, val]) => [rotuloResultado(k), val])),
    visitasPerfil,
    fonteVisitas: visitas.map(([k]) => k).join(', ') || (visitasPerfil !== null ? n.indicador : ''),
    custoVisita: div(n.gasto, visitasPerfil),
    seguidores: seguidoresAnuncios,
    fonteSeguidores: seguidores.map(([k]) => k).join(', ') || (seguidoresAnuncios !== null ? n.indicador : ''),
    custoSeguidor: div(n.gasto, seguidoresAnuncios),
    video: {
      reproducoes: v.reproducoes ?? null,
      v3s: v.v3s ?? null,
      thruplay: v.thruplay ?? null,
      p25: v.p25 ?? null,
      p50: v.p50 ?? null,
      p75: v.p75 ?? null,
      p95: v.p95 ?? null,
      p100: v.p100 ?? null,
      s30: v.s30 ?? null,
      tempoMedio: v.tempoMedio ?? null,
      custoThruplay: div(n.gasto, v.thruplay),
      custoV3s: div(n.gasto, v.v3s),
    },
  };
};

const procedimentoDe = (nome = '') => {
  const parte = String(nome).split('|')[0].trim();
  return parte && parte !== nome.trim() ? parte : '';
};

const STATUS = (s = '') => (['ACTIVE', 'IN_PROCESS', 'WITH_ISSUES'].includes(s) ? 'ativa' : /PAUSED/.test(s) ? 'pausada' : s === 'PENDING_REVIEW' ? 'em_analise' : s ? 'encerrada' : '');

const CAMPOS_BASE = [
  'spend', 'impressions', 'reach', 'clicks', 'inline_link_clicks', 'outbound_clicks', 'actions',
  'video_play_actions', 'video_thruplay_watched_actions', 'video_p25_watched_actions', 'video_p50_watched_actions',
  'video_p75_watched_actions', 'video_p95_watched_actions', 'video_p100_watched_actions', 'video_30_sec_watched_actions',
  'video_avg_time_watched_actions',
];
const CAMPOS_NIVEL = {
  account: [],
  campaign: ['campaign_id', 'campaign_name', 'objective'],
  adset: ['campaign_id', 'adset_id', 'adset_name'],
  ad: ['campaign_id', 'adset_id', 'ad_id', 'ad_name'],
};
const ID_NIVEL = { account: () => 'conta', campaign: (l) => l.campaign_id, adset: (l) => l.adset_id, ad: (l) => l.ad_id };

const SEGMENTOS = {
  idade_genero: { breakdowns: 'age,gender', rotulo: 'Idade e gênero' },
  regiao: { breakdowns: 'region', rotulo: 'Estado / região' },
  pais: { breakdowns: 'country', rotulo: 'País' },
  posicionamento: { breakdowns: 'publisher_platform,platform_position', rotulo: 'Posicionamento' },
  dispositivo: { breakdowns: 'impression_device', rotulo: 'Dispositivo' },
};

export const SECOES = ['investimento', 'alcance', 'ctr_cpc', 'frequencia', 'perfil', 'seguidores', 'evolucao', 'comparativo', 'destaques', 'publico', 'videos', 'alertas'];
const SECOES_PADRAO = ['investimento', 'alcance', 'ctr_cpc', 'frequencia', 'evolucao', 'comparativo', 'destaques', 'alertas'];

export const criarMetricas = ({ db, graph, ErroMeta, normalizarConta, ler, listar, lerConfig, cifrar, decifrar, log }) => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS met_diarias (
      conta_id TEXT NOT NULL, nivel TEXT NOT NULL, objeto_id TEXT NOT NULL, data TEXT NOT NULL,
      campanha_id TEXT, conjunto_id TEXT, nome TEXT, dados TEXT NOT NULL, sincronizado_em TEXT NOT NULL,
      PRIMARY KEY (conta_id, nivel, objeto_id, data)
    );
    CREATE INDEX IF NOT EXISTS met_diarias_data ON met_diarias (conta_id, nivel, data);
    CREATE TABLE IF NOT EXISTS met_objetos (
      conta_id TEXT NOT NULL, nivel TEXT NOT NULL, objeto_id TEXT NOT NULL, nome TEXT, campanha_id TEXT, conjunto_id TEXT,
      status TEXT, objetivo TEXT, orcamento_diario REAL, orcamento_total REAL, extra TEXT NOT NULL DEFAULT '{}', atualizado_em TEXT NOT NULL,
      PRIMARY KEY (conta_id, nivel, objeto_id)
    );
    CREATE TABLE IF NOT EXISTS met_cache (chave TEXT PRIMARY KEY, conta_id TEXT NOT NULL, dados TEXT NOT NULL, em TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS met_seguidores (instagram_id TEXT NOT NULL, data TEXT NOT NULL, total INTEGER, novos INTEGER, fonte TEXT, PRIMARY KEY (instagram_id, data));
    CREATE TABLE IF NOT EXISTS met_sincronizacoes (
      id TEXT PRIMARY KEY, conta_id TEXT NOT NULL, cliente_id TEXT, inicio TEXT NOT NULL, fim TEXT, status TEXT NOT NULL,
      de TEXT, ate TEXT, linhas INTEGER, erro TEXT, origem TEXT
    );
    CREATE INDEX IF NOT EXISTS met_sinc_conta ON met_sincronizacoes (conta_id, inicio);
    CREATE TABLE IF NOT EXISTS portais (
      cliente_id TEXT PRIMARY KEY, token_hash TEXT NOT NULL UNIQUE, token_cifrado TEXT NOT NULL,
      criado_em TEXT NOT NULL, ultimo_acesso TEXT, acessos INTEGER NOT NULL DEFAULT 0
    );
  `);

  const agora = () => new Date().toISOString();
  const hash = (token) => createHash('sha256').update(`portal:${token}`).digest('hex');

  // ---------- Cliente → conta (a única ligação que vale para autorização) ----------
  const contaDoCliente = (cliente) => {
    if (!cliente?.metaContaId) return null;
    try {
      return normalizarConta(cliente.metaContaId);
    } catch {
      return null;
    }
  };
  // A mesma conta ligada a dois clientes é ambígua: bloqueia para não misturar dados.
  const donosDaConta = (act) => listar('clientes').filter((c) => contaDoCliente(c) === act && c.status !== 'encerrado');

  // ---------- Leitura de insights na Meta ----------
  const lerInsights = async (act, { nivel, de, ate, diario = false, breakdowns, filtro }) => {
    const base = {
      level: nivel,
      time_range: { since: de, until: ate },
      limit: '500',
      ...(diario ? { time_increment: '1' } : {}),
      ...(breakdowns ? { breakdowns } : {}),
      ...(filtro ? { filtering: filtro } : {}),
    };
    const campos = [...CAMPOS_NIVEL[nivel], ...(breakdowns ? CAMPOS_BASE.filter((c) => !c.startsWith('video_') && c !== 'outbound_clicks') : CAMPOS_BASE)];
    try {
      return (await graph(`${act}/insights`, { ...base, fields: [...campos, 'results'].join(',') }, undefined, { maxPaginas: 40 })).data;
    } catch (falha) {
      // Algumas contas/combinações não aceitam "results" (ou campos de vídeo): lê o essencial.
      if (!(falha instanceof ErroMeta) || falha.detalhe?.codigo !== 100) throw falha;
      try {
        return (await graph(`${act}/insights`, { ...base, fields: campos.join(',') }, undefined, { maxPaginas: 40 })).data;
      } catch (falha2) {
        if (!(falha2 instanceof ErroMeta) || falha2.detalhe?.codigo !== 100) throw falha2;
        const essenciais = [...CAMPOS_NIVEL[nivel], 'spend', 'impressions', 'reach', 'clicks', 'inline_link_clicks', 'actions'];
        return (await graph(`${act}/insights`, { ...base, fields: essenciais.join(',') }, undefined, { maxPaginas: 40 })).data;
      }
    }
  };

  // ---------- Sincronização (histórico diário guardado no banco) ----------
  const gravarDiaria = db.prepare(
    'INSERT OR REPLACE INTO met_diarias (conta_id, nivel, objeto_id, data, campanha_id, conjunto_id, nome, dados, sincronizado_em) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
  );
  const gravarObjeto = db.prepare(
    'INSERT OR REPLACE INTO met_objetos (conta_id, nivel, objeto_id, nome, campanha_id, conjunto_id, status, objetivo, orcamento_diario, orcamento_total, extra, atualizado_em) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
  );
  const transacao = (fn) => {
    db.exec('BEGIN');
    try {
      fn();
      db.exec('COMMIT');
    } catch (falha) {
      db.exec('ROLLBACK');
      throw falha;
    }
  };

  const sincronizarObjetos = async (act) => {
    const t = agora();
    const [campanhas, conjuntos, anuncios] = await Promise.all([
      graph(`${act}/campaigns`, { fields: 'id,name,effective_status,objective,daily_budget,lifetime_budget,start_time,stop_time', limit: '500' }),
      graph(`${act}/adsets`, { fields: 'id,name,campaign_id,effective_status,daily_budget,lifetime_budget,optimization_goal,destination_type', limit: '500' }),
      graph(`${act}/ads`, { fields: 'id,name,campaign_id,adset_id,effective_status,creative{id,thumbnail_url,video_id,object_type}', limit: '500' }),
    ]);
    const centavos = (v) => (num(v) === null ? null : num(v) / 100);
    transacao(() => {
      for (const c of campanhas.data)
        gravarObjeto.run(act, 'campaign', c.id, c.name, c.id, null, STATUS(c.effective_status), c.objective || '', centavos(c.daily_budget), centavos(c.lifetime_budget), JSON.stringify({ inicio: c.start_time || null, fim: c.stop_time || null }), t);
      for (const s of conjuntos.data)
        gravarObjeto.run(act, 'adset', s.id, s.name, s.campaign_id, s.id, STATUS(s.effective_status), '', centavos(s.daily_budget), centavos(s.lifetime_budget), JSON.stringify({ otimizacao: s.optimization_goal || '', destino: s.destination_type || '' }), t);
      for (const a of anuncios.data)
        gravarObjeto.run(act, 'ad', a.id, a.name, a.campaign_id, a.adset_id, STATUS(a.effective_status), '', null, null, JSON.stringify({ miniatura: a.creative?.thumbnail_url || null, video: Boolean(a.creative?.video_id) }), t);
    });
    return campanhas.data.length + conjuntos.data.length + anuncios.data.length;
  };

  const sincronizarDiarias = async (act, de, ate) => {
    let linhas = 0;
    for (const nivel of ['account', 'campaign', 'adset', 'ad']) {
      const dados = await lerInsights(act, { nivel, de, ate, diario: true });
      const t = agora();
      transacao(() => {
        // Substitui o intervalo inteiro: o que a Meta corrigiu depois também é corrigido aqui.
        db.prepare('DELETE FROM met_diarias WHERE conta_id = ? AND nivel = ? AND data BETWEEN ? AND ?').run(act, nivel, de, ate);
        for (const l of dados) {
          const nome = nivel === 'campaign' ? l.campaign_name : nivel === 'adset' ? l.adset_name : nivel === 'ad' ? l.ad_name : null;
          gravarDiaria.run(act, nivel, String(ID_NIVEL[nivel](l)), l.date_start, l.campaign_id || null, l.adset_id || null, nome || null, JSON.stringify(normalizar(l)), t);
        }
      });
      linhas += dados.length;
    }
    return linhas;
  };

  // Seguidores do perfil do Instagram: total atual (instagram_basic) e, se a permissão
  // instagram_manage_insights existir, os novos seguidores por dia. É o crescimento TOTAL do
  // perfil (orgânico + pago), sempre mostrado separado do que a Meta atribui aos anúncios.
  const sincronizarSeguidores = async (instagramId) => {
    if (!instagramId) return;
    const perfil = await graph(instagramId, { fields: 'followers_count' });
    if (num(perfil.followers_count) !== null)
      db.prepare('INSERT INTO met_seguidores (instagram_id, data, total, fonte) VALUES (?, ?, ?, ?) ON CONFLICT (instagram_id, data) DO UPDATE SET total = excluded.total')
        .run(instagramId, hoje(), num(perfil.followers_count), 'followers_count');
    try {
      const ate = Math.floor(Date.now() / 1000);
      const r = await graph(`${instagramId}/insights`, { metric: 'follower_count', period: 'day', since: String(ate - 29 * 86400), until: String(ate) });
      for (const m of r.data || []) {
        for (const v of m.values || []) {
          const data = String(v.end_time || '').slice(0, 10);
          if (dataValida(data) && num(v.value) !== null)
            db.prepare('INSERT INTO met_seguidores (instagram_id, data, novos, fonte) VALUES (?, ?, ?, ?) ON CONFLICT (instagram_id, data) DO UPDATE SET novos = excluded.novos')
              .run(instagramId, somarDias(data, -1), num(v.value), 'follower_count');
        }
      }
    } catch {
      // sem instagram_manage_insights: fica só o total (histórico vai se formando a cada sincronização)
    }
  };

  const emAndamento = new Set();
  const sincronizar = async (clienteId, { dias, origem = 'manual' } = {}) => {
    const cliente = ler('clientes', clienteId);
    const act = contaDoCliente(cliente);
    if (!act) throw new ErroMeta('Este cliente não tem conta de anúncios válida.', 400);
    if (emAndamento.has(act)) throw new ErroMeta('Já existe uma sincronização desta conta em andamento.', 409);
    const temHistorico = db.prepare('SELECT 1 FROM met_diarias WHERE conta_id = ? LIMIT 1').get(act);
    const n = dias ?? (temHistorico ? 35 : 90);
    const ate = hoje();
    const de = somarDias(ate, -(n - 1));
    const id = randomUUID();
    db.prepare('INSERT INTO met_sincronizacoes (id, conta_id, cliente_id, inicio, status, de, ate, origem) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(id, act, clienteId, agora(), 'executando', de, ate, origem);
    emAndamento.add(act);
    try {
      let linhas = await sincronizarObjetos(act);
      linhas += await sincronizarDiarias(act, de, ate);
      const avisos = [];
      try {
        await sincronizarSeguidores(cliente.metaInstagramId);
      } catch (falha) {
        avisos.push(`Seguidores do Instagram: ${falha.message}`);
      }
      db.prepare('DELETE FROM met_cache WHERE conta_id = ?').run(act);
      db.prepare('UPDATE met_sincronizacoes SET fim = ?, status = ?, linhas = ?, erro = ? WHERE id = ?').run(agora(), 'ok', linhas, avisos.length ? avisos.join(' | ') : null, id);
      return { id, status: 'ok', linhas, de, ate, avisos };
    } catch (falha) {
      db.prepare('UPDATE met_sincronizacoes SET fim = ?, status = ?, erro = ? WHERE id = ?').run(agora(), 'erro', String(falha?.message || falha).slice(0, 500), id);
      throw falha;
    } finally {
      emAndamento.delete(act);
    }
  };

  const ultimaSincronizacao = (act) => {
    const ok = db.prepare("SELECT fim, de, ate FROM met_sincronizacoes WHERE conta_id = ? AND status = 'ok' ORDER BY inicio DESC LIMIT 1").get(act);
    const ultima = db.prepare('SELECT inicio, fim, status, erro FROM met_sincronizacoes WHERE conta_id = ? ORDER BY inicio DESC LIMIT 1').get(act);
    return { em: ok?.fim || null, de: ok?.de || null, ate: ok?.ate || null, status: ultima?.status || null, erro: ultima?.status === 'erro' ? ultima.erro : null, tentativa: ultima?.inicio || null, executando: emAndamento.has(act) };
  };

  // Atualização automática: a cada 3 horas, uma conta por vez (respeita os limites da Meta).
  // Contas sem histórico baixam 90 dias; as demais, os últimos 3 dias (e 35 dias uma vez por dia).
  let rodada = false;
  const rodadaAutomatica = async () => {
    if (rodada) return;
    rodada = true;
    try {
      const clientes = listar('clientes').filter((c) => c.status !== 'encerrado' && contaDoCliente(c));
      const vistas = new Set();
      for (const c of clientes) {
        const act = contaDoCliente(c);
        if (vistas.has(act)) continue;
        vistas.add(act);
        const ultima = db.prepare("SELECT inicio FROM met_sincronizacoes WHERE conta_id = ? AND status = 'ok' AND julianday(ate) - julianday(de) >= 30 ORDER BY inicio DESC LIMIT 1").get(act);
        const completa = !ultima || Date.now() - Date.parse(ultima.inicio) > DIA;
        try {
          await sincronizar(c.id, { dias: completa ? undefined : 3, origem: 'automatica' });
        } catch (falha) {
          log(`métricas: ${c.nome}: ${falha.message}`);
          if (falha?.status === 429) break; // limite da Meta: tenta na próxima rodada
          if (falha?.status === 400 && /não está conectado|token/i.test(falha.message)) break;
        }
        await new Promise((r) => setTimeout(r, 2000));
      }
    } finally {
      rodada = false;
    }
  };
  const HORAS_AUTO = Number(process.env.KONEXT_METRICAS_HORAS || 3);
  if (HORAS_AUTO > 0) {
    setInterval(() => void rodadaAutomatica(), HORAS_AUTO * 60 * 60 * 1000).unref?.();
    setTimeout(() => void rodadaAutomatica(), 60 * 1000).unref?.();
  }

  // ---------- Consultas para os relatórios ----------
  // Totais do período vêm da Meta já agregados (alcance único correto). Ficam em cache até a
  // próxima sincronização (ou 30 min quando o período inclui hoje).
  const lerCache = (chave, validadeMs) => {
    const c = db.prepare('SELECT dados, em FROM met_cache WHERE chave = ?').get(chave);
    if (!c || Date.now() - Date.parse(c.em) > validadeMs) return null;
    return { dados: JSON.parse(c.dados), em: c.em };
  };
  const gravarCache = (chave, act, dados) => db.prepare('INSERT OR REPLACE INTO met_cache (chave, conta_id, dados, em) VALUES (?, ?, ?, ?)').run(chave, act, JSON.stringify(dados), agora());

  const agregadoDoPeriodo = async (act, nivel, de, ate, campanhaId) => {
    const chave = `agregado|${act}|${nivel}|${de}|${ate}|${campanhaId || ''}`;
    const validade = ate >= hoje() ? 30 * 60 * 1000 : 7 * DIA;
    const guardado = lerCache(chave, validade);
    if (guardado) return { linhas: guardado.dados, em: guardado.em, origem: 'meta' };
    try {
      const filtro = campanhaId ? [{ field: 'campaign.id', operator: 'IN', value: [campanhaId] }] : undefined;
      const dados = (await lerInsights(act, { nivel, de, ate, filtro })).map((l) => ({
        id: String(ID_NIVEL[nivel](l)),
        nome: l.campaign_name || l.adset_name || l.ad_name || null,
        campanhaId: l.campaign_id || null,
        conjuntoId: l.adset_id || null,
        n: normalizar(l),
      }));
      gravarCache(chave, act, dados);
      return { linhas: dados, em: agora(), origem: 'meta' };
    } catch (falha) {
      // Sem acesso à Meta agora: usa o histórico guardado (somas diárias; alcance fica indisponível).
      const nivelBanco = campanhaId && nivel === 'account' ? 'campaign' : nivel;
      const filtroCampanha = !campanhaId ? '' : nivelBanco === 'campaign' ? 'AND objeto_id = ?' : 'AND campanha_id = ?';
      const linhas = db
        .prepare(`SELECT objeto_id, nome, campanha_id, conjunto_id, dados FROM met_diarias WHERE conta_id = ? AND nivel = ? AND data BETWEEN ? AND ? ${filtroCampanha}`)
        .all(act, nivelBanco, de, ate, ...(campanhaId ? [campanhaId] : []));
      const porObjeto = new Map();
      for (const l of linhas) {
        const id = nivel === 'account' ? 'conta' : l.objeto_id;
        if (!porObjeto.has(id)) porObjeto.set(id, { id, nome: l.nome, campanhaId: l.campanha_id, conjuntoId: l.conjunto_id, lista: [] });
        porObjeto.get(id).lista.push(JSON.parse(l.dados));
      }
      const dados = [...porObjeto.values()].map((o) => {
        const s = somar(o.lista);
        if (o.lista.length > 1) s.alcance = null;
        return { id: o.id, nome: o.nome, campanhaId: o.campanhaId, conjuntoId: o.conjuntoId, n: s };
      });
      return { linhas: dados, em: null, origem: 'historico', erro: falha.message };
    }
  };

  const serieDiaria = (act, de, ate, campanhaId) => {
    const linhas = campanhaId
      ? db.prepare("SELECT data, dados FROM met_diarias WHERE conta_id = ? AND nivel = 'campaign' AND objeto_id = ? AND data BETWEEN ? AND ? ORDER BY data").all(act, campanhaId, de, ate)
      : db.prepare("SELECT data, dados FROM met_diarias WHERE conta_id = ? AND nivel = 'account' AND data BETWEEN ? AND ? ORDER BY data").all(act, de, ate);
    // Resultados por dia vêm das campanhas (o nível conta não traz "results").
    const resultadosDia = new Map();
    if (!campanhaId) {
      for (const l of db.prepare("SELECT data, dados FROM met_diarias WHERE conta_id = ? AND nivel = 'campaign' AND data BETWEEN ? AND ?").all(act, de, ate)) {
        const d = JSON.parse(l.dados);
        if (d.resultados === null || d.resultados === undefined) continue;
        const m = resultadosDia.get(l.data) || {};
        m[d.indicador || '?'] = (m[d.indicador || '?'] || 0) + d.resultados;
        resultadosDia.set(l.data, m);
      }
    }
    return linhas.map((l) => {
      const n = JSON.parse(l.dados);
      if (!campanhaId) {
        const m = resultadosDia.get(l.data) || {};
        n.resultadosPorTipo = m;
        const tipos = Object.keys(m);
        n.resultados = tipos.length ? Object.values(m).reduce((a, b) => a + b, 0) : null;
        n.indicador = tipos.length === 1 ? tipos[0] : '';
      }
      const d = derivar(n);
      return {
        data: l.data,
        gasto: d.gasto,
        impressoes: d.impressoes,
        alcance: d.alcance,
        cliquesLink: d.cliquesLink,
        ctrLink: d.ctrLink,
        cpm: d.cpm,
        resultados: d.resultados,
        custoPorResultado: d.custoPorResultado,
        visitasPerfil: d.visitasPerfil,
        seguidores: d.seguidores,
        reproducoes: d.video.reproducoes,
      };
    });
  };

  const segmentos = async (act, tipo, de, ate, campanhaId) => {
    const def = SEGMENTOS[tipo];
    if (!def) throw new ErroMeta('Segmento inválido.', 400);
    const chave = `segmento|${act}|${tipo}|${de}|${ate}|${campanhaId || ''}`;
    const guardado = lerCache(chave, ate >= hoje() ? 30 * 60 * 1000 : 7 * DIA);
    if (guardado) return guardado.dados;
    const filtro = campanhaId ? [{ field: 'campaign.id', operator: 'IN', value: [campanhaId] }] : undefined;
    const chaves = def.breakdowns.split(',');
    const chaveDe = (l) => chaves.map((c) => l[c] ?? '?').join(' · ');
    // Investimento, impressões e alcance único: nível conta (ou da campanha filtrada).
    // Resultados: por campanha, somados por segmento só quando o tipo de resultado é o mesmo.
    let base;
    let porCampanha = [];
    try {
      base = await lerInsights(act, { nivel: campanhaId ? 'campaign' : 'account', de, ate, breakdowns: def.breakdowns, filtro });
      porCampanha = campanhaId ? base : await lerInsights(act, { nivel: 'campaign', de, ate, breakdowns: def.breakdowns, filtro });
    } catch (falha) {
      return { tipo, rotulo: def.rotulo, itens: [], indisponivel: falha.message };
    }
    const resultadosSeg = new Map();
    for (const l of porCampanha) {
      const r = lerResultado(l.results);
      if (r.valor === null) continue;
      const k = chaveDe(l);
      const m = resultadosSeg.get(k) || {};
      m[r.indicador || '?'] = (m[r.indicador || '?'] || 0) + r.valor;
      resultadosSeg.set(k, m);
    }
    const itens = base.map((l) => {
      const n = normalizar(l);
      const m = resultadosSeg.get(chaveDe(l)) || {};
      const tipos = Object.keys(m);
      n.resultadosPorTipo = m;
      n.resultados = tipos.length === 1 ? m[tipos[0]] : null;
      n.indicador = tipos.length === 1 ? tipos[0] : '';
      const d = derivar(n);
      return {
        segmento: chaveDe(l),
        gasto: d.gasto,
        impressoes: d.impressoes,
        alcance: d.alcance,
        cliquesLink: d.cliquesLink,
        ctrLink: d.ctrLink,
        resultados: d.resultados,
        tipoResultado: d.tipoResultado,
        resultadosPorTipo: d.resultadosPorTipo,
        custoPorResultado: d.custoPorResultado,
      };
    });
    itens.sort((a, b) => b.impressoes - a.impressoes);
    const resultado = { tipo, rotulo: def.rotulo, itens };
    gravarCache(chave, act, resultado);
    return resultado;
  };

  const seguidoresDoPerfil = (instagramId, de, ate) => {
    if (!instagramId) return { disponivel: false, motivo: 'O cliente não tem perfil do Instagram validado (Anúncios → Contas).' };
    const linhas = db.prepare('SELECT data, total, novos FROM met_seguidores WHERE instagram_id = ? AND data BETWEEN ? AND ? ORDER BY data').all(instagramId, somarDias(de, -1), ate);
    const ultimo = db.prepare('SELECT data, total FROM met_seguidores WHERE instagram_id = ? AND total IS NOT NULL ORDER BY data DESC LIMIT 1').get(instagramId);
    if (!linhas.length && !ultimo) return { disponivel: false, motivo: 'Ainda não há leitura de seguidores. Ela acontece a cada sincronização.' };
    const novos = linhas.filter((l) => l.novos !== null && l.data >= de);
    const totais = linhas.filter((l) => l.total !== null);
    return {
      disponivel: true,
      totalAtual: ultimo?.total ?? null,
      totalEm: ultimo?.data ?? null,
      novosNoPeriodo: novos.length ? novos.reduce((t, l) => t + l.novos, 0) : null,
      diasComNovos: novos.length,
      variacaoTotal: totais.length >= 2 ? totais[totais.length - 1].total - totais[0].total : null,
      historico: linhas.map((l) => ({ data: l.data, total: l.total, novos: l.novos })),
    };
  };

  // ---------- Montagem do relatório ----------
  const periodoAnterior = (de, ate) => {
    const n = diasEntre(de, ate);
    return { de: somarDias(de, -n), ate: somarDias(de, -1) };
  };

  const montarRelatorio = async (cliente, { de, ate, comparar = true, campanhaId = null, secoes = SECOES, admin = false }) => {
    const act = contaDoCliente(cliente);
    if (!act) throw new ErroMeta('Este cliente não tem conta de anúncios ligada.', 409);
    const quer = (s) => secoes.includes(s);
    const avisos = [];
    if (campanhaId) {
      const existe = db.prepare("SELECT 1 FROM met_objetos WHERE conta_id = ? AND nivel = 'campaign' AND objeto_id = ?").get(act, campanhaId);
      if (!existe) throw new ErroMeta('Campanha não encontrada nesta conta.', 404);
    }
    const contaTotal = await agregadoDoPeriodo(act, campanhaId ? 'campaign' : 'account', de, ate, campanhaId);
    const camp = await agregadoDoPeriodo(act, 'campaign', de, ate, campanhaId);
    if (contaTotal.origem === 'historico' || camp.origem === 'historico') avisos.push(`Não foi possível consultar a Meta agora (${contaTotal.erro || camp.erro}). Mostrando o histórico guardado; o alcance do período fica indisponível.`);
    // Resultados no total: soma das campanhas, por tipo (nunca mistura tipos diferentes).
    const totalBruto = contaTotal.linhas[0]?.n || somar([]);
    const porTipo = {};
    for (const c of camp.linhas) if (c.n.resultados !== null && c.n.resultados !== undefined) porTipo[c.n.indicador || '?'] = (porTipo[c.n.indicador || '?'] || 0) + c.n.resultados;
    const tipos = Object.keys(porTipo);
    const totalN = { ...totalBruto, resultadosPorTipo: porTipo, resultados: tipos.length === 1 ? porTipo[tipos[0]] : null, indicador: tipos.length === 1 ? tipos[0] : '' };
    // Visitas/seguidores no total: soma das campanhas (ações são contagens, podem somar).
    const acoesCamp = somar(camp.linhas.map((c) => c.n)).acoes;
    totalN.acoes = { ...totalN.acoes, ...Object.fromEntries(Object.entries(acoesCamp).filter(([k]) => ehVisitaPerfil(k) || ehSeguidor(k))) };
    const resumo = derivar(totalN);

    let anterior = null;
    let periodoAnt = null;
    if (comparar) {
      periodoAnt = periodoAnterior(de, ate);
      try {
        const a = await agregadoDoPeriodo(act, campanhaId ? 'campaign' : 'account', periodoAnt.de, periodoAnt.ate, campanhaId);
        const ac = await agregadoDoPeriodo(act, 'campaign', periodoAnt.de, periodoAnt.ate, campanhaId);
        const pt = {};
        for (const c of ac.linhas) if (c.n.resultados !== null && c.n.resultados !== undefined) pt[c.n.indicador || '?'] = (pt[c.n.indicador || '?'] || 0) + c.n.resultados;
        const tt = Object.keys(pt);
        const an = { ...(a.linhas[0]?.n || somar([])), resultadosPorTipo: pt, resultados: tt.length === 1 ? pt[tt[0]] : null, indicador: tt.length === 1 ? tt[0] : '' };
        an.acoes = { ...an.acoes, ...Object.fromEntries(Object.entries(somar(ac.linhas.map((c) => c.n)).acoes).filter(([k]) => ehVisitaPerfil(k) || ehSeguidor(k))) };
        anterior = a.linhas.length || ac.linhas.length ? derivar(an) : null;
      } catch (falha) {
        avisos.push(`Comparação com o período anterior indisponível: ${falha.message}`);
      }
    }

    const objetos = new Map(db.prepare('SELECT * FROM met_objetos WHERE conta_id = ?').all(act).map((o) => [`${o.nivel}:${o.objeto_id}`, o]));
    const campanhas = camp.linhas
      .map((c) => {
        const o = objetos.get(`campaign:${c.id}`) || {};
        return {
          id: c.id,
          nome: c.nome || o.nome || 'Campanha',
          procedimento: procedimentoDe(c.nome || o.nome),
          status: o.status || '',
          objetivo: o.objetivo || '',
          orcamentoDiario: o.orcamento_diario ?? null,
          orcamentoTotal: o.orcamento_total ?? null,
          m: derivar(c.n),
        };
      })
      .sort((a, b) => b.m.gasto - a.m.gasto);

    const relatorio = {
      cliente: { id: cliente.id, nome: cliente.nome, cor: cliente.cor, instagram: cliente.metaInstagramUsuario || null },
      periodo: { de, ate, dias: diasEntre(de, ate) },
      anterior: periodoAnt,
      sincronizacao: ultimaSincronizacao(act),
      consultadoEm: contaTotal.em,
      secoes,
      avisos,
      resumo,
      resumoAnterior: anterior,
      campanhas: quer('comparativo') || quer('destaques') || quer('alertas') || quer('perfil') || quer('seguidores') || admin ? campanhas : [],
    };
    if (quer('evolucao') || admin) relatorio.serie = serieDiaria(act, de, ate, campanhaId);
    if (quer('seguidores') || admin) relatorio.seguidoresPerfil = seguidoresDoPerfil(cliente.metaInstagramId, de, ate);
    if (quer('videos') || admin) {
      const ads = await agregadoDoPeriodo(act, 'ad', de, ate, campanhaId);
      relatorio.videos = ads.linhas
        .filter((a) => (a.n.video?.reproducoes ?? 0) > 0)
        .map((a) => {
          const o = objetos.get(`ad:${a.id}`) || {};
          const extra = JSON.parse(o.extra || '{}');
          const cmp = objetos.get(`campaign:${a.campanhaId}`) || {};
          const cj = objetos.get(`adset:${a.conjuntoId}`) || {};
          return { id: a.id, nome: a.nome || o.nome || 'Anúncio', campanha: cmp.nome || '', conjunto: cj.nome || '', miniatura: extra.miniatura || null, m: derivar(a.n) };
        })
        .sort((a, b) => (b.m.video.reproducoes ?? 0) - (a.m.video.reproducoes ?? 0))
        .slice(0, 30);
    }
    if (admin) {
      const conj = await agregadoDoPeriodo(act, 'adset', de, ate, campanhaId);
      relatorio.conjuntos = conj.linhas.map((c) => {
        const o = objetos.get(`adset:${c.id}`) || {};
        return { id: c.id, nome: c.nome || o.nome, campanhaId: c.campanhaId, status: o.status || '', orcamentoDiario: o.orcamento_diario ?? null, m: derivar(c.n) };
      });
      const ads = await agregadoDoPeriodo(act, 'ad', de, ate, campanhaId);
      relatorio.anuncios = ads.linhas.map((a) => {
        const o = objetos.get(`ad:${a.id}`) || {};
        return { id: a.id, nome: a.nome || o.nome, campanhaId: a.campanhaId, conjuntoId: a.conjuntoId, status: o.status || '', miniatura: JSON.parse(o.extra || '{}').miniatura || null, m: derivar(a.n) };
      });
      relatorio.contaId = act;
    }
    if (quer('publico') || admin) {
      relatorio.segmentos = {};
      for (const tipo of Object.keys(SEGMENTOS)) relatorio.segmentos[tipo] = await segmentos(act, tipo, de, ate, campanhaId);
    }
    return relatorio;
  };

  // ---------- Portal do cliente ----------
  const configRelatorio = (cliente) => {
    const config = lerConfig() || {};
    const modelos = Array.isArray(config.modelosRelatorio) ? config.modelosRelatorio : [];
    const pref = cliente.relatorio || {};
    const modelo = modelos.find((m) => m.id === pref.modeloId);
    const secoes = (Array.isArray(pref.secoes) && pref.secoes.length ? pref.secoes : modelo?.secoes || SECOES_PADRAO).filter((s) => SECOES.includes(s));
    const metricas = (Array.isArray(pref.metricas) && pref.metricas.length ? pref.metricas : modelo?.metricas || []).filter((m) => typeof m === 'string' && /^\w{1,40}$/.test(m)).slice(0, 24);
    return { secoes, metricas, titulo: pref.titulo || '', mensagem: pref.mensagem || '', config };
  };

  const gerarPortal = (clienteId) => {
    const cliente = ler('clientes', clienteId);
    if (!cliente) throw new ErroMeta('Cliente não encontrado.', 404);
    const act = contaDoCliente(cliente);
    if (!act) throw new ErroMeta('Ligue uma conta de anúncios a este cliente antes de gerar o link.', 409);
    if (donosDaConta(act).length > 1) throw new ErroMeta(`A conta ${act} está ligada a mais de um cliente. Corrija antes de gerar o link (cada conta precisa ter um único dono).`, 409);
    const token = randomBytes(24).toString('base64url');
    db.prepare('INSERT OR REPLACE INTO portais (cliente_id, token_hash, token_cifrado, criado_em, ultimo_acesso, acessos) VALUES (?, ?, ?, ?, NULL, 0)').run(clienteId, hash(token), cifrar(token), agora());
    log(`portal gerado para ${cliente.nome}`);
    return token;
  };

  const tokenDoPortal = (clienteId) => {
    const p = db.prepare('SELECT token_cifrado FROM portais WHERE cliente_id = ?').get(clienteId);
    return p ? decifrar(p.token_cifrado) : null;
  };

  const portalPorToken = (token) => {
    if (typeof token !== 'string' || !/^[\w-]{20,64}$/.test(token)) return null;
    const p = db.prepare('SELECT cliente_id FROM portais WHERE token_hash = ?').get(hash(token));
    if (!p) return null;
    const cliente = ler('clientes', p.cliente_id);
    if (!cliente || cliente.status === 'encerrado') return null;
    return cliente;
  };

  // Limite por IP no portal público: 60 consultas por minuto.
  const acessosIp = new Map();
  const podeAcessar = (ip) => {
    const t = Date.now();
    const r = acessosIp.get(ip);
    if (!r || r.desde < t - 60 * 1000) {
      acessosIp.set(ip, { desde: t, vezes: 1 });
      if (acessosIp.size > 5000) acessosIp.clear();
      return true;
    }
    r.vezes += 1;
    return r.vezes <= 60;
  };

  const lerPeriodo = (url, padraoDias = 30) => {
    const ateP = url.searchParams.get('ate');
    const deP = url.searchParams.get('de');
    const ate = dataValida(ateP) ? ateP : hoje();
    const de = dataValida(deP) ? deP : somarDias(ate, -(padraoDias - 1));
    if (de > ate) throw new ErroMeta('O início do período precisa ser antes do fim.', 400);
    if (diasEntre(de, ate) > 400) throw new ErroMeta('Escolha um período de até 400 dias.', 400);
    if (ate > somarDias(hoje(), 1)) throw new ErroMeta('O período não pode terminar no futuro.', 400);
    return { de, ate };
  };

  const relatorioPublico = async (token, url) => {
    const cliente = portalPorToken(token);
    if (!cliente) throw new ErroMeta('Link inválido ou revogado. Peça um novo link à agência.', 404);
    const act = contaDoCliente(cliente);
    if (!act) throw new ErroMeta('Os resultados deste cliente ainda não estão disponíveis.', 409);
    if (donosDaConta(act).length > 1) throw new ErroMeta('Os resultados estão temporariamente indisponíveis.', 409);
    const { de, ate } = lerPeriodo(url);
    const { secoes, metricas, titulo, mensagem, config } = configRelatorio(cliente);
    db.prepare('UPDATE portais SET ultimo_acesso = ?, acessos = acessos + 1 WHERE cliente_id = ?').run(agora(), cliente.id);
    const r = await montarRelatorio(cliente, { de, ate, secoes, comparar: true });
    // Nada de IDs internos da agência: só o que o cliente precisa ver.
    return {
      ...r,
      cliente: { nome: cliente.nome, cor: cliente.cor, instagram: cliente.metaInstagramUsuario || null },
      titulo,
      mensagem,
      metricas,
      agencia: { nome: config.empresa || 'Konext', logo: config.logo || '' },
      parametros: config.performance || null,
      avisos: r.avisos.map((a) =>
        /^Não foi possível consultar a Meta/.test(a)
          ? 'Não foi possível atualizar os números com a Meta agora. Mostrando os dados da última atualização; o alcance do período fica indisponível até a próxima.'
          : /^Comparação/.test(a)
            ? 'A comparação com o período anterior está indisponível no momento.'
            : a.replace(/\(Meta:.*?\)/g, '').trim(),
      ),
      sincronizacao: { em: r.sincronizacao.em },
    };
  };

  // ---------- Rotas ----------
  const rotasAdmin = async ({ req, metodo, rota, lerCorpo, responder, res }) => {
    const url = new URL(req.url, 'http://local');
    let m;
    if (rota === '/estado' && metodo === 'GET') {
      const portais = new Map(db.prepare('SELECT cliente_id, criado_em, ultimo_acesso, acessos FROM portais').all().map((p) => [p.cliente_id, p]));
      const clientes = listar('clientes')
        .filter((c) => c.status !== 'encerrado')
        .map((c) => {
          const act = contaDoCliente(c);
          const p = portais.get(c.id);
          return {
            clienteId: c.id,
            contaId: act,
            contaCompartilhada: act ? donosDaConta(act).length > 1 : false,
            sincronizacao: act ? ultimaSincronizacao(act) : null,
            portal: p ? { criadoEm: p.criado_em, ultimoAcesso: p.ultimo_acesso, acessos: p.acessos } : null,
          };
        });
      responder(res, 200, { clientes, automaticaHoras: HORAS_AUTO });
      return true;
    }
    if (rota === '/sincronizar' && metodo === 'POST') {
      const corpo = await lerCorpo(10 * 1024);
      const dias = corpo.dias ? Math.min(400, Math.max(1, Number(corpo.dias) || 35)) : undefined;
      responder(res, 200, await sincronizar(String(corpo.clienteId || ''), { dias }));
      return true;
    }
    if (rota === '/painel' && metodo === 'GET') {
      const cliente = ler('clientes', url.searchParams.get('clienteId') || '');
      if (!cliente) throw new ErroMeta('Cliente não encontrado.', 404);
      const { de, ate } = lerPeriodo(url);
      const campanhaId = url.searchParams.get('campanhaId') || null;
      responder(res, 200, await montarRelatorio(cliente, { de, ate, campanhaId, comparar: url.searchParams.get('comparar') !== '0', admin: true }));
      return true;
    }
    if ((m = rota.match(/^\/portais\/([\w-]+)$/))) {
      if (metodo === 'POST') {
        responder(res, 200, { token: gerarPortal(m[1]) });
        return true;
      }
      if (metodo === 'GET') {
        const token = tokenDoPortal(m[1]);
        if (!token) throw new ErroMeta('Este cliente ainda não tem link.', 404);
        responder(res, 200, { token });
        return true;
      }
      if (metodo === 'DELETE') {
        db.prepare('DELETE FROM portais WHERE cliente_id = ?').run(m[1]);
        log(`portal revogado: ${m[1]}`);
        responder(res, 204);
        return true;
      }
    }
    return false;
  };

  return { rotasAdmin, relatorioPublico, podeAcessar, sincronizar, montarRelatorio, gerarPortal, portalPorToken };
};
