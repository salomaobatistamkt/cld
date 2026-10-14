import {
  definePageLayout,
  PageLayoutTabLayoutMode,
  PageLayoutType,
} from 'twenty-sdk/define';

import {
  SERVICO_CONTRATADO_ENTREGAS_FIELD_UID,
  SERVICO_CONTRATADO_ESCOPO_FIELD_UID,
  SERVICO_CONTRATADO_PAGE_LAYOUT_UID,
  SERVICO_CONTRATADO_UID,
} from 'src/constants/universal-identifiers';

export default definePageLayout({
  universalIdentifier: SERVICO_CONTRATADO_PAGE_LAYOUT_UID,
  name: 'Página do serviço contratado',
  type: PageLayoutType.RECORD_PAGE,
  objectUniversalIdentifier: SERVICO_CONTRATADO_UID,
  tabs: [
    {
      universalIdentifier: 'c10607d8-744e-488b-95c2-de684cd95bc3',
      title: 'Início',
      position: 10,
      icon: 'IconHome',
      layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
      widgets: [
        {
          universalIdentifier: '8835117b-b759-4829-801c-cf8c7df2da47',
          title: 'Campos',
          type: 'FIELDS',
          configuration: { configurationType: 'FIELDS' },
        },
        {
          universalIdentifier: '11433420-3bfa-447e-a899-9003cbb9e86c',
          title: 'Entregas',
          type: 'FIELD',
          configuration: {
            configurationType: 'FIELD',
            fieldMetadataId: SERVICO_CONTRATADO_ENTREGAS_FIELD_UID,
            fieldDisplayMode: 'CARD',
          },
        },
      ],
    },
    {
      universalIdentifier: 'c2eb63e6-3891-49f9-95ac-a08997059849',
      title: 'Escopo',
      position: 20,
      icon: 'IconClipboardText',
      layoutMode: PageLayoutTabLayoutMode.GRID,
      widgets: [
        {
          universalIdentifier: '939834f1-8e5a-4033-a996-5c116eff90c7',
          title: 'Escopo',
          type: 'FIELD',
          position: {
            layoutMode: PageLayoutTabLayoutMode.GRID,
            row: 0,
            column: 0,
            rowSpan: 12,
            columnSpan: 12,
          },
          configuration: {
            configurationType: 'FIELD',
            fieldMetadataId: SERVICO_CONTRATADO_ESCOPO_FIELD_UID,
            fieldDisplayMode: 'EDITOR',
          },
        },
      ],
    },
    {
      universalIdentifier: '52192e55-4ccf-4a4a-bb86-a53a96a879a9',
      title: 'Linha do tempo',
      position: 30,
      icon: 'IconTimelineEvent',
      layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
      widgets: [
        {
          universalIdentifier: 'e79d0adb-298a-4bfa-949e-dbcb562ba99c',
          title: 'Linha do tempo',
          type: 'TIMELINE',
          configuration: { configurationType: 'TIMELINE' },
        },
      ],
    },
  ],
});
