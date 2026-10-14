import {
  defineView,
  ViewCalendarLayout,
  ViewType,
} from 'twenty-sdk/define';

import {
  ENTREGA_CLIENTE_FIELD_UID,
  ENTREGA_NAME_FIELD_UID,
  ENTREGA_PRAZO_FIELD_UID,
  ENTREGA_STATUS_FIELD_UID,
  ENTREGA_UID,
  VIEW_ENTREGAS_CALENDARIO_UID,
} from 'src/constants/universal-identifiers';

export default defineView({
  universalIdentifier: VIEW_ENTREGAS_CALENDARIO_UID,
  name: 'Calendário de entregas',
  objectUniversalIdentifier: ENTREGA_UID,
  type: ViewType.CALENDAR,
  icon: 'IconCalendar',
  position: 2,
  calendarLayout: ViewCalendarLayout.MONTH,
  calendarFieldMetadataUniversalIdentifier: ENTREGA_PRAZO_FIELD_UID,
  fields: [
    { universalIdentifier: '52195b7c-a2be-46c1-bcfb-f803e9af4ac6', fieldMetadataUniversalIdentifier: ENTREGA_NAME_FIELD_UID, position: 0, isVisible: true, size: 240 },
    { universalIdentifier: '715224d0-1aa5-4ce1-81bb-1fb6ca4b193a', fieldMetadataUniversalIdentifier: ENTREGA_CLIENTE_FIELD_UID, position: 1, isVisible: true, size: 180 },
    { universalIdentifier: '047f2585-0f5b-40b9-ac3e-42e4e2546511', fieldMetadataUniversalIdentifier: ENTREGA_STATUS_FIELD_UID, position: 2, isVisible: true, size: 160 },
  ],
});
