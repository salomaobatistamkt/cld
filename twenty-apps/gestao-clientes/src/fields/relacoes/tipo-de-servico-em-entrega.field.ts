import {
  defineField,
  FieldType,
  OnDeleteAction,
  RelationType,
} from 'twenty-sdk/define';

import {
  ENTREGA_TIPO_DE_SERVICO_FIELD_UID,
  ENTREGA_UID,
  TIPO_DE_SERVICO_ENTREGAS_FIELD_UID,
  TIPO_DE_SERVICO_UID,
} from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: ENTREGA_TIPO_DE_SERVICO_FIELD_UID,
  objectUniversalIdentifier: ENTREGA_UID,
  type: FieldType.RELATION,
  name: 'tipoDeServico',
  label: 'Tipo de serviço',
  icon: 'IconCategory',
  isNullable: true,
  relationTargetObjectMetadataUniversalIdentifier:
    TIPO_DE_SERVICO_UID,
  relationTargetFieldMetadataUniversalIdentifier: TIPO_DE_SERVICO_ENTREGAS_FIELD_UID,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.SET_NULL,
    joinColumnName: 'tipoDeServicoId',
  },
});
