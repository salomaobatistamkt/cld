import {
  definePageLayout,
  PageLayoutTabLayoutMode,
  PageLayoutType,
} from 'twenty-sdk/define';

import {
  REUNIAO_PAGE_LAYOUT_UID,
  REUNIAO_RESUMO_FIELD_UID,
  REUNIAO_UID,
} from 'src/constants/universal-identifiers';

export default definePageLayout({
  universalIdentifier: REUNIAO_PAGE_LAYOUT_UID,
  name: 'Página da reunião',
  type: PageLayoutType.RECORD_PAGE,
  objectUniversalIdentifier: REUNIAO_UID,
  tabs: [
    {
      universalIdentifier: '7514f468-e460-4495-b462-e72bbff17d24',
      title: 'Início',
      position: 10,
      icon: 'IconHome',
      layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
      widgets: [
        {
          universalIdentifier: 'b792f424-9fca-4272-9684-d48379543886',
          title: 'Campos',
          type: 'FIELDS',
          configuration: { configurationType: 'FIELDS' },
        },
      ],
    },
    {
      universalIdentifier: '762f4550-5120-4427-bd75-5d7d7df96a16',
      title: 'Resumo',
      position: 20,
      icon: 'IconNotes',
      layoutMode: PageLayoutTabLayoutMode.GRID,
      widgets: [
        {
          universalIdentifier: '83bf942d-21bb-4259-9969-5dfaf4643967',
          title: 'Resumo',
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
            fieldMetadataId: REUNIAO_RESUMO_FIELD_UID,
            fieldDisplayMode: 'EDITOR',
          },
        },
      ],
    },
    {
      universalIdentifier: 'fd7e29e2-015c-400e-a60d-8d75dd9d8641',
      title: 'Linha do tempo',
      position: 30,
      icon: 'IconTimelineEvent',
      layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
      widgets: [
        {
          universalIdentifier: 'd6343982-6ab8-4814-b1d7-eda449f1c77e',
          title: 'Linha do tempo',
          type: 'TIMELINE',
          configuration: { configurationType: 'TIMELINE' },
        },
      ],
    },
  ],
});
