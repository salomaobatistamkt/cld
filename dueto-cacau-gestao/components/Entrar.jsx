import React, { useState } from 'react';
import { entrar, useNuvem } from '@/lib/nuvem';

export function Entrar() {
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const { status, mensagem } = useNuvem();

  const enviar = async (e) => {
    e.preventDefault();
    setErro('');
    setEnviando(true);
    try {
      await entrar(usuario, senha);
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
        <p>Gestão da confeitaria. Entre com seu nome e a senha.</p>
        {status === 'erro' ? (
          <div className="faixa-aviso"><div>{mensagem}</div></div>
        ) : (
          <>
            <label className="campo">
              <span>Usuário</span>
              <input id="usuario" type="text" autoComplete="username" autoCapitalize="none" placeholder="salomão ou elizandra" value={usuario} onChange={(e) => setUsuario(e.target.value)} autoFocus />
            </label>
            <label className="campo">
              <span>Senha</span>
              <input id="senha" type="password" autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)} />
            </label>
            {erro ? <div className="entrar-erro" role="alert">{erro}</div> : null}
            <button type="submit" className="btn primario" disabled={enviando || !usuario || !senha}>{enviando ? 'Entrando…' : 'Entrar'}</button>
          </>
        )}
      </form>
    </div>
  );
}
