import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';

import {
  NAV_CLIENTES_UID,
  NAV_PASTA_UID,
  VIEW_CLIENTES_UID,
} from 'src/constants/universal-identifiers';

export default defineNavigationMenuItem({
  universalIdentifier: NAV_CLIENTES_UID,
  name: 'Clientes',
  icon: 'IconBuilding',
  color: 'green',
  position: 1,
  type: NavigationMenuItemType.VIEW,
  folderUniversalIdentifier: NAV_PASTA_UID,
  viewUniversalIdentifier: VIEW_CLIENTES_UID,
});
