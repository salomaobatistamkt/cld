import { apagarCookie, autenticado, criarCookie, ipDe, podeTentar, registrarFalha, senhaConfigurada, senhaCorreta, usuarioValido } from '@/lib/servidor';

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
    const usuario = usuarioValido(req.body?.usuario);
    // a mesma mensagem para usuário ou senha errados, para não revelar quem existe
    if (!usuario || !senhaCorreta(req.body?.senha)) {
      registrarFalha(ip);
      return res.status(401).json({ erro: 'Usuário ou senha incorretos.' });
    }
    res.setHeader('Set-Cookie', criarCookie(usuario));
    return res.status(200).json({ autenticado: true });
  }
  res.setHeader('Allow', 'GET, POST, DELETE');
  return res.status(405).end();
}
