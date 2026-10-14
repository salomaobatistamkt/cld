import {
  defineField,
  FieldType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

import { CLIENTE_CONCORRENTES_FIELD_UID } from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: CLIENTE_CONCORRENTES_FIELD_UID,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company.universalIdentifier,
  type: FieldType.TEXT,
  name: 'concorrentes',
  label: 'Concorrentes',
  icon: 'IconSwords',
  isNullable: true,
});
