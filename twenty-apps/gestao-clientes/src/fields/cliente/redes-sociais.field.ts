import {
  defineField,
  FieldType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

import { CLIENTE_REDES_FIELD_UID } from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: CLIENTE_REDES_FIELD_UID,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company.universalIdentifier,
  type: FieldType.LINKS,
  name: 'redesSociais',
  label: 'Redes sociais',
  description: 'Instagram, TikTok, YouTube… (vários links)',
  icon: 'IconBrandInstagram',
  isNullable: true,
});
