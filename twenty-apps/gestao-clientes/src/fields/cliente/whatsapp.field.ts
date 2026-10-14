import {
  defineField,
  FieldType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

import { CLIENTE_WHATSAPP_FIELD_UID } from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: CLIENTE_WHATSAPP_FIELD_UID,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company.universalIdentifier,
  type: FieldType.PHONES,
  name: 'whatsapp',
  label: 'WhatsApp',
  icon: 'IconBrandWhatsapp',
  isNullable: true,
});
