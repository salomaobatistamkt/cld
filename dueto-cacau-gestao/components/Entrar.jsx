import React, { useState } from 'react';
import { entrar, useNuvem } from '@/lib/nuvem';

export function Entrar() {
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const { status, mensagem } = useNuvem();

  const enviar = async (e) => {
    e.preventDefault();
    setErro('');
    setEnviando(true);
    try {
      await entrar(senha);
    } catch (err) {
      setErro(err.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="entrar-fundo">
      <form className="entrar-cartao" onSubmit={enviar}>
        <div className="hero-marca" role="img" aria-label="Dueto CaCau" />
        <h1>Dueto CaCau</h1>
        <p>Gestão da confeitaria. Digite a senha para entrar.</p>
        {status === 'erro' ? (
          <div className="faixa-aviso"><div>{mensagem}</div></div>
        ) : (
          <>
            <label className="campo">
              <span>Senha</span>
              <input id="senha" type="password" autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)} autoFocus />
            </label>
            {erro ? <div className="entrar-erro" role="alert">{erro}</div> : null}
            <button type="submit" className="btn primario" disabled={enviando || !senha}>{enviando ? 'Entrando…' : 'Entrar'}</button>
          </>
        )}
      </form>
    </div>
  );
}
