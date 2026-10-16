// Servidor do Konext Gestão: entrega o site, guarda os dados num SQLite e
// conversa com a Meta (Marketing API) sem expor o token para o navegador.
// Só usa módulos do próprio Node (24+), sem dependências para instalar.
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import { gzip } from 'node:zlib';
import { promisify } from 'node:util';

import { criarAnuncios } from './anuncios.mjs';
import { criarWebhooks } from './webhooks.mjs';

const gzipAsync = promisify(gzip);
const AQUI = fileURLToPath(new URL('.', import.meta.url));

// ---------- Configuração (variáveis de ambiente) ----------
const PORTA = Number(process.env.PORT || 3000);
const PASTA_DADOS = resolve(process.env.KONEXT_DADOS || join(AQUI, '..', 'dados'));
const PASTA_SITE = resolve(process.env.KONEXT_SITE || join(AQUI, '..', 'dist'));
const SENHA = process.env.KONEXT_SENHA || '';
const DIAS_SESSAO = 30;
// KONEXT_GRAPH_URL só serve para testes com uma Meta falsa.
const GRAPH = process.env.KONEXT_GRAPH_URL || 'https://graph.facebook.com/v22.0';

const log = (...partes) => console.log(new Date().toISOString(), ...partes);

if (SENHA.length < 8) {
  console.error('\n[konext] Defina a variável KONEXT_SENHA com pelo menos 8 caracteres (é a senha para entrar no sistema).\n');
  process.exit(1);
}
if (!existsSync(join(PASTA_SITE, 'index.html'))) {
  console.error(`\n[konext] Não achei o site em ${PASTA_SITE}. Rode "npm run build" antes.\n`);
  process.exit(1);
}
mkdirSync(PASTA_DADOS, { recursive: true });

// Segredo para assinar a sessão e cifrar o token da Meta. Se não vier por variável,
// é criado uma vez e guardado junto com os dados (assim sobrevive a atualizações).
const lerSegredo = () => {
  if (process.env.KONEXT_SEGREDO && process.env.KONEXT_SEGREDO.length >= 16) return process.env.KONEXT_SEGREDO;
  const arquivo = join(PASTA_DADOS, 'segredo.txt');
  if (existsSync(arquivo)) return readFileSync(arquivo, 'utf8').trim();
  const novo = randomBytes(32).toString('hex');
  writeFileSync(arquivo, novo, { mode: 0o600 });
  return novo;
};
const SEGREDO = lerSegredo();

// ---------- Banco de dados ----------
const db = new DatabaseSync(join(PASTA_DADOS, 'konext.db'));
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA busy_timeout = 5000;
  PRAGMA synchronous = NORMAL;
  CREATE TABLE IF NOT EXISTS registros (
    colecao TEXT NOT NULL,
    id TEXT NOT NULL,
    dados TEXT NOT NULL,
    atualizado_em TEXT NOT NULL,
    PRIMARY KEY (colecao, id)
  );
  CREATE TABLE IF NOT EXISTS chaves (chave TEXT PRIMARY KEY, valor TEXT NOT NULL);
