import { DefaultLoadingManager } from 'three';

// Tela de abertura (public/index.html, só na web): o app informa o progresso real e avisa quando a casa está pronta.
type Abertura = { progresso: (p: number, texto?: string) => void; fim: () => void };
const abertura = (): Abertura | undefined => (typeof window !== 'undefined' ? (window as unknown as { abertura?: Abertura }).abertura : undefined);

export const progressoAbertura = (p: number, texto?: string) => abertura()?.progresso(p, texto);
export const fimAbertura = () => abertura()?.fim();

// Modelos 3D e texturas (corpo, móveis KayKit): da metade da barra até quase o fim
DefaultLoadingManager.onProgress = (_url, carregados, total) => {
  if (total) progressoAbertura(0.5 + 0.45 * (carregados / total), 'Montando sua casa…');
};
