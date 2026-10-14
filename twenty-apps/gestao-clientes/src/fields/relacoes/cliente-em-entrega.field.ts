import {
  defineField,
  FieldType,
  OnDeleteAction,
  RelationType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

import {
  CLIENTE_ENTREGAS_FIELD_UID,
  ENTREGA_CLIENTE_FIELD_UID,
  ENTREGA_UID,
} from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: ENTREGA_CLIENTE_FIELD_UID,
  objectUniversalIdentifier: ENTREGA_UID,
  type: FieldType.RELATION,
  name: 'cliente',
  label: 'Cliente',
  icon: 'IconBuilding',
  isNullable: true,
  relationTargetObjectMetadataUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company.universalIdentifier,
  relationTargetFieldMetadataUniversalIdentifier: CLIENTE_ENTREGAS_FIELD_UID,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.SET_NULL,
    joinColumnName: 'clienteId',
  },
});
