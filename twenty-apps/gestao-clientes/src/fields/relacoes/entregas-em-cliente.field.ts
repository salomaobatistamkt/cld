import {
  defineField,
  FieldType,
  RelationType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

import {
  CLIENTE_ENTREGAS_FIELD_UID,
  ENTREGA_CLIENTE_FIELD_UID,
  ENTREGA_UID,
} from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: CLIENTE_ENTREGAS_FIELD_UID,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company.universalIdentifier,
  type: FieldType.RELATION,
  name: 'entregas',
  label: 'Entregas',
  icon: 'IconPackage',
  relationTargetObjectMetadataUniversalIdentifier: ENTREGA_UID,
  relationTargetFieldMetadataUniversalIdentifier: ENTREGA_CLIENTE_FIELD_UID,
  universalSettings: {
    relationType: RelationType.ONE_TO_MANY,
  },
});
