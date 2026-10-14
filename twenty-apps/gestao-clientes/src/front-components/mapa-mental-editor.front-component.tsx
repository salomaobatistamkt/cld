import { useEffect, useRef, useState } from 'react';
import { defineFrontComponent } from 'twenty-sdk/define';
import {
  AppPath,
  enqueueSnackbar,
  navigate,
  useRecordId,
} from 'twenty-sdk/front-component';
import { useTheme } from 'twenty-ui/theme';

import { CORES_RAMOS } from 'src/constants/cores-ramos';
import { MODELOS_MAPA } from 'src/constants/modelos-mapa';
import { MAPA_MENTAL_EDITOR_FRONT_COMPONENT_UID } from 'src/constants/universal-identifiers';
import { Botao } from 'src/front-components/components/botao';
import { MapaCanvas } from 'src/front-components/components/mapa-canvas';
import { type ModeloMapa } from 'src/types/modelo-mapa';
import { type NoMapa } from 'src/types/no-mapa';
import { adicionarFilho } from 'src/utils/adicionar-filho.util';
import { adicionarIrmao } from 'src/utils/adicionar-irmao.util';
import { atualizarNo } from 'src/utils/atualizar-no.util';
import { consultar } from 'src/utils/consultar.util';
import { encontrarNo } from 'src/utils/encontrar-no.util';
import { gerarIdNo } from 'src/utils/gerar-id-no.util';
import { instanciarModelo } from 'src/utils/instanciar-modelo.util';
import { moverNo } from 'src/utils/mover-no.util';
import { mutar } from 'src/utils/mutar.util';
import { normalizarConteudoMapa } from 'src/utils/normalizar-conteudo-mapa.util';
import { removerNo } from 'src/utils/remover-no.util';

type EstadoSalvamento = 'salvo' | 'pendente' | 'salvando' | 'erro';

type MapaCarregado = {
  id: string;
  name: string | null;
  conteudo: unknown;
  cliente: { id: string; name: string | null } | null;
};

const ATRASO_SALVAMENTO_MS = 900;

