import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';

import {
  NAV_PAINEL_UID,
  NAV_PASTA_UID,
  PAINEL_PAGE_LAYOUT_UID,
} from 'src/constants/universal-identifiers';

export default defineNavigationMenuItem({
  universalIdentifier: NAV_PAINEL_UID,
  name: 'Painel',
  icon: 'IconLayoutDashboard',
  color: 'blue',
  position: 0,
  type: NavigationMenuItemType.PAGE_LAYOUT,
  folderUniversalIdentifier: NAV_PASTA_UID,
  pageLayoutUniversalIdentifier: PAINEL_PAGE_LAYOUT_UID,
});
