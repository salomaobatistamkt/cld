import {
  defineField,
  FieldType,
  RelationType,
} from 'twenty-sdk/define';

import {
  SERVICO_CONTRATADO_TIPO_DE_SERVICO_FIELD_UID,
  SERVICO_CONTRATADO_UID,
  TIPO_DE_SERVICO_SERVICOS_CONTRATADOS_FIELD_UID,
  TIPO_DE_SERVICO_UID,
} from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: TIPO_DE_SERVICO_SERVICOS_CONTRATADOS_FIELD_UID,
  objectUniversalIdentifier:
    TIPO_DE_SERVICO_UID,
  type: FieldType.RELATION,
  name: 'servicosContratados',
  label: 'Serviços contratados',
  icon: 'IconFileCertificate',
  relationTargetObjectMetadataUniversalIdentifier: SERVICO_CONTRATADO_UID,
  relationTargetFieldMetadataUniversalIdentifier: SERVICO_CONTRATADO_TIPO_DE_SERVICO_FIELD_UID,
  universalSettings: {
    relationType: RelationType.ONE_TO_MANY,
  },
});