`);

const COLECOES = ['clientes', 'servicos', 'entregas', 'quadros', 'lancamentos', 'processos', 'rotina'];
const sql = {
  todos: db.prepare('SELECT colecao, dados FROM registros ORDER BY rowid'),
  gravar: db.prepare(
    `INSERT INTO registros (colecao, id, dados, atualizado_em) VALUES (?, ?, ?, ?)
     ON CONFLICT (colecao, id) DO UPDATE SET dados = excluded.dados, atualizado_em = excluded.atualizado_em`,
  ),
  apagar: db.prepare('DELETE FROM registros WHERE colecao = ? AND id = ?'),
  apagarTudo: db.prepare('DELETE FROM registros'),
  lerChave: db.prepare('SELECT valor FROM chaves WHERE chave = ?'),
  gravarChave: db.prepare('INSERT INTO chaves (chave, valor) VALUES (?, ?) ON CONFLICT (chave) DO UPDATE SET valor = excluded.valor'),
  apagarChave: db.prepare('DELETE FROM chaves WHERE chave = ?'),
};

const lerChave = (chave) => sql.lerChave.get(chave)?.valor ?? null;
const webhooks = criarWebhooks({ db, lerChave, gravarChave: (chave, valor) => sql.gravarChave.run(chave, valor), log, assinar: (texto) => assinar(texto) });

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

const lerTudo = () => {
  const dados = Object.fromEntries(COLECOES.map((c) => [c, []]));
  for (const linha of sql.todos.all()) {
    if (dados[linha.colecao]) dados[linha.colecao].push(JSON.parse(linha.dados));
  }
  const config = lerChave('config');
  if (config) dados.config = JSON.parse(config);
  return dados;
};

// Cópia automática do banco uma vez por dia (guarda as últimas 14).
const PASTA_COPIAS = join(PASTA_DADOS, 'copias');
const fazerCopia = () => {
  try {
    mkdirSync(PASTA_COPIAS, { recursive: true });
    const nome = `konext-${new Date().toISOString().slice(0, 10)}.db`;
    const destino = join(PASTA_COPIAS, nome);
    if (existsSync(destino)) return;
    db.exec(`VACUUM INTO '${destino.replace(/'/g, "''")}'`);
    const copias = readdirSync(PASTA_COPIAS).filter((n) => n.endsWith('.db')).sort();
    for (const antiga of copias.slice(0, Math.max(0, copias.length - 14))) rmSync(join(PASTA_COPIAS, antiga));
    log('cópia de segurança criada:', nome);
  } catch (falha) {
    log('falha ao criar cópia de segurança:', falha.message);
  }
};
fazerCopia();
setInterval(fazerCopia, 60 * 60 * 1000).unref();

// ---------- Sessão ----------
const COOKIE = 'konext_sessao';
const impressaoSenha = createHash('sha256').update(`senha:${SENHA}`).digest('hex').slice(0, 16);
const assinar = (texto) => createHmac('sha256', SEGREDO).update(texto).digest('base64url');

const criarSessao = () => {
  const expira = Date.now() + DIAS_SESSAO * 24 * 60 * 60 * 1000;
  return `${expira}.${assinar(`sessao.${expira}.${impressaoSenha}`)}`;
};

const lerCookies = (req) =>
  Object.fromEntries(
    (req.headers.cookie || '')
      .split(';')
      .map((p) => p.trim().split('='))
      .filter(([k, v]) => k && v)
      .map(([k, ...v]) => [k, decodeURIComponent(v.join('='))]),
  );

const iguais = (a, b) => {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && timingSafeEqual(x, y);
};

const sessaoValida = (req) => {
  const valor = lerCookies(req)[COOKIE];
  if (!valor) return false;
  const [expira, assinatura] = valor.split('.');
  if (!expira || !assinatura || Number(expira) < Date.now()) return false;
  return iguais(assinatura, assinar(`sessao.${expira}.${impressaoSenha}`));
};

const ehHttps = (req) => (req.headers['x-forwarded-proto'] || '').split(',')[0].trim() === 'https';
const cookieSessao = (req, valor, maxAge) =>
  `${COOKIE}=${valor}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${ehHttps(req) ? '; Secure' : ''}`;

