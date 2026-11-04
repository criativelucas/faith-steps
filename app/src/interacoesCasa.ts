/** Dono explícito: as rotinas seguem posição, rotação e disponibilidade do móvel. */
export const DONOS_ROTEIROS: Record<string,string> = {
 tv_culto:'sofa',sofa_ler:'sofa',sala_louvor:'som',sala_peixe:'aquario',sala_violao:'violao',sala_treino:'treino',
 quarto_oracao:'almofada',quarto_biblia:'cama',quarto_beira_cama:'cama',quarto_cochilo:'cama',
 banheiro_dentes:'espelho',banheiro_lavar_maos:'espelho',
 estudo_mesa:'mesa',estudo_poltrona:'poltrona',estudo_procurar_livro:'estante',estudo_estante:'estante',
 cozinha_agua:'geladeira',cozinha_lanche:'geladeira',cozinha_mesa:'jantar',cozinha_pia:'pia',cozinha_fogao:'fogao',
 estudio_bateria:'bateria',estudio_teclado:'teclado-estudio',estudio_microfone:'microfone',
 academia_esteira:'esteira',academia_halteres:'halteres',jardim_horta:'horta',jardim_banco:'banco',
 piscina_sol:'espreguicadeira',piscina_ler:'espreguicadeira',piscina_nadar:'piscina_nadar',piscina_coco:'bistro_piscina',piscina_ducha:'ducha_piscina',
 garagem_bancada:'bancada_oficina',varanda_mesa:'mesa_varanda',varanda_cha:'cafeteira_varanda',
};
type ObjetoVisivel = {visible:boolean;parent?:ObjetoVisivel|null};
export function objetoDisponivel(objeto: ObjetoVisivel | null | undefined):boolean {
 if(!objeto) return false;
 for(let o:ObjetoVisivel|null|undefined=objeto;o;o=o.parent) if(!o.visible) return false;
 return true;
}
