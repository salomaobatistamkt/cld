// Editor de modelo de mensagem do WhatsApp (boas-vindas + mensagem pronta), com prévia.
// Os modelos ficam salvos no Konext e servem para qualquer cliente.
import { Save, Trash2, X } from 'lucide-react';
import { useState } from 'react';

export type ModeloKonext = { id: string; nome: string; boasVindas: string; mensagemPronta: string };

export const BOAS_VINDAS_PADRAO = '🟢 Online agora!';
export const LIMITE_MENSAGEM_PRONTA = 80;

export const PreviaWhatsApp = ({ boasVindas, mensagemPronta, nomePagina }: { boasVindas: string; mensagemPronta: string; nomePagina?: string }) => (
  <div className="previa-whats" aria-label="Prévia da conversa no WhatsApp">
    <div className="previa-whats-topo">{nomePagina || 'Sua página'}</div>
    <div className="previa-whats-corpo">
      <div className="balao-recebido">
        <span className="balao-anuncio">Anúncio · Ver detalhes</span>
        <span>{boasVindas || '…'}</span>
      </div>
      <div className="campo-digitado">{mensagemPronta || 'Mensagem pronta'}</div>
    </div>
  </div>
);

export const EditorModeloMensagem = ({
  inicial,
  sugestao,
  nomePagina,
  aoSalvar,
  aoExcluir,
  aoFechar,
}: {
  inicial?: Partial<ModeloKonext>;
  sugestao?: string;
  nomePagina?: string;
  aoSalvar: (m: ModeloKonext) => void;
  aoExcluir?: () => void;
  aoFechar: () => void;
}) => {
  const [nome, setNome] = useState(inicial?.nome || '');
  const [boasVindas, setBoasVindas] = useState(inicial?.boasVindas || BOAS_VINDAS_PADRAO);
  const [mensagemPronta, setMensagemPronta] = useState(inicial?.mensagemPronta || sugestao || '');
  const valido = boasVindas.trim() && mensagemPronta.trim() && mensagemPronta.length <= LIMITE_MENSAGEM_PRONTA;
  return (
    <div className="editor-modelo">
      <div className="editor-modelo-campos">
        <label className="campo">
          <span>Nome do modelo</span>
          <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Preenchimento labial" maxLength={80} />
        </label>
        <label className="campo">
          <span>Mensagem de boas-vindas</span>
          <input value={boasVindas} onChange={(e) => setBoasVindas(e.target.value)} maxLength={300} />
          <small>
            Padrão da agência: {BOAS_VINDAS_PADRAO}{' '}
            {boasVindas !== BOAS_VINDAS_PADRAO ? (
              <button type="button" className="link-botao" onClick={() => setBoasVindas(BOAS_VINDAS_PADRAO)}>
                usar o padrão
              </button>
            ) : null}
          </small>
        </label>
        <label className="campo">
          <span>
            Mensagem pronta (o que o cliente envia) <small className={mensagemPronta.length > LIMITE_MENSAGEM_PRONTA ? 'erro-texto' : ''}>{mensagemPronta.length}/{LIMITE_MENSAGEM_PRONTA}</small>
          </span>
          <input value={mensagemPronta} onChange={(e) => setMensagemPronta(e.target.value)} placeholder="Olá! Tenho interesse em realizar o preenchimento labial!" />
          <small>Comece com uma saudação e cite o procedimento: é o texto que aciona suas automações.</small>
        </label>
        <div className="acoes">
          <button type="button" className="btn primario" disabled={!valido} onClick={() => aoSalvar({ id: inicial?.id || crypto.randomUUID(), nome: nome.trim() || mensagemPronta.trim().slice(0, 60), boasVindas: boasVindas.trim(), mensagemPronta: mensagemPronta.trim() })}>
            <Save size={15} /> Salvar modelo
          </button>
          <button type="button" className="btn" onClick={aoFechar}>
            <X size={15} /> Cancelar
          </button>
          {aoExcluir ? (
            <button type="button" className="btn perigo" onClick={aoExcluir}>
              <Trash2 size={15} /> Excluir
            </button>
          ) : null}
        </div>
      </div>
      <PreviaWhatsApp boasVindas={boasVindas} mensagemPronta={mensagemPronta} nomePagina={nomePagina} />
    </div>
  );
};
