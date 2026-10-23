import React, { useEffect, useRef, useState } from 'react';
import { create } from 'zustand';
import { X } from 'lucide-react';

/* ---------- Formatação ---------- */
const brlFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
export const brl = (v) => brlFmt.format(Number.isFinite(Number(v)) ? Number(v) : 0);
export const brl4 = (v) =>
  `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 4 })}`;
export const pct = (v, casas = 0) =>
  `${(Number(v || 0) * 100).toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })}%`;
export const numero = (v, casas = 2) =>
  Number(v || 0).toLocaleString('pt-BR', { maximumFractionDigits: casas });
export const dataCurta = (iso) => {
  if (!iso) return '';
  const [a, m, d] = iso.split('-');
  return `${d}/${m}`;
};
export const dataLonga = (iso) => {
  if (!iso) return 'Sem data';
  const [a, m, d] = iso.split('-');
  return `${d}/${m}/${a}`;
};
export const minutosTexto = (min) => {
  const m = Math.round(Number(min) || 0);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h} h ${r} min` : `${h} h`;
};
export const mesAtual = () => new Date().toISOString().slice(0, 7);

/* ---------- Aviso rápido ---------- */
export const useToast = create((set) => ({
  toast: null,
  mostrar: (texto, erro = false) => {
    set({ toast: { texto, erro } });
    setTimeout(() => set({ toast: null }), 2600);
  },
}));

export const Toast = () => {
  const toast = useToast((s) => s.toast);
  return toast ? <div className={`toast${toast.erro ? ' erro' : ''}`} role="status">{toast.texto}</div> : null;
};

/* ---------- Campos ---------- */
const textoDe = (v) => (v === null || v === undefined || Number(v) === 0 ? '' : String(v));

/** Campo numérico que aceita "1," e "0.5" enquanto a pessoa digita. */
export const Numero = ({ value, onChange, prefixo, sufixo, passo = 'any', min = 0, placeholder, ...resto }) => {
  const [texto, setTexto] = useState(textoDe(value));
  const ultimo = useRef(value);

  useEffect(() => {
    if (value !== ultimo.current) {
      ultimo.current = value;
      setTexto(textoDe(value));
    }
  }, [value]);

  const campo = (
    <input
      type="number"
      inputMode="decimal"
      step={passo}
      min={min}
      value={texto}
      placeholder={placeholder === undefined || placeholder === null ? '0' : String(placeholder).replace('.', ',')}
      onChange={(e) => {
        const bruto = e.target.value;
        setTexto(bruto);
        if (bruto === '') {
          ultimo.current = null;
          onChange(null);
          return;
        }
        const n = Number(bruto);
        if (Number.isFinite(n)) {
          ultimo.current = n;
          onChange(n);
        }
      }}
      {...resto}
    />
  );
  if (!prefixo && !sufixo) return campo;
  return (
    <div className={`${prefixo ? 'com-prefixo' : ''} ${sufixo ? 'com-sufixo' : ''}`}>
      {prefixo ? <i>{prefixo}</i> : null}
      {campo}
      {sufixo ? <i>{sufixo}</i> : null}
    </div>
  );
};

export const Campo = ({ rotulo, dica, children }) => (
  <label className="campo">
    <span>{rotulo}</span>
    {children}
    {dica ? <small>{dica}</small> : null}
  </label>
);

export const Texto = ({ value, onChange, ...resto }) => (
  <input type="text" value={value ?? ''} onChange={(e) => onChange(e.target.value)} {...resto} />
);

/* ---------- Estrutura ---------- */
export const CabPagina = ({ titulo, descricao, children }) => (
  <header className="cab-pagina">
    <div>
      <h1>{titulo}</h1>
      {descricao ? <p>{descricao}</p> : null}
    </div>
    {children ? <div className="acoes">{children}</div> : null}
  </header>
);

export const Cartao = ({ titulo, descricao, acoes, semPad, className = '', children }) => (
  <section className={`cartao${semPad ? ' sem-pad' : ''} ${className}`}>
    {titulo || acoes ? (
      <div className="cartao-topo" style={semPad ? { padding: '18px 22px 0' } : undefined}>
        <div>
          {titulo ? <h2>{titulo}</h2> : null}
          {descricao ? <p>{descricao}</p> : null}
        </div>
        {acoes ? <div className="acoes">{acoes}</div> : null}
      </div>
    ) : null}
    {children}
  </section>
);

export const Kpi = ({ icone: Icone, rotulo, valor, rodape, destaque, tom }) => (
  <div className={`kpi${destaque ? ' destaque' : ''}`}>
    <div className="kpi-rotulo">{Icone ? <Icone size={16} /> : null}<span>{rotulo}</span></div>
    <div className={`kpi-valor num${tom === 'vinho' ? ' vinho' : ''}`}>{valor}</div>
    {rodape ? <div className="kpi-rodape">{rodape}</div> : null}
  </div>
);

export const Abas = ({ itens, ativo, onChange }) => (
  <div className="abas" role="tablist">
    {itens.map((i) => (
      <button key={i.id} role="tab" aria-selected={ativo === i.id} className={ativo === i.id ? 'ativo' : ''} onClick={() => onChange(i.id)}>
        {i.rotulo}
      </button>
    ))}
  </div>
);

export const Tag = ({ cor = '', children }) => <span className={`tag ${cor}`}>{children}</span>;

export const Vazio = ({ icone: Icone, titulo, texto, children }) => (
  <div className="vazio">
    {Icone ? <Icone size={30} color="#b58d3a" /> : null}
    <h3>{titulo}</h3>
    {texto ? <p>{texto}</p> : null}
    {children}
  </div>
);

export const Aviso = ({ icone: Icone, tom, children }) => (
  <div className={`faixa-aviso${tom === 'info' ? ' faixa-info' : ''}`}>
    {Icone ? <Icone size={17} /> : null}
    <div>{children}</div>
  </div>
);

export const Modal = ({ titulo, onClose, children, rodape, largo }) => {
  useEffect(() => {
    const aoTeclar = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', aoTeclar);
    return () => document.removeEventListener('keydown', aoTeclar);
  }, [onClose]);
  return (
    <div className="modal-fundo" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal${largo ? ' largo' : ''}`} role="dialog" aria-modal="true" aria-label={titulo}>
        <div className="modal-topo">
          <h2>{titulo}</h2>
          <button type="button" className="btn fantasma icone" onClick={onClose} aria-label="Fechar"><X size={19} /></button>
        </div>
        <div className="modal-corpo">{children}</div>
        {rodape ? <div className="modal-rodape">{rodape}</div> : null}
      </div>
    </div>
  );
};

export const confirmar = (texto) => (typeof window === 'undefined' ? false : window.confirm(texto));

export const UNIDADES = [
  { id: 'g', rotulo: 'g (gramas)' },
  { id: 'ml', rotulo: 'ml (mililitros)' },
  { id: 'un', rotulo: 'un (unidades)' },
  { id: 'm', rotulo: 'm (metros)' },
];
