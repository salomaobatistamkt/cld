import '@excalidraw/excalidraw/index.css';

import { convertToExcalidrawElements, Excalidraw, exportToBlob, MainMenu } from '@excalidraw/excalidraw';
import { useEffect, useRef, useState } from 'react';

import { type Quadro } from '@/lib/types';
import { hojeISO } from '@/lib/util';

import { prepararFontes } from './fontes';
import { MODELOS } from './modelos';

type API = Parameters<NonNullable<React.ComponentProps<typeof Excalidraw>['excalidrawAPI']>>[0];
type Elementos = readonly { isDeleted?: boolean }[];

const blobParaDataUrl = (blob: Blob) =>
  new Promise<string>((resolver, rejeitar) => {
    const leitor = new FileReader();
    leitor.onload = () => resolver(String(leitor.result));
    leitor.onerror = rejeitar;
    leitor.readAsDataURL(blob);
  });

// Elementos iniciais: a cena salva ou, na primeira abertura, o modelo escolhido.
export const elementosIniciais = async (quadro: Quadro) => {
  if (quadro.cena.elements.length > 0) return quadro.cena.elements;
  await prepararFontes();
  const modelo = MODELOS[quadro.modelo ?? 'branco'] ?? MODELOS.branco;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return convertToExcalidrawElements(modelo.gerar() as any, { regenerateIds: false }) as unknown[];
};

export const gerarMiniatura = async (elementos: unknown[], files: Record<string, unknown>) => {
  const visiveis = (elementos as Elementos).filter((el) => !el.isDeleted);
  if (visiveis.length === 0) return '';
  const blob = await exportToBlob({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    elements: visiveis as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    files: files as any,
    appState: { exportBackground: true, viewBackgroundColor: '#ffffff' },
    maxWidthOrHeight: 640,
    mimeType: 'image/jpeg',
    quality: 0.8,
  });
  return blobParaDataUrl(blob);
};

type Props = {
  quadro: Quadro;
  somenteLeitura?: boolean;
  aoSalvar?: (quadro: Quadro) => void;
};

export const EditorQuadro = ({ quadro, somenteLeitura = false, aoSalvar }: Props) => {
  const api = useRef<API | null>(null);
  const ultimo = useRef(quadro);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [, setVersao] = useState(0);
  const [elementos, setElementos] = useState<unknown[] | null>(null);

  useEffect(() => {
    let ativo = true;
    prepararFontes()
      .then(() => elementosIniciais(quadro))
      .then((els) => {
        if (!ativo) return;
        setElementos(els);
        // Primeira abertura de um modelo: salva a cena gerada para não recriar depois.
        if (!somenteLeitura && quadro.cena.elements.length === 0 && els.length > 0 && aoSalvar) {
          const salvo = { ...quadro, cena: { elements: els, files: quadro.cena.files }, atualizadoEm: hojeISO() };
          ultimo.current = salvo;
          aoSalvar(salvo);
          gerarMiniatura(els, quadro.cena.files).then((miniatura) => {
            if (miniatura) aoSalvar({ ...ultimo.current, miniatura });
          });
        }
      });
    return () => {
      ativo = false;
    };
  }, [quadro.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(
    () => () => {
      if (temporizador.current) clearTimeout(temporizador.current);
    },
    [],
  );

  if (!elementos) return <div style={{ padding: 24, color: '#64748b' }}>Abrindo quadro…</div>;

  return (
    <Excalidraw
      excalidrawAPI={(instancia) => {
        api.current = instancia;
        setVersao((v) => v + 1);
        // Abre já enquadrado: o quadro inteiro cabe na tela.
        setTimeout(() => {
          try {
            instancia.scrollToContent(instancia.getSceneElements(), { fitToContent: true, animate: false });
          } catch {
            // ignora
          }
        }, 60);
      }}
      langCode="pt-BR"
      theme="light"
      viewModeEnabled={somenteLeitura}
      zenModeEnabled={somenteLeitura}
      initialData={{
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        elements: elementos as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        files: quadro.cena.files as any,
        appState: {
          viewBackgroundColor: '#ffffff',
          currentItemFontFamily: 6,
          currentItemRoughness: 0,
          currentItemRoundness: 'round',
        },
        scrollToContent: true,
      }}
      UIOptions={{ canvasActions: { loadScene: false, saveToActiveFile: false, export: { saveFileToDisk: true } } }}
      onChange={(els, _estado, files) => {
        if (somenteLeitura || !aoSalvar) return;
        if (temporizador.current) clearTimeout(temporizador.current);
        temporizador.current = setTimeout(async () => {
          const ativos = (els as Elementos).filter((el) => !el.isDeleted) as unknown[];
          const atual = ultimo.current;
          if (JSON.stringify(ativos) === JSON.stringify(atual.cena.elements)) return;
          const proximo: Quadro = { ...atual, cena: { elements: ativos, files: files as Record<string, unknown> }, atualizadoEm: hojeISO() };
          ultimo.current = proximo;
          aoSalvar(proximo);
          try {
            const miniatura = await gerarMiniatura(ativos, files as Record<string, unknown>);
            ultimo.current = { ...ultimo.current, miniatura };
            aoSalvar(ultimo.current);
          } catch {
            // miniatura é opcional
          }
        }, 900);
      }}
    >
      <MainMenu>
        <MainMenu.DefaultItems.Export />
        <MainMenu.DefaultItems.SaveAsImage />
        <MainMenu.DefaultItems.ClearCanvas />
        <MainMenu.Separator />
        <MainMenu.DefaultItems.ToggleTheme />
        <MainMenu.DefaultItems.ChangeCanvasBackground />
      </MainMenu>
    </Excalidraw>
  );
};

export default EditorQuadro;
