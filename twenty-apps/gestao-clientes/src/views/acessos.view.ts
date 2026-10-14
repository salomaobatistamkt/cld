import {
  defineView,
  ViewType,
} from 'twenty-sdk/define';

import {
  ACESSO_CATEGORIA_FIELD_UID,
  ACESSO_CLIENTE_FIELD_UID,
  ACESSO_COFRE_FIELD_UID,
  ACESSO_LINK_FIELD_UID,
  ACESSO_LOGIN_FIELD_UID,
  ACESSO_NAME_FIELD_UID,
  ACESSO_OBSERVACOES_FIELD_UID,
  ACESSO_UID,
  VIEW_ACESSOS_UID,
} from 'src/constants/universal-identifiers';

export default defineView({
  universalIdentifier: VIEW_ACESSOS_UID,
  name: 'Acessos',
  objectUniversalIdentifier: ACESSO_UID,
  type: ViewType.TABLE,
  icon: 'IconTable',
  position: 0,
  fields: [
    { universalIdentifier: 'a68e4b31-f8fe-4df5-8f63-1ac29507f37e', fieldMetadataUniversalIdentifier: ACESSO_NAME_FIELD_UID, position: 0, isVisible: true, size: 200 },
    { universalIdentifier: '3e769f5a-65e2-494b-8028-cff8a424a1b8', fieldMetadataUniversalIdentifier: ACESSO_CLIENTE_FIELD_UID, position: 1, isVisible: true, size: 180 },
    { universalIdentifier: '3f41a48b-68d9-4e4c-8682-87f012b86122', fieldMetadataUniversalIdentifier: ACESSO_CATEGORIA_FIELD_UID, position: 2, isVisible: true, size: 150 },
    { universalIdentifier: '4914ae00-ac52-4333-bc9c-f3b06e2daf9a', fieldMetadataUniversalIdentifier: ACESSO_LINK_FIELD_UID, position: 3, isVisible: true, size: 220 },
    { universalIdentifier: 'be74511d-0926-4e4e-a0de-4e7b8d41854d', fieldMetadataUniversalIdentifier: ACESSO_LOGIN_FIELD_UID, position: 4, isVisible: true, size: 180 },
    { universalIdentifier: '1e01588a-0f92-47cc-9571-5df2a1c393af', fieldMetadataUniversalIdentifier: ACESSO_COFRE_FIELD_UID, position: 5, isVisible: true, size: 220 },
    { universalIdentifier: 'b0e3a6ec-c97c-4a40-813f-7d520e081841', fieldMetadataUniversalIdentifier: ACESSO_OBSERVACOES_FIELD_UID, position: 6, isVisible: true, size: 260 },
  ],
});
