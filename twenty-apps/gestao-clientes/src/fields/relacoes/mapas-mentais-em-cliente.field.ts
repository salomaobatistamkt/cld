import {
  defineField,
  FieldType,
  RelationType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

import {
  CLIENTE_MAPAS_MENTAIS_FIELD_UID,
  MAPA_MENTAL_CLIENTE_FIELD_UID,
  MAPA_MENTAL_UID,
} from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: CLIENTE_MAPAS_MENTAIS_FIELD_UID,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company.universalIdentifier,
  type: FieldType.RELATION,
  name: 'mapasMentais',
  label: 'Mapas mentais',
  icon: 'IconHierarchy2',
  relationTargetObjectMetadataUniversalIdentifier: MAPA_MENTAL_UID,
  relationTargetFieldMetadataUniversalIdentifier: MAPA_MENTAL_CLIENTE_FIELD_UID,
  universalSettings: {
    relationType: RelationType.ONE_TO_MANY,
  },
});
