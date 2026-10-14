import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';

import {
  ACESSO_UID,
  NAV_ACESSOS_UID,
  NAV_PASTA_UID,
} from 'src/constants/universal-identifiers';

export default defineNavigationMenuItem({
  universalIdentifier: NAV_ACESSOS_UID,
  name: 'Acessos',
  icon: 'IconKey',
  color: 'amber',
  position: 6,
  type: NavigationMenuItemType.OBJECT,
  folderUniversalIdentifier: NAV_PASTA_UID,
  targetObjectUniversalIdentifier: ACESSO_UID,
});
