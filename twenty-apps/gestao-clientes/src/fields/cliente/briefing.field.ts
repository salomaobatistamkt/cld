import {
  defineField,
  FieldType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

import { CLIENTE_BRIEFING_FIELD_UID } from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: CLIENTE_BRIEFING_FIELD_UID,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company.universalIdentifier,
  type: FieldType.RICH_TEXT,
  name: 'briefing',
  label: 'Briefing',
  description: 'Briefing completo da marca e do negócio',
  icon: 'IconClipboardText',
  isNullable: true,
});
