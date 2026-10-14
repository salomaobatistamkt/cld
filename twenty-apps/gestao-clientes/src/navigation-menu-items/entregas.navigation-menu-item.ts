import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';

import {
  NAV_QUADRO_ENTREGAS_UID,
  NAV_PASTA_UID,
  VIEW_ENTREGAS_KANBAN_UID,
} from 'src/constants/universal-identifiers';

export default defineNavigationMenuItem({
  universalIdentifier: NAV_QUADRO_ENTREGAS_UID,
  name: 'Entregas',
  icon: 'IconPackage',
  color: 'orange',
  position: 2,
  type: NavigationMenuItemType.VIEW,
  folderUniversalIdentifier: NAV_PASTA_UID,
  viewUniversalIdentifier: VIEW_ENTREGAS_KANBAN_UID,
});
