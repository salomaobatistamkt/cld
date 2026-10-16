import { Image as IconeImagem, Trash2, Upload, Video } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { Confirmar, Vazio } from '@/components/ui';
import { criacaoApi, enviarArquivo, type Midia, urlMidia } from '@/lib/anuncios';
import { useStore } from '@/lib/store';
import { useToast } from '@/lib/toast';

import { AvisoSoServidor } from './Diagnostico';

const tamanho = (bytes: number) => (bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB` : `${Math.round(bytes / 1024)} KB`);

// Anúncios → Biblioteca de criativos: arraste arquivos, veja e organize por cliente.
export const BibliotecaCriativos = () => {
  const { dados } = useStore();
  const modoServidor = useStore((estado) => estado.backend?.modo === 'servidor');
  const mostrar = useToast((estado) => estado.mostrar);
  const [cliente, setCliente] = useState('');
  const [midias, setMidias] = useState<Midia[] | null>(null);
  const [envios, setEnvios] = useState<Array<{ chave: string; nome: string; fracao: number; erro?: string }>>([]);
  const [arrastando, setArrastando] = useState(false);
  const [apagar, setApagar] = useState<Midia | null>(null);
  const [previa, setPrevia] = useState<Midia | null>(null);
  const entrada = useRef<HTMLInputElement>(null);

  const carregar = useCallback(async () => {
    try {
      const r = await criacaoApi.midias(cliente || undefined);
      setMidias(cliente ? r.midias.filter((m) => m.clienteId === cliente) : r.midias);
    } catch (falha) {
      mostrar(falha instanceof Error ? falha.message : 'Não foi possível carregar', true);
    }
  }, [cliente, mostrar]);

  useEffect(() => {
    if (modoServidor) carregar();
  }, [modoServidor, carregar]);

  const enviar = async (arquivos: File[]) => {
    for (const arquivo of arquivos) {
      const chave = `${arquivo.name}-${Date.now()}`;
      setEnvios((e) => [...e, { chave, nome: arquivo.name, fracao: 0 }]);
      try {
        await enviarArquivo(arquivo, cliente || null, (fracao) => setEnvios((e) => e.map((x) => (x.chave === chave ? { ...x, fracao } : x))));
        setEnvios((e) => e.filter((x) => x.chave !== chave));
        carregar();
      } catch (falha) {
        setEnvios((e) => e.map((x) => (x.chave === chave ? { ...x, erro: falha instanceof Error ? falha.message : 'Falhou' } : x)));
      }
    }
  };

  const nomeCliente = (id: string | null) => (id ? dados.clientes.find((c) => c.id === id)?.nome ?? 'Cliente removido' : 'Sem cliente');

  return (
    <div className="pagina">
      <div className="cabecalho">
        <div>
          <h1>
            <IconeImagem size={26} /> Biblioteca de criativos
          </h1>
          <p>Imagens e vídeos prontos para virar anúncio. O envio para a Meta acontece só na hora de publicar, e é reaproveitado depois. Para não ocupar espaço, cada arquivo é apagado automaticamente 24h depois do envio (os anúncios já criados continuam na Meta).</p>
        </div>
      </div>
      {!modoServidor ? (
        <AvisoSoServidor />
      ) : (
        <>
          <div className="acoes">
            <select className="input" style={{ width: 'auto' }} value={cliente} onChange={(e) => setCliente(e.target.value)} aria-label="Cliente">
              <option value="">Todos os clientes</option>
              {dados.clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </div>
          <div
            className={`area-soltar${arrastando ? ' ativa' : ''}`}
            onDragOver={(e) => {
              e.preventDefault();
              setArrastando(true);
            }}
            onDragLeave={() => setArrastando(false)}
            onDrop={(e) => {
              e.preventDefault();
              setArrastando(false);
              enviar([...e.dataTransfer.files]);
            }}
          >
            <Upload size={24} />
            <b>Arraste arquivos aqui {cliente ? `para ${nomeCliente(cliente)}` : '(escolha o cliente acima para organizar)'}</b>
            <span className="muted">JPG, PNG (até 30 MB) · MP4, MOV (até 1 GB)</span>
            <button type="button" className="btn" onClick={() => entrada.current?.click()}>
              <Upload size={15} /> Escolher arquivos
            </button>
            <input
              ref={entrada}
              type="file"
              multiple
              hidden
              accept=".jpg,.jpeg,.png,.mp4,.mov"
              onChange={(e) => {
                enviar([...(e.target.files ?? [])]);
                e.target.value = '';
              }}
            />
          </div>
          {envios.map((e) => (
            <div key={e.chave} className={`linha-envio${e.erro ? ' erro' : ''}`}>
              <span>{e.nome}</span>
              {e.erro ? <span className="erro-texto">{e.erro}</span> : <div className="progresso"><div style={{ width: `${Math.round(e.fracao * 100)}%` }} /></div>}
              {e.erro ? (
                <button type="button" className="btn fantasma pequeno" onClick={() => setEnvios((l) => l.filter((x) => x.chave !== e.chave))}>
                  Fechar
                </button>
              ) : (
                <span className="muted">{Math.round(e.fracao * 100)}%</span>
              )}
            </div>
          ))}
          {midias === null ? <p className="muted">Carregando…</p> : midias.length === 0 ? (
            <Vazio texto="Nenhum criativo ainda." />
          ) : (
            <div className="grade-biblioteca">
              {midias.map((m) => (
                <div key={m.id} className="cartao-midia">
                  <button type="button" className="abrir-midia" onClick={() => setPrevia(m)} aria-label={`Ver ${m.nome}`}>
                    {m.tipo === 'imagem' ? (
                      <img className="miniatura-criativo" src={urlMidia(m.id)} alt="" loading="lazy" />
                    ) : (
                      <video className="miniatura-criativo" src={`${urlMidia(m.id)}#t=0.5`} preload="metadata" muted playsInline />
                    )}
                  </button>
                  <span className="nome-midia">{m.nome}</span>
                  <small className="muted">
                    {m.tipo === 'video' ? <Video size={11} /> : <IconeImagem size={11} />} {tamanho(m.tamanho)} · {nomeCliente(m.clienteId)}
                    {m.contasEnviadas.length ? ` · já na Meta (${m.contasEnviadas.length})` : ''}
                  </small>
                  <button type="button" className="btn fantasma pequeno perigo" onClick={() => setApagar(m)}>
                    <Trash2 size={13} /> Apagar
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
      {previa ? (
        <div className="fundo-modal" onMouseDown={(e) => e.target === e.currentTarget && setPrevia(null)}>
          <div className="previa-grande">
            {previa.tipo === 'imagem' ? <img src={urlMidia(previa.id)} alt={previa.nome} /> : <video src={urlMidia(previa.id)} controls autoPlay playsInline />}
            <button type="button" className="btn" onClick={() => setPrevia(null)}>
              Fechar
            </button>
          </div>
        </div>
      ) : null}
      {apagar ? (
        <Confirmar
          texto={`Apagar “${apagar.nome}” da biblioteca? Os anúncios já publicados com ele continuam na Meta.`}
          aoCancelar={() => setApagar(null)}
          aoConfirmar={async () => {
            try {
              await criacaoApi.apagarMidia(apagar.id);
              mostrar('Apagado');
            } catch (falha) {
              mostrar(falha instanceof Error ? falha.message : 'Falhou', true);
            }
            setApagar(null);
            carregar();
          }}
        />
      ) : null}
    </div>
  );
};
