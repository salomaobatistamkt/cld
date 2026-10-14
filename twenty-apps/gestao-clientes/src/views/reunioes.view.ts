import {
  defineView,
  ViewSortDirection,
  ViewType,
} from 'twenty-sdk/define';

import {
  REUNIAO_CLIENTE_FIELD_UID,
  REUNIAO_DATA_FIELD_UID,
  REUNIAO_NAME_FIELD_UID,
  REUNIAO_PARTICIPANTES_FIELD_UID,
  REUNIAO_PROXIMOS_PASSOS_FIELD_UID,
  REUNIAO_TIPO_FIELD_UID,
  REUNIAO_UID,
  VIEW_REUNIOES_UID,
} from 'src/constants/universal-identifiers';

export default defineView({
  universalIdentifier: VIEW_REUNIOES_UID,
  name: 'Reuniões',
  objectUniversalIdentifier: REUNIAO_UID,
  type: ViewType.TABLE,
  icon: 'IconTable',
  position: 0,
  fields: [
    { universalIdentifier: '96826dcd-f59b-4c68-a9fe-30502f4213e8', fieldMetadataUniversalIdentifier: REUNIAO_NAME_FIELD_UID, position: 0, isVisible: true, size: 240 },
    { universalIdentifier: '33975787-cae9-4b87-933d-e0b40d20b19a', fieldMetadataUniversalIdentifier: REUNIAO_CLIENTE_FIELD_UID, position: 1, isVisible: true, size: 180 },
    { universalIdentifier: '302cad64-79f6-4d0b-9b9b-54ce7c9a1a82', fieldMetadataUniversalIdentifier: REUNIAO_DATA_FIELD_UID, position: 2, isVisible: true, size: 160 },
    { universalIdentifier: 'ae486afb-57f3-4b5d-af69-c81ef1701466', fieldMetadataUniversalIdentifier: REUNIAO_TIPO_FIELD_UID, position: 3, isVisible: true, size: 130 },
    { universalIdentifier: '077d48d7-acad-4f1f-a48e-1d6effa2be45', fieldMetadataUniversalIdentifier: REUNIAO_PARTICIPANTES_FIELD_UID, position: 4, isVisible: true, size: 200 },
    { universalIdentifier: 'eca3ef10-565d-4b6a-ac5b-933104c60bf1', fieldMetadataUniversalIdentifier: REUNIAO_PROXIMOS_PASSOS_FIELD_UID, position: 5, isVisible: true, size: 280 },
  ],
  sorts: [
    { universalIdentifier: '15a779a1-471e-421e-80cd-b6b69b7996db', fieldMetadataUniversalIdentifier: REUNIAO_DATA_FIELD_UID, direction: ViewSortDirection.DESC },
  ],
});
