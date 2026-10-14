import { SERVICO_CONTRATADO_STATUS_OPTIONS } from 'src/objects/servico-contratado.object';

export const STATUS_SERVICO: Record<string, { label: string; color: string }> =
  Object.fromEntries(
    SERVICO_CONTRATADO_STATUS_OPTIONS.map((opcao) => [
      opcao.value,
      { label: opcao.label, color: opcao.color },
    ]),
  );
