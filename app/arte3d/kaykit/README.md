# Cenários KayKit

Modelos de Kay Lousberg, dos pacotes City Builder Bits 1.0 FREE e Furniture
Bits 1.0 FREE fornecidos para este projeto. Licença CC0; textos originais ao lado.

`../importar_kaykit.py` importa a seleção dos GLTFs diretamente dos dois ZIPs.
Requer Python 3 e Pillow. Execute na pasta `app`:

```sh
python3 arte3d/importar_kaykit.py /pasta/com/os/zips
```

A saída `src/assets/kaykit.json` preserva posições, índices e normais dos
modelos originais. A paleta de cada textura é amostrada pelas coordenadas UV e
convertida de sRGB para cores lineares de vértice. Assim cada peça usa uma única
malha/material sem requisições extras de textura durante o jogo.

`src/kaykit.ts` define o enquadramento e as composições. Os móveis interativos
mantêm seus identificadores, orientação e área original; a decoração de apoio
acompanha o móvel quando ele é movido. Plantas de chão das expansões têm bloqueios
registrados em `Casa3D.tsx`. Os detalhes das expansões seguem a visibilidade do
cômodo comprado. Recursos de cada instância são liberados com a cena.
