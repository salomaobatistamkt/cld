# 07 · Regras de negócio e conformidade

## Classificação de ofertas

Comparação com o histórico **da mesma rota, mesmo tipo de tarifa e duração parecida (± 2 dias)**, nos últimos 180 dias.

| Selo | Regra padrão |
|---|---|
| Achado imperdível | entre os 5% mais baratos do histórico |
| Excelente oportunidade | entre os 15% mais baratos |
| Boa oportunidade | entre os 30% mais baratos |
| Preço competitivo | abaixo da mediana |
| (sem selo) | menos de 30 preços comparáveis |

- A economia divulgada é sempre **em relação à mediana**, e o post mostra o valor de referência.
- Todos os parâmetros são editáveis em *Painel → Ajustes*.
- Nenhum selo é inventado: sem amostra suficiente, o post diz "Oferta encontrada" e "Ainda sem histórico suficiente para comparar".

## Controle de qualidade antes de publicar

A verificação confere:

1. Data de ida no futuro.
2. Volta depois da ida.
3. Permanência igual à diferença entre as datas.
4. Aeroportos válidos e diferentes.
5. Nenhuma oferta igual já ativa.
6. Link do parceiro presente.
7. **Preço reconsultado na fonte**, dentro da tolerância (3%).

Regras de publicação:

- Não foi possível reconfirmar o preço → status **desatualizada**; a oferta sai do site e dos envios.
- Aprovar exige consulta com menos de 6 h.
- Ofertas manuais são confirmadas por você: o botão "Conferi no site" fica registrado no log.
- **Expiração automática:** a oferta sai do ar na data da partida ou 48 h depois de publicada (configurável).

## Conteúdo obrigatório em todo post

- Preço com tipo de tarifa (**ida e volta** ou **por trecho**) e situação das **taxas**.
- Datas e duração.
- "Preço visto em consulta de dd/mm/aaaa hh:mm (horário de Brasília)".
- Aviso de que valores e disponibilidade podem mudar.
- Aviso de link de afiliado.
- Sem falsa escassez ("últimas vagas", contagem regressiva) e sem desconto sem referência.

Testes automáticos garantem esses itens nos 4 modelos (`tests/core.test.ts`).

## Dados de exemplo

O modo demonstração gera preços sintéticos marcados com `is_sample`. Eles:

- aparecem com selo "exemplo" em todas as telas;
- trazem o aviso "DADO DE EXEMPLO · NÃO É UM PREÇO REAL · NÃO PUBLICAR" no texto;
- não podem ter post aprovado nem enviado;
- nunca se misturam ao histórico real.

## LGPD

| Ponto | Como o sistema trata |
|---|---|
| Consentimento | Cadastro só com a caixa marcada; gravamos texto, data, hora e canal do consentimento |
| Finalidade | Envio de ofertas de viagem, declarado no formulário |
| DDD | Vira só `inferred_region` ("indicação"), separado da região informada pelo usuário; nunca tratado como localização atual |
| Minimização | Só nome, contato, aeroporto e interesses |
| Descadastro | Fase 2: link de descadastro em cada e-mail e mensagem |
| Contagem de participantes de grupos | Só quando informada legitimamente pela plataforma; nada de raspagem |

## Pontos jurídicos para validar com advogado

1. **Cadastur:** como afiliado que só redireciona para o parceiro, provavelmente não se aplica; com venda própria, aplica.
2. **Política de privacidade e termos de uso** do site.
3. **Código de Defesa do Consumidor (art. 31) e regras da ANAC** sobre informação de preço.
4. **Contratos e termos de cada programa de afiliados.**
