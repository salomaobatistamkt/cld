import {
  defineField,
  FieldType,
  RelationType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

import {
  CLIENTE_SERVICOS_CONTRATADOS_FIELD_UID,
  SERVICO_CONTRATADO_CLIENTE_FIELD_UID,
  SERVICO_CONTRATADO_UID,
} from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: CLIENTE_SERVICOS_CONTRATADOS_FIELD_UID,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company.universalIdentifier,
  type: FieldType.RELATION,
  name: 'servicosContratados',
  label: 'Serviços contratados',
  icon: 'IconFileCertificate',
  relationTargetObjectMetadataUniversalIdentifier: SERVICO_CONTRATADO_UID,
  relationTargetFieldMetadataUniversalIdentifier: SERVICO_CONTRATADO_CLIENTE_FIELD_UID,
  universalSettings: {
    relationType: RelationType.ONE_TO_MANY,
  },
});
