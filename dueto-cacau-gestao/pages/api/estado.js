import { autenticado, gravarDados, lerDados, senhaConfigurada } from '@/lib/servidor';

export const config = { api: { bodyParser: { sizeLimit: '8mb' } } };

export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!senhaConfigurada()) return res.status(503).json({ erro: 'Senha de acesso não configurada no servidor.' });
  if (!autenticado(req)) return res.status(401).json({ erro: 'Entre com a senha.' });

  try {
    if (req.method === 'GET') {
      const d = lerDados();
      return res.status(200).json(d);
    }
    if (req.method === 'PUT') {
      const { baseRev, estado } = req.body || {};
      if (!estado || typeof estado !== 'object' || !Array.isArray(estado.receitas)) {
        return res.status(400).json({ erro: 'Dados inválidos.' });
      }
      const atual = lerDados();
      if (Number(baseRev) !== atual.rev) {
        return res.status(409).json({ erro: 'Os dados mudaram em outro aparelho.', rev: atual.rev });
      }
      const d = gravarDados(estado, atual.rev + 1);
      return res.status(200).json({ rev: d.rev, atualizadoEm: d.atualizadoEm });
    }
    res.setHeader('Allow', 'GET, PUT');
    return res.status(405).end();
  } catch (e) {
    console.error('erro em /api/estado', e);
    return res.status(500).json({ erro: 'Não foi possível ler ou gravar os dados no servidor.' });
  }
}
