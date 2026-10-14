import {
  defineField,
  FieldType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

import { CLIENTE_DOCUMENTO_FIELD_UID } from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: CLIENTE_DOCUMENTO_FIELD_UID,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company.universalIdentifier,
  type: FieldType.TEXT,
  name: 'documento',
  label: 'CNPJ / CPF',
  icon: 'IconId',
  isNullable: true,
});
