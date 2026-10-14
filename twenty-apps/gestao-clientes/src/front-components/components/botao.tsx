import { type ReactNode } from 'react';
import { useTheme } from 'twenty-ui/theme';

type BotaoProps = {
  children: ReactNode;
  onClick: () => void;
  variante?: 'primario' | 'secundario' | 'perigo' | 'fantasma';
  desabilitado?: boolean;
  titulo?: string;
  ativo?: boolean;
};

export const Botao = ({
  children,
  onClick,
  variante = 'secundario',
  desabilitado = false,
  titulo,
  ativo = false,
}: BotaoProps) => {
  const theme = useTheme();
  const cores = {
    primario: {
      fundo: theme.color.blue,
      texto: theme.font.color.inverted,
      borda: theme.color.blue,
    },
    secundario: {
      fundo: ativo ? theme.background.tertiary : theme.background.primary,
      texto: theme.font.color.primary,
      borda: theme.border.color.medium,
    },
    perigo: {
      fundo: theme.background.primary,
      texto: theme.font.color.danger,
      borda: theme.border.color.danger,
    },
    fantasma: {
      fundo: ativo ? theme.background.tertiary : 'transparent',
      texto: theme.font.color.secondary,
      borda: 'transparent',
    },
  }[variante];

  return (
    <button
      type="button"
      title={titulo}
      disabled={desabilitado}
      onClick={onClick}
      style={{
        alignItems: 'center',
        background: cores.fundo,
        border: `1px solid ${cores.borda}`,
        borderRadius: theme.border.radius.sm,
        color: cores.texto,
        cursor: desabilitado ? 'not-allowed' : 'pointer',
        display: 'inline-flex',
        flexShrink: 0,
        fontFamily: 'inherit',
        fontSize: theme.font.size.sm,
        fontWeight: theme.font.weight.medium,
        gap: 4,
        height: 28,
        opacity: desabilitado ? 0.5 : 1,
        padding: '0 10px',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </button>
  );
};
