import { X } from 'lucide-react';
import { type ReactNode, useEffect } from 'react';

import { type Rotulo } from '@/lib/constantes';
import { iniciais } from '@/lib/util';

export const Tag = ({ rotulo, semPonto = false }: { rotulo: Rotulo; semPonto?: boolean }) => (
  <span className={`tag ${rotulo.cor}${semPonto ? ' sem-ponto' : ''}`}>{rotulo.label}</span>
);

export const Avatar = ({ nome, cor, tamanho = 40 }: { nome: string; cor: string; tamanho?: number }) => (
  <span
    className="avatar"
    style={{ background: cor, width: tamanho, height: tamanho, fontSize: tamanho * 0.38, borderRadius: tamanho * 0.3 }}
    aria-hidden="true"
  >
    {iniciais(nome)}
  </span>
);

export const Modal = ({
  titulo,
  aoFechar,
  children,
  rodape,
  pequeno = false,
}: {
  titulo: string;
  aoFechar: () => void;
  children: ReactNode;
  rodape?: ReactNode;
  pequeno?: boolean;
}) => {
  useEffect(() => {
    const tecla = (evento: KeyboardEvent) => evento.key === 'Escape' && aoFechar();
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [aoFechar]);

  return (
    <div className="fundo-modal" onMouseDown={(evento) => evento.target === evento.currentTarget && aoFechar()}>
      <div className={`modal${pequeno ? ' pequeno' : ''}`} role="dialog" aria-modal="true" aria-label={titulo}>
        <div className="modal-topo">
          <h2>{titulo}</h2>
          <button type="button" className="btn fantasma icone" onClick={aoFechar} aria-label="Fechar">
            <X size={18} />
          </button>
        </div>
        <div className="modal-corpo">{children}</div>
        {rodape ? <div className="modal-rodape">{rodape}</div> : null}
      </div>
    </div>
  );
};

type CampoProps = {
  rotulo: string;
  dica?: string;
  largo?: boolean;
  children: ReactNode;
};

export const Campo = ({ rotulo, dica, largo = false, children }: CampoProps) => (
  <label className={`campo${largo ? ' largo' : ''}`}>
    <span>{rotulo}</span>
    {children}
    {dica ? <small>{dica}</small> : null}
  </label>
);

export const Vazio = ({ icone, texto, acao }: { icone?: ReactNode; texto: string; acao?: ReactNode }) => (
  <div className="vazio">
    {icone}
    <span>{texto}</span>
    {acao}
  </div>
);

export const Kpi = ({
  icone,
  rotulo,
  valor,
  detalhe,
  tom,
}: {
  icone: ReactNode;
  rotulo: string;
  valor: string;
  detalhe?: string;
  tom?: 'alerta' | 'bom';
}) => (
  <div className={`kpi${tom ? ` ${tom}` : ''}`}>
    <div className="rotulo">
      {icone}
      {rotulo}
    </div>
    <div className="valor">{valor}</div>
    {detalhe ? <div className="detalhe">{detalhe}</div> : null}
  </div>
);

// Confirmação dentro da página (o navegador do artefato ignora window.confirm).
export const Confirmar = ({
  texto,
  rotuloAcao = 'Excluir',
  aoConfirmar,
  aoCancelar,
}: {
  texto: string;
  rotuloAcao?: string;
  aoConfirmar: () => void;
  aoCancelar: () => void;
}) => (
  <Modal
    titulo="Tem certeza?"
    aoFechar={aoCancelar}
    pequeno
    rodape={
      <>
        <button type="button" className="btn fantasma" onClick={aoCancelar}>
          Cancelar
        </button>
        <button type="button" className="btn primario" onClick={aoConfirmar}>
          {rotuloAcao}
        </button>
      </>
    }
  >
    <p style={{ margin: 0 }}>{texto}</p>
  </Modal>
);
