import { definePostInstallLogicFunction } from 'twenty-sdk/define';

import { TIPOS_DE_SERVICO_INICIAIS } from 'src/constants/tipos-de-servico-iniciais';
import { SEMEAR_TIPOS_DE_SERVICO_UID } from 'src/constants/universal-identifiers';
import { consultar } from 'src/utils/consultar.util';
import { mutar } from 'src/utils/mutar.util';

// Cria os tipos de serviço iniciais uma única vez. Idempotente: só cria os que
// ainda não existem (pelo nome), então reinstalar não duplica nada e os tipos
// criados ou renomeados pelo usuário são preservados.
const handler = async () => {
  const existentes = await consultar<{ tiposDeServico?: { edges?: Array<{ node: { name: string | null } }> } }>({
      tiposDeServico: {
        __args: { first: 200 },
        edges: { node: { name: true } },
      },
    });
  const nomes = new Set(
    (existentes.tiposDeServico?.edges ?? []).map((aresta) =>
      (aresta.node.name ?? '').trim().toLowerCase(),
    ),
  );
  const faltando = TIPOS_DE_SERVICO_INICIAIS.filter(
    (tipo) => !nomes.has(tipo.name.toLowerCase()),
  );
  if (faltando.length === 0) {
    return { criados: 0 };
  }
  await mutar({
    createTiposDeServico: {
      __args: { data: faltando },
      id: true,
    },
  });
  return { criados: faltando.length };
};

export default definePostInstallLogicFunction({
  universalIdentifier: SEMEAR_TIPOS_DE_SERVICO_UID,
  name: 'semear-tipos-de-servico',
  description: 'Cadastra os tipos de serviço iniciais (Marketing/Tráfego, Sites/Sistemas, Consultoria/Mentoria)',
  timeoutSeconds: 30,
  handler,
});
