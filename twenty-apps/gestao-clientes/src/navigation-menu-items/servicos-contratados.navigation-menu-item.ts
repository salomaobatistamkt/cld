import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';

import {
  NAV_PASTA_UID,
  NAV_SERVICOS_UID,
  SERVICO_CONTRATADO_UID,
} from 'src/constants/universal-identifiers';

export default defineNavigationMenuItem({
  universalIdentifier: NAV_SERVICOS_UID,
  name: 'Serviços contratados',
  icon: 'IconFileCertificate',
  color: 'purple',
  position: 3,
  type: NavigationMenuItemType.OBJECT,
  folderUniversalIdentifier: NAV_PASTA_UID,
  targetObjectUniversalIdentifier: SERVICO_CONTRATADO_UID,
});
