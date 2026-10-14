let contador = 0;

export const gerarIdNo = (): string => {
  contador += 1;
  return `no-${Date.now().toString(36)}-${contador.toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 7)}`;
};
