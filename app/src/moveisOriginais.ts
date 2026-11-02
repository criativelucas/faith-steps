export const MOVEIS_ORIGINAIS: Record<string,string> = {
 cama:'Cama',biblia:'Mesa de cabeceira', 'guarda-roupa':'Guarda-roupa',almofada:'Almofada de oração',banheira:'Banheira',espelho:'Pia e espelho',estante:'Estante',mesa:'Mesa de estudo',poltrona:'Poltrona',sofa:'Sofá',tv:'TV e rack',aquario:'Aquário',som:'Caixa de som',violao:'Violão',treino:'Tapete de treino',pia:'Pia da cozinha',fogao:'Fogão',geladeira:'Geladeira',jantar:'Mesa de jantar',
 // Expansões: tudo pode mudar de lugar também
 bateria:'Bateria','teclado-estudio':'Teclado',microfone:'Microfone',esteira:'Esteira',bicicleta:'Bicicleta ergométrica',halteres:'Halteres',colchonete:'Colchonete',
 horta:'Horta',banco:'Banco do jardim',fonte:'Fonte',bancada_oficina:'Bancada',bistro_piscina:'Mesinha da piscina',cafeteira_varanda:'Cafeteira',espreguicadeira:'Espreguiçadeira',mesa_varanda:'Mesa da varanda',ducha_piscina:'Ducha',bicicleta_passeio:'Bicicleta',
};
export const idOriginal=(item:string)=>item.startsWith('original:')&&MOVEIS_ORIGINAIS[item.slice(9)]?item.slice(9):null;