// Limite de tentativas de senha por IP: 10 a cada 15 minutos.
const tentativas = new Map();
const ipDe = (req) => (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress || '?';
const podeTentar = (ip) => {
  const agora = Date.now();
  const registro = tentativas.get(ip);
  if (!registro || registro.desde < agora - 15 * 60 * 1000) {
    tentativas.set(ip, { desde: agora, vezes: 0 });
    return true;
  }
  return registro.vezes < 10;
};
const registrarErro = (ip) => {
  const registro = tentativas.get(ip);
  if (registro) registro.vezes += 1;
};

// ---------- Token da Meta (cifrado no banco) ----------
const chaveCifra = createHash('sha256').update(`meta:${SEGREDO}`).digest();
const cifrar = (texto) => {
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', chaveCifra, iv);
  const corpo = Buffer.concat([c.update(texto, 'utf8'), c.final()]);
  return [iv, c.getAuthTag(), corpo].map((b) => b.toString('base64')).join('.');
};
const decifrar = (pacote) => {
  try {
    const [iv, tag, corpo] = pacote.split('.').map((p) => Buffer.from(p, 'base64'));
    const d = createDecipheriv('aes-256-gcm', chaveCifra, iv);
    d.setAuthTag(tag);
    return Buffer.concat([d.update(corpo), d.final()]).toString('utf8');
  } catch {
    return null;
  }
};
const tokenMeta = () => {
  const guardado = lerChave('meta_token');
  return guardado ? decifrar(guardado) : null;
};

class ErroMeta extends Error {
  constructor(mensagem, status = 502, detalhe = null) {
    super(mensagem);
    this.status = status;
    // O que a Meta respondeu (código, subcódigo, mensagem). Nunca inclui o token.
    this.detalhe = detalhe;
  }
}

const limparTextoMeta = (texto) => String(texto || '').replace(/EAA[A-Za-z0-9]+/g, '[token]').slice(0, 400);

// Traduz os códigos de erro da Graph API para algo que dá para agir, guardando o original.
const traduzirErroMeta = (erro) => {
  const codigo = Number(erro?.code);
  const detalhe = {
    codigo: Number.isFinite(codigo) ? codigo : null,
    subcodigo: erro?.error_subcode ?? null,
    tipo: erro?.type ?? null,
    mensagem: limparTextoMeta(erro?.error_user_msg || erro?.message),
    titulo: limparTextoMeta(erro?.error_user_title),
    rastreio: erro?.fbtrace_id ?? null,
  };
  const com = (texto, status) => new ErroMeta(`${texto} (Meta: ${detalhe.mensagem || 'sem detalhe'} · código ${detalhe.codigo ?? '?'}${detalhe.subcodigo ? `/${detalhe.subcodigo}` : ''})`, status, detalhe);
  if ([102, 190, 463, 467].includes(codigo)) return com('O token do Meta expirou ou é inválido. Gere um novo e salve em Configurações → Integrações.', 400);
  if ([10, 200, 272, 294].includes(codigo) || (codigo >= 200 && codigo < 300))
    return com('Sem permissão para isso. Confira se o usuário do sistema tem acesso a este ativo e se o token tem a permissão necessária.', 403);
  if ([4, 17, 32, 613].includes(codigo) || (codigo >= 80000 && codigo <= 80014)) return com('A Meta limitou as consultas por alguns minutos. Tente de novo daqui a pouco.', 429);
  if (codigo === 100) return com('A Meta recusou o pedido (ID inexistente, sem acesso ou campo inválido).', 400);
  return com('A Meta respondeu com erro.', 502);
};

// Uso dos limites da API informado pela Meta na última resposta (para a tela de diagnóstico).
const usoMeta = { app: null, contas: null, negocio: null, em: null };
const lerUso = (resposta) => {
  const json = (nome) => {
    try {
      const valor = resposta.headers.get(nome);
      return valor ? JSON.parse(valor) : null;
    } catch {
      return null;
    }
  };
  const app = json('x-app-usage');
  const contas = json('x-ad-account-usage');
  const negocio = json('x-business-use-case-usage');
  if (app || contas || negocio) Object.assign(usoMeta, { app: app ?? usoMeta.app, contas: contas ?? usoMeta.contas, negocio: negocio ?? usoMeta.negocio, em: new Date().toISOString() });
};

const graph = async (caminho, params, token = tokenMeta(), opcoes = {}) => {
  if (!token) throw new ErroMeta('O Meta Ads ainda não está conectado. Vá em Configurações → Integrações.', 400);
  const url = new URL(`${GRAPH}/${caminho}`);
  for (const [k, v] of Object.entries(params || {})) url.searchParams.set(k, typeof v === 'string' ? v : JSON.stringify(v));
  const itens = [];
  let proxima = url.toString();
  const maxPaginas = opcoes.maxPaginas ?? 20;
  for (let pagina = 0; proxima && pagina < maxPaginas; pagina += 1) {
    let resposta;
    try {
      resposta = await fetch(proxima, { headers: { authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(25000) });
    } catch (falha) {
      const causa = falha?.name === 'TimeoutError' ? 'a Meta demorou mais de 25s' : falha?.cause?.code || falha?.message || 'erro de rede';
      throw new ErroMeta(`Não foi possível falar com a Meta agora (${causa}). Tente de novo em instantes.`, 504, { codigo: null, mensagem: String(causa) });
    }
    lerUso(resposta);
    const corpo = await resposta.json().catch(() => ({}));
    if (!resposta.ok || corpo.error) throw traduzirErroMeta(corpo.error);
    if (!Array.isArray(corpo.data)) return corpo;
    itens.push(...corpo.data);
    proxima = corpo.paging?.next || null;
  }
  return { data: itens };
};

const normalizarConta = (conta) => {
  const limpa = String(conta || '').trim().replace(/^act_/, '');
  if (!/^\d{3,25}$/.test(limpa)) throw new ErroMeta('ID da conta de anúncios inválido. Use o formato act_123456789.', 400);
  return `act_${limpa}`;
};

const lerRegistro = (colecao, id) => {
  const linha = db.prepare('SELECT dados FROM registros WHERE colecao = ? AND id = ?').get(colecao, id);
  return linha ? JSON.parse(linha.dados) : null;
};
const listarRegistros = (colecao) => db.prepare('SELECT dados FROM registros WHERE colecao = ? ORDER BY rowid').all(colecao).map((l) => JSON.parse(l.dados));
const anuncios = criarAnuncios({
  graph,
  ErroMeta,
  normalizarConta,
  usoMeta,
  tokenMeta,
  ler: lerRegistro,
  listar: listarRegistros,
  gravar: (colecao, item) => sql.gravar.run(colecao, item.id, JSON.stringify(item), new Date().toISOString()),
  log,
});

const rotuloResultado = (indicador = '') => {
  if (indicador.includes('messaging_conversation_started')) return 'Conversas no WhatsApp';
  if (indicador.includes('lead')) return 'Leads';
  if (indicador.includes('purchase')) return 'Compras';
  if (indicador.includes('link_click')) return 'Cliques no link';
  if (indicador.includes('landing_page_view')) return 'Visitas à página';
  if (indicador.includes('reach')) return 'Alcance';
  if (indicador.includes('video')) return 'Visualizações';
  if (indicador.includes('engagement')) return 'Engajamentos';
  if (indicador.includes('follow') || indicador.includes('like')) return 'Seguidores';
  return indicador ? indicador.replace(/^actions:/, '') : 'Resultados';
};

const numero = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

// "results" e "cost_per_result" vêm como [{ indicator, values: [{ value }] }] e podem faltar.
const lerResultado = (lista) => {
  if (!Array.isArray(lista) || lista.length === 0) return { valor: null, indicador: '' };
  const primeiro = lista[0];
  const valores = Array.isArray(primeiro.values) ? primeiro.values : primeiro.value !== undefined ? [{ value: primeiro.value }] : [];
  if (valores.length === 0) return { valor: null, indicador: primeiro.indicator || '' };
  const soma = valores.reduce((total, v) => total + (numero(v.value) ?? 0), 0);
  return { valor: soma, indicador: primeiro.indicator || '' };
};

const STATUS_CAMPANHA = (efetivo) => {
  if (efetivo === 'ACTIVE' || efetivo === 'IN_PROCESS' || efetivo === 'WITH_ISSUES') return 'ATIVA';
  if (String(efetivo).includes('PAUSED')) return 'PAUSADA';
  return 'ENCERRADA';
};

const CAMPOS_INSIGHTS = ['campaign_id', 'campaign_name', 'spend', 'impressions', 'reach', 'clicks', 'cpm', 'ctr', 'cpc', 'frequency'];

const cacheCampanhas = new Map();
const lerCampanhasMeta = async (conta, de, ate) => {
  const act = normalizarConta(conta);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(de) || !/^\d{4}-\d{2}-\d{2}$/.test(ate)) throw new ErroMeta('Período inválido.', 400);
  const chave = `${act}|${de}|${ate}`;
  const guardado = cacheCampanhas.get(chave);
  if (guardado && guardado.em > Date.now() - 2 * 60 * 1000) return guardado.campanhas;

  const base = { level: 'campaign', time_range: { since: de, until: ate }, limit: '500' };
  const [campanhas, insights] = await Promise.all([
    graph(`${act}/campaigns`, { fields: 'id,name,status,effective_status,objective', limit: '500' }),
    graph(`${act}/insights`, { ...base, fields: [...CAMPOS_INSIGHTS, 'results', 'cost_per_result'].join(',') }).catch((falha) => {
      // Contas/versões sem "results": lê o resto e deixa os resultados em branco.
      if (falha instanceof ErroMeta && falha.detalhe?.codigo === 100) {
        return graph(`${act}/insights`, { ...base, fields: CAMPOS_INSIGHTS.join(',') });
      }
      throw falha;
    }),
  ]);

  const porId = new Map(campanhas.data.map((c) => [c.id, c]));
  const lista = insights.data.map((linha) => {
    const campanha = porId.get(linha.campaign_id) || {};
    const resultado = lerResultado(linha.results);
    const custo = lerResultado(linha.cost_per_result);
    return {
      id: linha.campaign_id,
      nome: linha.campaign_name || campanha.name || 'Campanha',
      status: STATUS_CAMPANHA(campanha.effective_status || campanha.status),
      objetivo: campanha.objective || '',
      investimento: numero(linha.spend) ?? 0,
      impressoes: numero(linha.impressions) ?? 0,
      alcance: numero(linha.reach) ?? 0,
      cliques: numero(linha.clicks) ?? 0,
      cpm: numero(linha.cpm),
      ctr: numero(linha.ctr),
      cpc: numero(linha.cpc),
      frequencia: numero(linha.frequency),
      resultados: resultado.valor,
      tipoResultado: rotuloResultado(resultado.indicador || custo.indicador),
      custoPorResultado: custo.valor ?? (resultado.valor ? (numero(linha.spend) ?? 0) / resultado.valor : null),
    };
  });
  cacheCampanhas.set(chave, { em: Date.now(), campanhas: lista });
  if (cacheCampanhas.size > 300) cacheCampanhas.delete(cacheCampanhas.keys().next().value);
  return lista;
};

// ---------- HTTP ----------
const responder = (res, status, corpo, cabecalhos = {}) => {
  const texto = corpo === undefined ? '' : JSON.stringify(corpo);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    ...cabecalhos,
  });
  res.end(texto);
};

