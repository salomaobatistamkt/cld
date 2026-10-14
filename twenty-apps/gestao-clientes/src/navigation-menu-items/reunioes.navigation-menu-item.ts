import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';

import {
  NAV_PASTA_UID,
  NAV_REUNIOES_UID,
  REUNIAO_UID,
} from 'src/constants/universal-identifiers';

export default defineNavigationMenuItem({
  universalIdentifier: NAV_REUNIOES_UID,
  name: 'Reuniões',
  icon: 'IconUsersGroup',
  color: 'turquoise',
  position: 5,
  type: NavigationMenuItemType.OBJECT,
  folderUniversalIdentifier: NAV_PASTA_UID,
  targetObjectUniversalIdentifier: REUNIAO_UID,
});
