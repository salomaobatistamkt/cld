import {
  defineField,
  FieldType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

import { CLIENTE_OBJETIVOS_FIELD_UID } from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: CLIENTE_OBJETIVOS_FIELD_UID,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company.universalIdentifier,
  type: FieldType.TEXT,
  name: 'objetivos',
  label: 'Objetivos',
  description: 'Metas do cliente (ex.: 50 leads/mês, CPL < R$ 15)',
  icon: 'IconTrophy',
  isNullable: true,
});
