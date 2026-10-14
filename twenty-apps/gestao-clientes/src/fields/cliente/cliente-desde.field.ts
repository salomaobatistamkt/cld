import {
  defineField,
  FieldType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

import { CLIENTE_DESDE_FIELD_UID } from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: CLIENTE_DESDE_FIELD_UID,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company.universalIdentifier,
  type: FieldType.DATE,
  name: 'clienteDesde',
  label: 'Cliente desde',
  icon: 'IconCalendarStar',
  isNullable: true,
});
