import {
  defineView,
  ViewType,
} from 'twenty-sdk/define';

import {
  SERVICO_CONTRATADO_CLIENTE_FIELD_UID,
  SERVICO_CONTRATADO_DATA_INICIO_FIELD_UID,
  SERVICO_CONTRATADO_DATA_RENOVACAO_FIELD_UID,
  SERVICO_CONTRATADO_DIA_VENCIMENTO_FIELD_UID,
  SERVICO_CONTRATADO_FORMA_PAGAMENTO_FIELD_UID,
  SERVICO_CONTRATADO_NAME_FIELD_UID,
  SERVICO_CONTRATADO_RECORRENCIA_FIELD_UID,
  SERVICO_CONTRATADO_STATUS_FIELD_UID,
  SERVICO_CONTRATADO_TIPO_DE_SERVICO_FIELD_UID,
  SERVICO_CONTRATADO_UID,
  SERVICO_CONTRATADO_VALOR_FIELD_UID,
  VIEW_SERVICOS_UID,
} from 'src/constants/universal-identifiers';

export default defineView({
  universalIdentifier: VIEW_SERVICOS_UID,
  name: 'Serviços contratados',
  objectUniversalIdentifier: SERVICO_CONTRATADO_UID,
  type: ViewType.TABLE,
  icon: 'IconTable',
  position: 0,
  fields: [
    { universalIdentifier: '77a6c058-cf03-4438-8320-ca889efee5d6', fieldMetadataUniversalIdentifier: SERVICO_CONTRATADO_NAME_FIELD_UID, position: 0, isVisible: true, size: 240 },
    { universalIdentifier: 'e2fb05a3-9c02-4329-b262-fcb275420550', fieldMetadataUniversalIdentifier: SERVICO_CONTRATADO_CLIENTE_FIELD_UID, position: 1, isVisible: true, size: 180 },
    { universalIdentifier: '319fde74-a1a7-4b0c-8261-417e304b0cbe', fieldMetadataUniversalIdentifier: SERVICO_CONTRATADO_TIPO_DE_SERVICO_FIELD_UID, position: 2, isVisible: true, size: 170 },
    { universalIdentifier: 'd4ab90f6-9216-4785-a1fd-4b270ff4b729', fieldMetadataUniversalIdentifier: SERVICO_CONTRATADO_STATUS_FIELD_UID, position: 3, isVisible: true, size: 130 },
    { universalIdentifier: '579e6ce8-f65f-43d2-89b2-a22af59014c1', fieldMetadataUniversalIdentifier: SERVICO_CONTRATADO_VALOR_FIELD_UID, position: 4, isVisible: true, size: 140 },
    { universalIdentifier: '3f3016da-2c7f-44b3-910d-700e18c1acbc', fieldMetadataUniversalIdentifier: SERVICO_CONTRATADO_RECORRENCIA_FIELD_UID, position: 5, isVisible: true, size: 130 },
    { universalIdentifier: '9a4ece22-3e8a-4f8e-b04a-1274b19f56b6', fieldMetadataUniversalIdentifier: SERVICO_CONTRATADO_DIA_VENCIMENTO_FIELD_UID, position: 6, isVisible: true, size: 110 },
    { universalIdentifier: 'da96ec21-53ba-4466-bbf7-db431938031d', fieldMetadataUniversalIdentifier: SERVICO_CONTRATADO_DATA_INICIO_FIELD_UID, position: 7, isVisible: true, size: 120 },
    { universalIdentifier: '3aa472e6-56c4-403f-96d6-696e0167013a', fieldMetadataUniversalIdentifier: SERVICO_CONTRATADO_DATA_RENOVACAO_FIELD_UID, position: 8, isVisible: true, size: 120 },
    { universalIdentifier: '8a791bb7-9459-49f3-8242-ae353cc3d108', fieldMetadataUniversalIdentifier: SERVICO_CONTRATADO_FORMA_PAGAMENTO_FIELD_UID, position: 9, isVisible: true, size: 140 },
  ],
});