const lerCorpo = (req, limite) =>
  new Promise((ok, falhou) => {
    const partes = [];
    let tamanho = 0;
    req.on('data', (parte) => {
      tamanho += parte.length;
      if (tamanho > limite) {
        falhou(Object.assign(new Error('Conteúdo grande demais'), { status: 413 }));
        req.destroy();
        return;
      }
      partes.push(parte);
    });
    req.on('end', () => {
      try {
        ok(partes.length ? JSON.parse(Buffer.concat(partes).toString('utf8')) : {});
      } catch {
        falhou(Object.assign(new Error('JSON inválido'), { status: 400 }));
      }
    });
    req.on('error', falhou);
  });

const MB = 1024 * 1024;

const api = async (req, res, caminho) => {
  const metodo = req.method;

  if (caminho === '/api/saude') return responder(res, 200, { app: 'konext-gestao', ok: true, autenticado: sessaoValida(req) });

  // Link que vai nos avisos da rotina: o n8n chama (GET ou POST) para dar baixa na tarefa.
  // Não pede senha: a assinatura no próprio link é a autorização.
  if (caminho === '/api/publico/rotina/concluir' && (metodo === 'GET' || metodo === 'POST')) {
    const url = new URL(req.url, 'http://local');
    const { status, corpo } = webhooks.concluirRotina({ id: url.searchParams.get('id'), assinatura: url.searchParams.get('assinatura') });
    return responder(res, status, corpo);
  }

  // Pedidos que mudam algo precisam vir como JSON do próprio site (proteção contra CSRF).
  if (metodo !== 'GET' && metodo !== 'DELETE' && !(req.headers['content-type'] || '').includes('application/json')) {
    return responder(res, 415, { erro: 'Envie JSON' });
  }

  if (caminho === '/api/entrar' && metodo === 'POST') {
    const ip = ipDe(req);
    if (!podeTentar(ip)) return responder(res, 429, { erro: 'Muitas tentativas. Espere 15 minutos e tente de novo.' });
    const { senha } = await lerCorpo(req, 10 * 1024);
    const confere = iguais(createHash('sha256').update(String(senha || '')).digest('hex'), createHash('sha256').update(SENHA).digest('hex'));
    if (!confere) {
      registrarErro(ip);
      log('senha incorreta de', ip);
      return responder(res, 401, { erro: 'Senha incorreta.' });
    }
    return responder(res, 200, { ok: true }, { 'set-cookie': cookieSessao(req, criarSessao(), DIAS_SESSAO * 24 * 60 * 60) });
  }

  if (caminho === '/api/sair' && metodo === 'POST') {
    return responder(res, 200, { ok: true }, { 'set-cookie': cookieSessao(req, '', 0) });
  }

  if (!sessaoValida(req)) return responder(res, 401, { erro: 'Entre com a senha para continuar.' });
  webhooks.registrarOrigem(req);

  if (caminho === '/api/dados' && metodo === 'GET') return responder(res, 200, lerTudo());

  if (caminho === '/api/config' && metodo === 'PUT') {
    const config = await lerCorpo(req, 5 * MB);
    if (!config || typeof config !== 'object' || Array.isArray(config)) return responder(res, 400, { erro: 'Configuração inválida' });
    sql.gravarChave.run('config', JSON.stringify(config));
    return responder(res, 204);
  }

  if (caminho === '/api/importar' && metodo === 'POST') {
    const dados = await lerCorpo(req, 200 * MB);
    if (!dados || !Array.isArray(dados.clientes)) return responder(res, 400, { erro: 'Arquivo inválido' });
    fazerCopia();
    const agora = new Date().toISOString();
    transacao(() => {
      sql.apagarTudo.run();
      for (const colecao of COLECOES) {
        for (const item of Array.isArray(dados[colecao]) ? dados[colecao] : []) {
          if (item && typeof item.id === 'string') sql.gravar.run(colecao, item.id, JSON.stringify(item), agora);
        }
      }
      if (dados.config && typeof dados.config === 'object') sql.gravarChave.run('config', JSON.stringify(dados.config));
    });
    log('dados importados');
    return responder(res, 204);
  }

  // ----- Meta Ads -----
  if (caminho.startsWith('/api/meta/')) {
    const url = new URL(req.url, 'http://local');
    const rota = caminho.slice('/api/meta'.length);
    try {
      if (rota === '/estado' && metodo === 'GET') return responder(res, 200, { conectado: Boolean(lerChave('meta_token')) });
      if (rota === '/conexao' && metodo === 'PUT') {
        const { token } = await lerCorpo(req, 10 * 1024);
        const limpo = String(token || '').trim();
        if (limpo.length < 20) return responder(res, 400, { erro: 'Cole o token completo (começa com EAA…).' });
        const contas = await graph('me/adaccounts', { fields: 'account_id,name,currency,account_status', limit: '200' }, limpo);
        sql.gravarChave.run('meta_token', cifrar(limpo));
        cacheCampanhas.clear();
        log('Meta conectada,', contas.data.length, 'contas');
        return responder(res, 200, { conectado: true, contas: contas.data.length });
      }
      if (rota === '/conexao' && metodo === 'DELETE') {
        sql.apagarChave.run('meta_token');
        cacheCampanhas.clear();
        return responder(res, 200, { conectado: false });
      }
      if (rota === '/contas' && metodo === 'GET') {
        const contas = await graph('me/adaccounts', { fields: 'account_id,name,currency,account_status', limit: '200' });
        return responder(res, 200, {
          contas: contas.data.map((c) => ({ id: `act_${c.account_id}`, nome: c.name, moeda: c.currency, status: c.account_status })),
        });
      }
      if (rota === '/campanhas' && metodo === 'GET') {
        const campanhas = await lerCampanhasMeta(url.searchParams.get('conta'), url.searchParams.get('de') || '', url.searchParams.get('ate') || '');
        return responder(res, 200, { campanhas });
      }
    } catch (falha) {
      if (falha instanceof ErroMeta) return responder(res, falha.status, { erro: falha.message, detalhe: falha.detalhe });
      throw falha;
    }
    return responder(res, 404, { erro: 'Rota não encontrada' });
  }

  // ----- Anúncios (Meta Marketing API) -----
  if (caminho.startsWith('/api/anuncios/')) {
    try {
      const tratado = await anuncios.rotas({ metodo, rota: caminho.slice('/api/anuncios'.length), lerCorpo: (limite) => lerCorpo(req, limite), responder, res });
      if (!tratado) responder(res, 404, { erro: 'Rota não encontrada' });
    } catch (falha) {
      if (falha instanceof ErroMeta) return responder(res, falha.status, { erro: falha.message, detalhe: falha.detalhe });
      throw falha;
    }
    return;
  }

  // ----- Webhooks de saída -----
  if (caminho === '/api/webhooks' || caminho.startsWith('/api/webhooks/')) {
    const tratado = await webhooks.rotas({
      metodo,
      rota: caminho.slice('/api/webhooks'.length),
      lerCorpo: (limite) => lerCorpo(req, limite),
      responder,
      res,
    });
    if (!tratado) responder(res, 404, { erro: 'Rota não encontrada' });
    return;
  }

  // ----- Registros: /api/:colecao/:id -----
  const [, , colecao, idBruto, sobra] = caminho.split('/');
  if (COLECOES.includes(colecao) && idBruto && sobra === undefined) {
    const id = decodeURIComponent(idBruto);
    if (metodo === 'PUT') {
      const item = await lerCorpo(req, 40 * MB);
      if (!item || item.id !== id) return responder(res, 400, { erro: 'Registro inválido' });
      const antes = webhooks.ler(colecao, id);
      sql.gravar.run(colecao, id, JSON.stringify(item), new Date().toISOString());
      webhooks.aoSalvar(colecao, antes, item);
      return responder(res, 204);
    }
    if (metodo === 'DELETE') {
      sql.apagar.run(colecao, id);
      return responder(res, 204);
    }
  }

  return responder(res, 404, { erro: 'Rota não encontrada' });
};

