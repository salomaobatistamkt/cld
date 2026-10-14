import {
  defineView,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
  ViewFilterOperand,
  ViewType,
} from 'twenty-sdk/define';

import {
  CLIENTE_DESDE_FIELD_UID,
  CLIENTE_EMAIL_FIELD_UID,
  CLIENTE_ENTREGAS_FIELD_UID,
  CLIENTE_RESPONSAVEL_FIELD_UID,
  CLIENTE_SEGMENTO_FIELD_UID,
  CLIENTE_SERVICOS_CONTRATADOS_FIELD_UID,
  CLIENTE_STATUS_FIELD_UID,
  CLIENTE_WHATSAPP_FIELD_UID,
  VIEW_CLIENTES_UID,
} from 'src/constants/universal-identifiers';

export default defineView({
  universalIdentifier: VIEW_CLIENTES_UID,
  name: 'Clientes',
  objectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company.universalIdentifier,
  type: ViewType.TABLE,
  icon: 'IconBuilding',
  position: 10,
  fields: [
    { universalIdentifier: '774d0b4e-b303-4642-87dc-119f558f05a6', fieldMetadataUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company.fields.name.universalIdentifier, position: 0, isVisible: true, size: 220 },
    { universalIdentifier: 'a54f01b4-8b40-43c2-85ab-f718418a9020', fieldMetadataUniversalIdentifier: CLIENTE_STATUS_FIELD_UID, position: 1, isVisible: true, size: 140 },
    { universalIdentifier: '4cf8729e-abc6-426f-a43e-67efc663eb41', fieldMetadataUniversalIdentifier: CLIENTE_SEGMENTO_FIELD_UID, position: 2, isVisible: true, size: 160 },
    { universalIdentifier: 'a5d74cc7-60e3-4477-a366-8e667fd81edb', fieldMetadataUniversalIdentifier: CLIENTE_RESPONSAVEL_FIELD_UID, position: 3, isVisible: true, size: 170 },
    { universalIdentifier: 'a19f69c0-8f75-4b40-aa40-e3442208fedc', fieldMetadataUniversalIdentifier: CLIENTE_WHATSAPP_FIELD_UID, position: 4, isVisible: true, size: 160 },
    { universalIdentifier: '563ca161-18ef-47fa-a8c4-002c52899c1f', fieldMetadataUniversalIdentifier: CLIENTE_EMAIL_FIELD_UID, position: 5, isVisible: true, size: 200 },
    { universalIdentifier: 'e5b52871-6335-4f89-875a-f783619e4dd0', fieldMetadataUniversalIdentifier: CLIENTE_SERVICOS_CONTRATADOS_FIELD_UID, position: 6, isVisible: true, size: 220 },
    { universalIdentifier: 'a3a55d58-09d4-41c1-9891-c34530ec373e', fieldMetadataUniversalIdentifier: CLIENTE_ENTREGAS_FIELD_UID, position: 7, isVisible: true, size: 200 },
    { universalIdentifier: '5c12208d-4f00-41c7-a17c-0d4e1f7fbfee', fieldMetadataUniversalIdentifier: CLIENTE_DESDE_FIELD_UID, position: 8, isVisible: true, size: 130 },
  ],
  filters: [
    { universalIdentifier: '0f879364-919c-4d60-9aef-eaee357a1416', fieldMetadataUniversalIdentifier: CLIENTE_STATUS_FIELD_UID, operand: ViewFilterOperand.IS_NOT_EMPTY, value: '' },
  ],
});
