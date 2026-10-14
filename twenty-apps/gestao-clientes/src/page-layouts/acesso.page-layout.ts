import {
  definePageLayout,
  PageLayoutTabLayoutMode,
  PageLayoutType,
} from 'twenty-sdk/define';

import {
  ACESSO_PAGE_LAYOUT_UID,
  ACESSO_UID,
} from 'src/constants/universal-identifiers';

export default definePageLayout({
  universalIdentifier: ACESSO_PAGE_LAYOUT_UID,
  name: 'Página do acesso',
  type: PageLayoutType.RECORD_PAGE,
  objectUniversalIdentifier: ACESSO_UID,
  tabs: [
    {
      universalIdentifier: '5fe0d438-5e88-4a01-8a07-3f09bb1addb7',
      title: 'Início',
      position: 10,
      icon: 'IconHome',
      layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
      widgets: [
        {
          universalIdentifier: 'cb0e3802-60dd-42ab-bd1c-15b3aedce7be',
          title: 'Campos',
          type: 'FIELDS',
          configuration: { configurationType: 'FIELDS' },
        },
      ],
    },
    {
      universalIdentifier: '3ec2aa67-2165-4f8a-a09a-9fe2d2de3f85',
      title: 'Linha do tempo',
      position: 20,
      icon: 'IconTimelineEvent',
      layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
      widgets: [
        {
          universalIdentifier: 'f03ec8c4-4a53-4439-9bf0-07e4d20f3e0d',
          title: 'Linha do tempo',
          type: 'TIMELINE',
          configuration: { configurationType: 'TIMELINE' },
        },
      ],
    },
  ],
});
