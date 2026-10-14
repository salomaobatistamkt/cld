import {
  defineView,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
  ViewFilterOperand,
  ViewType,
} from 'twenty-sdk/define';

import {
  CLIENTE_RESPONSAVEL_FIELD_UID,
  CLIENTE_SEGMENTO_FIELD_UID,
  CLIENTE_SERVICOS_CONTRATADOS_FIELD_UID,
  CLIENTE_STATUS_FIELD_UID,
  VIEW_CLIENTES_KANBAN_UID,
} from 'src/constants/universal-identifiers';

export default defineView({
  universalIdentifier: VIEW_CLIENTES_KANBAN_UID,
  name: 'Clientes por status',
  objectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company.universalIdentifier,
  type: ViewType.KANBAN,
  icon: 'IconLayoutKanban',
  position: 11,
  mainGroupByFieldMetadataUniversalIdentifier: CLIENTE_STATUS_FIELD_UID,
  fields: [
    { universalIdentifier: '8d2772a4-4f9e-4447-b8ad-007f8023348c', fieldMetadataUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company.fields.name.universalIdentifier, position: 0, isVisible: true, size: 220 },
    { universalIdentifier: '3101f67b-efcf-4929-9c10-8605431ea200', fieldMetadataUniversalIdentifier: CLIENTE_SEGMENTO_FIELD_UID, position: 1, isVisible: true, size: 160 },
    { universalIdentifier: '0b9deb0f-af7a-4cb1-94dc-24d126c318c1', fieldMetadataUniversalIdentifier: CLIENTE_RESPONSAVEL_FIELD_UID, position: 2, isVisible: true, size: 170 },
    { universalIdentifier: '48687660-5153-4821-8c8d-78757158803c', fieldMetadataUniversalIdentifier: CLIENTE_SERVICOS_CONTRATADOS_FIELD_UID, position: 3, isVisible: true, size: 200 },
  ],
  groups: [
    { universalIdentifier: '989ca730-c1e9-46c3-8f56-e3f57925950e', fieldValue: 'LEAD', position: 0, isVisible: true },
    { universalIdentifier: 'ff6d6053-f235-40bb-a5e6-90fa10407d95', fieldValue: 'ONBOARDING', position: 1, isVisible: true },
    { universalIdentifier: '595f06bc-b968-49f1-8134-f9280fc5762b', fieldValue: 'ATIVO', position: 2, isVisible: true },
    { universalIdentifier: '44b0c743-d3f1-4ef0-9c2b-e0dd0e76e996', fieldValue: 'PAUSADO', position: 3, isVisible: true },
    { universalIdentifier: '17949db5-90a4-4556-914e-1e6eab67d137', fieldValue: 'ENCERRADO', position: 4, isVisible: true },
  ],
  filters: [
    { universalIdentifier: 'e0accb91-5877-4833-8155-73658b25fde6', fieldMetadataUniversalIdentifier: CLIENTE_STATUS_FIELD_UID, operand: ViewFilterOperand.IS_NOT_EMPTY, value: '' },
  ],
});
