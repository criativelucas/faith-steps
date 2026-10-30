export const MOVEIS_ORIGINAIS: Record<string,string> = {
 cama:'Cama',biblia:'Mesa de cabeceira', 'guarda-roupa':'Guarda-roupa',almofada:'Almofada de oração',banheira:'Banheira',espelho:'Pia e espelho',estante:'Estante',mesa:'Mesa de estudo',poltrona:'Poltrona',sofa:'Sofá',tv:'TV e rack',aquario:'Aquário',som:'Caixa de som',violao:'Violão',treino:'Tapete de treino',pia:'Pia da cozinha',fogao:'Fogão',geladeira:'Geladeira',jantar:'Mesa de jantar',
};
export const idOriginal=(item:string)=>item.startsWith('original:')&&MOVEIS_ORIGINAIS[item.slice(9)]?item.slice(9):null;
