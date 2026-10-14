import {
  defineField,
  FieldType,
  OnDeleteAction,
  RelationType,
} from 'twenty-sdk/define';

import {
  ENTREGA_SERVICO_CONTRATADO_FIELD_UID,
  ENTREGA_UID,
  SERVICO_CONTRATADO_ENTREGAS_FIELD_UID,
  SERVICO_CONTRATADO_UID,
} from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: ENTREGA_SERVICO_CONTRATADO_FIELD_UID,
  objectUniversalIdentifier: ENTREGA_UID,
  type: FieldType.RELATION,
  name: 'servicoContratado',
  label: 'Serviço contratado',
  icon: 'IconFileCertificate',
  isNullable: true,
  relationTargetObjectMetadataUniversalIdentifier:
    SERVICO_CONTRATADO_UID,
  relationTargetFieldMetadataUniversalIdentifier: SERVICO_CONTRATADO_ENTREGAS_FIELD_UID,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.SET_NULL,
    joinColumnName: 'servicoContratadoId',
  },
});
