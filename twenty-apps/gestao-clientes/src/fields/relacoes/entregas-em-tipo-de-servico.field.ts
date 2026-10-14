import {
  defineField,
  FieldType,
  RelationType,
} from 'twenty-sdk/define';

import {
  ENTREGA_TIPO_DE_SERVICO_FIELD_UID,
  ENTREGA_UID,
  TIPO_DE_SERVICO_ENTREGAS_FIELD_UID,
  TIPO_DE_SERVICO_UID,
} from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: TIPO_DE_SERVICO_ENTREGAS_FIELD_UID,
  objectUniversalIdentifier:
    TIPO_DE_SERVICO_UID,
  type: FieldType.RELATION,
  name: 'entregas',
  label: 'Entregas',
  icon: 'IconPackage',
  relationTargetObjectMetadataUniversalIdentifier: ENTREGA_UID,
  relationTargetFieldMetadataUniversalIdentifier: ENTREGA_TIPO_DE_SERVICO_FIELD_UID,
  universalSettings: {
    relationType: RelationType.ONE_TO_MANY,
  },
});
