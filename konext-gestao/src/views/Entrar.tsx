import { Lock, LogIn } from 'lucide-react';
import { useState } from 'react';

import { Logo } from '@/components/Logo';
import { entrarNoServidor } from '@/lib/backend';
import { iniciarSistema } from '@/lib/inicio';
import { useStore } from '@/lib/store';

// Tela de senha do servidor. Também aparece por cima do sistema se a sessão expirar.
export const Entrar = () => {
  const pronto = useStore((estado) => estado.pronto);
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const enviar = async (evento: React.FormEvent) => {
    evento.preventDefault();
    if (!senha || enviando) return;
    setEnviando(true);
    setErro(null);
    const falha = await entrarNoServidor(senha);
    setEnviando(false);
    if (falha) {
      setErro(falha);
      return;
    }
    useStore.setState({ precisaEntrar: false });
    // Recarrega os dados do servidor (na primeira entrada e depois de a sessão expirar).
    await iniciarSistema();
  };

  return (
    <div className="tela-entrar">
      <form className="cartao-entrar" onSubmit={enviar}>
        <Logo grande />
        <div>
          <h1>{pronto ? 'Sua sessão expirou' : 'Entrar'}</h1>
          <p className="muted">
            {pronto ? 'Digite a senha de novo para continuar. A última alteração pode não ter sido salva.' : 'Digite a senha de acesso do Konext Gestão.'}
          </p>
        </div>
        <label className="campo">
          <span>Senha</span>
          <div className="campo-senha">
            <Lock size={16} />
            <input
              id="senha-entrar"
              type="password"
              autoComplete="current-password"
              autoFocus
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
            />
          </div>
        </label>
        {erro ? <div className="faixa alerta"><p>{erro}</p></div> : null}
        <button type="submit" className="btn primario" disabled={!senha || enviando}>
          <LogIn size={16} /> {enviando ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  );
};
