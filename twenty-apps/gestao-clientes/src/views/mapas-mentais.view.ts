import {
  defineView,
  ViewType,
} from 'twenty-sdk/define';

import {
  MAPA_MENTAL_CLIENTE_FIELD_UID,
  MAPA_MENTAL_NAME_FIELD_UID,
  MAPA_MENTAL_UID,
  VIEW_MAPAS_UID,
} from 'src/constants/universal-identifiers';

export default defineView({
  universalIdentifier: VIEW_MAPAS_UID,
  name: 'Mapas mentais',
  objectUniversalIdentifier: MAPA_MENTAL_UID,
  type: ViewType.TABLE,
  icon: 'IconTable',
  position: 0,
  fields: [
    { universalIdentifier: '52444ec7-40da-4344-820c-e71cb7e3946e', fieldMetadataUniversalIdentifier: MAPA_MENTAL_NAME_FIELD_UID, position: 0, isVisible: true, size: 260 },
    { universalIdentifier: '2a8dea94-23e6-4527-8782-d6796d896860', fieldMetadataUniversalIdentifier: MAPA_MENTAL_CLIENTE_FIELD_UID, position: 1, isVisible: true, size: 200 },
  ],
});
