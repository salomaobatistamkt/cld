import { CoreApiClient } from 'twenty-client-sdk/core';

export const mutar = async <T,>(selecao: Record<string, unknown>): Promise<T> =>
  (await new CoreApiClient().mutation(selecao as any)) as T;
