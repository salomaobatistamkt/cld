import {
  defineField,
  FieldType,
  RelationType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

import {
  CLIENTE_REUNIOES_FIELD_UID,
  REUNIAO_CLIENTE_FIELD_UID,
  REUNIAO_UID,
} from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: CLIENTE_REUNIOES_FIELD_UID,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company.universalIdentifier,
  type: FieldType.RELATION,
  name: 'reunioes',
  label: 'Reuniões',
  icon: 'IconUsersGroup',
  relationTargetObjectMetadataUniversalIdentifier: REUNIAO_UID,
  relationTargetFieldMetadataUniversalIdentifier: REUNIAO_CLIENTE_FIELD_UID,
  universalSettings: {
    relationType: RelationType.ONE_TO_MANY,
  },
});
