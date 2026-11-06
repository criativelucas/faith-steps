// Imagens importadas como módulo (o Metro devolve a referência que o <Image> do React Native entende)
declare module '*.png' {
  const imagem: import('react-native').ImageSourcePropType;
  export default imagem;
}
