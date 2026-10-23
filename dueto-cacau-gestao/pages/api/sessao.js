import { apagarCookie, autenticado, criarCookie, ipDe, podeTentar, registrarFalha, senhaConfigurada, senhaCorreta } from '@/lib/servidor';

export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!senhaConfigurada()) {
    return res.status(503).json({ erro: 'Senha de acesso não configurada no servidor (variável APP_PASSWORD).' });
  }
  if (req.method === 'GET') return res.status(200).json({ autenticado: autenticado(req) });
  if (req.method === 'DELETE') {
    res.setHeader('Set-Cookie', apagarCookie());
    return res.status(200).json({ autenticado: false });
  }
  if (req.method === 'POST') {
    const ip = ipDe(req);
    if (!podeTentar(ip)) return res.status(429).json({ erro: 'Muitas tentativas. Aguarde um minuto e tente de novo.' });
    if (!senhaCorreta(req.body?.senha)) {
      registrarFalha(ip);
      return res.status(401).json({ erro: 'Senha incorreta.' });
    }
    res.setHeader('Set-Cookie', criarCookie());
    return res.status(200).json({ autenticado: true });
  }
  res.setHeader('Allow', 'GET, POST, DELETE');
  return res.status(405).end();
}
