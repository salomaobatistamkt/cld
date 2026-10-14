import {
  defineView,
  ViewCalendarLayout,
  ViewType,
} from 'twenty-sdk/define';

import {
  SERVICO_CONTRATADO_CLIENTE_FIELD_UID,
  SERVICO_CONTRATADO_DATA_RENOVACAO_FIELD_UID,
  SERVICO_CONTRATADO_NAME_FIELD_UID,
  SERVICO_CONTRATADO_UID,
  VIEW_RENOVACOES_UID,
} from 'src/constants/universal-identifiers';

export default defineView({
  universalIdentifier: VIEW_RENOVACOES_UID,
  name: 'Calendário de renovações',
  objectUniversalIdentifier: SERVICO_CONTRATADO_UID,
  type: ViewType.CALENDAR,
  icon: 'IconCalendarRepeat',
  position: 2,
  calendarLayout: ViewCalendarLayout.MONTH,
  calendarFieldMetadataUniversalIdentifier: SERVICO_CONTRATADO_DATA_RENOVACAO_FIELD_UID,
  fields: [
    { universalIdentifier: 'daf090a0-a462-4e1a-b7fc-0907d3cbfe73', fieldMetadataUniversalIdentifier: SERVICO_CONTRATADO_NAME_FIELD_UID, position: 0, isVisible: true, size: 240 },
    { universalIdentifier: 'f6a7ccfd-a7d6-4311-8e96-8450d2dd52a3', fieldMetadataUniversalIdentifier: SERVICO_CONTRATADO_CLIENTE_FIELD_UID, position: 1, isVisible: true, size: 180 },
  ],
});
