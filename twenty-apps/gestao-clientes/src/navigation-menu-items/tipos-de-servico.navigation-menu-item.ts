import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';

import {
  NAV_PASTA_UID,
  NAV_TIPOS_UID,
  TIPO_DE_SERVICO_UID,
} from 'src/constants/universal-identifiers';

export default defineNavigationMenuItem({
  universalIdentifier: NAV_TIPOS_UID,
  name: 'Tipos de serviço',
  icon: 'IconCategory',
  color: 'gray',
  position: 7,
  type: NavigationMenuItemType.OBJECT,
  folderUniversalIdentifier: NAV_PASTA_UID,
  targetObjectUniversalIdentifier: TIPO_DE_SERVICO_UID,
});
