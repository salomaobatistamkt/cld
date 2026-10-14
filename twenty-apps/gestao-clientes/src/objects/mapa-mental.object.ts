import { defineObject, FieldType } from 'twenty-sdk/define';

import {
  MAPA_MENTAL_CONTEUDO_FIELD_UID,
  MAPA_MENTAL_NAME_FIELD_UID,
  MAPA_MENTAL_UID,
} from 'src/constants/universal-identifiers';

export default defineObject({
  universalIdentifier: MAPA_MENTAL_UID,
  nameSingular: 'mapaMental',
  namePlural: 'mapasMentais',
  labelSingular: 'Mapa mental',
  labelPlural: 'Mapas mentais',
  description: 'Mapa mental editável para planejar entregas, campanhas e ideias',
  icon: 'IconHierarchy2',
  labelIdentifierFieldMetadataUniversalIdentifier: MAPA_MENTAL_NAME_FIELD_UID,
  fields: [
    {
      universalIdentifier: MAPA_MENTAL_NAME_FIELD_UID,
      type: FieldType.TEXT,
      name: 'name',
      label: 'Título',
      icon: 'IconAbc',
    },
    {
      // Árvore de nós ({ id, texto, filhos[] }) editada pelo componente de mapa mental.
      universalIdentifier: MAPA_MENTAL_CONTEUDO_FIELD_UID,
      type: FieldType.RAW_JSON,
      name: 'conteudo',
      label: 'Conteúdo',
      description: 'Estrutura do mapa (editada pela aba Mapa)',
      icon: 'IconBraces',
      isNullable: true,
    },
  ],
});
