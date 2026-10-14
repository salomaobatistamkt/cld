import {
  defineView,
  ViewType,
} from 'twenty-sdk/define';

import {
  TIPO_DE_SERVICO_DESCRICAO_FIELD_UID,
  TIPO_DE_SERVICO_ENTREGAS_PADRAO_FIELD_UID,
  TIPO_DE_SERVICO_NAME_FIELD_UID,
  TIPO_DE_SERVICO_SERVICOS_CONTRATADOS_FIELD_UID,
  TIPO_DE_SERVICO_UID,
  VIEW_TIPOS_UID,
} from 'src/constants/universal-identifiers';

export default defineView({
  universalIdentifier: VIEW_TIPOS_UID,
  name: 'Tipos de serviço',
  objectUniversalIdentifier: TIPO_DE_SERVICO_UID,
  type: ViewType.TABLE,
  icon: 'IconTable',
  position: 0,
  fields: [
    { universalIdentifier: 'ab3658b4-3125-4aff-9a9b-b892380a4e55', fieldMetadataUniversalIdentifier: TIPO_DE_SERVICO_NAME_FIELD_UID, position: 0, isVisible: true, size: 220 },
    { universalIdentifier: '9ae15c1e-7da3-4815-90cf-47e29a6ffc09', fieldMetadataUniversalIdentifier: TIPO_DE_SERVICO_DESCRICAO_FIELD_UID, position: 1, isVisible: true, size: 320 },
    { universalIdentifier: 'd28f9891-9028-4dcc-84a8-2dd2628af591', fieldMetadataUniversalIdentifier: TIPO_DE_SERVICO_ENTREGAS_PADRAO_FIELD_UID, position: 2, isVisible: true, size: 320 },
    { universalIdentifier: '8978fdd9-383d-45ab-ae7b-7058b643e061', fieldMetadataUniversalIdentifier: TIPO_DE_SERVICO_SERVICOS_CONTRATADOS_FIELD_UID, position: 3, isVisible: true, size: 220 },
  ],
});