// ---------- Arquivos do site ----------
const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.wasm': 'application/wasm',
  '.txt': 'text/plain; charset=utf-8',
};
const COMPRIMIR = new Set(['.html', '.js', '.mjs', '.css', '.json', '.svg', '.txt', '.wasm']);
const memoria = new Map();

const arquivo = async (req, res, caminho) => {
  let relativo;
  try {
    relativo = normalize(decodeURIComponent(caminho)).replace(/^([/\\])+/, '');
  } catch {
    res.writeHead(400).end();
    return;
  }
  let alvo = resolve(PASTA_SITE, relativo || 'index.html');
  if (alvo !== PASTA_SITE && !alvo.startsWith(PASTA_SITE + sep)) {
    res.writeHead(403).end();
    return;
  }
  let info = existsSync(alvo) ? statSync(alvo) : null;
  if (info?.isDirectory()) {
    alvo = join(alvo, 'index.html');
    info = existsSync(alvo) ? statSync(alvo) : null;
  }
  if (!info) {
    // Arquivo com extensão que não existe é 404; o resto abre o app.
    if (extname(relativo)) {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('Não encontrado');
      return;
    }
    alvo = join(PASTA_SITE, 'index.html');
  }
  const ext = extname(alvo).toLowerCase();
  const imutavel = alvo.includes(`${sep}assets${sep}`) || alvo.includes(`${sep}fonts${sep}`);
  let entrada = memoria.get(alvo);
  if (!entrada) {
    const bruto = readFileSync(alvo);
    entrada = { bruto, gz: COMPRIMIR.has(ext) && bruto.length > 1024 ? await gzipAsync(bruto, { level: 6 }) : null };
    if (bruto.length < 8 * MB) memoria.set(alvo, entrada);
  }
  const aceitaGzip = /\bgzip\b/.test(req.headers['accept-encoding'] || '');
  const corpo = aceitaGzip && entrada.gz ? entrada.gz : entrada.bruto;
  res.writeHead(200, {
    'content-type': TIPOS[ext] || 'application/octet-stream',
    'content-length': corpo.length,
    'cache-control': imutavel ? 'public, max-age=31536000, immutable' : 'no-cache',
    vary: 'accept-encoding',
    ...(corpo === entrada.gz ? { 'content-encoding': 'gzip' } : {}),
  });
  res.end(req.method === 'HEAD' ? undefined : corpo);
};

