import {
  defineField,
  FieldType,
  OnDeleteAction,
  RelationType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

import {
  CLIENTE_MAPAS_MENTAIS_FIELD_UID,
  MAPA_MENTAL_CLIENTE_FIELD_UID,
  MAPA_MENTAL_UID,
} from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: MAPA_MENTAL_CLIENTE_FIELD_UID,
  objectUniversalIdentifier: MAPA_MENTAL_UID,
  type: FieldType.RELATION,
  name: 'cliente',
  label: 'Cliente',
  icon: 'IconBuilding',
  isNullable: true,
  relationTargetObjectMetadataUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company.universalIdentifier,
  relationTargetFieldMetadataUniversalIdentifier: CLIENTE_MAPAS_MENTAIS_FIELD_UID,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.SET_NULL,
    joinColumnName: 'clienteId',
  },
});
