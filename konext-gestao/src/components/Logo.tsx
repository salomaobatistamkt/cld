import { useStore } from '@/lib/store';

// Logo da empresa: a imagem enviada nas Configurações ou o nome "konext" na caixa preta.
export const Logo = ({ compacto = false, grande = false }: { compacto?: boolean; grande?: boolean }) => {
  const { logo, empresa } = useStore((estado) => estado.dados.config);
  return (
    <span className={`logo${compacto ? ' compacto' : ''}${grande ? ' grande' : ''}`} aria-label={`${empresa} Gestão`}>
      {logo ? (
        <img src={logo} alt={empresa} className="logo-imagem" />
      ) : (
        <span className="logo-texto">{compacto ? 'k' : 'konext'}</span>
      )}
      {!compacto ? <small>gestão</small> : null}
    </span>
  );
};