const servidor = createServer(async (req, res) => {
  res.setHeader('x-content-type-options', 'nosniff');
  res.setHeader('referrer-policy', 'same-origin');
  res.setHeader('x-frame-options', 'SAMEORIGIN');
  const caminho = (req.url || '/').split('?')[0];
  try {
    if (caminho === '/api' || caminho.startsWith('/api/')) return await api(req, res, caminho);
    if (req.method !== 'GET' && req.method !== 'HEAD') return responder(res, 405, { erro: 'Método não permitido' });
    return await arquivo(req, res, caminho);
  } catch (falha) {
    const status = falha?.status || 500;
    if (status === 500) log('erro', req.method, caminho, falha);
    if (!res.headersSent) responder(res, status, { erro: status === 500 ? 'Erro interno no servidor' : falha.message });
    else res.end();
  }
});

servidor.requestTimeout = 120000;
servidor.listen(PORTA, '0.0.0.0', () => log(`Konext Gestão no ar na porta ${PORTA} (dados em ${PASTA_DADOS})`));

const desligar = () => {
  log('desligando…');
  servidor.close(() => {
    db.close();
    process.exit(0);
  });
  setTimeout(() => process.exit(0), 5000).unref();
};
process.on('SIGTERM', desligar);
process.on('SIGINT', desligar);
