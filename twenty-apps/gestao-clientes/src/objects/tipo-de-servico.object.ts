import { defineObject, FieldType } from 'twenty-sdk/define';

import {
  TIPO_DE_SERVICO_DESCRICAO_FIELD_UID,
  TIPO_DE_SERVICO_ENTREGAS_PADRAO_FIELD_UID,
  TIPO_DE_SERVICO_NAME_FIELD_UID,
  TIPO_DE_SERVICO_UID,
} from 'src/constants/universal-identifiers';

// Catálogo editável: cada registro é um tipo de serviço/entrega que a agência
// oferece. Criar um novo tipo é só criar um novo registro, sem mexer em código.
export default defineObject({
  universalIdentifier: TIPO_DE_SERVICO_UID,
  nameSingular: 'tipoDeServico',
  namePlural: 'tiposDeServico',
  labelSingular: 'Tipo de serviço',
  labelPlural: 'Tipos de serviço',
  description: 'Catálogo dos serviços oferecidos (ex.: Tráfego, Sites, Mentoria)',
  icon: 'IconCategory',
  labelIdentifierFieldMetadataUniversalIdentifier: TIPO_DE_SERVICO_NAME_FIELD_UID,
  fields: [
    {
      universalIdentifier: TIPO_DE_SERVICO_NAME_FIELD_UID,
      type: FieldType.TEXT,
      name: 'name',
      label: 'Nome',
      description: 'Nome do tipo de serviço',
      icon: 'IconAbc',
    },
    {
      universalIdentifier: TIPO_DE_SERVICO_DESCRICAO_FIELD_UID,
      type: FieldType.TEXT,
      name: 'descricao',
      label: 'Descrição',
      description: 'O que esse serviço inclui',
      icon: 'IconFileDescription',
      isNullable: true,
    },
    {
      universalIdentifier: TIPO_DE_SERVICO_ENTREGAS_PADRAO_FIELD_UID,
      type: FieldType.TEXT,
      name: 'entregasPadrao',
      label: 'Entregas padrão',
      description:
        'Uma entrega por linha. Usadas como checklist ao planejar um novo serviço contratado',
      icon: 'IconListCheck',
      isNullable: true,
    },
  ],
});
