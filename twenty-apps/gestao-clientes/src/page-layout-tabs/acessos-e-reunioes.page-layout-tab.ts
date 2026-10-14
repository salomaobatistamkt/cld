import {
  definePageLayoutTab,
  PageLayoutTabLayoutMode,
  STANDARD_PAGE_LAYOUT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

import {
  ABA_ACESSOS_REUNIOES_UID,
  CLIENTE_ACESSOS_FIELD_UID,
  CLIENTE_MAPAS_MENTAIS_FIELD_UID,
  CLIENTE_REUNIOES_FIELD_UID,
} from 'src/constants/universal-identifiers';

// Aba extra na página padrão de Empresa (que este app usa como Cliente).
export default definePageLayoutTab({
  universalIdentifier: ABA_ACESSOS_REUNIOES_UID,
  pageLayoutUniversalIdentifier:
    STANDARD_PAGE_LAYOUT_UNIVERSAL_IDENTIFIERS.companyRecordPage.universalIdentifier,
  title: 'Acessos e reuniões',
  position: 14,
  icon: 'IconKey',
  layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
  widgets: [
    {
      universalIdentifier: '7d263966-2b3b-4dc6-b5ed-a0fd6db3ad7a',
      title: 'Acessos',
      type: 'FIELD',
      configuration: {
        configurationType: 'FIELD',
        fieldMetadataId: CLIENTE_ACESSOS_FIELD_UID,
        fieldDisplayMode: 'CARD',
      },
    },
    {
      universalIdentifier: 'f95c6b31-8d2a-40d4-b745-0a33f4d97387',
      title: 'Reuniões',
      type: 'FIELD',
      configuration: {
        configurationType: 'FIELD',
        fieldMetadataId: CLIENTE_REUNIOES_FIELD_UID,
        fieldDisplayMode: 'CARD',
      },
    },
    {
      universalIdentifier: '3e323541-671d-441f-a2a8-a89de51911a4',
      title: 'Mapas mentais',
      type: 'FIELD',
      configuration: {
        configurationType: 'FIELD',
        fieldMetadataId: CLIENTE_MAPAS_MENTAIS_FIELD_UID,
        fieldDisplayMode: 'CARD',
      },
    },
  ],
});
