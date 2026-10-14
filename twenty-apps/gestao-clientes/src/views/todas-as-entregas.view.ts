import {
  defineView,
  ViewSortDirection,
  ViewType,
} from 'twenty-sdk/define';

import {
  ENTREGA_CLIENTE_FIELD_UID,
  ENTREGA_LINK_FIELD_UID,
  ENTREGA_NAME_FIELD_UID,
  ENTREGA_PRAZO_FIELD_UID,
  ENTREGA_PRIORIDADE_FIELD_UID,
  ENTREGA_RESPONSAVEL_FIELD_UID,
  ENTREGA_SERVICO_CONTRATADO_FIELD_UID,
  ENTREGA_STATUS_FIELD_UID,
  ENTREGA_TIPO_DE_SERVICO_FIELD_UID,
  ENTREGA_UID,
  VIEW_ENTREGAS_UID,
} from 'src/constants/universal-identifiers';

export default defineView({
  universalIdentifier: VIEW_ENTREGAS_UID,
  name: 'Todas as entregas',
  objectUniversalIdentifier: ENTREGA_UID,
  type: ViewType.TABLE,
  icon: 'IconTable',
  position: 0,
  fields: [
    { universalIdentifier: '5a32d721-5e91-4517-a4b6-aa38b8fa0bbc', fieldMetadataUniversalIdentifier: ENTREGA_NAME_FIELD_UID, position: 0, isVisible: true, size: 240 },
    { universalIdentifier: '87de91ce-63ff-4cb8-a49b-a69c2e731164', fieldMetadataUniversalIdentifier: ENTREGA_CLIENTE_FIELD_UID, position: 1, isVisible: true, size: 180 },
    { universalIdentifier: '412810cd-ac4d-4b3e-b9fe-d5329717e6f2', fieldMetadataUniversalIdentifier: ENTREGA_STATUS_FIELD_UID, position: 2, isVisible: true, size: 160 },
    { universalIdentifier: '6e379be6-f649-4429-9f8d-4378f48aa11b', fieldMetadataUniversalIdentifier: ENTREGA_PRAZO_FIELD_UID, position: 3, isVisible: true, size: 120 },
    { universalIdentifier: 'f5e47644-031a-42f4-963c-c9a11ca79eb7', fieldMetadataUniversalIdentifier: ENTREGA_PRIORIDADE_FIELD_UID, position: 4, isVisible: true, size: 120 },
    { universalIdentifier: 'd7a197c3-d435-4714-8760-c69b6338fb87', fieldMetadataUniversalIdentifier: ENTREGA_TIPO_DE_SERVICO_FIELD_UID, position: 5, isVisible: true, size: 170 },
    { universalIdentifier: 'a9e46411-95ac-40e6-9f47-ceb9f7790f34', fieldMetadataUniversalIdentifier: ENTREGA_SERVICO_CONTRATADO_FIELD_UID, position: 6, isVisible: true, size: 200 },
    { universalIdentifier: '3d73b680-ce7d-4928-a9c2-b4848c0d84c8', fieldMetadataUniversalIdentifier: ENTREGA_RESPONSAVEL_FIELD_UID, position: 7, isVisible: true, size: 150 },
    { universalIdentifier: 'fa445315-f3cd-4880-854a-e8b5f33fab3e', fieldMetadataUniversalIdentifier: ENTREGA_LINK_FIELD_UID, position: 8, isVisible: true, size: 180 },
  ],
  sorts: [
    { universalIdentifier: 'f6319461-b9ee-4db2-a334-f0886ccef66d', fieldMetadataUniversalIdentifier: ENTREGA_PRAZO_FIELD_UID, direction: ViewSortDirection.ASC },
  ],
});
