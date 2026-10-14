import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';

import {
  MAPA_MENTAL_UID,
  NAV_MAPAS_UID,
  NAV_PASTA_UID,
} from 'src/constants/universal-identifiers';

export default defineNavigationMenuItem({
  universalIdentifier: NAV_MAPAS_UID,
  name: 'Mapas mentais',
  icon: 'IconHierarchy2',
  color: 'pink',
  position: 4,
  type: NavigationMenuItemType.OBJECT,
  folderUniversalIdentifier: NAV_PASTA_UID,
  targetObjectUniversalIdentifier: MAPA_MENTAL_UID,
});
