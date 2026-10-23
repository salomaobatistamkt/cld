import React, { useRef } from 'react';
import { Download, HardDrive, RotateCcw, Trash2, Upload } from 'lucide-react';
import { useStore } from '@/lib/store';
import { Aviso, Cartao, CabPagina, confirmar, useToast } from './ui';

export const Configuracoes = () => {
  const st = useStore();
  const mostrar = useToast((s) => s.mostrar);
  const arquivo = useRef(null);

  const baixar = () => {
    const blob = new Blob([st.exportar()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dueto-cacau-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    mostrar('Cópia de segurança baixada');
  };

  const importar = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      if (!confirmar('Importar substitui todos os dados atuais. Continuar?')) return;
      st.importar(await f.text());
      mostrar('Dados importados');
    } catch {
      mostrar('Não foi possível ler esse arquivo', true);
    } finally {
      e.target.value = '';
    }
  };

  return (
    <div className="pagina">
      <CabPagina titulo="Configurações" descricao="Cópia de segurança e dados do sistema." />

      <Aviso tom="info" icone={HardDrive}>
        Por enquanto os dados ficam salvos neste aparelho, no navegador. Faça uma cópia de segurança de tempos em tempos. Quando o sistema for para a VPS, eles passam a ficar no servidor e podem ser acessados de qualquer aparelho.
      </Aviso>

      <div className="duas-colunas">
        <Cartao titulo="Cópia de segurança" descricao="Baixe tudo em um arquivo ou restaure a partir de um arquivo anterior.">
          <div className="acoes">
            <button type="button" className="btn verde" onClick={baixar}><Download size={16} />Baixar cópia</button>
            <button type="button" className="btn secundario" onClick={() => arquivo.current?.click()}><Upload size={16} />Importar arquivo</button>
            <input ref={arquivo} type="file" accept="application/json,.json" hidden onChange={importar} />
          </div>
        </Cartao>

        <Cartao titulo="Dados de exemplo" descricao={st.exemplo ? 'O sistema está com receitas, pedidos e valores de exemplo para você testar.' : 'Seus próprios dados estão em uso.'}>
          <div className="acoes">
            <button type="button" className="btn primario" disabled={!st.exemplo} onClick={() => { if (confirmar('Apagar receitas, insumos, pedidos, caixa e tarefas de exemplo? Os custos e operação são mantidos.')) { st.limparExemplos(); mostrar('Exemplos removidos'); } }}><Trash2 size={16} />Começar do zero</button>
            <button type="button" className="btn secundario" onClick={() => { if (confirmar('Voltar aos dados de exemplo? Isso substitui o que você cadastrou.')) { st.restaurarExemplos(); mostrar('Exemplos restaurados'); } }}><RotateCcw size={16} />Restaurar exemplos</button>
          </div>
        </Cartao>
      </div>
    </div>
  );
};
