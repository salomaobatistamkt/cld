import {
  defineField,
  FieldType,
  OnDeleteAction,
  RelationType,
} from 'twenty-sdk/define';

import {
  SERVICO_CONTRATADO_TIPO_DE_SERVICO_FIELD_UID,
  SERVICO_CONTRATADO_UID,
  TIPO_DE_SERVICO_SERVICOS_CONTRATADOS_FIELD_UID,
  TIPO_DE_SERVICO_UID,
} from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: SERVICO_CONTRATADO_TIPO_DE_SERVICO_FIELD_UID,
  objectUniversalIdentifier: SERVICO_CONTRATADO_UID,
  type: FieldType.RELATION,
  name: 'tipoDeServico',
  label: 'Tipo de serviço',
  icon: 'IconCategory',
  isNullable: true,
  relationTargetObjectMetadataUniversalIdentifier:
    TIPO_DE_SERVICO_UID,
  relationTargetFieldMetadataUniversalIdentifier: TIPO_DE_SERVICO_SERVICOS_CONTRATADOS_FIELD_UID,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.SET_NULL,
    joinColumnName: 'tipoDeServicoId',
  },
});
