import {
  defineView,
  ViewSortDirection,
  ViewType,
} from 'twenty-sdk/define';

import {
  ENTREGA_CLIENTE_FIELD_UID,
  ENTREGA_NAME_FIELD_UID,
  ENTREGA_PRAZO_FIELD_UID,
  ENTREGA_PRIORIDADE_FIELD_UID,
  ENTREGA_RESPONSAVEL_FIELD_UID,
  ENTREGA_STATUS_FIELD_UID,
  ENTREGA_UID,
  VIEW_ENTREGAS_KANBAN_UID,
} from 'src/constants/universal-identifiers';

export default defineView({
  universalIdentifier: VIEW_ENTREGAS_KANBAN_UID,
  name: 'Quadro de entregas',
  objectUniversalIdentifier: ENTREGA_UID,
  type: ViewType.KANBAN,
  icon: 'IconLayoutKanban',
  position: 1,
  mainGroupByFieldMetadataUniversalIdentifier: ENTREGA_STATUS_FIELD_UID,
  fields: [
    { universalIdentifier: 'a7faa7bd-5150-4162-95ac-17b4b2bcaaac', fieldMetadataUniversalIdentifier: ENTREGA_NAME_FIELD_UID, position: 0, isVisible: true, size: 240 },
    { universalIdentifier: 'a65de459-2552-488b-a418-91b8337c86f9', fieldMetadataUniversalIdentifier: ENTREGA_CLIENTE_FIELD_UID, position: 1, isVisible: true, size: 180 },
    { universalIdentifier: 'a9bebafb-c09b-492d-89e0-725ebbbbc37a', fieldMetadataUniversalIdentifier: ENTREGA_PRAZO_FIELD_UID, position: 2, isVisible: true, size: 120 },
    { universalIdentifier: '4c4de7c4-9951-4de1-9a47-80b606eca94f', fieldMetadataUniversalIdentifier: ENTREGA_PRIORIDADE_FIELD_UID, position: 3, isVisible: true, size: 120 },
    { universalIdentifier: 'f623f916-6328-46cd-9dca-714676a0f069', fieldMetadataUniversalIdentifier: ENTREGA_RESPONSAVEL_FIELD_UID, position: 4, isVisible: true, size: 150 },
  ],
  groups: [
    { universalIdentifier: 'aa94faf0-110a-4bcc-8062-63e864190af9', fieldValue: 'BACKLOG', position: 0, isVisible: true },
    { universalIdentifier: 'b853abfd-7743-45bc-b4c3-21f2083afc0e', fieldValue: 'A_FAZER', position: 1, isVisible: true },
    { universalIdentifier: '99276de2-7a1e-48a6-99d1-d4a5eb99b163', fieldValue: 'EM_PRODUCAO', position: 2, isVisible: true },
    { universalIdentifier: 'f36b0163-8b44-4c32-a918-033231286f6c', fieldValue: 'EM_REVISAO', position: 3, isVisible: true },
    { universalIdentifier: 'dda58204-0121-4587-a7b8-c601779e91d2', fieldValue: 'AGUARDANDO_CLIENTE', position: 4, isVisible: true },
    { universalIdentifier: '55f2d263-9246-4c09-a22d-635fcbd273d6', fieldValue: 'ENTREGUE', position: 5, isVisible: true },
    { universalIdentifier: '914efd1e-dfe3-4fa7-8753-e28f6267d159', fieldValue: 'CANCELADA', position: 6, isVisible: true },
  ],
  sorts: [
    { universalIdentifier: '6ba24dbc-5dc2-4a25-bda2-476baeb506ef', fieldMetadataUniversalIdentifier: ENTREGA_PRAZO_FIELD_UID, direction: ViewSortDirection.ASC },
  ],
});
