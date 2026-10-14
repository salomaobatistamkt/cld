import {
  definePageLayout,
  PageLayoutTabLayoutMode,
  PageLayoutType,
  PageLayoutWidgetVerticalListHeightBehavior,
} from 'twenty-sdk/define';

import {
  MAPA_MENTAL_EDITOR_FRONT_COMPONENT_UID,
  MAPA_MENTAL_PAGE_LAYOUT_UID,
  MAPA_MENTAL_UID,
} from 'src/constants/universal-identifiers';

export default definePageLayout({
  universalIdentifier: MAPA_MENTAL_PAGE_LAYOUT_UID,
  name: 'Página do mapa mental',
  type: PageLayoutType.RECORD_PAGE,
  objectUniversalIdentifier: MAPA_MENTAL_UID,
  tabs: [
    {
      universalIdentifier: 'acbc94b5-81bd-4239-9c32-63bf4ce63971',
      title: 'Mapa',
      position: 25,
      icon: 'IconHierarchy2',
      layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
      widgets: [
        {
          universalIdentifier: '7999d4da-d4ba-4086-b4f1-5c2e23229149',
          title: 'Mapa mental',
          type: 'FRONT_COMPONENT',
          heightBehavior: PageLayoutWidgetVerticalListHeightBehavior.TAB_VIEWPORT,
          configuration: {
            configurationType: 'FRONT_COMPONENT',
            frontComponentUniversalIdentifier: MAPA_MENTAL_EDITOR_FRONT_COMPONENT_UID,
          },
        },
      ],
    },
    {
      universalIdentifier: '4bfd6473-9496-46ef-acaa-570a28831a73',
      title: 'Início',
      position: 10,
      icon: 'IconHome',
      layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
      widgets: [
        {
          universalIdentifier: 'b6719bd2-1176-42f2-9c5e-6f601feee8e5',
          title: 'Campos',
          type: 'FIELDS',
          configuration: { configurationType: 'FIELDS' },
        },
      ],
    },
    {
      universalIdentifier: 'd42aaf0c-a3c8-4f44-b34d-bf0b8a4a4cae',
      title: 'Linha do tempo',
      position: 30,
      icon: 'IconTimelineEvent',
      layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
      widgets: [
        {
          universalIdentifier: '3d8270e8-e8b9-4ce6-8fe1-68e3e60933de',
          title: 'Linha do tempo',
          type: 'TIMELINE',
          configuration: { configurationType: 'TIMELINE' },
        },
      ],
    },
  ],
});
