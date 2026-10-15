import { create } from 'zustand';

type Toast = { texto: string; erro: boolean; id: number } | null;

export const useToast = create<{ toast: Toast; mostrar: (texto: string, erro?: boolean) => void }>((set) => ({
  toast: null,
  mostrar: (texto, erro = false) => {
    const id = Date.now();
    set({ toast: { texto, erro, id } });
    setTimeout(() => set((estado) => (estado.toast?.id === id ? { toast: null } : estado)), 2600);
  },
}));
