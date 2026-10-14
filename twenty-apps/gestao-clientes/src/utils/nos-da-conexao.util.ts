import { type Conexao } from 'src/types/no-conexao';

export const nosDaConexao = <T,>(conexao: Conexao<T>): T[] =>
  (conexao?.edges ?? []).map((aresta) => aresta.node);
