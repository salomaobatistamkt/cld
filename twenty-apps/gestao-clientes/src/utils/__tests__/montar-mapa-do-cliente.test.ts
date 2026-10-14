import { describe, expect, it } from 'vitest';

import { type DadosCliente } from 'src/types/dados-cliente';
import { montarMapaDoCliente } from 'src/utils/montar-mapa-do-cliente.util';

const base: DadosCliente = {
  id: 'c1',
  name: 'Padaria Sol',
  statusCliente: 'ATIVO',
  segmento: 'Alimentação',
  publicoAlvo: 'Bairro',
  tomDeVoz: null,
  objetivos: '  ',
  concorrentes: null,
  coresDaMarca: null,
  servicos: [
    {
      id: 's1',
      name: 'Tráfego',
      status: 'ATIVO',
      tipo: 'Marketing / Tráfego',
      entregas: [{ id: 'e1', name: 'Criativos de outubro', status: 'ENTREGUE' }],
    },
  ],
  entregasAvulsas: [],
  acessos: [],
  reunioes: [],
  mapas: [],
};

describe('montarMapaDoCliente', () => {
  it('monta serviços com entregas e liga cada nó ao registro', () => {
    const raiz = montarMapaDoCliente(base);
    expect(raiz.texto).toBe('Padaria Sol');
    const servicos = raiz.filhos.find((no) => no.id === 'ramo-servicos')!;
    expect(servicos.filhos[0].texto).toBe('Tráfego · Marketing / Tráfego · Ativo');
    expect(servicos.filhos[0].registro).toEqual({ objeto: 'servicoContratado', id: 's1' });
    const entrega = servicos.filhos[0].filhos[0];
    expect(entrega.texto).toBe('Criativos de outubro · Entregue');
    expect(entrega.cor).toBe('green');
  });

  it('mostra só campos de briefing preenchidos e placeholders nos ramos vazios', () => {
    const raiz = montarMapaDoCliente(base);
    const briefing = raiz.filhos.find((no) => no.id === 'ramo-briefing')!;
    expect(briefing.filhos.map((no) => no.texto)).toEqual(['Segmento: Alimentação', 'Público-alvo: Bairro']);
    const acessos = raiz.filhos.find((no) => no.id === 'ramo-acessos')!;
    expect(acessos.filhos[0].texto).toBe('Nenhum acesso cadastrado');
    expect(raiz.filhos.some((no) => no.id === 'ramo-avulsas')).toBe(false);
  });
});
