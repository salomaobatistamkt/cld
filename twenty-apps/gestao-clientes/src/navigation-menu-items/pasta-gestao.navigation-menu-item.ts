import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';

import {
  NAV_PASTA_UID,
} from 'src/constants/universal-identifiers';

export default defineNavigationMenuItem({
  universalIdentifier: NAV_PASTA_UID,
  name: 'Gestão de Clientes',
  icon: 'IconBriefcase',
  color: 'blue',
  position: 0,
  type: NavigationMenuItemType.FOLDER,
});
