import {
  defineField,
  FieldType,
  RelationType,
} from 'twenty-sdk/define';

import {
  ENTREGA_SERVICO_CONTRATADO_FIELD_UID,
  ENTREGA_UID,
  SERVICO_CONTRATADO_ENTREGAS_FIELD_UID,
  SERVICO_CONTRATADO_UID,
} from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: SERVICO_CONTRATADO_ENTREGAS_FIELD_UID,
  objectUniversalIdentifier:
    SERVICO_CONTRATADO_UID,
  type: FieldType.RELATION,
  name: 'entregas',
  label: 'Entregas',
  icon: 'IconPackage',
  relationTargetObjectMetadataUniversalIdentifier: ENTREGA_UID,
  relationTargetFieldMetadataUniversalIdentifier: ENTREGA_SERVICO_CONTRATADO_FIELD_UID,
  universalSettings: {
    relationType: RelationType.ONE_TO_MANY,
  },
});