const MapaMentalEditor = () => {
  const theme = useTheme();
  const recordId = useRecordId();
  const [mapa, setMapa] = useState<MapaCarregado | null>(null);
  const [raiz, setRaiz] = useState<NoMapa | null>(null);
  const [selecionadoId, setSelecionadoId] = useState<string | null>(null);
  const [estado, setEstado] = useState<EstadoSalvamento>('salvo');
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [mostrarModelos, setMostrarModelos] = useState(false);
  const [criandoEntregas, setCriandoEntregas] = useState(false);
  const versao = useRef(0);

  useEffect(() => {
    if (!recordId) {
      setCarregando(false);
      return;
    }
    let cancelado = false;
    setCarregando(true);
    setErro(null);
    consultar<{ mapasMentais?: { edges?: Array<{ node: MapaCarregado }> } }>({
        mapasMentais: {
          __args: { filter: { id: { eq: recordId } }, first: 1 },
          edges: {
            node: {
              id: true,
              name: true,
              conteudo: true,
              cliente: { id: true, name: true },
            },
          },
        },
      })
      .then((resultado) => {
        if (cancelado) {
          return;
        }
        const node = resultado.mapasMentais?.edges?.[0]?.node ?? null;
        setMapa(node);
        if (node) {
          const arvore = normalizarConteudoMapa(node.conteudo, node.name ?? 'Ideia central');
          setRaiz(arvore);
          setSelecionadoId(arvore.id);
          setMostrarModelos(arvore.filhos.length === 0);
        }
      })
      .catch((falha: unknown) => {
        if (!cancelado) {
          setErro(falha instanceof Error ? falha.message : String(falha));
        }
      })
      .finally(() => {
        if (!cancelado) {
          setCarregando(false);
        }
      });
    return () => {
      cancelado = true;
    };
  }, [recordId]);

  // Salvamento automático: espera o usuário parar de editar por um instante.
  useEffect(() => {
    if (!raiz || !mapa || estado !== 'pendente') {
      return;
    }
    const versaoAtual = versao.current;
    const temporizador = setTimeout(() => {
      setEstado('salvando');
      mutar({
          updateMapaMental: {
            __args: { id: mapa.id, data: { conteudo: raiz } },
            id: true,
          },
        })
        .then(() => {
          if (versao.current === versaoAtual) {
            setEstado('salvo');
          }
        })
        .catch(() => setEstado('erro'));
    }, ATRASO_SALVAMENTO_MS);
    return () => clearTimeout(temporizador);
  }, [raiz, mapa, estado]);

  const alterar = (proxima: NoMapa) => {
    versao.current += 1;
    setRaiz(proxima);
    setEstado('pendente');
  };

  if (carregando) {
    return <Mensagem texto="Carregando mapa…" />;
  }
  if (erro) {
    return <Mensagem texto={`Não foi possível carregar o mapa: ${erro}`} />;
  }
  if (!mapa || !raiz) {
    return <Mensagem texto="Abra um mapa mental para editá-lo aqui." />;
  }

  const selecionado = selecionadoId ? encontrarNo(raiz, selecionadoId) : null;
  const ehRaiz = selecionado?.id === raiz.id;

  const novoNo = (texto: string): NoMapa => ({ id: gerarIdNo(), texto, filhos: [] });

  const adicionarFilhoAoSelecionado = () => {
    const alvo = selecionado ?? raiz;
    const novo = novoNo('Nova ideia');
    alterar(adicionarFilho(raiz, alvo.id, novo));
    setSelecionadoId(novo.id);
  };

  const adicionarIrmaoAoSelecionado = () => {
    if (!selecionado) {
      return;
    }
    const novo = novoNo('Nova ideia');
    alterar(adicionarIrmao(raiz, selecionado.id, novo));
    setSelecionadoId(novo.id);
  };

  const excluirSelecionado = () => {
    if (!selecionado || ehRaiz) {
      return;
    }
    alterar(removerNo(raiz, selecionado.id));
    setSelecionadoId(raiz.id);
  };

  const aplicarModelo = (modelo: ModeloMapa) => {
    const instanciado = instanciarModelo(modelo, raiz.texto);
    const alvo = selecionado ?? raiz;
    // Mapa vazio: o modelo vira o mapa. Senão, os ramos entram no nó selecionado.
    const proxima =
      raiz.filhos.length === 0
        ? { ...raiz, filhos: instanciado.filhos }
        : instanciado.filhos.reduce(
            (arvore, ramo) => adicionarFilho(arvore, alvo.id, ramo),
            raiz,
          );
    alterar(proxima);
    setMostrarModelos(false);
  };

  // Cria uma Entrega para cada filho do nó selecionado (ou para o próprio nó,
  // se ele não tiver filhos) e liga cada nó à entrega criada.
  const criarEntregas = async () => {
    if (!selecionado) {
      return;
    }
    const candidatos = (selecionado.filhos.length > 0 ? selecionado.filhos : [selecionado])
      .filter((no) => !no.registro && no.texto.trim());
    if (candidatos.length === 0) {
      await enqueueSnackbar({
        message: 'Esses itens já viraram entregas.',
        variant: 'info',
      });
      return;
    }
    setCriandoEntregas(true);
    try {
      const resultado = await mutar<{ createEntregas?: Array<{ id: string }> }>({
          createEntregas: {
            __args: {
              data: candidatos.map((no) => ({
                name: no.texto.trim(),
                status: 'A_FAZER',
                ...(mapa.cliente ? { clienteId: mapa.cliente.id } : {}),
              })),
            },
            id: true,
          },
        });
      const criadas = resultado.createEntregas ?? [];
      const proxima = candidatos.reduce(
        (arvore, no, indice) =>
          criadas[indice]
            ? atualizarNo(arvore, no.id, (atual) => ({
                ...atual,
                registro: { objeto: 'entrega', id: criadas[indice].id },
              }))
            : arvore,
        raiz,
      );
      alterar(proxima);
      await enqueueSnackbar({
        message: `${criadas.length} entrega(s) criada(s)${mapa.cliente ? ` para ${mapa.cliente.name ?? 'o cliente'}` : ''}.`,
        variant: 'success',
      });
    } catch (falha) {
      await enqueueSnackbar({
        message: 'Não foi possível criar as entregas.',
        detailedMessage: falha instanceof Error ? falha.message : String(falha),
        variant: 'error',
      });
    } finally {
      setCriandoEntregas(false);
    }
  };

  const abrirRegistro = (registro: { objeto: string; id: string }) =>
    navigate(AppPath.RecordShowPage, {
      objectNameSingular: registro.objeto,
      objectRecordId: registro.id,
    });

  const rotuloEstado = {
    salvo: 'Salvo',
    pendente: 'Alterações não salvas…',
    salvando: 'Salvando…',
    erro: 'Erro ao salvar — edite de novo para tentar outra vez',
  }[estado];

  const separador = (
    <span style={{ alignSelf: 'stretch', borderLeft: `1px solid ${theme.border.color.medium}` }} />
  );

  return (
    <div
      style={{
        boxSizing: 'border-box',
        color: theme.font.color.primary,
        display: 'grid',
        fontFamily: 'Inter, sans-serif',
        gridTemplateRows: 'auto minmax(0, 1fr)',
        height: '100%',
        minHeight: 420,
        width: '100%',
      }}
    >
      <div
        style={{
          alignItems: 'center',
          borderBottom: `1px solid ${theme.border.color.medium}`,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 6,
          padding: '8px 12px',
        }}
      >
        <Botao variante="primario" onClick={adicionarFilhoAoSelecionado} titulo="Adiciona um filho ao nó selecionado">
          + Filho
        </Botao>
        <Botao onClick={adicionarIrmaoAoSelecionado} desabilitado={!selecionado || ehRaiz}>
          + Irmão
        </Botao>
        <input
          value={selecionado?.texto ?? ''}
          placeholder="Selecione um nó para editar o texto"
          disabled={!selecionado}
          onChange={(evento) => {
            if (selecionado) {
              const texto = evento.target.value;
              alterar(atualizarNo(raiz, selecionado.id, (no) => ({ ...no, texto })));
            }
          }}
          style={{
            background: theme.background.primary,
            border: `1px solid ${theme.border.color.medium}`,
            borderRadius: theme.border.radius.sm,
            color: theme.font.color.primary,
            flex: '1 1 220px',
            fontFamily: 'inherit',
            fontSize: theme.font.size.md,
            height: 28,
            minWidth: 160,
            padding: '0 8px',
          }}
        />
        <Botao titulo="Mover para cima" desabilitado={!selecionado || ehRaiz} onClick={() => selecionado && alterar(moverNo(raiz, selecionado.id, -1))}>
          ↑
        </Botao>
        <Botao titulo="Mover para baixo" desabilitado={!selecionado || ehRaiz} onClick={() => selecionado && alterar(moverNo(raiz, selecionado.id, 1))}>
          ↓
        </Botao>
        <Botao variante="perigo" desabilitado={!selecionado || ehRaiz} onClick={excluirSelecionado} titulo="Exclui o nó e tudo abaixo dele">
          Excluir
        </Botao>
        {separador}
        <span style={{ display: 'inline-flex', gap: 3 }}>
          {CORES_RAMOS.map((cor) => (
            <button
              key={cor}
              type="button"
              title={`Cor: ${cor}`}
              disabled={!selecionado || ehRaiz}
              onClick={() =>
                selecionado &&
                alterar(atualizarNo(raiz, selecionado.id, (no) => ({ ...no, cor })))
              }
              style={{
                background: (theme.tag.text as Record<string, string>)[cor],
                border: selecionado?.cor === cor ? `2px solid ${theme.font.color.primary}` : '2px solid transparent',
                borderRadius: '50%',
                cursor: 'pointer',
                height: 16,
                opacity: !selecionado || ehRaiz ? 0.4 : 1,
                padding: 0,
                width: 16,
              }}
            />
          ))}
        </span>
        {separador}
        <Botao ativo={mostrarModelos} onClick={() => setMostrarModelos((atual) => !atual)}>
          Modelos
        </Botao>
        <Botao
          onClick={criarEntregas}
          desabilitado={!selecionado || criandoEntregas}
          titulo="Cria uma entrega para cada filho do nó selecionado"
        >
          {criandoEntregas ? 'Criando…' : '→ Virar entregas'}
        </Botao>
        {selecionado?.registro ? (
          <Botao variante="fantasma" onClick={() => selecionado.registro && abrirRegistro(selecionado.registro)}>
            Abrir entrega ↗
          </Botao>
        ) : null}
        <span
          style={{
            color: estado === 'erro' ? theme.font.color.danger : theme.font.color.tertiary,
            fontSize: theme.font.size.sm,
            marginLeft: 'auto',
            whiteSpace: 'nowrap',
          }}
        >
          {rotuloEstado}
        </span>
      </div>
      <div style={{ minHeight: 0, position: 'relative' }}>
        <MapaCanvas
          raiz={raiz}
          selecionadoId={selecionadoId}
          onSelecionar={(id) => setSelecionadoId(id)}
          onAlternarRecolhido={(id) =>
            alterar(atualizarNo(raiz, id, (no) => ({ ...no, recolhido: !no.recolhido })))
          }
          onAbrirRegistro={abrirRegistro}
        />
        {mostrarModelos ? (
          <div
            style={{
              background: theme.background.primary,
              border: `1px solid ${theme.border.color.medium}`,
              borderRadius: theme.border.radius.md,
              boxShadow: theme.boxShadow.strong,
              display: 'grid',
              gap: 8,
              left: 12,
              maxWidth: 340,
              padding: 12,
              position: 'absolute',
              top: 12,
            }}
          >
            <strong style={{ fontSize: theme.font.size.md }}>
              {raiz.filhos.length === 0 ? 'Começar com um modelo' : 'Inserir modelo no nó selecionado'}
            </strong>
            {MODELOS_MAPA.map((modelo) => (
              <button
                key={modelo.nome}
                type="button"
                onClick={() => aplicarModelo(modelo)}
                style={{
                  background: theme.background.secondary,
                  border: `1px solid ${theme.border.color.medium}`,
                  borderRadius: theme.border.radius.sm,
                  color: theme.font.color.primary,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  padding: '8px 10px',
                  textAlign: 'left',
                }}
              >
                <div style={{ fontWeight: 600 }}>{modelo.nome}</div>
                <div style={{ color: theme.font.color.tertiary, fontSize: theme.font.size.sm }}>
                  {modelo.descricao}
                </div>
              </button>
            ))}
            <Botao variante="fantasma" onClick={() => setMostrarModelos(false)}>
              {raiz.filhos.length === 0 ? 'Começar em branco' : 'Fechar'}
            </Botao>
          </div>
        ) : null}
      </div>
    </div>
  );
};

const Mensagem = ({ texto }: { texto: string }) => {
  const theme = useTheme();
  return (
    <div
      style={{
        color: theme.font.color.tertiary,
        fontFamily: 'Inter, sans-serif',
        padding: 32,
        textAlign: 'center',
      }}
    >
      {texto}
    </div>
  );
};

export default defineFrontComponent({
  universalIdentifier: MAPA_MENTAL_EDITOR_FRONT_COMPONENT_UID,
  name: 'mapa-mental-editor',
  description: 'Editor visual de mapa mental, com modelos e conversão em entregas',
  component: MapaMentalEditor,
});
