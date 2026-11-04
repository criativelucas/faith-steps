"""Importa a seleção estática KayKit dos ZIPs fornecidos (Python + Pillow).

Uso: python3 arte3d/importar_kaykit.py /pasta/com/os/zips
Mantém geometria/normais originais e incorpora a paleta em cores de vértice
lineares. Dispensa downloads e decodificação de texturas em cada móvel.
"""
import io
import json
import struct
import sys
import zipfile
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SELECAO = {
    'Furniture': 'couch_pillows armchair_pillows bed_double_B cabinet_medium_decorated cabinet_small book_set book_single cactus_medium_A cactus_small_A cactus_small_B lamp_standing lamp_table pictureframe_standing_A shelf_B_small_decorated table_medium_long chair_A_wood rug_oval_A rug_rectangle_stripes_A'.split(),
    'City_Builder': 'building_A_withoutBase building_B_withoutBase building_C_withoutBase building_D_withoutBase building_E_withoutBase building_F_withoutBase building_G_withoutBase building_H_withoutBase bench bush box_A box_B dumpster firehydrant streetlight trafficlight_A watertower'.split(),
}

def linear(v):
    s = v / 255
    return round(s / 12.92 if s <= .04045 else ((s + .055) / 1.055) ** 2.4, 5)

def importar(pasta):
    modelos = {}
    for pacote, nomes in SELECAO.items():
        nome = f'KayKit_{pacote}_Bits_1.0_FREE'
        with zipfile.ZipFile(pasta / f'{nome}.zip') as z:
            (ROOT / 'arte3d/kaykit' / f'{pacote}_License.txt').write_bytes(z.read(f'{nome}/License.txt'))
            prefix = f'{nome}/Assets/gltf/'
            for item in nomes:
                gltf = json.loads(z.read(prefix + item + '.gltf'))
                assert len(gltf['nodes']) == 1 and not (set(gltf['nodes'][0]) - {'mesh', 'name'}), item
                buffers = [z.read(prefix + b['uri']) for b in gltf['buffers']]
                def ler(indice):
                    a = gltf['accessors'][indice]; v = gltf['bufferViews'][a['bufferView']]
                    formato = {5126:'f', 5123:'H', 5125:'I'}[a['componentType']]
                    n = {'SCALAR':1, 'VEC2':2, 'VEC3':3}[a['type']]
                    passo = v.get('byteStride', struct.calcsize('<' + formato) * n)
                    inicio = v.get('byteOffset', 0) + a.get('byteOffset', 0)
                    return [struct.unpack_from('<' + formato * n, buffers[v['buffer']], inicio + k * passo) for k in range(a['count'])]
                primitives = gltf['meshes'][0]['primitives']; assert len(primitives) == 1
                p = primitives[0]; a = p['attributes']
                tex = Image.open(io.BytesIO(z.read(prefix + gltf['images'][0]['uri']))).convert('RGB')
                cores = []
                for u,v in ler(a['TEXCOORD_0']):
                    rgb = tex.getpixel((min(tex.width-1,max(0,int(u*tex.width))),min(tex.height-1,max(0,int(v*tex.height)))))
                    cores.extend(linear(c) for c in rgb)
                modelos[item] = {
                    'position': [round(c,5) for xyz in ler(a['POSITION']) for c in xyz],
                    'normal': [round(c,5) for xyz in ler(a['NORMAL']) for c in xyz],
                    'color': cores,
                    'index': [i[0] for i in ler(p['indices'])],
                }
    destino = ROOT / 'src/assets/kaykit.json'
    destino.write_text(json.dumps(modelos,separators=(',',':')))
    print(f'{len(modelos)} modelos, {destino.stat().st_size:,} bytes')

if __name__ == '__main__':
    importar(Path(sys.argv[1]))
