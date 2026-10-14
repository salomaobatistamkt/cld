import {
  definePageLayout,
  PageLayoutTabLayoutMode,
  PageLayoutType,
} from 'twenty-sdk/define';

import {
  TIPO_DE_SERVICO_ENTREGAS_FIELD_UID,
  TIPO_DE_SERVICO_PAGE_LAYOUT_UID,
  TIPO_DE_SERVICO_SERVICOS_CONTRATADOS_FIELD_UID,
  TIPO_DE_SERVICO_UID,
} from 'src/constants/universal-identifiers';

export default definePageLayout({
  universalIdentifier: TIPO_DE_SERVICO_PAGE_LAYOUT_UID,
  name: 'Página do tipo de serviço',
  type: PageLayoutType.RECORD_PAGE,
  objectUniversalIdentifier: TIPO_DE_SERVICO_UID,
  tabs: [
    {
      universalIdentifier: '689a183c-0b36-4433-8dbe-1fc5510a02c0',
      title: 'Início',
      position: 10,
      icon: 'IconHome',
      layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
      widgets: [
        {
          universalIdentifier: 'f1419ab3-bdf8-43cc-9793-5e76c6bc741c',
          title: 'Campos',
          type: 'FIELDS',
          configuration: { configurationType: 'FIELDS' },
        },
        {
          universalIdentifier: 'ab546e7f-b252-435e-8598-adc3bd87353f',
          title: 'Serviços contratados',
          type: 'FIELD',
          configuration: {
            configurationType: 'FIELD',
            fieldMetadataId: TIPO_DE_SERVICO_SERVICOS_CONTRATADOS_FIELD_UID,
            fieldDisplayMode: 'CARD',
          },
        },
        {
          universalIdentifier: '9c56021b-200b-4cd8-abdc-c274a4ca87d7',
          title: 'Entregas',
          type: 'FIELD',
          configuration: {
            configurationType: 'FIELD',
            fieldMetadataId: TIPO_DE_SERVICO_ENTREGAS_FIELD_UID,
            fieldDisplayMode: 'CARD',
          },
        },
      ],
    },
    {
      universalIdentifier: '7a69f07c-680c-4bfe-b29b-ecc6043889ef',
      title: 'Linha do tempo',
      position: 20,
      icon: 'IconTimelineEvent',
      layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
      widgets: [
        {
          universalIdentifier: '97053228-aa18-4a17-8de6-b59ed11a5d37',
          title: 'Linha do tempo',
          type: 'TIMELINE',
          configuration: { configurationType: 'TIMELINE' },
        },
      ],
    },
  ],
});
