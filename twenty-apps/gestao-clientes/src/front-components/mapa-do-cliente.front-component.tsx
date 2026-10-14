import { useCallback, useEffect, useMemo, useState } from 'react';
import { defineFrontComponent } from 'twenty-sdk/define';
import {
  AppPath,
  enqueueSnackbar,
  navigate,
  useRecordId,
} from 'twenty-sdk/front-component';
import { useTheme } from 'twenty-ui/theme';

import { MAPA_DO_CLIENTE_FRONT_COMPONENT_UID } from 'src/constants/universal-identifiers';
import { Botao } from 'src/front-components/components/botao';
import { MapaCanvas } from 'src/front-components/components/mapa-canvas';
import { type DadosCliente } from 'src/types/dados-cliente';
import { type NoMapa } from 'src/types/no-mapa';
import { atualizarNo } from 'src/utils/atualizar-no.util';
import { carregarCliente } from 'src/utils/carregar-cliente.util';
import { gerarIdNo } from 'src/utils/gerar-id-no.util';
import { montarMapaDoCliente } from 'src/utils/montar-mapa-do-cliente.util';
import { mutar } from 'src/utils/mutar.util';

// Remove os ids derivados dos registros para que a cópia editável tenha ids próprios.
const copiarArvore = (no: NoMapa): NoMapa => ({
  ...no,
  id: gerarIdNo(),
  filhos: no.filhos.map(copiarArvore),
});

const MapaDoCliente = () => {
  const theme = useTheme();
  const recordId = useRecordId();
  const [dados, setDados] = useState<DadosCliente | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [recolhidos, setRecolhidos] = useState<Set<string>>(new Set());
  const [criando, setCriando] = useState(false);

  const recarregar = useCallback(() => {
    if (!recordId) {
      setCarregando(false);
      return;
    }
    setCarregando(true);
    setErro(null);
    carregarCliente(recordId)
      .then(setDados)
      .catch((falha: unknown) =>
        setErro(falha instanceof Error ? falha.message : String(falha)),
      )
      .finally(() => setCarregando(false));
  }, [recordId]);

  useEffect(recarregar, [recarregar]);

  const raiz = useMemo(() => {
    if (!dados) {
      return null;
    }
    return [...recolhidos].reduce(
      (arvore, id) => atualizarNo(arvore, id, (no) => ({ ...no, recolhido: true })),
      montarMapaDoCliente(dados),
    );
  }, [dados, recolhidos]);

  const criarMapa = async (copiar: boolean) => {
    if (!dados || !raiz) {
      return;
    }
    setCriando(true);
    try {
      const conteudo: NoMapa = copiar
        ? copiarArvore({ ...raiz, texto: dados.name ?? 'Cliente' })
        : { id: gerarIdNo(), texto: dados.name ?? 'Cliente', filhos: [] };
      const resultado = await mutar<{ createMapaMental?: { id: string } }>({
        createMapaMental: {
          __args: {
            data: {
              name: copiar ? `Visão geral — ${dados.name ?? 'cliente'}` : `Planejamento — ${dados.name ?? 'cliente'}`,
              clienteId: dados.id,
              conteudo,
            },
          },
          id: true,
        },
      });
      const novoId = resultado.createMapaMental?.id;
      if (novoId) {
        await navigate(AppPath.RecordShowPage, {
          objectNameSingular: 'mapaMental',
          objectRecordId: novoId,
        });
      }
    } catch (falha) {
      await enqueueSnackbar({
        message: 'Não foi possível criar o mapa mental.',
        detailedMessage: falha instanceof Error ? falha.message : String(falha),
        variant: 'error',
      });
    } finally {
      setCriando(false);
    }
  };

  if (carregando && !dados) {
    return <div style={{ color: theme.font.color.tertiary, padding: 32, textAlign: 'center' }}>Montando o mapa do cliente…</div>;
  }
  if (erro) {
    return <div style={{ color: theme.font.color.danger, padding: 32, textAlign: 'center' }}>Erro ao carregar: {erro}</div>;
  }
  if (!raiz) {
    return <div style={{ color: theme.font.color.tertiary, padding: 32, textAlign: 'center' }}>Abra um cliente para ver o mapa.</div>;
  }

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
        <span style={{ color: theme.font.color.secondary, fontSize: theme.font.size.sm, marginRight: 'auto' }}>
          Gerado a partir dos dados do cliente. Clique em um item com ↗ para abri-lo.
        </span>
        <Botao onClick={recarregar} desabilitado={carregando}>
          {carregando ? 'Atualizando…' : 'Atualizar'}
        </Botao>
        <Botao onClick={() => criarMapa(true)} desabilitado={criando} titulo="Cria um mapa mental editável com esta estrutura">
          Copiar como mapa editável
        </Botao>
        <Botao variante="primario" onClick={() => criarMapa(false)} desabilitado={criando}>
          + Novo mapa de planejamento
        </Botao>
      </div>
      <MapaCanvas
        raiz={raiz}
        onAlternarRecolhido={(id) =>
          setRecolhidos((atual) => {
            const proximo = new Set(atual);
            if (proximo.has(id)) {
              proximo.delete(id);
            } else {
              proximo.add(id);
            }
            return proximo;
          })
        }
        onAbrirRegistro={(registro) =>
          navigate(AppPath.RecordShowPage, {
            objectNameSingular: registro.objeto,
            objectRecordId: registro.id,
          })
        }
      />
    </div>
  );
};

export default defineFrontComponent({
  universalIdentifier: MAPA_DO_CLIENTE_FRONT_COMPONENT_UID,
  name: 'mapa-do-cliente',
  description: 'Mapa mental automático do cliente: serviços, entregas, briefing, acessos e reuniões',
  component: MapaDoCliente,
});
