// Escolha do período: atalhos, intervalo livre entre datas ou o máximo da conta.
import { CalendarDays } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { intervaloDoPeriodo } from '@/lib/meta';
import { dataBR, type EscolhaPeriodo } from '@/lib/metricas';
import { hojeISO, somarDias } from '@/lib/util';

const ATALHOS: Array<{ modo: EscolhaPeriodo['modo']; rotulo: string }> = [
  { modo: 'hoje', rotulo: 'Hoje' },
  { modo: '7', rotulo: 'Últimos 7 dias' },
  { modo: '14', rotulo: 'Últimos 14 dias' },
  { modo: '30', rotulo: 'Últimos 30 dias' },
  { modo: '90', rotulo: 'Últimos 90 dias' },
  { modo: 'mes', rotulo: 'Este mês' },
  { modo: 'mes-passado', rotulo: 'Mês passado' },
  { modo: 'maximo', rotulo: 'Máximo (desde o início da conta)' },
];

export const periodoDe = (modo: EscolhaPeriodo['modo'], de = '', ate = ''): EscolhaPeriodo => {
  const hoje = hojeISO();
  if (modo === 'hoje') return { modo, de: hoje, ate: hoje };
  if (modo === '90') return { modo, de: somarDias(hoje, -89), ate: hoje };
  if (modo === '7' || modo === '14' || modo === '30' || modo === 'mes' || modo === 'mes-passado') return { modo, ...intervaloDoPeriodo(modo, hoje) };
  if (modo === 'maximo') return { modo, de: '', ate: hoje };
  return { modo, de, ate };
};

export const rotuloPeriodo = (p: EscolhaPeriodo, real?: { de: string; ate: string }) => {
  const atalho = ATALHOS.find((a) => a.modo === p.modo);
  const datas = real ? `${dataBR(real.de)} – ${dataBR(real.ate)}` : p.de && p.ate ? `${dataBR(p.de)} – ${dataBR(p.ate)}` : '';
  if (p.modo === 'personalizado') return datas;
  return atalho ? `${atalho.rotulo.replace(' (desde o início da conta)', '')}${datas ? ` · ${datas}` : ''}` : datas;
};

export const SeletorPeriodo = ({ valor, aoMudar, real, desabilitado }: { valor: EscolhaPeriodo; aoMudar: (p: EscolhaPeriodo) => void; real?: { de: string; ate: string }; desabilitado?: boolean }) => {
  const [aberto, setAberto] = useState(false);
  const [de, setDe] = useState(valor.de);
  const [ate, setAte] = useState(valor.ate || hojeISO());
  const caixa = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => {
      if (caixa.current && !caixa.current.contains(e.target as Node)) setAberto(false);
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setAberto(false);
    document.addEventListener('mousedown', fora);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', fora);
      document.removeEventListener('keydown', esc);
    };
  }, [aberto]);
  const escolher = (p: EscolhaPeriodo) => {
    aoMudar(p);
    setAberto(false);
  };
  return (
    <div className="seletor-periodo" ref={caixa}>
      <button type="button" className="btn-periodo" onClick={() => setAberto((a) => !a)} disabled={desabilitado} aria-expanded={aberto}>
        <CalendarDays size={16} />
        <span>{rotuloPeriodo(valor, real)}</span>
      </button>
      {aberto ? (
        <div className="menu-periodo" role="dialog" aria-label="Escolher período">
          <div className="atalhos-periodo">
            {ATALHOS.map((a) => (
              <button key={a.modo} type="button" className={valor.modo === a.modo ? 'ativo' : ''} onClick={() => escolher(periodoDe(a.modo))}>
                {a.rotulo}
              </button>
            ))}
          </div>
          <div className="livre-periodo">
            <b>Escolher datas</b>
            <label>
              De
              <input type="date" value={de} max={ate || hojeISO()} onChange={(e) => setDe(e.target.value)} />
            </label>
            <label>
              Até
              <input type="date" value={ate} min={de} max={hojeISO()} onChange={(e) => setAte(e.target.value)} />
            </label>
            <button type="button" className="btn-aplicar" disabled={!de || !ate || de > ate} onClick={() => escolher({ modo: 'personalizado', de, ate })}>
              Aplicar
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
};
