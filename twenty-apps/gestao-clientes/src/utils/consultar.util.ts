import { CoreApiClient } from 'twenty-client-sdk/core';

// O cliente gerado é tipado pelo schema de cada workspace (que muda conforme os
// objetos instalados). Aqui o formato da resposta é declarado por quem chama.
export const consultar = async <T,>(selecao: Record<string, unknown>): Promise<T> =>
  (await new CoreApiClient().query(selecao as any)) as T;
