import { Modal, View } from 'react-native';
import type { Look } from './personagem';
import type { Estado } from './jogo';
import EstudioVisual from './EstudioVisual';

export type CategoriaEstudio = 'cabelo' | 'rosto' | 'cima' | 'baixo' | 'calcado' | 'fantasia';
export type OcasiaoEstudio = 'dia' | 'culto' | 'treino' | 'dormir' | 'fantasia' | 'piscina';

export type Props = {
  aberto: boolean;
  look: Look;
  forma?: number;
  estado?: Estado;
  itens?: string[];
  talentos?: number;
  nivel?: number;
  modoCriacao?: boolean;
  nomeInicial?: string;
  categoriaInicial?: CategoriaEstudio;
  buscando?: boolean;
  onComprar?: (id: string) => void;
  onSalvar: (look: Look, nome?: string) => void;
  onFechar: () => void;
  onEntrar?: () => void;
};

// Mount a fresh editing session on each opening: cancelled changes never leak back.
export default function EstudioPersonagem(props: Props) {
  return <Modal visible={props.aberto} animationType="fade" onRequestClose={props.onFechar}>
    <View style={{ flex: 1, backgroundColor: '#389fba' }}>
      {props.aberto && <EstudioVisual {...props}
        onSalvar={async (look, nome) => { props.onSalvar(look, nome); }}
        onFechar={async () => { props.onFechar(); }}
        onComprar={props.onComprar ? async id => { props.onComprar?.(id); } : undefined}
        onEntrar={props.onEntrar ? async () => { props.onEntrar?.(); } : undefined}
        dom={{ style: { flex: 1 } }} />}
    </View>
  </Modal>;
}
