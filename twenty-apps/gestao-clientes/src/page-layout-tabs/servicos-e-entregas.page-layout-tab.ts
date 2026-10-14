import {
  definePageLayoutTab,
  PageLayoutTabLayoutMode,
  STANDARD_PAGE_LAYOUT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

import {
  ABA_SERVICOS_ENTREGAS_UID,
  CLIENTE_ENTREGAS_FIELD_UID,
  CLIENTE_SERVICOS_CONTRATADOS_FIELD_UID,
} from 'src/constants/universal-identifiers';

// Aba extra na página padrão de Empresa (que este app usa como Cliente).
export default definePageLayoutTab({
  universalIdentifier: ABA_SERVICOS_ENTREGAS_UID,
  pageLayoutUniversalIdentifier:
    STANDARD_PAGE_LAYOUT_UNIVERSAL_IDENTIFIERS.companyRecordPage.universalIdentifier,
  title: 'Serviços e entregas',
  position: 12,
  icon: 'IconPackage',
  layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
  widgets: [
    {
      universalIdentifier: '9f627a1b-4577-47db-b6f7-a62df8866525',
      title: 'Serviços contratados',
      type: 'FIELD',
      configuration: {
        configurationType: 'FIELD',
        fieldMetadataId: CLIENTE_SERVICOS_CONTRATADOS_FIELD_UID,
        fieldDisplayMode: 'CARD',
      },
    },
    {
      universalIdentifier: '1ba821b0-3633-4987-9589-70dd3081c627',
      title: 'Entregas',
      type: 'FIELD',
      configuration: {
        configurationType: 'FIELD',
        fieldMetadataId: CLIENTE_ENTREGAS_FIELD_UID,
        fieldDisplayMode: 'CARD',
      },
    },
  ],
});
