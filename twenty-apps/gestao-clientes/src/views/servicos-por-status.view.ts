import {
  defineView,
  ViewType,
} from 'twenty-sdk/define';

import {
  SERVICO_CONTRATADO_CLIENTE_FIELD_UID,
  SERVICO_CONTRATADO_DATA_RENOVACAO_FIELD_UID,
  SERVICO_CONTRATADO_NAME_FIELD_UID,
  SERVICO_CONTRATADO_STATUS_FIELD_UID,
  SERVICO_CONTRATADO_UID,
  SERVICO_CONTRATADO_VALOR_FIELD_UID,
  VIEW_SERVICOS_KANBAN_UID,
} from 'src/constants/universal-identifiers';

export default defineView({
  universalIdentifier: VIEW_SERVICOS_KANBAN_UID,
  name: 'Serviços por status',
  objectUniversalIdentifier: SERVICO_CONTRATADO_UID,
  type: ViewType.KANBAN,
  icon: 'IconLayoutKanban',
  position: 1,
  mainGroupByFieldMetadataUniversalIdentifier: SERVICO_CONTRATADO_STATUS_FIELD_UID,
  fields: [
    { universalIdentifier: '06a4fa9f-5792-44ca-8e2a-888165b39e65', fieldMetadataUniversalIdentifier: SERVICO_CONTRATADO_NAME_FIELD_UID, position: 0, isVisible: true, size: 240 },
    { universalIdentifier: 'a656b8c6-57e8-4cb4-a28b-b4adc4717969', fieldMetadataUniversalIdentifier: SERVICO_CONTRATADO_CLIENTE_FIELD_UID, position: 1, isVisible: true, size: 180 },
    { universalIdentifier: '452f9769-d1f9-47a8-a2ef-e6efd848f216', fieldMetadataUniversalIdentifier: SERVICO_CONTRATADO_VALOR_FIELD_UID, position: 2, isVisible: true, size: 140 },
    { universalIdentifier: '2d24c6d3-e107-4c51-85ad-64ade7a659fe', fieldMetadataUniversalIdentifier: SERVICO_CONTRATADO_DATA_RENOVACAO_FIELD_UID, position: 3, isVisible: true, size: 120 },
  ],
  groups: [
    { universalIdentifier: '9be4fdb2-1df5-4cf9-81a0-38351c24f1a5', fieldValue: 'PROPOSTA', position: 0, isVisible: true },
    { universalIdentifier: '1d402b3f-6c95-4857-b307-cf549e551a18', fieldValue: 'ONBOARDING', position: 1, isVisible: true },
    { universalIdentifier: '4e422957-f23e-4b2f-b239-247e8789d757', fieldValue: 'ATIVO', position: 2, isVisible: true },
    { universalIdentifier: 'dcc1a7ac-a98a-4085-bdcb-85b8cc4a9168', fieldValue: 'PAUSADO', position: 3, isVisible: true },
    { universalIdentifier: '8e20ce21-6e12-4ce2-acd7-a9e911999d93', fieldValue: 'ENCERRADO', position: 4, isVisible: true },
  ],
});
