import { ENTREGA_STATUS_OPTIONS } from 'src/objects/entrega.object';

export const STATUS_ENTREGA: Record<string, { label: string; color: string }> =
  Object.fromEntries(
    ENTREGA_STATUS_OPTIONS.map((opcao) => [
      opcao.value,
      { label: opcao.label, color: opcao.color },
    ]),
  );
