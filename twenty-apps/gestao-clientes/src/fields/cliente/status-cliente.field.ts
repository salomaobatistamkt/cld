import {
  defineField,
  FieldType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

import { CLIENTE_STATUS_FIELD_UID } from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: CLIENTE_STATUS_FIELD_UID,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company.universalIdentifier,
  type: FieldType.SELECT,
  name: 'statusCliente',
  label: 'Status do cliente',
  icon: 'IconProgressCheck',
  isNullable: true,
  defaultValue: "'LEAD'",
  options: [
    { position: 0, label: 'Lead', value: 'LEAD', color: 'gray' },
    { position: 1, label: 'Onboarding', value: 'ONBOARDING', color: 'sky' },
    { position: 2, label: 'Ativo', value: 'ATIVO', color: 'green' },
    { position: 3, label: 'Pausado', value: 'PAUSADO', color: 'orange' },
    { position: 4, label: 'Encerrado', value: 'ENCERRADO', color: 'red' },
  ],
});
