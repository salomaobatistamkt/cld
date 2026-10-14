import {
  definePageLayoutTab,
  PageLayoutTabLayoutMode,
  PageLayoutWidgetVerticalListHeightBehavior,
  STANDARD_PAGE_LAYOUT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

import {
  ABA_MAPA_DO_CLIENTE_UID,
  MAPA_DO_CLIENTE_FRONT_COMPONENT_UID,
} from 'src/constants/universal-identifiers';

// Aba extra na página padrão de Empresa (que este app usa como Cliente).
export default definePageLayoutTab({
  universalIdentifier: ABA_MAPA_DO_CLIENTE_UID,
  pageLayoutUniversalIdentifier:
    STANDARD_PAGE_LAYOUT_UNIVERSAL_IDENTIFIERS.companyRecordPage.universalIdentifier,
  title: 'Mapa do cliente',
  position: 11,
  icon: 'IconHierarchy2',
  layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
  widgets: [
    {
      universalIdentifier: '5dc626c7-d79c-45aa-b824-ac58d059539a',
      title: 'Mapa do cliente',
      type: 'FRONT_COMPONENT',
      heightBehavior: PageLayoutWidgetVerticalListHeightBehavior.TAB_VIEWPORT,
      configuration: {
        configurationType: 'FRONT_COMPONENT',
        frontComponentUniversalIdentifier: MAPA_DO_CLIENTE_FRONT_COMPONENT_UID,
      },
    },
  ],
});
