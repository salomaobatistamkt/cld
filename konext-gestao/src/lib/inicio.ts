import { criarBackendServidor, detectarServidor } from './backend';
import { criarBackendPadrao, useStore } from './store';

// Abre o sistema: no servidor pede a senha quando precisa; sem servidor usa o navegador.
export const iniciarSistema = async () => {
  const { servidor, autenticado } = await detectarServidor();
  if (!servidor) {
    await useStore.getState().iniciar(criarBackendPadrao());
    return;
  }
  if (!autenticado) {
    useStore.setState({ precisaEntrar: true });
    return;
  }
  try {
    useStore.setState({ erroInicial: null });
    await useStore.getState().iniciar(criarBackendServidor());
  } catch (falha) {
    console.error(falha);
    if (useStore.getState().precisaEntrar) return;
    // Não cai no modo navegador: o que fosse feito ali não iria para o servidor.
    useStore.setState({ erroInicial: falha instanceof Error ? falha.message : 'Servidor indisponível' });
  }
};
