import {
  defineField,
  FieldType,
  RelationType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

import {
  ACESSO_CLIENTE_FIELD_UID,
  ACESSO_UID,
  CLIENTE_ACESSOS_FIELD_UID,
} from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: CLIENTE_ACESSOS_FIELD_UID,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company.universalIdentifier,
  type: FieldType.RELATION,
  name: 'acessos',
  label: 'Acessos',
  icon: 'IconKey',
  relationTargetObjectMetadataUniversalIdentifier: ACESSO_UID,
  relationTargetFieldMetadataUniversalIdentifier: ACESSO_CLIENTE_FIELD_UID,
  universalSettings: {
    relationType: RelationType.ONE_TO_MANY,
  },
});
