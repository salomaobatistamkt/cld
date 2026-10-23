// Utilitários que rodam só no servidor: login por senha e arquivo de dados.
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const DIR = process.env.DATA_DIR || path.join(process.cwd(), 'dados');
const ARQUIVO = path.join(DIR, 'estado.json');
const ANTERIOR = path.join(DIR, 'estado-anterior.json');
const COOKIE = 'dueto_sessao';
const VALIDADE_MS = 30 * 24 * 3600 * 1000;

export const senhaConfigurada = () => Boolean(process.env.APP_PASSWORD && process.env.APP_PASSWORD.length >= 4);
const segredo = () => crypto.createHash('sha256').update(`dueto|${process.env.AUTH_SECRET || process.env.APP_PASSWORD || ''}`).digest();

const assinar = (texto) => crypto.createHmac('sha256', segredo()).update(texto).digest('hex');
const iguais = (a, b) => {
  const x = Buffer.from(String(a)); const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

export const senhaCorreta = (tentativa) => senhaConfigurada() && iguais(
  crypto.createHash('sha256').update(String(tentativa || '')).digest('hex'),
  crypto.createHash('sha256').update(process.env.APP_PASSWORD).digest('hex'),
);

export const criarCookie = () => {
  const exp = Date.now() + VALIDADE_MS;
  const valor = `${exp}.${assinar(String(exp))}`;
  return `${COOKIE}=${valor}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor(VALIDADE_MS / 1000)}`;
};
export const apagarCookie = () => `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;

export const autenticado = (req) => {
  if (!senhaConfigurada()) return false;
  const bruto = (req.headers.cookie || '').split(';').map((c) => c.trim()).find((c) => c.startsWith(`${COOKIE}=`));
  if (!bruto) return false;
  const [exp, assinatura] = bruto.slice(COOKIE.length + 1).split('.');
  if (!exp || !assinatura || Number(exp) < Date.now()) return false;
  return iguais(assinatura, assinar(exp));
};

/* Limite simples de tentativas de senha por IP. */
const tentativas = new Map();
export const podeTentar = (ip) => {
  const agora = Date.now();
  const lista = (tentativas.get(ip) || []).filter((t) => agora - t < 60_000);
  tentativas.set(ip, lista);
  return lista.length < 8;
};
export const registrarFalha = (ip) => tentativas.set(ip, [...(tentativas.get(ip) || []), Date.now()]);
export const ipDe = (req) => String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim();

/* Arquivo de dados: { rev, atualizadoEm, estado } */
export const lerDados = () => {
  try {
    return JSON.parse(fs.readFileSync(ARQUIVO, 'utf8'));
  } catch (e) {
    if (e.code === 'ENOENT') return { rev: 0, atualizadoEm: null, estado: null };
    throw e;
  }
};

export const gravarDados = (estado, rev) => {
  fs.mkdirSync(DIR, { recursive: true });
  try {
    // guarda uma cópia da versão anterior no máximo uma vez por hora
    const velho = fs.statSync(ANTERIOR, { throwIfNoEntry: false });
    if (fs.existsSync(ARQUIVO) && (!velho || Date.now() - velho.mtimeMs > 3600_000)) fs.copyFileSync(ARQUIVO, ANTERIOR);
  } catch (_) { /* cópia é opcional */ }
  const dados = { rev, atualizadoEm: new Date().toISOString(), estado };
  const temp = `${ARQUIVO}.${process.pid}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(dados));
  fs.renameSync(temp, ARQUIVO);
  return dados;
};
