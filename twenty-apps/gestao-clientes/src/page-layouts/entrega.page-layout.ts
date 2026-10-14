import {
  definePageLayout,
  PageLayoutTabLayoutMode,
  PageLayoutType,
} from 'twenty-sdk/define';

import {
  ENTREGA_DESCRICAO_FIELD_UID,
  ENTREGA_PAGE_LAYOUT_UID,
  ENTREGA_UID,
} from 'src/constants/universal-identifiers';

export default definePageLayout({
  universalIdentifier: ENTREGA_PAGE_LAYOUT_UID,
  name: 'Página da entrega',
  type: PageLayoutType.RECORD_PAGE,
  objectUniversalIdentifier: ENTREGA_UID,
  tabs: [
    {
      universalIdentifier: '2075ca07-2c09-481a-bcbf-4503c5cd4405',
      title: 'Início',
      position: 10,
      icon: 'IconHome',
      layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
      widgets: [
        {
          universalIdentifier: '554e8729-2a3f-4c0d-948b-3fcba9b6c1f1',
          title: 'Campos',
          type: 'FIELDS',
          configuration: { configurationType: 'FIELDS' },
        },
      ],
    },
    {
      universalIdentifier: '2879b8aa-5ce6-4ea1-b5e3-01791a68a484',
      title: 'Descrição',
      position: 20,
      icon: 'IconNotes',
      layoutMode: PageLayoutTabLayoutMode.GRID,
      widgets: [
        {
          universalIdentifier: '5f6261c1-dd8f-4160-b56f-aa43b6a7d1ca',
          title: 'Descrição',
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
            fieldMetadataId: ENTREGA_DESCRICAO_FIELD_UID,
            fieldDisplayMode: 'EDITOR',
          },
        },
      ],
    },
    {
      universalIdentifier: '424079c2-f75f-4aeb-b3b0-3f9edaa48fa3',
      title: 'Linha do tempo',
      position: 30,
      icon: 'IconTimelineEvent',
      layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
      widgets: [
        {
          universalIdentifier: '521edeef-48b7-491b-875c-9d5239fc6d02',
          title: 'Linha do tempo',
          type: 'TIMELINE',
          configuration: { configurationType: 'TIMELINE' },
        },
      ],
    },
  ],
});
