// Criação de campanhas na Meta: biblioteca de criativos, públicos da conta, campanhas de
// referência e o motor que publica em lote (fila persistente, retomada e reconciliação).
//
// Regras que não podem ser quebradas:
// - toda operação é amarrada à conta validada do cliente (IDs oficiais, conferidos de novo);
// - cada criativo tem o seu conjunto, com exatamente um anúncio;
// - tudo nasce PAUSADO; ativar é uma ação separada;
// - uma criação cujo resultado ficou desconhecido (timeout) nunca é repetida às cegas:
//   o sistema procura o objeto na Meta pelo pai + nome + horário antes de decidir.
import { randomUUID } from 'node:crypto';
import { closeSync, createReadStream, existsSync, mkdirSync, openSync, readSync, rmSync, statfsSync, statSync, writeSync } from 'node:fs';
import { join } from 'node:path';

const MB = 1024 * 1024;
const TIPOS = {
  jpg: { tipo: 'imagem', mime: 'image/jpeg', limite: 30 * MB },
  jpeg: { tipo: 'imagem', mime: 'image/jpeg', limite: 30 * MB },
  png: { tipo: 'imagem', mime: 'image/png', limite: 30 * MB },
  mp4: { tipo: 'video', mime: 'video/mp4', limite: 1024 * MB },
  mov: { tipo: 'video', mime: 'video/quicktime', limite: 1024 * MB },
};
const PARTE_MAX = 8 * MB;

const conferirAssinatura = (ext, cabeca) => {
  if (ext === 'jpg' || ext === 'jpeg') return cabeca[0] === 0xff && cabeca[1] === 0xd8 && cabeca[2] === 0xff;
  if (ext === 'png') return cabeca[0] === 0x89 && cabeca[1] === 0x50 && cabeca[2] === 0x4e && cabeca[3] === 0x47;
  return cabeca.toString('latin1', 4, 8) === 'ftyp';
};

