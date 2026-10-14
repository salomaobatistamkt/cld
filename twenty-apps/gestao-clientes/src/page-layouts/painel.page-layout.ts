import {
  definePageLayout,
  PageLayoutTabLayoutMode,
  PageLayoutWidgetVerticalListHeightBehavior,
} from 'twenty-sdk/define';

import {
  PAINEL_FRONT_COMPONENT_UID,
  PAINEL_PAGE_LAYOUT_TAB_UID,
  PAINEL_PAGE_LAYOUT_UID,
  PAINEL_WIDGET_UID,
} from 'src/constants/universal-identifiers';

export default definePageLayout({
  universalIdentifier: PAINEL_PAGE_LAYOUT_UID,
  name: 'Painel',
  type: 'STANDALONE_PAGE',
  tabs: [
    {
      universalIdentifier: PAINEL_PAGE_LAYOUT_TAB_UID,
      title: 'Painel',
      position: 0,
      icon: 'IconLayoutDashboard',
      layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
      widgets: [
        {
          universalIdentifier: PAINEL_WIDGET_UID,
          title: ' ',
          type: 'FRONT_COMPONENT',
          heightBehavior:
            PageLayoutWidgetVerticalListHeightBehavior.TAB_VIEWPORT,
          configuration: {
            configurationType: 'FRONT_COMPONENT',
            frontComponentUniversalIdentifier: PAINEL_FRONT_COMPONENT_UID,
          },
        },
      ],
    },
  ],
});
