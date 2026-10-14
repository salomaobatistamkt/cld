import {
  definePageLayoutTab,
  PageLayoutTabLayoutMode,
  STANDARD_PAGE_LAYOUT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

import {
  ABA_BRIEFING_UID,
  CLIENTE_BRIEFING_FIELD_UID,
} from 'src/constants/universal-identifiers';

// Aba extra na página padrão de Empresa (que este app usa como Cliente).
export default definePageLayoutTab({
  universalIdentifier: ABA_BRIEFING_UID,
  pageLayoutUniversalIdentifier:
    STANDARD_PAGE_LAYOUT_UNIVERSAL_IDENTIFIERS.companyRecordPage.universalIdentifier,
  title: 'Briefing',
  position: 13,
  icon: 'IconClipboardText',
  layoutMode: PageLayoutTabLayoutMode.GRID,
  widgets: [
    {
      universalIdentifier: 'ad115b45-70d1-4815-b862-249f1226ea52',
      title: 'Briefing',
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
        fieldMetadataId: CLIENTE_BRIEFING_FIELD_UID,
        fieldDisplayMode: 'EDITOR',
      },
    },
  ],
});
