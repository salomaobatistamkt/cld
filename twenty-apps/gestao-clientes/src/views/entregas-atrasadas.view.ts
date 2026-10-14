import {
  defineView,
  ViewFilterOperand,
  ViewSortDirection,
  ViewType,
} from 'twenty-sdk/define';

import {
  ENTREGA_CLIENTE_FIELD_UID,
  ENTREGA_NAME_FIELD_UID,
  ENTREGA_PRAZO_FIELD_UID,
  ENTREGA_RESPONSAVEL_FIELD_UID,
  ENTREGA_STATUS_FIELD_UID,
  ENTREGA_UID,
  VIEW_ENTREGAS_ATRASADAS_UID,
} from 'src/constants/universal-identifiers';

export default defineView({
  universalIdentifier: VIEW_ENTREGAS_ATRASADAS_UID,
  name: 'Atrasadas',
  objectUniversalIdentifier: ENTREGA_UID,
  type: ViewType.TABLE,
  icon: 'IconAlarm',
  position: 3,
  fields: [
    { universalIdentifier: '192d4706-07e4-41cd-81c3-78a6b649f12e', fieldMetadataUniversalIdentifier: ENTREGA_NAME_FIELD_UID, position: 0, isVisible: true, size: 240 },
    { universalIdentifier: '07526b6b-534a-43eb-b395-2f0cb8d9f112', fieldMetadataUniversalIdentifier: ENTREGA_CLIENTE_FIELD_UID, position: 1, isVisible: true, size: 180 },
    { universalIdentifier: '18f04799-1671-4eac-8ab8-10c6adc67a8b', fieldMetadataUniversalIdentifier: ENTREGA_STATUS_FIELD_UID, position: 2, isVisible: true, size: 160 },
    { universalIdentifier: 'b24724c7-36d9-4e86-9702-eb0a9cb0bade', fieldMetadataUniversalIdentifier: ENTREGA_PRAZO_FIELD_UID, position: 3, isVisible: true, size: 120 },
    { universalIdentifier: '6e247766-7ae3-4111-bda9-a5e68ccad9dc', fieldMetadataUniversalIdentifier: ENTREGA_RESPONSAVEL_FIELD_UID, position: 4, isVisible: true, size: 150 },
  ],
  filters: [
    { universalIdentifier: '499de023-86de-43a5-b62e-a2d54c1f96fe', fieldMetadataUniversalIdentifier: ENTREGA_PRAZO_FIELD_UID, operand: ViewFilterOperand.IS_IN_PAST, value: '' },
    { universalIdentifier: '2386e486-7fe4-44d4-95c8-af57a36fef21', fieldMetadataUniversalIdentifier: ENTREGA_STATUS_FIELD_UID, operand: ViewFilterOperand.IS_NOT, value: ['ENTREGUE', 'CANCELADA'] },
  ],
  sorts: [
    { universalIdentifier: 'e9febfab-8128-4a95-8226-271a49d9a2bf', fieldMetadataUniversalIdentifier: ENTREGA_PRAZO_FIELD_UID, direction: ViewSortDirection.ASC },
  ],
});