const semAcento = (texto) => String(texto || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Categoria interna de organização (não é tipo oficial da Meta).
const categoriaDoPublico = (nome, targeting, subtipo) => {
  const n = semAcento(nome);
  const generos = Array.isArray(targeting?.genders) ? targeting.genders : [];
  const sufixo = /mulher|feminin/.test(n) || (generos.length === 1 && generos[0] === 2) ? ' Mulheres' : /homem|homens|masculin/.test(n) || (generos.length === 1 && generos[0] === 1) ? ' Homens' : '';
  if (/remarketing|rmkt|rmk|retarget/.test(n) || ['WEBSITE', 'ENGAGEMENT', 'IG_BUSINESS', 'VIDEO', 'FB_EVENT'].includes(subtipo)) return 'Remarketing';
  if (/comprador/.test(n)) return `Compradores${sufixo}`;
  if (/aberto/.test(n)) return `Aberto${sufixo}`;
  return 'Outros públicos';
};

const resumoTargeting = (t) => {
  if (!t) return '';
  const partes = [];
  if (t.age_min || t.age_max) partes.push(`${t.age_min ?? 18}–${t.age_max ?? 65} anos`);
  if (Array.isArray(t.genders) && t.genders.length === 1) partes.push(t.genders[0] === 1 ? 'homens' : 'mulheres');
  const geo = t.geo_locations || {};
  const locais = (geo.cities?.length || 0) + (geo.regions?.length || 0) + (geo.countries?.length || 0) + (geo.custom_locations?.length || 0) + (geo.zips?.length || 0);
  if (locais) partes.push(`${locais} local(is)`);
  const interesses = (t.flexible_spec || []).reduce((soma, f) => soma + Object.values(f).reduce((s, v) => s + (Array.isArray(v) ? v.length : 0), 0), 0) + (t.interests?.length || 0);
  if (interesses) partes.push(`${interesses} interesse(s)/comportamento(s)`);
  if (t.custom_audiences?.length) partes.push(`${t.custom_audiences.length} público(s) personalizado(s)`);
  return partes.join(' · ');
};

const MODELOS = {
  whatsapp: {
    rotulo: 'Mensagens no WhatsApp',
    objetivos: ['OUTCOME_ENGAGEMENT', 'MESSAGES'],
    padrao: {
      objective: 'OUTCOME_ENGAGEMENT',
      destination_type: 'WHATSAPP',
      optimization_goal: 'CONVERSATIONS',
      billing_event: 'IMPRESSIONS',
      bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
      cta: { type: 'WHATSAPP_MESSAGE', value: { app_destination: 'WHATSAPP' } },
      link: 'https://api.whatsapp.com/send',
    },
  },
  instagram: {
    rotulo: 'Visitas ao perfil do Instagram',
    objetivos: ['OUTCOME_TRAFFIC', 'LINK_CLICKS'],
    padrao: {
      objective: 'OUTCOME_TRAFFIC',
      destination_type: 'INSTAGRAM_PROFILE',
      optimization_goal: 'VISIT_INSTAGRAM_PROFILE',
      billing_event: 'IMPRESSIONS',
      bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
      cta: { type: 'VIEW_INSTAGRAM_PROFILE' },
      link: null,
    },
  },
};

const STATUS_META = {
  ACTIVE: 'Ativo',
  PAUSED: 'Pausado',
  DELETED: 'Excluído',
  ARCHIVED: 'Arquivado',
  PENDING_REVIEW: 'Em análise',
  IN_PROCESS: 'Em processamento',
  DISAPPROVED: 'Reprovado',
  PREAPPROVED: 'Pré-aprovado',
  WITH_ISSUES: 'Com problemas',
  CAMPAIGN_PAUSED: 'Pausado (campanha)',
  ADSET_PAUSED: 'Pausado (conjunto)',
  PENDING_BILLING_INFO: 'Aguardando pagamento',
};

export const criarCampanhas = ({ db, graph, graphEnviar, ErroMeta, normalizarConta, ler, pastaDados, log }) => {
  const PASTA_MIDIAS = join(pastaDados, 'midias');
  mkdirSync(PASTA_MIDIAS, { recursive: true });

  db.exec(`
    CREATE TABLE IF NOT EXISTS midias (
      id TEXT PRIMARY KEY, cliente_id TEXT, nome TEXT NOT NULL, ext TEXT NOT NULL, tipo TEXT NOT NULL,
      mime TEXT NOT NULL, tamanho INTEGER NOT NULL, recebido INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL, meta TEXT NOT NULL DEFAULT '{}', criado_em TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS operacoes (
      id TEXT PRIMARY KEY, cliente_id TEXT NOT NULL, conta_id TEXT NOT NULL, status TEXT NOT NULL,
      plano TEXT NOT NULL, erro TEXT, proxima_em TEXT, criado_em TEXT NOT NULL, atualizado_em TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS objetos (
      id TEXT PRIMARY KEY, operacao_id TEXT NOT NULL, chave TEXT NOT NULL, tipo TEXT NOT NULL, ordem INTEGER NOT NULL,
      status TEXT NOT NULL, meta_id TEXT, nome TEXT, erro TEXT, tentativas INTEGER NOT NULL DEFAULT 0,
      iniciado_em TEXT, atualizado_em TEXT NOT NULL, estado_meta TEXT, extra TEXT NOT NULL DEFAULT '{}'
    );
    CREATE INDEX IF NOT EXISTS objetos_op ON objetos (operacao_id, ordem);
    CREATE TABLE IF NOT EXISTS historico_anuncios (
      id TEXT PRIMARY KEY, operacao_id TEXT, acao TEXT NOT NULL, detalhe TEXT, em TEXT NOT NULL
    );
  `);

  const agora = () => new Date().toISOString();
  const registrar = (operacaoId, acao, detalhe) =>
    db.prepare('INSERT INTO historico_anuncios (id, operacao_id, acao, detalhe, em) VALUES (?, ?, ?, ?, ?)').run(randomUUID(), operacaoId, acao, detalhe ? JSON.stringify(detalhe) : null, agora());

  // ---------- Cliente e conta (sempre conferidos de novo) ----------
  const contaDoCliente = async (clienteId, { conferirNaMeta = true } = {}) => {
    const cliente = ler('clientes', clienteId);
    if (!cliente) throw new ErroMeta('Cliente não encontrado.', 404);
    if (!cliente.metaContaId) throw new ErroMeta(`“${cliente.nome}” não tem conta de anúncios informada.`, 409);
    const act = normalizarConta(cliente.metaContaId);
    if (cliente.metaValidacao?.contaId !== act) throw new ErroMeta(`A conta de “${cliente.nome}” ainda não foi validada (ou mudou). Valide em Anúncios → Contas de anúncios.`, 409);
    if (conferirNaMeta) {
      const conta = await graph(act, { fields: 'id,name,account_status,currency' });
      if (conta.id !== act) throw new ErroMeta(`A Meta devolveu a conta ${conta.id} em vez de ${act}. Operação bloqueada.`, 409);
      if (conta.account_status !== 1) throw new ErroMeta(`A conta “${conta.name}” não está ativa na Meta. Operação bloqueada.`, 409);
      return { cliente, act, conta };
    }
    return { cliente, act, conta: null };
  };

  // ---------- Biblioteca de criativos ----------
  const midiaPublica = (m) => ({
    id: m.id,
    clienteId: m.cliente_id,
    nome: m.nome,
    tipo: m.tipo,
    mime: m.mime,
    tamanho: m.tamanho,
    recebido: m.recebido,
    status: m.status,
    criadoEm: m.criado_em,
    contasEnviadas: Object.keys(JSON.parse(m.meta || '{}')),
  });
  const lerMidia = (id) => db.prepare('SELECT * FROM midias WHERE id = ?').get(id);
  const arquivoDaMidia = (m) => join(PASTA_MIDIAS, `${m.id}.${m.ext}`);

  const iniciarMidia = ({ nome, tamanho, clienteId }) => {
    const ext = String(nome || '').split('.').pop().toLowerCase();
    const tipo = TIPOS[ext];
    if (!tipo) throw new ErroMeta('Formato não aceito. Use JPG ou PNG para imagens e MP4 ou MOV para vídeos.', 415);
    const bytes = Number(tamanho);
    if (!Number.isFinite(bytes) || bytes <= 0) throw new ErroMeta('Tamanho do arquivo inválido.', 400);
    if (bytes > tipo.limite) throw new ErroMeta(`Arquivo grande demais: o limite para ${tipo.tipo === 'video' ? 'vídeo' : 'imagem'} é ${tipo.limite / MB} MB.`, 413);
    try {
      const disco = statfsSync(PASTA_MIDIAS);
      const livre = Number(disco.bavail) * Number(disco.bsize);
      if (livre - bytes < 1024 * MB) throw new ErroMeta(`Pouco espaço livre no servidor (${Math.round(livre / MB)} MB). Apague criativos antigos antes de enviar este.`, 507);
    } catch (falha) {
      if (falha instanceof ErroMeta) throw falha;
    }
    if (clienteId && !ler('clientes', clienteId)) throw new ErroMeta('Cliente não encontrado.', 404);
    const id = randomUUID();
    const limpo = String(nome).replace(/[\\/\0]/g, '_').slice(0, 180);
    db.prepare('INSERT INTO midias (id, cliente_id, nome, ext, tipo, mime, tamanho, recebido, status, criado_em) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)').run(
      id,
      clienteId || null,
      limpo,
      ext,
      tipo.tipo,
      tipo.mime,
      bytes,
      'enviando',
      agora(),
    );
    return midiaPublica(lerMidia(id));
  };

  const receberParte = async (req, id, deslocamento) => {
    const m = lerMidia(id);
    if (!m) throw new ErroMeta('Arquivo não encontrado.', 404);
    if (m.status !== 'enviando') throw new ErroMeta('Este arquivo já foi concluído.', 409);
    if (deslocamento !== m.recebido) throw new ErroMeta(`Parte fora de ordem: o servidor espera a partir do byte ${m.recebido}.`, 409);
    const partes = [];
    let total = 0;
    for await (const pedaco of req) {
      total += pedaco.length;
      if (total > PARTE_MAX || m.recebido + total > m.tamanho) throw new ErroMeta('Parte maior que o permitido.', 413);
      partes.push(pedaco);
    }
    const dados = Buffer.concat(partes);
    if (m.recebido === 0 && !conferirAssinatura(m.ext, dados.subarray(0, 12))) throw new ErroMeta('O conteúdo não corresponde ao formato do arquivo (pode estar corrompido ou renomeado).', 415);
    const fd = openSync(arquivoDaMidia(m), m.recebido === 0 ? 'w' : 'r+');
    try {
      writeSync(fd, dados, 0, dados.length, m.recebido);
    } finally {
      closeSync(fd);
    }
    db.prepare('UPDATE midias SET recebido = ? WHERE id = ?').run(m.recebido + dados.length, id);
    return { recebido: m.recebido + dados.length, tamanho: m.tamanho };
  };

  const concluirMidia = (id) => {
    const m = lerMidia(id);
    if (!m) throw new ErroMeta('Arquivo não encontrado.', 404);
    const caminho = arquivoDaMidia(m);
    if (m.recebido !== m.tamanho || !existsSync(caminho) || statSync(caminho).size !== m.tamanho) throw new ErroMeta('O arquivo não chegou completo. Envie de novo.', 409);
    db.prepare("UPDATE midias SET status = 'pronta' WHERE id = ?").run(id);
    return midiaPublica(lerMidia(id));
  };

  const apagarMidia = (id) => {
    const m = lerMidia(id);
    if (!m) return;
    const emUso = db.prepare("SELECT 1 FROM objetos o JOIN operacoes p ON p.id = o.operacao_id WHERE o.chave = ? AND p.status IN ('na_fila','em_andamento','aguardando_limite')").get(`midia:${id}`);
    if (emUso) throw new ErroMeta('Este criativo está sendo publicado agora. Espere terminar para apagar.', 409);
    rmSync(arquivoDaMidia(m), { force: true });
    db.prepare('DELETE FROM midias WHERE id = ?').run(id);
  };

  const servirMidia = (req, res, id) => {
    const m = lerMidia(id);
    if (!m || m.status !== 'pronta') {
      res.writeHead(404).end();
      return;
    }
    const caminho = arquivoDaMidia(m);
    const tamanho = statSync(caminho).size;
    const faixa = /bytes=(\d*)-(\d*)/.exec(req.headers.range || '');
    if (faixa) {
      const inicio = faixa[1] ? Number(faixa[1]) : 0;
      const fim = faixa[2] ? Math.min(Number(faixa[2]), tamanho - 1) : Math.min(inicio + 4 * MB, tamanho - 1);
      if (inicio >= tamanho || inicio > fim) {
        res.writeHead(416, { 'content-range': `bytes */${tamanho}` }).end();
        return;
      }
      res.writeHead(206, { 'content-type': m.mime, 'content-length': fim - inicio + 1, 'content-range': `bytes ${inicio}-${fim}/${tamanho}`, 'accept-ranges': 'bytes', 'cache-control': 'private, max-age=86400' });
      createReadStream(caminho, { start: inicio, end: fim }).pipe(res);
      return;
    }
    res.writeHead(200, { 'content-type': m.mime, 'content-length': tamanho, 'accept-ranges': 'bytes', 'cache-control': 'private, max-age=86400' });
    createReadStream(caminho).pipe(res);
  };

  // Envia a mídia para a conta (ou reaproveita o envio anterior para a mesma conta).
  const enviarMidiaParaConta = async (m, act) => {
    const meta = JSON.parse(m.meta || '{}');
    if (meta[act]) return meta[act];
    const caminho = arquivoDaMidia(m);
    let resultado;
    if (m.tipo === 'imagem') {
      const fd = openSync(caminho, 'r');
      const dados = Buffer.alloc(m.tamanho);
      try {
        readSync(fd, dados, 0, m.tamanho, 0);
      } finally {
        closeSync(fd);
      }
      const r = await graphEnviar(`${act}/adimages`, { filename: new Blob([dados], { type: m.mime }) }, { multipart: true, nomeArquivo: `${m.id}.${m.ext}` });
      const imagem = Object.values(r.images || {})[0];
      if (!imagem?.hash) throw new ErroMeta('A Meta não devolveu o identificador da imagem.', 502);
      resultado = { hash: imagem.hash };
    } else {
      // Vídeo em partes (upload resumível da Meta).
      const inicio = await graphEnviar(`${act}/advideos`, { upload_phase: 'start', file_size: String(m.tamanho) }, { video: true });
      let { start_offset: de, end_offset: ate } = inicio;
      const sessao = inicio.upload_session_id;
      const fd = openSync(caminho, 'r');
      try {
        while (Number(de) < Number(ate)) {
          const tamanho = Number(ate) - Number(de);
          const pedaco = Buffer.alloc(tamanho);
          readSync(fd, pedaco, 0, tamanho, Number(de));
          const r = await graphEnviar(
            `${act}/advideos`,
            { upload_phase: 'transfer', upload_session_id: sessao, start_offset: String(de), video_file_chunk: new Blob([pedaco]) },
            { video: true, multipart: true, nomeArquivo: 'parte', timeout: 10 * 60 * 1000 },
          );
          de = r.start_offset;
          ate = r.end_offset;
        }
      } finally {
        closeSync(fd);
      }
      await graphEnviar(`${act}/advideos`, { upload_phase: 'finish', upload_session_id: sessao, title: m.nome }, { video: true });
      resultado = { videoId: inicio.video_id };
    }
    meta[act] = resultado;
    db.prepare('UPDATE midias SET meta = ? WHERE id = ?').run(JSON.stringify(meta), m.id);
    return resultado;
  };

  // O vídeo precisa terminar o processamento na Meta antes de virar anúncio.
  const videoPronto = async (videoId) => {
    const v = await graph(videoId, { fields: 'status,picture' });
    const status = v.status?.video_status;
    if (status === 'error') throw new ErroMeta('A Meta não conseguiu processar este vídeo. Confira o arquivo e envie de novo.', 422);
    if (status !== 'ready') return null;
    let miniatura = v.picture || null;
    try {
      const t = await graph(`${videoId}/thumbnails`, { fields: 'uri,is_preferred' });
      miniatura = (t.data.find((x) => x.is_preferred) || t.data[0])?.uri || miniatura;
    } catch {
      // fica com a picture
    }
    if (!miniatura) return null;
    return { miniatura };
  };

  // ---------- Públicos da conta ----------
  const cachePublicos = new Map();
  const lerComFallback = async (caminho, campos, minimos) => {
    try {
      return await graph(caminho, { fields: campos, limit: '200' });
    } catch (falha) {
      if (falha instanceof ErroMeta && falha.detalhe?.codigo === 100) return graph(caminho, { fields: minimos, limit: '200' });
      throw falha;
    }
  };
  const publicosDaConta = async (act, atualizar = false) => {
    const guardado = cachePublicos.get(act);
    if (!atualizar && guardado && Date.now() - guardado.em < 10 * 60 * 1000) return guardado;
    const erros = {};
    let salvos = [];
    let personalizados = [];
    try {
      const r = await lerComFallback(`${act}/saved_audiences`, 'id,name,targeting,description,approximate_count_lower_bound,approximate_count_upper_bound', 'id,name,targeting');
      salvos = r.data.map((p) => ({
        id: p.id,
        nome: p.name,
        tipo: 'salvo',
        tipoTexto: 'Público salvo',
        categoria: categoriaDoPublico(p.name, p.targeting),
        resumo: resumoTargeting(p.targeting),
        tamanho: p.approximate_count_lower_bound ? `${p.approximate_count_lower_bound.toLocaleString('pt-BR')}–${(p.approximate_count_upper_bound || 0).toLocaleString('pt-BR')}` : '',
        disponivel: Boolean(p.targeting),
        restricao: p.targeting ? '' : 'A Meta não devolveu a segmentação deste público.',
        targeting: p.targeting || null,
      }));
    } catch (falha) {
      erros.salvos = falha.message;
    }
    try {
      const r = await lerComFallback(`${act}/customaudiences`, 'id,name,subtype,description,approximate_count_lower_bound,approximate_count_upper_bound,delivery_status,operation_status', 'id,name,subtype');
      personalizados = r.data.map((p) => {
        const entrega = p.delivery_status?.code;
        const ok = !entrega || entrega === 200;
        return {
          id: p.id,
          nome: p.name,
          tipo: 'personalizado',
          tipoTexto: `Personalizado${p.subtype ? ` (${p.subtype.toLowerCase()})` : ''}`,
          categoria: categoriaDoPublico(p.name, null, p.subtype),
          resumo: p.description || '',
          tamanho: p.approximate_count_lower_bound > 0 ? `${p.approximate_count_lower_bound.toLocaleString('pt-BR')}–${(p.approximate_count_upper_bound || 0).toLocaleString('pt-BR')}` : '',
          disponivel: ok,
          restricao: ok ? '' : p.delivery_status?.description || 'Público com restrição de entrega.',
          targeting: null,
        };
      });
    } catch (falha) {
      erros.personalizados = falha.message;
    }
    const resultado = { em: Date.now(), publicos: [...salvos, ...personalizados], erros };
    cachePublicos.set(act, resultado);
    return resultado;
  };

  // ---------- Campanhas de referência ----------
  const referenciasDaConta = async (act, modelo) => {
    const r = await graph(`${act}/campaigns`, { fields: 'id,name,objective,effective_status,created_time', limit: '100' }, undefined, { maxPaginas: 2 });
    const objetivos = MODELOS[modelo]?.objetivos || [];
    return r.data
      .filter((c) => objetivos.includes(c.objective) && c.effective_status !== 'DELETED')
      .sort((a, b) => String(b.created_time).localeCompare(String(a.created_time)))
      .slice(0, 30)
      .map((c) => ({ id: c.id, nome: c.name, objetivo: c.objective, status: STATUS_META[c.effective_status] || c.effective_status }));
  };

  // ---------- Regulação do Brasil (anunciante verificado) ----------
  // A Meta exige, em conjuntos que alcançam o Brasil, o beneficiário e o pagador verificados.
  // O Konext não inventa esses IDs: copia de um conjunto que já existe na conta.
  const CAMPOS_REGULACAO = ['regional_regulated_categories', 'regional_regulation_identities'];
  const temValor = (v) => v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && !v.length) && !(typeof v === 'object' && !Array.isArray(v) && !Object.keys(v).length);
  const regulacaoDe = (cj) => {
    if (!cj || !temValor(cj.regional_regulation_identities)) return null;
    const r = {};
    for (const f of CAMPOS_REGULACAO) if (temValor(cj[f])) r[f] = cj[f];
    if (!r.regional_regulated_categories) r.regional_regulated_categories = ['BRAZIL_REGULATION'];
    return r;
  };
  const lerRegulacaoDoConjunto = async (adsetId) => {
    const lido = {};
    for (const f of CAMPOS_REGULACAO) {
      try {
        Object.assign(lido, await graph(adsetId, { fields: f }));
      } catch {
        // campo indisponível nesta versão/conta: ignora
      }
    }
    return regulacaoDe(lido);
  };
  const cacheRegulacao = new Map();
  const regulacaoDaConta = async (act) => {
    const guardado = cacheRegulacao.get(act);
    if (guardado && Date.now() - guardado.em < 10 * 60 * 1000) return guardado.valor;
    let valor = null;
    try {
      const lidos = await graph(`${act}/adsets`, { fields: `id,created_time,${CAMPOS_REGULACAO.join(',')}`, limit: '50' }, undefined, { maxPaginas: 1 });
      const comRegulacao = (lidos.data || [])
        .filter((cj) => regulacaoDe(cj))
        .sort((a, b) => String(b.created_time || '').localeCompare(String(a.created_time || '')));
      valor = regulacaoDe(comRegulacao[0]);
    } catch (falha) {
      if (falha?.detalhe?.codigo !== 100) throw falha;
    }
    if (valor) cacheRegulacao.set(act, { em: Date.now(), valor });
    return valor;
  };
  const ehErroRegulacao = (falha) =>
    falha?.detalhe?.subcodigo === 3858634 || /anunciante verificado|verified advertiser|beneficiar|universal_payer|regional_regulat/i.test(`${falha?.detalhe?.mensagem || ''} ${falha?.message || ''}`);
  const erroSemRegulacao = () =>
    new ErroMeta(
      'A Meta exige o anunciante verificado (beneficiário e pagador) para anúncios no Brasil, e o Konext não encontrou nenhum conjunto nesta conta com isso preenchido para copiar. ' +
        'Abra o Gerenciador de Anúncios desta conta, edite (ou crie) um conjunto qualquer, preencha “Beneficiário” e “Pagador” na seção de anunciante verificado e salve. Depois clique em “Tentar de novo o que falhou”.',
      409,
      { codigo: 100, subcodigo: 3858634 },
    );

  // Aprende os parâmetros de uma campanha que já funciona na conta.
  const aprenderReferencia = async (act, campanhaId, modelo) => {
    const c = await graph(campanhaId, { fields: 'id,name,objective,account_id' });
    if (`act_${c.account_id}` !== act) throw new ErroMeta('Essa campanha de referência é de outra conta. Bloqueado.', 409);
    const padrao = MODELOS[modelo].padrao;
    if (!MODELOS[modelo].objetivos.includes(c.objective)) throw new ErroMeta(`A campanha “${c.name}” tem objetivo ${c.objective}, que não combina com ${MODELOS[modelo].rotulo}.`, 409);
    const conjuntos = await graph(`${campanhaId}/adsets`, { fields: 'id,destination_type,optimization_goal,billing_event,bid_strategy,promoted_object', limit: '5' }, undefined, { maxPaginas: 1 });
    const cj = conjuntos.data[0];
    if (!cj) throw new ErroMeta(`A campanha “${c.name}” não tem conjuntos para copiar a configuração.`, 409);
    const anuncios = await graph(`${campanhaId}/ads`, { fields: 'id,creative{object_story_spec,asset_feed_spec,call_to_action_type}', limit: '5' }, undefined, { maxPaginas: 1 });
    let cta = null;
    let link = null;
    for (const a of anuncios.data) {
      const oss = a.creative?.object_story_spec || {};
      const bloco = oss.video_data || oss.link_data || {};
      if (bloco.call_to_action?.type) {
        cta = bloco.call_to_action;
        link = oss.link_data?.link || bloco.call_to_action?.value?.link || null;
        break;
      }
      const afs = a.creative?.asset_feed_spec;
      if (afs?.call_to_action_types?.[0]) {
        cta = { type: afs.call_to_action_types[0] };
        link = afs.link_urls?.[0]?.website_url || null;
        break;
      }
      if (a.creative?.call_to_action_type) {
        cta = { type: a.creative.call_to_action_type };
        break;
      }
    }
    return {
      origem: 'referencia',
      referencia: { id: c.id, nome: c.name },
      objective: c.objective,
      destination_type: cj.destination_type || padrao.destination_type,
      optimization_goal: cj.optimization_goal || padrao.optimization_goal,
      billing_event: cj.billing_event || padrao.billing_event,
      bid_strategy: cj.bid_strategy || padrao.bid_strategy,
      promoted_object: cj.promoted_object || null,
      cta: cta ? { type: cta.type, ...(cta.value && modelo === 'whatsapp' ? { value: { app_destination: cta.value.app_destination || 'WHATSAPP' } } : {}) } : padrao.cta,
      link: modelo === 'whatsapp' ? link || padrao.link : null,
      ctaCopiado: Boolean(cta),
      regulacao: await lerRegulacaoDoConjunto(cj.id),
    };
  };

  // ---------- Operações ----------
  const nomeConta = (act) => act;
  const centavos = (valor) => Math.round(Number(valor) * 100);

  const validarPlano = async (entrada) => {
    const problemas = [];
    const { cliente, act, conta } = await contaDoCliente(String(entrada.clienteId || ''));
    const modelo = entrada.modelo === 'instagram' ? 'instagram' : entrada.modelo === 'whatsapp' ? 'whatsapp' : null;
    if (!modelo) throw new ErroMeta('Escolha o modelo de campanha.', 400);
    if (!cliente.metaPaginaId) problemas.push('O cliente não tem página do Facebook validada (necessária para os anúncios).');
    if (modelo === 'instagram' && !cliente.metaInstagramId) problemas.push('Visitas ao perfil precisa do perfil do Instagram validado para este cliente.');

    // Configuração: da campanha de referência (preferível) ou o padrão do sistema.
    let config;
    if (entrada.referenciaId) config = await aprenderReferencia(act, String(entrada.referenciaId), modelo);
    else config = { origem: 'padrao', ...MODELOS[modelo].padrao, promoted_object: null, ctaCopiado: false };
    const promotedObject = { ...(config.promoted_object || {}), page_id: cliente.metaPaginaId };
    if (config.promoted_object?.page_id && config.promoted_object.page_id !== cliente.metaPaginaId)
      problemas.push(`A campanha de referência usa outra página (${config.promoted_object.page_id}). A nova vai usar a página validada do cliente.`);
    const instagramUrl = cliente.metaInstagramUsuario ? `https://www.instagram.com/${cliente.metaInstagramUsuario}/` : null;

    const nomeCampanha = String(entrada.nomeCampanha || '').trim().slice(0, 250);
    if (!nomeCampanha) throw new ErroMeta('Informe o nome da campanha.', 400);
    const texto = String(entrada.texto || '').trim().slice(0, 2000);
    const titulo = String(entrada.titulo || '').trim().slice(0, 255);

    const orc = entrada.orcamento || {};
    const modo = ['conjunto', 'campanha_diario', 'campanha_total'].includes(orc.modo) ? orc.modo : null;
    if (!modo) throw new ErroMeta('Escolha como o orçamento será aplicado.', 400);
    const inicio = /^\d{4}-\d{2}-\d{2}$/.test(orc.inicio || '') ? orc.inicio : '';
    const fim = /^\d{4}-\d{2}-\d{2}$/.test(orc.fim || '') ? orc.fim : '';
    if (modo !== 'conjunto' && !(Number(orc.valor) > 0)) throw new ErroMeta('Informe o valor do orçamento da campanha.', 400);
    if (modo === 'campanha_total' && (!inicio || !fim)) throw new ErroMeta('Orçamento total precisa de data de início e de término.', 400);
    if (fim && inicio && fim <= inicio) throw new ErroMeta('A data de término precisa ser depois do início.', 400);

    const itens = Array.isArray(entrada.itens) ? entrada.itens : [];
    if (!itens.length) throw new ErroMeta('Adicione pelo menos um criativo.', 400);
    const { publicos } = await publicosDaConta(act, true);
    const porId = new Map(publicos.map((p) => [p.id, p]));
    const nomesAnuncio = new Set();
    const itensValidos = itens.map((item, i) => {
      const n = i + 1;
      const midia = lerMidia(String(item.midiaId || ''));
      if (!midia || midia.status !== 'pronta') throw new ErroMeta(`Criativo ${n}: arquivo não encontrado ou incompleto.`, 409);
      if (midia.cliente_id && midia.cliente_id !== cliente.id) throw new ErroMeta(`Criativo ${n} (“${midia.nome}”) pertence a outro cliente. Bloqueado.`, 409);
      const publico = porId.get(String(item.publicoId || ''));
      if (!publico) throw new ErroMeta(`Criativo ${n}: o público escolhido não existe mais nesta conta (ou o token não tem acesso). Escolha outro.`, 409);
      if (!publico.disponivel) throw new ErroMeta(`Criativo ${n}: o público “${publico.nome}” não pode ser usado (${publico.restricao}).`, 409);
      const nomeConjunto = String(item.nomeConjunto || '').trim().slice(0, 250);
      const nomeAnuncio = String(item.nomeAnuncio || '').trim().slice(0, 250);
      if (!nomeConjunto || !nomeAnuncio) throw new ErroMeta(`Criativo ${n}: falta o nome do conjunto ou do anúncio.`, 400);
      if (nomesAnuncio.has(nomeAnuncio)) throw new ErroMeta(`O nome de anúncio “${nomeAnuncio}” está repetido. Cada anúncio precisa de um nome único.`, 400);
      nomesAnuncio.add(nomeAnuncio);
      const valor = Number(item.valor);
      if (modo === 'conjunto' && !(valor > 0)) throw new ErroMeta(`Criativo ${n}: informe o orçamento diário do conjunto.`, 400);
      const targeting =
        publico.tipo === 'salvo'
          ? publico.targeting
          : { custom_audiences: [{ id: publico.id }], geo_locations: { countries: ['BR'] }, age_min: 18, age_max: 65 };
      if (publico.tipo === 'personalizado') problemas.push(`Criativo ${n}: público personalizado “${publico.nome}” vai com localização Brasil e idade 18–65 (a Meta exige localização).`);
      return {
        n,
        midiaId: midia.id,
        midiaNome: midia.nome,
        midiaTipo: midia.tipo,
        publico: { id: publico.id, nome: publico.nome, tipo: publico.tipo, categoria: publico.categoria },
        targeting,
        nomeConjunto,
        nomeAnuncio,
        valor: modo === 'conjunto' ? valor : null,
      };
    });

    const totalDiario = modo === 'conjunto' ? itensValidos.reduce((s, it) => s + it.valor, 0) : modo === 'campanha_diario' ? Number(orc.valor) : null;
    const dias = inicio && fim ? Math.round((Date.parse(fim) - Date.parse(inicio)) / 86400000) : null;
    return {
      plano: {
        clienteId: cliente.id,
        clienteNome: cliente.nome,
        contaId: act,
        contaNome: conta?.name || cliente.metaValidacao?.contaNome || nomeConta(act),
        moeda: conta?.currency || cliente.metaValidacao?.moeda || 'BRL',
        paginaId: cliente.metaPaginaId,
        instagramId: cliente.metaInstagramId || null,
        instagramUrl,
        modelo,
        modeloRotulo: MODELOS[modelo].rotulo,
        config: { ...config, promoted_object: promotedObject },
        nomeCampanha,
        texto,
        titulo,
        orcamento: { modo, valor: modo === 'conjunto' ? null : Number(orc.valor), inicio, fim },
        itens: itensValidos,
        estimativa: { totalDiario, dias, totalPeriodo: modo === 'campanha_total' ? Number(orc.valor) : totalDiario && dias ? totalDiario * dias : null },
      },
      avisos: problemas,
    };
  };

  const criarOperacao = (plano) => {
    const id = randomUUID();
    const t = agora();
    db.exec('BEGIN');
    try {
      db.prepare('INSERT INTO operacoes (id, cliente_id, conta_id, status, plano, criado_em, atualizado_em) VALUES (?, ?, ?, ?, ?, ?, ?)').run(id, plano.clienteId, plano.contaId, 'na_fila', JSON.stringify(plano), t, t);
      const inserir = db.prepare('INSERT INTO objetos (id, operacao_id, chave, tipo, ordem, status, nome, atualizado_em) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
      let ordem = 0;
      for (const midiaId of [...new Set(plano.itens.map((i) => i.midiaId))]) inserir.run(randomUUID(), id, `midia:${midiaId}`, 'midia', ordem++, 'pendente', plano.itens.find((i) => i.midiaId === midiaId).midiaNome, t);
      inserir.run(randomUUID(), id, 'campanha', 'campanha', ordem++, 'pendente', plano.nomeCampanha, t);
      for (const item of plano.itens) {
        inserir.run(randomUUID(), id, `conjunto:${item.n}`, 'conjunto', ordem++, 'pendente', item.nomeConjunto, t);
        inserir.run(randomUUID(), id, `criativo:${item.n}`, 'criativo', ordem++, 'pendente', `${item.nomeAnuncio} · ${item.midiaNome}`, t);
        inserir.run(randomUUID(), id, `anuncio:${item.n}`, 'anuncio', ordem++, 'pendente', item.nomeAnuncio, t);
      }
      db.exec('COMMIT');
    } catch (falha) {
      db.exec('ROLLBACK');
      throw falha;
    }
    registrar(id, 'criada', { conjuntos: plano.itens.length });
    log(`operação ${id} na fila: ${plano.clienteNome} · ${plano.itens.length} conjunto(s)`);
    acordar();
    return id;
  };

  const objetosDa = (operacaoId) => db.prepare('SELECT * FROM objetos WHERE operacao_id = ? ORDER BY ordem').all(operacaoId);
  const atualizarObjeto = (id, campos) => {
    const chaves = Object.keys(campos);
    db.prepare(`UPDATE objetos SET ${chaves.map((k) => `${k} = ?`).join(', ')}, atualizado_em = ? WHERE id = ?`).run(...chaves.map((k) => campos[k]), agora(), id);
  };
  const atualizarOperacao = (id, campos) => {
    const chaves = Object.keys(campos);
    db.prepare(`UPDATE operacoes SET ${chaves.map((k) => `${k} = ?`).join(', ')}, atualizado_em = ? WHERE id = ?`).run(...chaves.map((k) => campos[k]), agora(), id);
  };
  const erroTexto = (falha) => JSON.stringify({ mensagem: falha?.message || String(falha), detalhe: falha?.detalhe ?? null });
  const limiteOuTransitorio = (falha) => falha instanceof ErroMeta && (falha.status === 429 || falha.detalhe?.transitorio === true || [1, 2].includes(falha.detalhe?.codigo));

  // ---------- Reconciliação de resultado desconhecido ----------
  const BORDA = { campanha: (p) => `${p.contaId}/campaigns`, conjunto: (p, pai) => `${pai}/adsets`, anuncio: (p, pai) => `${pai}/ads` };
  const reconciliar = async (op, plano, obj, paiId) => {
    const borda = BORDA[obj.tipo]?.(plano, paiId);
    if (!borda) return 'repetir';
    const desde = Date.parse(obj.iniciado_em || obj.atualizado_em) - 5 * 60 * 1000;
    const r = await graph(borda, { fields: 'id,name,created_time', limit: '200' }, undefined, { maxPaginas: 3 });
    const conhecidos = new Set(db.prepare('SELECT meta_id FROM objetos WHERE meta_id IS NOT NULL').all().map((l) => l.meta_id));
    const candidatos = r.data.filter((x) => x.name === obj.nome && Date.parse(x.created_time) >= desde && !conhecidos.has(x.id));
    if (candidatos.length === 1) {
      atualizarObjeto(obj.id, { status: 'criado', meta_id: candidatos[0].id, erro: null });
      registrar(op.id, 'reconciliado', { chave: obj.chave, metaId: candidatos[0].id });
      return 'adotado';
    }
    if (candidatos.length > 1) return 'ambiguo';
    return 'repetir';
  };

  // ---------- Criação de cada objeto ----------
  const comAdaptacoes = async (enviar, params) => {
    // Erros da Meta na criação são definitivos (nada foi criado), então dá para ajustar e tentar de novo.
    let p = { ...params };
    for (let tentativa = 0; tentativa < 3; tentativa += 1) {
      try {
        return await enviar(p);
      } catch (falha) {
        const texto = `${falha?.detalhe?.mensagem || ''} ${falha?.message || ''}`;
        if (!(falha instanceof ErroMeta) || falha.detalhe?.incerto) throw falha;
        if (/is_adset_budget_sharing_enabled/.test(texto) && p.is_adset_budget_sharing_enabled === undefined) p = { ...p, is_adset_budget_sharing_enabled: false };
        else if (/advantage_audience|targeting_automation/i.test(texto) && !p.targeting?.targeting_automation)
          p = { ...p, targeting: { ...p.targeting, targeting_automation: { advantage_audience: 0 } } };
        else if (/instagram_user_id/.test(texto) && p.object_story_spec?.instagram_user_id) {
          const { instagram_user_id: ig, ...resto } = p.object_story_spec;
          p = { ...p, object_story_spec: { ...resto, instagram_actor_id: ig } };
        } else throw falha;
      }
    }
    return enviar(p);
  };

  const horario = (data, fimDoDia = false) => (data ? `${data}T${fimDoDia ? '23:59:00' : '00:00:00'}-0300` : undefined);

  const executarObjeto = async (op, plano, obj, objs) => {
    const porChave = (chave) => objs.find((o) => o.chave === chave);
    const c = plano.config;
    if (obj.tipo === 'midia') {
      const midia = lerMidia(obj.chave.split(':')[1]);
      if (!midia) throw new ErroMeta('O arquivo foi apagado da biblioteca.', 410);
      const enviado = await enviarMidiaParaConta(midia, plano.contaId);
      if (enviado.videoId) {
        const pronto = await videoPronto(enviado.videoId);
        if (!pronto) return { esperar: 20 };
        return { metaId: enviado.videoId, extra: { miniatura: pronto.miniatura } };
      }
      return { metaId: enviado.hash, extra: { hash: enviado.hash } };
    }
    if (obj.tipo === 'campanha') {
      const params = { name: plano.nomeCampanha, objective: c.objective, status: 'PAUSED', special_ad_categories: [], buying_type: 'AUCTION' };
      if (plano.orcamento.modo === 'campanha_diario') Object.assign(params, { daily_budget: String(centavos(plano.orcamento.valor)), bid_strategy: c.bid_strategy });
      if (plano.orcamento.modo === 'campanha_total') Object.assign(params, { lifetime_budget: String(centavos(plano.orcamento.valor)), bid_strategy: c.bid_strategy });
      const r = await comAdaptacoes((p) => graphEnviar(`${plano.contaId}/campaigns`, p), params);
      return { metaId: r.id };
    }
    const n = Number(obj.chave.split(':')[1]);
    const item = plano.itens.find((i) => i.n === n);
    if (obj.tipo === 'conjunto') {
      const campanha = porChave('campanha');
      const params = {
        name: item.nomeConjunto,
        campaign_id: campanha.meta_id,
        status: 'PAUSED',
        billing_event: c.billing_event,
        optimization_goal: c.optimization_goal,
        destination_type: c.destination_type,
        promoted_object: c.promoted_object,
        targeting: item.targeting,
        start_time: horario(plano.orcamento.inicio),
        end_time: horario(plano.orcamento.fim, true),
      };
      if (plano.orcamento.modo === 'conjunto') Object.assign(params, { daily_budget: String(centavos(item.valor)), bid_strategy: c.bid_strategy });
      // Anunciante verificado (Brasil): da referência ou de outro conjunto da conta.
      let regulacao = c.regulacao || (await regulacaoDaConta(plano.contaId));
      if (regulacao) Object.assign(params, regulacao);
      try {
        const r = await comAdaptacoes((p) => graphEnviar(`${plano.contaId}/adsets`, p), params);
        return { metaId: r.id };
      } catch (falha) {
        if (!(falha instanceof ErroMeta) || falha.detalhe?.incerto || !ehErroRegulacao(falha)) throw falha;
        if (regulacao) throw falha;
        cacheRegulacao.delete(plano.contaId);
        regulacao = await regulacaoDaConta(plano.contaId);
        if (!regulacao) throw erroSemRegulacao();
        const r = await comAdaptacoes((p) => graphEnviar(`${plano.contaId}/adsets`, p), { ...params, ...regulacao });
        return { metaId: r.id };
      }
    }
    if (obj.tipo === 'criativo') {
      const midiaObj = porChave(`midia:${item.midiaId}`);
      const extraMidia = JSON.parse(midiaObj.extra || '{}');
      const cta = { ...c.cta };
      const link = plano.modelo === 'whatsapp' ? c.link : plano.instagramUrl;
      if (plano.modelo === 'instagram' && link) cta.value = { link };
      const oss = { page_id: plano.paginaId };
      if (plano.instagramId) oss.instagram_user_id = plano.instagramId;
      if (item.midiaTipo === 'video') {
        oss.video_data = { video_id: midiaObj.meta_id, image_url: extraMidia.miniatura, message: plano.texto || undefined, title: plano.titulo || undefined, call_to_action: cta };
      } else {
        oss.link_data = { image_hash: extraMidia.hash, message: plano.texto || undefined, name: plano.titulo || undefined, link: link || undefined, call_to_action: cta };
      }
      const r = await comAdaptacoes((p) => graphEnviar(`${plano.contaId}/adcreatives`, p), { name: `${item.nomeAnuncio} · ${item.midiaNome}`.slice(0, 100), object_story_spec: oss });
      return { metaId: r.id };
    }
    if (obj.tipo === 'anuncio') {
      const conjunto = porChave(`conjunto:${n}`);
      const criativo = porChave(`criativo:${n}`);
      const r = await graphEnviar(`${plano.contaId}/ads`, { name: item.nomeAnuncio, adset_id: conjunto.meta_id, creative: { creative_id: criativo.meta_id }, status: 'PAUSED' });
      return { metaId: r.id };
    }
    throw new Error(`tipo desconhecido ${obj.tipo}`);
  };

  // Dependências: o que precisa estar criado antes, e o que fica bloqueado se falhar.
  const dependencias = (obj, plano) => {
    if (obj.tipo === 'midia' || obj.tipo === 'campanha') return [];
    const n = Number(obj.chave.split(':')[1]);
    const item = plano.itens.find((i) => i.n === n);
    if (obj.tipo === 'conjunto') return ['campanha'];
    if (obj.tipo === 'criativo') return [`midia:${item.midiaId}`, `conjunto:${n}`];
    return [`conjunto:${n}`, `criativo:${n}`];
  };

  const verificarNaMeta = async (op, objs) => {
    for (const obj of objs.filter((o) => o.meta_id && ['campanha', 'conjunto', 'anuncio'].includes(o.tipo))) {
      try {
        const r = await graph(obj.meta_id, { fields: 'id,name,effective_status,configured_status' });
        atualizarObjeto(obj.id, { estado_meta: JSON.stringify({ efetivo: r.effective_status, configurado: r.configured_status, texto: STATUS_META[r.effective_status] || r.effective_status, em: agora() }) });
      } catch (falha) {
        atualizarObjeto(obj.id, { estado_meta: JSON.stringify({ erro: falha.message, em: agora() }) });
      }
    }
  };

  // ---------- Motor ----------
  let rodando = false;
  let timer = null;
  const acordar = (ms = 200) => {
    clearTimeout(timer);
    timer = setTimeout(passo, ms);
    timer.unref?.();
  };

  const passo = async () => {
    if (rodando) return;
    rodando = true;
    let proxima = 3000;
    try {
      const op = db
        .prepare("SELECT * FROM operacoes WHERE status IN ('na_fila','em_andamento','aguardando_limite') AND (proxima_em IS NULL OR proxima_em <= ?) ORDER BY criado_em LIMIT 1")
        .get(agora());
      if (!op) proxima = 15000;
      else proxima = await processar(op);
    } catch (falha) {
      log('motor de anúncios:', falha);
    } finally {
      rodando = false;
      acordar(proxima);
    }
  };

  const processar = async (op) => {
    const plano = JSON.parse(op.plano);
    if (op.status === 'na_fila') {
      // Antes de criar qualquer coisa: a conta continua sendo a do cliente?
      try {
        const { act } = await contaDoCliente(plano.clienteId);
        if (act !== plano.contaId) throw new ErroMeta('A conta do cliente mudou depois que a operação foi montada. Bloqueado.', 409);
      } catch (falha) {
        if (limiteOuTransitorio(falha)) {
          atualizarOperacao(op.id, { status: 'aguardando_limite', proxima_em: new Date(Date.now() + 60000).toISOString(), erro: falha.message });
          return 1000;
        }
        atualizarOperacao(op.id, { status: 'falha', erro: falha.message });
        registrar(op.id, 'falha', { motivo: falha.message });
        return 500;
      }
      atualizarOperacao(op.id, { status: 'em_andamento', erro: null });
      registrar(op.id, 'iniciada');
    }
    const objs = objetosDa(op.id);
    const porChave = new Map(objs.map((o) => [o.chave, o]));

    // Incertos primeiro: conferir na Meta antes de qualquer outra coisa.
    for (const obj of objs.filter((o) => o.status === 'incerto')) {
      const pai = obj.tipo === 'conjunto' ? porChave.get('campanha')?.meta_id : obj.tipo === 'anuncio' ? porChave.get(`conjunto:${obj.chave.split(':')[1]}`)?.meta_id : null;
      try {
        const r = await reconciliar(op, plano, obj, pai);
        if (r === 'ambiguo') {
          atualizarObjeto(obj.id, { status: 'aguardando_correcao', erro: JSON.stringify({ mensagem: 'Há mais de um objeto com este nome criado nesse horário. Confira no Gerenciador e informe qual é o certo.' }) });
        } else if (r === 'repetir') {
          const conferencias = JSON.parse(obj.extra || '{}').conferencias || 0;
          if (conferencias < 3) {
            atualizarObjeto(obj.id, { extra: JSON.stringify({ ...JSON.parse(obj.extra || '{}'), conferencias: conferencias + 1 }) });
            return 20000; // a Meta pode demorar a listar o que acabou de criar
          }
          atualizarObjeto(obj.id, { status: 'pendente', erro: null });
          registrar(op.id, 'nao_encontrado_repetir', { chave: obj.chave });
        }
      } catch (falha) {
        return limiteOuTransitorio(falha) ? 60000 : 20000;
      }
      return 300;
    }

    const proximo = objs.find((o) => o.status === 'pendente');
    if (!proximo) {
      // Fim: confere tudo na Meta e fecha o relatório.
      await verificarNaMeta(op, objs);
      const finais = objetosDa(op.id);
      const pendencias = finais.filter((o) => ['aguardando_correcao'].includes(o.status));
      const falhas = finais.filter((o) => ['falhou', 'bloqueado'].includes(o.status));
      const status = pendencias.length ? 'aguardando_correcao' : falhas.length ? (finais.some((o) => o.tipo === 'anuncio' && o.status === 'criado') ? 'parcial' : 'falha') : 'concluida';
      atualizarOperacao(op.id, { status, proxima_em: null });
      registrar(op.id, 'finalizada', { status });
      log(`operação ${op.id}: ${status}`);
      return 500;
    }

    // Bloqueia o que depende de algo que falhou.
    const deps = dependencias(proximo, plano).map((k) => porChave.get(k));
    if (deps.some((d) => !d || ['falhou', 'bloqueado'].includes(d.status))) {
      atualizarObjeto(proximo.id, { status: 'bloqueado', erro: JSON.stringify({ mensagem: 'Não foi criado porque uma etapa anterior falhou.' }) });
      return 100;
    }
    if (deps.some((d) => d.status !== 'criado')) return 2000;

    atualizarObjeto(proximo.id, { status: 'enviando', iniciado_em: agora(), tentativas: proximo.tentativas + 1 });
    try {
      const r = await executarObjeto(op, plano, { ...proximo, status: 'enviando' }, objetosDa(op.id));
      if (r.esperar) {
        atualizarObjeto(proximo.id, { status: 'pendente', tentativas: proximo.tentativas });
        atualizarOperacao(op.id, { erro: 'Aguardando a Meta processar o vídeo…' });
        return r.esperar * 1000;
      }
      atualizarObjeto(proximo.id, { status: 'criado', meta_id: r.metaId, erro: null, extra: JSON.stringify({ ...JSON.parse(proximo.extra || '{}'), ...(r.extra || {}) }) });
      atualizarOperacao(op.id, { status: 'em_andamento', erro: null, proxima_em: null });
      return 300;
    } catch (falha) {
      if (falha instanceof ErroMeta && falha.detalhe?.incerto && ['campanha', 'conjunto', 'anuncio'].includes(proximo.tipo)) {
        atualizarObjeto(proximo.id, { status: 'incerto', erro: erroTexto(falha) });
        registrar(op.id, 'resultado_desconhecido', { chave: proximo.chave });
        return 15000;
      }
      if (limiteOuTransitorio(falha) || (falha instanceof ErroMeta && falha.detalhe?.incerto)) {
        const espera = Math.min(15 * 60, 30 * 2 ** Math.min(proximo.tentativas, 5));
        atualizarObjeto(proximo.id, { status: 'pendente', erro: erroTexto(falha) });
        if (proximo.tentativas >= 6) {
          atualizarObjeto(proximo.id, { status: 'falhou' });
          return 300;
        }
        atualizarOperacao(op.id, { status: 'aguardando_limite', proxima_em: new Date(Date.now() + espera * 1000).toISOString(), erro: `${falha.message} Nova tentativa em ${espera}s.` });
        return 1000;
      }
      atualizarObjeto(proximo.id, { status: 'falhou', erro: erroTexto(falha) });
      registrar(op.id, 'erro', { chave: proximo.chave, mensagem: falha?.message });
      if (proximo.tipo === 'campanha') {
        // Sem campanha não há o que criar: bloqueia o resto de uma vez.
        for (const o of objetosDa(op.id).filter((x) => x.status === 'pendente' && x.tipo !== 'midia')) atualizarObjeto(o.id, { status: 'bloqueado', erro: JSON.stringify({ mensagem: 'A campanha não foi criada.' }) });
      }
      return 300;
    }
  };

  // Ao ligar: o que estava "enviando" quando o servidor caiu tem resultado desconhecido.
  for (const o of db.prepare("SELECT id, tipo FROM objetos WHERE status = 'enviando'").all()) {
    db.prepare('UPDATE objetos SET status = ? WHERE id = ?').run(['campanha', 'conjunto', 'anuncio'].includes(o.tipo) ? 'incerto' : 'pendente', o.id);
  }
  acordar(3000);

  const operacaoPublica = (op, comObjetos = false) => {
    const plano = JSON.parse(op.plano);
    const objs = objetosDa(op.id);
    const contar = (tipo, status) => objs.filter((o) => o.tipo === tipo && (!status || o.status === status)).length;
    const base = {
      id: op.id,
      status: op.status,
      erro: op.erro,
      proximaEm: op.proxima_em,
      criadoEm: op.criado_em,
      atualizadoEm: op.atualizado_em,
      clienteId: plano.clienteId,
      clienteNome: plano.clienteNome,
      contaId: plano.contaId,
      contaNome: plano.contaNome,
      modelo: plano.modeloRotulo,
      nomeCampanha: plano.nomeCampanha,
      conjuntos: contar('conjunto'),
      anuncios: contar('anuncio'),
      progresso: { feitos: objs.filter((o) => o.status === 'criado').length, total: objs.length, falhas: objs.filter((o) => ['falhou', 'bloqueado', 'aguardando_correcao'].includes(o.status)).length },
      etapaAtual: objs.find((o) => ['enviando', 'incerto', 'pendente'].includes(o.status))?.nome || null,
      campanhaId: objs.find((o) => o.tipo === 'campanha')?.meta_id || null,
    };
    if (!comObjetos) return base;
    return {
      ...base,
      plano,
      objetos: objs.map((o) => ({
        chave: o.chave,
        tipo: o.tipo,
        nome: o.nome,
        status: o.status,
        metaId: o.meta_id,
        tentativas: o.tentativas,
        erro: o.erro ? JSON.parse(o.erro) : null,
        estadoMeta: o.estado_meta ? JSON.parse(o.estado_meta) : null,
      })),
      historico: db.prepare('SELECT acao, detalhe, em FROM historico_anuncios WHERE operacao_id = ? ORDER BY em').all(op.id).map((h) => ({ ...h, detalhe: h.detalhe ? JSON.parse(h.detalhe) : null })),
    };
  };

  const mudarStatusNaMeta = async (opId, status) => {
    const op = db.prepare('SELECT * FROM operacoes WHERE id = ?').get(opId);
    if (!op) throw new ErroMeta('Operação não encontrada.', 404);
    const plano = JSON.parse(op.plano);
    if (status === 'ACTIVE' && op.status !== 'concluida') throw new ErroMeta('Só dá para ativar uma operação concluída sem falhas.', 409);
    await contaDoCliente(plano.clienteId);
    const objs = objetosDa(opId).filter((o) => o.meta_id && ['anuncio', 'conjunto', 'campanha'].includes(o.tipo));
    // Ativa de baixo para cima e pausa de cima para baixo.
    const ordem = status === 'ACTIVE' ? ['anuncio', 'conjunto', 'campanha'] : ['campanha', 'conjunto', 'anuncio'];
    const falhas = [];
    for (const tipo of ordem) {
      for (const o of objs.filter((x) => x.tipo === tipo)) {
        try {
          await graphEnviar(o.meta_id, { status });
        } catch (falha) {
          falhas.push(`${o.nome}: ${falha.message}`);
        }
      }
    }
    registrar(opId, status === 'ACTIVE' ? 'ativada' : 'pausada', { falhas });
    await verificarNaMeta(op, objetosDa(opId));
    if (falhas.length) throw new ErroMeta(`Alguns objetos não mudaram: ${falhas.slice(0, 3).join(' | ')}`, 502);
  };

  // ---------- Rotas ----------
  const rotas = async ({ req, res, metodo, rota, lerCorpo, responder }) => {
    let m;
    if (rota === '/midias' && metodo === 'GET') {
      const url = new URL(req.url, 'http://local');
      const cliente = url.searchParams.get('cliente');
      const lista = db
        .prepare(`SELECT * FROM midias WHERE status = 'pronta' ${cliente ? 'AND (cliente_id = ? OR cliente_id IS NULL)' : ''} ORDER BY criado_em DESC`)
        .all(...(cliente ? [cliente] : []));
      responder(res, 200, { midias: lista.map(midiaPublica) });
      return true;
    }
    if (rota === '/midias' && metodo === 'POST') {
      responder(res, 200, { midia: iniciarMidia(await lerCorpo(10 * 1024)) });
      return true;
    }
    if ((m = rota.match(/^\/midias\/([\w-]+)\/parte$/)) && metodo === 'PUT') {
      const url = new URL(req.url, 'http://local');
      responder(res, 200, await receberParte(req, m[1], Number(url.searchParams.get('offset'))));
      return true;
    }
    if ((m = rota.match(/^\/midias\/([\w-]+)\/concluir$/)) && metodo === 'POST') {
      responder(res, 200, { midia: concluirMidia(m[1]) });
      return true;
    }
    if ((m = rota.match(/^\/midias\/([\w-]+)\/arquivo$/)) && metodo === 'GET') {
      servirMidia(req, res, m[1]);
      return true;
    }
    if ((m = rota.match(/^\/midias\/([\w-]+)$/)) && metodo === 'DELETE') {
      apagarMidia(m[1]);
      responder(res, 204);
      return true;
    }
    if ((m = rota.match(/^\/clientes\/([\w-]+)\/publicos$/)) && metodo === 'GET') {
      const { act } = await contaDoCliente(m[1], { conferirNaMeta: false });
      const url = new URL(req.url, 'http://local');
      const r = await publicosDaConta(act, url.searchParams.get('atualizar') === '1');
      responder(res, 200, { contaId: act, atualizadoEm: new Date(r.em).toISOString(), erros: r.erros, publicos: r.publicos.map(({ targeting, ...resto }) => resto) });
      return true;
    }
    if ((m = rota.match(/^\/clientes\/([\w-]+)\/referencias$/)) && metodo === 'GET') {
      const { act } = await contaDoCliente(m[1], { conferirNaMeta: false });
      const url = new URL(req.url, 'http://local');
      const modelo = url.searchParams.get('modelo') === 'instagram' ? 'instagram' : 'whatsapp';
      responder(res, 200, { referencias: await referenciasDaConta(act, modelo) });
      return true;
    }
    if ((m = rota.match(/^\/clientes\/([\w-]+)\/referencias\/([\w-]+)$/)) && metodo === 'GET') {
      const { act } = await contaDoCliente(m[1], { conferirNaMeta: false });
      const url = new URL(req.url, 'http://local');
      const modelo = url.searchParams.get('modelo') === 'instagram' ? 'instagram' : 'whatsapp';
      responder(res, 200, { config: await aprenderReferencia(act, m[2], modelo) });
      return true;
    }
    if (rota === '/operacoes/revisar' && metodo === 'POST') {
      const { plano, avisos } = await validarPlano(await lerCorpo(2 * MB));
      const { itens, ...resto } = plano;
      responder(res, 200, { plano: { ...resto, itens: itens.map(({ targeting, ...i }) => ({ ...i, resumoPublico: resumoTargeting(targeting) })) }, avisos });
      return true;
    }
    if (rota === '/operacoes' && metodo === 'POST') {
      const { plano } = await validarPlano(await lerCorpo(2 * MB));
      responder(res, 200, { id: criarOperacao(plano) });
      return true;
    }
    if (rota === '/operacoes' && metodo === 'GET') {
      responder(res, 200, { operacoes: db.prepare('SELECT * FROM operacoes ORDER BY criado_em DESC LIMIT 100').all().map((op) => operacaoPublica(op)) });
      return true;
    }
    if ((m = rota.match(/^\/operacoes\/([\w-]+)$/)) && metodo === 'GET') {
      const op = db.prepare('SELECT * FROM operacoes WHERE id = ?').get(m[1]);
      if (!op) throw new ErroMeta('Operação não encontrada.', 404);
      responder(res, 200, { operacao: operacaoPublica(op, true) });
      return true;
    }
    if ((m = rota.match(/^\/operacoes\/([\w-]+)\/retomar$/)) && metodo === 'POST') {
      const op = db.prepare('SELECT * FROM operacoes WHERE id = ?').get(m[1]);
      if (!op) throw new ErroMeta('Operação não encontrada.', 404);
      // Só volta para a fila o que falhou por motivo que pode ter sido corrigido; o que já existe na Meta fica.
      for (const o of objetosDa(op.id).filter((x) => ['falhou', 'bloqueado'].includes(x.status))) atualizarObjeto(o.id, { status: 'pendente', erro: null });
      atualizarOperacao(op.id, { status: 'em_andamento', proxima_em: null, erro: null });
      registrar(op.id, 'retomada');
      acordar();
      responder(res, 200, { ok: true });
      return true;
    }
    if ((m = rota.match(/^\/operacoes\/([\w-]+)\/resolver$/)) && metodo === 'POST') {
      // Para objetos "aguardando correção": o usuário informa o ID certo (ou que não existe).
      const corpo = await lerCorpo(10 * 1024);
      const obj = objetosDa(m[1]).find((o) => o.chave === corpo.chave && o.status === 'aguardando_correcao');
      if (!obj) throw new ErroMeta('Nada para resolver aqui.', 404);
      if (corpo.metaId) {
        const r = await graph(String(corpo.metaId), { fields: 'id,name' });
        if (r.name !== obj.nome) throw new ErroMeta(`O ID informado é de “${r.name}”, não de “${obj.nome}”.`, 409);
        atualizarObjeto(obj.id, { status: 'criado', meta_id: r.id, erro: null });
      } else atualizarObjeto(obj.id, { status: 'pendente', erro: null });
      atualizarOperacao(m[1], { status: 'em_andamento', proxima_em: null });
      registrar(m[1], 'resolvido_manual', { chave: obj.chave, metaId: corpo.metaId || null });
      acordar();
      responder(res, 200, { ok: true });
      return true;
    }
    if ((m = rota.match(/^\/operacoes\/([\w-]+)\/(ativar|pausar)$/)) && metodo === 'POST') {
      await mudarStatusNaMeta(m[1], m[2] === 'ativar' ? 'ACTIVE' : 'PAUSED');
      responder(res, 200, { ok: true });
      return true;
    }
    if ((m = rota.match(/^\/operacoes\/([\w-]+)\/verificar$/)) && metodo === 'POST') {
      const op = db.prepare('SELECT * FROM operacoes WHERE id = ?').get(m[1]);
      if (!op) throw new ErroMeta('Operação não encontrada.', 404);
      await verificarNaMeta(op, objetosDa(op.id));
      responder(res, 200, { ok: true });
      return true;
    }
    return false;
  };

  return { rotas };
};
