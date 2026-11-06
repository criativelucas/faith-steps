# Personagem chibi do Faith Steps, feito com o pacote KayKit Adventurers (arte3d/kaykit, CC0 de Kay Lousberg,
# licença em LICENCA_KayKit.txt).
#
#   blender -b -P arte3d/corpo_chibi.py -- m public/corpo_m.glb      (homem)
#   blender -b -P arte3d/corpo_chibi.py -- f public/corpo_f.glb      (mulher)
#   blender -b -P arte3d/corpo_chibi.py -- m previas pasta/           (fotos de conferência das roupas e poses)
#
# 1. Esqueleto e rosto de um personagem KayKit (Rogue para mulher, Ranger para homem); cabelos e barbas das outras cabeças.
# 2. Roupas = as peças do próprio pacote (tronco, braços com mãos, pernas com botas, capacete...), juntas em conjuntos.
#    Cada face vira uma categoria (pele, cabelo, cima, cima2, baixo, calcado ou fixo). O degradê da paleta KayKit
#    (claro em cima, escuro embaixo) vai para a cor de vértice; o app escolhe a cor de cada categoria.
# 3. Animações: parado, andar e correr são as do KayKit; as outras vêm do boneco antigo (arte3d/boneco.py).
# Os ossos ganham os nomes que o app usa (pelvis, spine_03, hand_r...).
import bpy, sys, os, math, bmesh
import numpy as np
from collections import Counter
from mathutils import Vector, Matrix, Euler
from mathutils.bvhtree import BVHTree

AQUI = os.path.dirname(os.path.abspath(__file__))
KK = os.path.join(AQUI, 'kaykit')
ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
SEXO, SAIDA = ARGS[0], ARGS[1]
DESTINO = ARGS[2] if len(ARGS) > 2 else None
FEM = SEXO == 'f'
BASE = 'Rogue' if FEM else 'Ranger'
ESCALA = 0.70                      # medidas KayKit -> metros do jogo (~1,45 m com cabelo)
# Braços nas animações antigas: (abertura para o lado, inclinação para trás) em graus. O tronco KayKit é largo,
# então os braços abrem um pouco; no louvor (braços para cima) o giro é ao contrário para fazer um V.
BRACOS = {'louvor': (-15, 0), 'orar': (4, 25)}
BRACOS_PADRAO = (20, 0)

# ---------- 1. Boneco antigo: só o esqueleto e as animações ----------
sys.argv = [sys.argv[0], '--', 'biblioteca']
exec(compile(open(os.path.join(AQUI, 'boneco.py')).read(), 'boneco.py', 'exec'), {'__name__': 'boneco'})  # espaço próprio: não mexe nas variáveis daqui
antigo = bpy.data.objects['boneco']
for ob in list(bpy.data.objects):
    if ob.type == 'MESH':
        bpy.data.objects.remove(ob)
acoes = list(bpy.data.actions)

RENOMEAR = {'hips': 'pelvis', 'spine': 'spine_01', 'chest': 'spine_03', 'head': 'Head'}
for s in 'lr':
    RENOMEAR.update({f'upperleg.{s}': f'thigh_{s}', f'lowerleg.{s}': f'calf_{s}', f'foot.{s}': f'foot_{s}', f'toes.{s}': f'ball_{s}',
                     f'upperarm.{s}': f'upperarm_{s}', f'lowerarm.{s}': f'lowerarm_{s}', f'wrist.{s}': f'wrist_{s}',
                     f'hand.{s}': f'hand_{s}', f'handslot.{s}': f'handslot_{s}'})

def importar(arquivo):
    antes = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=os.path.join(KK, arquivo))
    nomes = [o.name for o in bpy.data.objects if o not in antes]
    for n in nomes:
        o = bpy.data.objects[n]
        if o.type == 'MESH' and o.parent is None:
            bpy.data.objects.remove(o)  # esfera solta que vem em cada arquivo
    return [bpy.data.objects[n] for n in nomes if n in bpy.data.objects]

# ---------- Paleta: categorias e degradê ----------
# Quadrado da paleta KayKit (coluna, linha) -> categoria, por personagem. O que não está aqui fica com a cor original
# ("fixo": couro, metal, olhos...). None apaga a face (o livro do mago).
CATEG = {
    'Rogue': {(0, 0): 'pele', (1, 0): 'cabelo', (0, 1): 'cima', (1, 1): 'cima2', (7, 1): 'baixo', (3, 2): 'calcado'},
    'Rogue_Hooded': {(0, 0): 'pele', (1, 0): 'cabelo', (0, 1): 'cima', (1, 1): 'cima2', (7, 1): 'baixo', (3, 2): 'calcado'},
    'Ranger': {(0, 0): 'pele', (1, 0): 'cabelo', (5, 0): 'cima', (6, 0): 'cima', (0, 1): 'cima2', (7, 1): 'baixo', (3, 2): 'calcado'},
    'Mage': {(0, 0): 'pele', (7, 2): 'pele', (1, 0): 'cabelo', (0, 1): 'cima', (3, 0): 'cima2', (4, 0): 'cima2', (7, 1): 'baixo', (3, 2): 'calcado', (2, 2): None},
    'Knight': {(0, 0): 'pele', (1, 0): 'cabelo', (0, 1): 'cima'},
    'Barbarian': {(0, 0): 'pele', (1, 0): 'cabelo'},
}
MATS = ['pele', 'cabelo', 'sobrancelha', 'cima', 'cima2', 'baixo', 'calcado', 'fixo']
# quanto a cor escurece do topo ao pé de cada quadrado (medido na paleta original)
QUEDA = {'pele': 0.15, 'cabelo': 0.42, 'sobrancelha': 0.3, 'cima': 0.58, 'cima2': 0.5, 'baixo': 0.42, 'calcado': 0.42}
def lin(c):
    return ((c + 0.055) / 1.055) ** 2.4 if c > 0.04045 else c / 12.92

materiais = {}
for n in MATS:
    m = bpy.data.materials.new(n); m.use_nodes = True
    b = next(x for x in m.node_tree.nodes if x.type == 'BSDF_PRINCIPLED')
    b.inputs['Base Color'].default_value = (1, 1, 1, 1)
    b.inputs['Roughness'].default_value = 0.8
    materiais[n] = m

def quadrado(p, uv):
    u = sum(uv[l].uv[0] for l in p.loop_indices) / p.loop_total
    v = sum(uv[l].uv[1] for l in p.loop_indices) / p.loop_total
    return min(7, max(0, int(u * 8))), min(3, max(0, int((1 - v) * 4)))

def cor_da_face(p, cat, arr, uv, cor):
    r = quadrado(p, uv)[1]
    H, W = arr.shape[:2]
    for li in p.loop_indices:
        u, v = uv[li].uv
        if cat == 'fixo':
            px = arr[min(H - 1, max(0, int(v * H))), min(W - 1, max(0, int(u * W)))]
            cor.data[li].color = (lin(px[0]), lin(px[1]), lin(px[2]), 1)
        else:
            t = min(1, max(0, (1 - v) * 4 - r))
            s = lin(1 - QUEDA[cat] * t)
            cor.data[li].color = (s, s, s, 1)

def pintar(o, arr, mapa=None, forcar=None):
    """Material por categoria + degradê na cor de vértice 'Col' (a textura não vai para o jogo)."""
    me = o.data
    uv = me.uv_layers.active.data
    if 'Col' in me.color_attributes:
        me.color_attributes.remove(me.color_attributes['Col'])
    cor = me.color_attributes.new('Col', 'FLOAT_COLOR', 'CORNER')
    me.materials.clear()
    for n in MATS: me.materials.append(materiais[n])
    apagar = []
    for p in me.polygons:
        cat = forcar or (mapa or {}).get(quadrado(p, uv), 'fixo')
        if cat is None:
            apagar.append(p.index); continue
        p.material_index = MATS.index(cat)
        cor_da_face(p, cat, arr, uv, cor)
    if apagar:
        bm = bmesh.new(); bm.from_mesh(me); bm.faces.ensure_lookup_table()
        bmesh.ops.delete(bm, geom=[bm.faces[i] for i in apagar], context='FACES')
        bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
        bm.to_mesh(me); bm.free()
    me.color_attributes.active_color = me.color_attributes['Col']
    me.color_attributes.render_color_index = me.color_attributes.active_color_index
    for p in me.polygons: p.use_smooth = True

def recategorizar(o, arr, escolher, nova):
    """Troca a categoria das faces escolhidas (ex.: calça abaixo do joelho vira pele na bermuda)."""
    me = o.data; uv = me.uv_layers.active.data; cor = me.color_attributes['Col']
    for p in me.polygons:
        if escolher(p):
            p.material_index = MATS.index(nova)
            cor_da_face(p, nova, arr, uv, cor)

# ---------- 2. Personagens do pacote ----------
def adotar(o):
    """A malha passa a seguir o esqueleto 'corpo' (coordenadas de mundo, grupos com os nomes novos)."""
    mw = o.matrix_world.copy()
    o.parent = None
    o.data.transform(mw)
    o.matrix_world = Matrix.Identity(4)
    o.parent = arm
    o.matrix_parent_inverse = arm.matrix_world.inverted()
    o.modifiers.clear()
    m = o.modifiers.new('esqueleto', 'ARMATURE'); m.object = arm
    for g in o.vertex_groups:
        if g.name in RENOMEAR:
            g.name = RENOMEAR[g.name]
    return o

def textura(objs):
    for o in objs:
        for m in (o.data.materials if o.type == 'MESH' else []):
            for n in m.node_tree.nodes:
                if n.type == 'TEX_IMAGE' and n.image:
                    img = n.image
                    return np.array(img.pixels[:], dtype=np.float32).reshape(img.size[1], img.size[0], 4)

arm = None
PECAS, PALETA = {}, {}
for nome in [BASE] + [n for n in ('Rogue', 'Ranger', 'Mage', 'Knight', 'Barbarian', 'Rogue_Hooded') if n != BASE]:
    objs = importar(nome + '.glb')
    esq = next(o for o in objs if o.type == 'ARMATURE')
    if arm is None:
        arm = esq; arm.name = 'corpo'
        for b in list(arm.data.bones):
            if b.name in RENOMEAR: b.name = RENOMEAR[b.name]
    PALETA[nome] = textura(objs)
    PECAS[nome] = {}
    for o in objs:
        if o.type == 'MESH':
            adotar(o)
            PECAS[nome][o.name.split('_', 1)[1]] = o
    if esq is not arm:
        bpy.data.objects.remove(esq)

# ---------- Cabeça: rosto, olhos, sobrancelhas, cabelos e barbas ----------
def partes_soltas(bm):
    vistos, res = set(), []
    for f0 in bm.faces:
        if f0 in vistos: continue
        pilha, comp = [f0], set()
        vistos.add(f0)
        while pilha:
            x = pilha.pop(); comp.add(x)
            for e in x.edges:
                for y in e.link_faces:
                    if y not in vistos: vistos.add(y); pilha.append(y)
        res.append(comp)
    return res

def classe(q, c, n, tam):
    if q == (0, 0): return 'pele'
    if q == (2, 0): return 'olhos'
    if q == (1, 1): return 'capuz'  # só a cabeça encapuzada tem
    if q == (1, 0):
        # sobrancelha: peça pequena na testa (mechas da franja passam pela mesma altura, mas são compridas)
        if n <= 120 and c.y < -0.25 and 1.6 < c.z < 1.9 and abs(c.x) > 0.06 and tam.z < 0.16 and tam.x < 0.32: return 'sobrancelha'
        if c.z < 1.56 and c.y < -0.25: return 'barba'
        return 'cabelo'
    return None  # brincos e enfeites

def dividir(o, sufixo=''):
    bm = bmesh.new(); bm.from_mesh(o.data); uvl = bm.loops.layers.uv.active
    grupos = {}
    for comp in partes_soltas(bm):
        cont = Counter()
        for f in comp:
            u = sum(l[uvl].uv[0] for l in f.loops) / len(f.loops); v = sum(l[uvl].uv[1] for l in f.loops) / len(f.loops)
            cont[(int(u * 8), int((1 - v) * 4))] += 1
        vs = {v for f in comp for v in f.verts}
        tam = Vector([max(v.co[i] for v in vs) - min(v.co[i] for v in vs) for i in range(3)])
        k = classe(cont.most_common(1)[0][0], sum((v.co for v in vs), Vector()) / len(vs), len(comp), tam)
        if k: grupos.setdefault(k, set()).update(f.index for f in comp)
    bm.free()
    saida = {}
    for k, faces in grupos.items():
        n = o.copy(); n.data = o.data.copy(); n.name = k + sufixo
        bpy.context.collection.objects.link(n)
        bm = bmesh.new(); bm.from_mesh(n.data); bm.faces.ensure_lookup_table()
        bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.index not in faces], context='FACES')
        bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
        bm.to_mesh(n.data); bm.free()
        saida[k] = n
    bpy.data.objects.remove(o)
    return saida

def caixa(o):
    ps = [v.co for v in o.data.vertices]
    return Vector([min(p[i] for p in ps) for i in range(3)]), Vector([max(p[i] for p in ps) for i in range(3)])

PINTA_CABECA = {'pele': 'pele', 'olhos': 'fixo', 'sobrancelha': 'sobrancelha', 'cabelo': 'cabelo', 'barba': 'cabelo'}
cab = dividir(PECAS[BASE].pop('Head'))
for k, o in cab.items():
    pintar(o, PALETA[BASE], forcar=PINTA_CABECA[k])
cranio_base = caixa(cab['pele'])
CABELO_DE = {'Rogue': 'longo', 'Ranger': 'curto', 'Mage': 'liso', 'Knight': 'tigela'}
cabelos = {CABELO_DE[BASE]: cab.pop('cabelo')}
if FEM and 'barba' in cab:
    bpy.data.objects.remove(cab.pop('barba'))

def encaixar(o, cranio_origem):
    """Ajusta cabelo/barba de outra cabeça ao crânio da cabeça base."""
    (a0, a1), (b0, b1) = cranio_origem, cranio_base
    ca, cb = (a0 + a1) / 2, (b0 + b1) / 2
    s = Vector([(b1[i] - b0[i]) / (a1[i] - a0[i]) for i in range(3)])
    for v in o.data.vertices:
        d = v.co - ca
        v.co = cb + Vector((d.x * s.x, d.y * s.y, d.z * s.z))

for nome in ('Rogue', 'Ranger', 'Mage', 'Knight', 'Barbarian', 'Rogue_Hooded'):
    if nome == BASE or 'Head' not in PECAS[nome]: continue
    partes = dividir(PECAS[nome].pop('Head'), '_' + nome)
    cranio = caixa(partes['pele'])
    for k, o in partes.items():
        if nome == 'Barbarian' and k == 'barba' and not FEM:
            encaixar(o, cranio); pintar(o, PALETA[nome], forcar='cabelo'); o.name = 'barba_cheia'
        elif k == 'capuz':
            encaixar(o, cranio); pintar(o, PALETA[nome], forcar='cima2'); o.name = 'chapeu_capuz'
        elif k == 'cabelo' and nome in CABELO_DE and CABELO_DE[nome] not in cabelos:
            encaixar(o, cranio); pintar(o, PALETA[nome], forcar='cabelo'); cabelos[CABELO_DE[nome]] = o
        else:
            bpy.data.objects.remove(o)
for k, o in cabelos.items():
    o.name = 'cabelo_' + k

# Olhos fechados (orar, dormir): os mesmos olhos achatados numa linha
fechados = cab['olhos'].copy(); fechados.data = cab['olhos'].data.copy(); fechados.name = 'olhos_fechados'
bpy.context.collection.objects.link(fechados)
bm = bmesh.new(); bm.from_mesh(fechados.data)
for comp in partes_soltas(bm):
    vs = {v for f in comp for v in f.verts}
    c = sum((v.co for v in vs), Vector()) / len(vs)
    if len(comp) < 10:
        bmesh.ops.delete(bm, geom=list(comp), context='FACES'); continue  # brilho do olho
    for v in vs:
        v.co.z = c.z - 0.03 + (v.co.z - c.z) * 0.12
        v.co.y -= 0.01
bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
bm.to_mesh(fechados.data); bm.free()
# Brilho dos olhos: um pontinho branco redondo no alto de cada olho (rosto mais vivo); o brilho fino original sai
def brilhar(o):
    bm = bmesh.new(); bm.from_mesh(o.data)
    col = bm.loops.layers.float_color.get('Col'); dv = bm.verts.layers.deform.verify()
    gi = o.vertex_groups['Head'].index
    for comp in partes_soltas(bm):
        vs = {v for f in comp for v in f.verts}
        if len(comp) < 10:
            bmesh.ops.delete(bm, geom=list(comp), context='FACES'); continue
        xs, zs = [v.co.x for v in vs], [v.co.z for v in vs]
        w, h = max(xs) - min(xs), max(zs) - min(zs)
        c = Vector(((max(xs) + min(xs)) / 2, min(v.co.y for v in vs), (max(zs) + min(zs)) / 2))
        lado = 1 if c.x > 0 else -1
        for dx, dz, r in ((0.2, 0.22, 0.2), (-0.18, -0.24, 0.09)):
            g = bmesh.ops.create_uvsphere(bm, u_segments=10, v_segments=6, radius=1)
            centro = c + Vector((lado * dx * w, -0.012, dz * h))
            for v in g['verts']:
                v.co = centro + Vector((v.co.x * r * w, v.co.y * 0.01, v.co.z * r * w))
                v[dv][gi] = 1.0
            for f in {f for v in g['verts'] for f in v.link_faces}:
                f.material_index = next(iter(comp)).material_index; f.smooth = True
                if col:
                    for l in f.loops: l[col] = (1, 1, 1, 1)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
    bm.to_mesh(o.data); bm.free()
brilhar(cab['olhos'])
print('BRILHO', 'Col' in cab['olhos'].data.color_attributes)

# ---------- Roupas: as peças KayKit, pintadas por categoria e juntas em conjuntos ----------
for nome, pecas in PECAS.items():
    for o in pecas.values():
        pintar(o, PALETA[nome], CATEG[nome])

def copia(o):
    n = o.copy(); n.data = o.data.copy(); bpy.context.collection.objects.link(n)
    return n
def juntar(nome, objs):
    objs = [copia(o) for o in objs]
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    if len(objs) > 1: bpy.ops.object.join()
    o = objs[0]; o.name = nome; o.data.name = nome
    return o
def centro_z(o, p):
    return sum(o.data.vertices[i].co.z for i in p.vertices) / len(p.vertices)
P = PECAS
for nome, chave in (('roupa_tunica', 'Rogue'), ('roupa_camisa', 'Ranger'), ('roupa_casaco', 'Mage'),
                    ('roupa_capuz', 'Rogue_Hooded'), ('roupa_armadura', 'Knight'), ('roupa_barbaro', 'Barbarian')):
    juntar(nome, [P[chave]['Body'], P[chave]['ArmLeft'], P[chave]['ArmRight']])
calca = juntar('pernas_calca', [P['Rogue']['LegLeft'], P['Rogue']['LegRight']])
curta = juntar('pernas_curta', [P['Rogue']['LegLeft'], P['Rogue']['LegRight']])
bota = juntar('sapato_bota', [P['Rogue']['LegLeft'], P['Rogue']['LegRight']])
def tirar_faces(o, sai):
    bm = bmesh.new(); bm.from_mesh(o.data)
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if sai(f)], context='FACES')
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
    bm.to_mesh(o.data); bm.free()
# A bota vira um sapato à parte (o jogo tem vários calçados); as pernas descem até o tornozelo dentro do sapato
CALC = MATS.index('calcado')
tirar_faces(calca, lambda f: f.material_index == CALC)
tirar_faces(curta, lambda f: f.material_index == CALC or f.calc_center_median().z < 0.43)  # perna de fora: canela lisa
tirar_faces(bota, lambda f: f.material_index != CALC)

# ---------- Calçados e canelas, modelados no estilo KayKit (medidas do pacote; o pé esquerdo fica em x = +0,169) ----------
GRUPOS = ['foot_l', 'foot_r', 'calf_l', 'calf_r', 'thigh_l', 'thigh_r']
class Peca:
    def __init__(self, nome):
        self.nome = nome
        self.bm = bmesh.new()
        self.col = self.bm.loops.layers.float_color.new('Col')
        self.dv = self.bm.verts.layers.deform.verify()
    def pintar(self, faces, cat, cor=None):
        zs = [v.co.z for f in faces for v in f.verts]
        z0, z1 = min(zs), max(zs)
        base = tuple(lin(int(cor[i:i + 2], 16) / 255) for i in (1, 3, 5)) if cor else None
        for f in faces:
            f.material_index = MATS.index(cat); f.smooth = True
            for l in f.loops:
                t = (z1 - l.vert.co.z) / max(z1 - z0, 1e-4)
                if cat == 'fixo':
                    k = lin(1 - 0.22 * t); l[self.col] = (base[0] * k, base[1] * k, base[2] * k, 1)
                else:
                    k = lin(1 - QUEDA[cat] * t); l[self.col] = (k, k, k, 1)
    def pesar(self, verts, pesos):
        for v in verts:
            for g, w in pesos(v.co).items():
                if w > 0.001: v[self.dv][GRUPOS.index(g)] = w
    def loft(self, aneis, cat, pesos, cor=None):
        rs = [[self.bm.verts.new(p) for p in a] for a in aneis]
        n, faces = len(rs[0]), []
        for a, b in zip(rs, rs[1:]):
            for i in range(n): faces.append(self.bm.faces.new((a[i], a[(i + 1) % n], b[(i + 1) % n], b[i])))
        for r in (rs[0], rs[-1]):
            c = self.bm.verts.new(sum((v.co for v in r), Vector()) / n); r.append(c)
            for i in range(n): faces.append(self.bm.faces.new((r[i], r[(i + 1) % n], c)))
        self.pintar(faces, cat, cor); self.pesar({v for f in faces for v in f.verts}, pesos)
    def bola(self, centro, raios, cat, pesos, cor=None, seg=10):
        g = bmesh.ops.create_uvsphere(self.bm, u_segments=seg, v_segments=max(4, seg * 2 // 3), radius=1)
        for v in g['verts']: v.co = Vector((v.co.x * raios[0], v.co.y * raios[1], v.co.z * raios[2])) + Vector(centro)
        faces = list({f for v in g['verts'] for f in v.link_faces})
        self.pintar(faces, cat, cor); self.pesar(g['verts'], pesos)
    def caixa(self, centro, tam, cat, pesos, cor=None):
        g = bmesh.ops.create_cube(self.bm, size=1)
        for v in g['verts']: v.co = Vector((v.co.x * tam[0], v.co.y * tam[1], v.co.z * tam[2])) + Vector(centro)
        faces = list({f for v in g['verts'] for f in v.link_faces})
        self.pintar(faces, cat, cor); self.pesar({v for f in faces for v in f.verts}, pesos)
    def objeto(self):
        bmesh.ops.recalc_face_normals(self.bm, faces=self.bm.faces)
        me = bpy.data.meshes.new(self.nome); self.bm.to_mesh(me); self.bm.free()
        for n in MATS: me.materials.append(materiais[n])
        o = bpy.data.objects.new(self.nome, me); bpy.context.collection.objects.link(o)
        for g in GRUPOS: o.vertex_groups.new(name=g)
        o.parent = arm; o.matrix_parent_inverse = arm.matrix_world.inverted()
        m = o.modifiers.new('esqueleto', 'ARMATURE'); m.object = arm
        me.color_attributes.active_color = me.color_attributes['Col']
        me.color_attributes.render_color_index = me.color_attributes.active_color_index  # o exportador usa esta
        return o

def anel(c, u, v, ru, rv, p=3.0, n=14):
    pts = []
    for i in range(n):
        t = 2 * math.pi * i / n
        a, b = math.cos(t), math.sin(t)
        pts.append(c + u * (math.copysign(abs(a) ** (2 / p), a) * ru) + v * (math.copysign(abs(b) ** (2 / p), b) * rv))
    return pts
X, Y, Z = Vector((1, 0, 0)), Vector((0, 1, 0)), Vector((0, 0, 1))
PE_X = 0.169
def pe(lado): return lambda co: {('foot_l' if lado > 0 else 'foot_r'): 1.0}
def canela(lado):
    s = 'l' if lado > 0 else 'r'
    def pesos(co):
        t = min(1, max(0, (co.z - 0.27) / 0.06))
        return {f'calf_{s}': 1 - t, f'thigh_{s}': t}
    return pesos
def corpo_sapato(pc, lado, perfil, base, cat, p=3.0, sobe=lambda y: 0.0, cor=None, alarga=0.0, n=14):
    # perfil: (y, meia largura, topo) do calcanhar (+y) para a ponta (-y)
    aneis = []
    for y, w, topo in perfil:
        b, t = base + sobe(y), topo + sobe(y)
        aneis.append(anel(Vector((PE_X * lado, y, (b + t) / 2)), X, Z, w + alarga, (t - b) / 2, p, n))
    pc.loft(aneis, cat, pe(lado), cor)
def tubo(pc, lado, alturas, cat, raio_y=1.0):
    # canela: (altura, raio) de cima para baixo
    pc.loft([anel(Vector((PE_X * lado, 0.0, z)), X, Y, r, r * raio_y, 2.2, 12) for z, r in alturas], cat, canela(lado))

for o, cat, alturas in ((calca, 'baixo', [(0.34, 0.102), (0.2, 0.1), (0.07, 0.096)]),
                        (curta, 'pele', [(0.47, 0.098), (0.36, 0.09), (0.26, 0.08), (0.16, 0.072), (0.06, 0.07)])):
    pc = Peca('canelas')
    for lado in (1, -1): tubo(pc, lado, alturas, cat)
    canelas = pc.objeto()
    bpy.ops.object.select_all(action='DESELECT')
    o.select_set(True); canelas.select_set(True)
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.join()

# Perfis (y, meia largura, topo) de cada calçado
PERFIL_PE = [(0.11, 0.062, 0.15), (0.09, 0.082, 0.17), (0.03, 0.092, 0.165), (-0.06, 0.097, 0.125), (-0.15, 0.092, 0.105), (-0.22, 0.078, 0.09), (-0.258, 0.048, 0.072)]
def sola(pc, lado, perfil, altura, cor, folga=0.012, sobe=lambda y: 0.0):
    corpo_sapato(pc, lado, [(y + (0.01 if i == 0 else -0.01 if i == len(perfil) - 1 else 0), w + folga, altura) for i, (y, w, _) in enumerate(perfil)],
                 0.0, 'fixo', 4.0, sobe, cor)
def pe_de_pele(pc, lado, base=0.02, sobe=lambda y: 0.0):
    corpo_sapato(pc, lado, PERFIL_PE, base, 'pele', 2.6, sobe)

def tenis(pc, lado):
    perfil = [(0.115, 0.07, 0.17), (0.095, 0.095, 0.21), (0.03, 0.108, 0.212), (-0.06, 0.112, 0.15), (-0.15, 0.108, 0.122), (-0.22, 0.095, 0.105), (-0.262, 0.06, 0.085)]
    corpo_sapato(pc, lado, perfil, 0.045, 'calcado')
    sola(pc, lado, perfil, 0.058, '#F4F2EE', 0.014)
    for y, z in ((0.005, 0.2), (-0.04, 0.175), (-0.085, 0.152)):  # cadarço
        pc.caixa((PE_X * lado, y, z), (0.12, 0.018, 0.016), 'fixo', pe(lado), '#FFFFFF')
    pc.caixa((PE_X * lado, 0.118, 0.13), (0.06, 0.012, 0.07), 'fixo', pe(lado), '#F4F2EE')  # aba do calcanhar
def social(pc, lado):
    perfil = [(0.115, 0.068, 0.14), (0.095, 0.09, 0.155), (0.03, 0.1, 0.15), (-0.06, 0.103, 0.112), (-0.15, 0.094, 0.093), (-0.22, 0.072, 0.078), (-0.272, 0.032, 0.062)]
    corpo_sapato(pc, lado, perfil, 0.035, 'calcado', 3.2)
    sola(pc, lado, perfil, 0.04, '#2B201C', 0.008)
    pc.caixa((PE_X * lado, 0.085, 0.022), (0.13, 0.07, 0.05), 'fixo', pe(lado), '#2B201C')  # salto baixo
    pc.caixa((PE_X * lado, -0.005, 0.158), (0.1, 0.03, 0.012), 'fixo', pe(lado), '#2B201C')  # cadarço
def sapatilha(pc, lado, sobe=lambda y: 0.0):
    pe_de_pele(pc, lado, 0.022, sobe)
    perfil = [(0.118, 0.072, 0.07), (0.097, 0.092, 0.08), (0.03, 0.102, 0.08), (-0.06, 0.107, 0.09), (-0.15, 0.102, 0.112), (-0.22, 0.088, 0.1), (-0.268, 0.055, 0.082)]
    corpo_sapato(pc, lado, perfil, 0.0, 'calcado', 3.0, sobe)
    for dx in (-0.025, 0.025):  # lacinho
        pc.bola((PE_X * lado + dx, -0.175, 0.118 + sobe(-0.175)), (0.025, 0.012, 0.016), 'cima2', pe(lado), seg=8)
def salto(pc, lado):
    sobe = lambda y: max(0.0, min(1.0, (y + 0.08) / 0.19)) * 0.055  # calcanhar levantado
    sapatilha(pc, lado, sobe)
    pc.caixa((PE_X * lado, 0.085, 0.03), (0.05, 0.05, 0.065), 'fixo', pe(lado), '#3A2A30')
def sandalia(pc, lado):
    pe_de_pele(pc, lado, 0.03)
    perfil = PERFIL_PE
    sola(pc, lado, perfil, 0.032, '#C9A27A', 0.018)
    pc.caixa((PE_X * lado, -0.14, 0.098), (0.2, 0.035, 0.03), 'calcado', pe(lado))
    pc.caixa((PE_X * lado, 0.0, 0.158), (0.19, 0.035, 0.03), 'calcado', pe(lado))
def pantufa(pc, lado):
    perfil = [(0.13, 0.085, 0.165), (0.1, 0.115, 0.195), (0.03, 0.126, 0.2), (-0.06, 0.13, 0.18), (-0.15, 0.125, 0.16), (-0.22, 0.105, 0.14), (-0.275, 0.065, 0.11)]
    corpo_sapato(pc, lado, perfil, 0.0, 'calcado', 2.2)
    for dy, dx in ((-0.02, 0.04), (0.04, -0.04), (-0.08, -0.03), (0.06, 0.05)):  # lã
        pc.bola((PE_X * lado + dx, dy, 0.19), (0.045, 0.045, 0.035), 'calcado', pe(lado), seg=8)
    pc.bola((PE_X * lado, -0.245, 0.105), (0.068, 0.05, 0.058), 'fixo', pe(lado), '#4A3F45')  # rosto da ovelha
    for dx in (-0.075, 0.075):
        pc.bola((PE_X * lado + dx, -0.2, 0.16), (0.035, 0.016, 0.02), 'fixo', pe(lado), '#4A3F45', seg=8)
    for dx in (-0.024, 0.024):
        pc.bola((PE_X * lado + dx, -0.29, 0.118), (0.013, 0.008, 0.013), 'fixo', pe(lado), '#FFFFFF', seg=8)
        pc.bola((PE_X * lado + dx, -0.297, 0.116), (0.007, 0.005, 0.007), 'fixo', pe(lado), '#141014', seg=6)
# ---------- Crânio e cabelos presos ----------
# A cabeça da Rogue não tem o alto nem a nuca (o cabelo comprido cobria): uma calota cor de pele fecha a cabeça, e
# calotas um pouco maiores, cor de cabelo, fazem o raspado, o coque e o rabo de cavalo.
GRUPOS.append('Head')
na_cabeca = lambda co: {'Head': 1.0}
mn, mx = cranio_base
CC = Vector((0, (mn.y + mx.y) / 2 + 0.01, (mn.z + mx.z) / 2 + 0.02))
RC = Vector((0.46, (mx.y - mn.y) / 2, (mx.z - mn.z) / 2 + 0.02))
def calota(pc, folga, cat, frente=1.8, tras=1.26):
    g = bmesh.ops.create_uvsphere(pc.bm, u_segments=40 if cat == 'cabelo' else 20, v_segments=24 if cat == 'cabelo' else 12, radius=1)
    for v in g['verts']:
        v.co = CC + Vector((v.co.x * (RC.x + folga), v.co.y * (RC.y + folga), v.co.z * (RC.z + folga)))
    corte = lambda y: frente + (tras - frente) * (y - mn.y) / (mx.y - mn.y)  # linha da testa até a nuca
    if cat == 'cabelo':
        # Recortar faces mantém a linha do cabelo contínua, sem degraus entre anéis.
        bmesh.ops.bisect_plane(pc.bm, geom=list(pc.bm.verts) + list(pc.bm.edges) + list(pc.bm.faces),
                              plane_co=(0, mn.y, frente), plane_no=(0, -(tras - frente) / (mx.y - mn.y), 1),
                              clear_inner=True, clear_outer=False)
        vivos = list(pc.bm.verts)
    else:
        bmesh.ops.delete(pc.bm, geom=[v for v in g['verts'] if v.co.z < corte(v.co.y)], context='VERTS')
        vivos = [v for v in g['verts'] if v.is_valid]
    if cat == 'cabelo':
        # A testa KayKit não é elipsoidal. Ajustar à pele evita faixas de crânio
        # atravessando coque, rabo e raspado, inclusive entre os vértices.
        pele = cab['pele'].data
        superficie = BVHTree.FromPolygons([v.co for v in pele.vertices], [p.vertices[:] for p in pele.polygons])
        for v in vivos:
            direcao = (v.co - CC).normalized()
            # Partir de fora encontra a camada externa, não a calota interna
            # usada para fechar o crânio original.
            ponto, _, _, _ = superficie.ray_cast(CC + direcao * 3, -direcao)
            if ponto is not None:
                raio = max((v.co - CC).length, (ponto - CC).length + max(folga, 0.075 if FEM else 0.12))
                # Não projetar as laterais sobre as orelhas.
                mistura = min(1, max(0, (v.co.z - 1.70) / 0.15))
                v.co = v.co.lerp(CC + direcao * raio, mistura)
    pc.pintar(list({f for v in vivos for f in v.link_faces}), cat); pc.pesar(vivos, na_cabeca)
NUCA = CC.y + RC.y
pc = Peca('cranio'); calota(pc, -0.015, 'pele', frente=1.75, tras=1.22); cranio = pc.objeto()
# Some com as faces da calota que ficam por dentro da cabeça original: o cruzamento das duas superfícies
# desenhava um risco na testa.
_pele = cab['pele'].data
_bvh_pele = BVHTree.FromPolygons([v.co for v in _pele.vertices], [p.vertices[:] for p in _pele.polygons])
_bm = bmesh.new(); _bm.from_mesh(cranio.data)
_dentro = []
for f in _bm.faces:
    c = f.calc_center_median(); d = (c - CC).normalized()
    hit, _, _, dist = _bvh_pele.ray_cast(c + d * 0.001, d)
    if hit is not None and dist < 0.2: _dentro.append(f)
bmesh.ops.delete(_bm, geom=_dentro, context='FACES')
bmesh.ops.delete(_bm, geom=[v for v in _bm.verts if not v.link_faces], context='VERTS')
_bm.to_mesh(cranio.data); _bm.free()
print('CALOTA faces escondidas removidas', len(_dentro))
bpy.ops.object.select_all(action='DESELECT')
cab['pele'].select_set(True); cranio.select_set(True)
bpy.context.view_layer.objects.active = cab['pele']
bpy.ops.object.join()
pc = Peca('cabelo_raspado'); calota(pc, 0.012, 'cabelo'); pc.objeto()
pc = Peca('cabelo_coque'); calota(pc, 0.03, 'cabelo')
pc.bola((0, NUCA - 0.04, CC.z + RC.z * 0.62), (0.16, 0.14, 0.15), 'cabelo', na_cabeca, seg=12); pc.objeto()
pc = Peca('cabelo_rabo'); calota(pc, 0.03, 'cabelo')
pc.bola((0, NUCA + 0.01, CC.z + 0.06), (0.1, 0.09, 0.1), 'cabelo', na_cabeca, seg=10)
pc.bola((0, NUCA + 0.07, CC.z - 0.2), (0.1, 0.1, 0.25), 'cabelo', na_cabeca, seg=12); pc.objeto()

for nome, fazer in (('sapato_tenis', tenis), ('sapato_social', social), ('sapato_sapatilha', sapatilha), ('sapato_salto', salto),
                    ('sapato_sandalia', sandalia), ('sapato_pantufa', pantufa)):
    pc = Peca(nome)
    for lado in (1, -1): fazer(pc, lado)
    pc.objeto()
juntar('pernas_armadura', [P['Knight']['LegLeft'], P['Knight']['LegRight']])
juntar('pernas_barbaro', [P['Barbarian']['LegLeft'], P['Barbarian']['LegRight']])
juntar('chapeu_capacete', [P['Knight']['Helmet'], P['Knight']['HelmetVisor']])
juntar('chapeu_urso', [P['Barbarian']['BearHat']])
juntar('capa', [P['Knight']['Cape']])

# Saia: a parte de baixo do casaco do mago (do cinto para baixo); saia longa e casaco longo (vestido longo) esticados
casaco = P['Mage']['Body']
uvm = casaco.data.uv_layers.active.data
cinto = [centro_z(casaco, p) for p in casaco.data.polygons if quadrado(p, uvm) == (5, 0)]
CINTO_ALTO, CINTO_BAIXO = max(cinto) + 0.03, min(cinto) - 0.01
def esticar(o, ate=0.10, abre=0.16):
    zb = min(v.co.z for v in o.data.vertices)
    f = (CINTO_BAIXO - ate) / (CINTO_BAIXO - zb)
    for v in o.data.vertices:
        if v.co.z < CINTO_BAIXO:
            z = CINTO_BAIXO - (CINTO_BAIXO - v.co.z) * f
            k = 1 + abre * (CINTO_BAIXO - z) / (CINTO_BAIXO - ate)
            v.co = Vector((v.co.x * k, v.co.y * k, z))
saia = juntar('roupa_saia', [casaco])
bm = bmesh.new(); bm.from_mesh(saia.data)
# só o pano abaixo do cinto (cinto, fivelas e botões ficam de fora: a parte de cima da roupa cobre a cintura)
bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.calc_center_median().z > CINTO_BAIXO or f.material_index == MATS.index('fixo')], context='FACES')
bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
bm.to_mesh(saia.data); bm.free()
recategorizar(saia, PALETA['Mage'], lambda p: p.material_index in (MATS.index('cima'), MATS.index('cima2')), 'baixo')
esticar(juntar('roupa_saia_longa', [saia]))
esticar(saia, ate=0.24, abre=0.06)  # saia até o cano da bota
esticar(juntar('roupa_casaco_longo', [P['Mage']['Body'], P['Mage']['ArmLeft'], P['Mage']['ArmRight']]))

# Roupas do dia a dia (moletom, camiseta, vestido...), modeladas sobre o tronco KayKit
exec(compile(open(os.path.join(AQUI, 'roupas_modernas.py')).read(), 'roupas_modernas.py', 'exec'))

FINAIS = ('pele', 'olhos', 'sobrancelha', 'cabelo_', 'barba', 'roupa_', 'pernas_', 'chapeu_', 'capa', 'sapato_', 'topo_', 'baixo_', 'fant_')
for pecas in PECAS.values():
    for o in pecas.values():
        if o.name in bpy.data.objects: bpy.data.objects.remove(o)
for o in list(bpy.data.objects):
    if o.type == 'MESH' and not o.name.startswith(FINAIS):
        bpy.data.objects.remove(o)
for o in bpy.data.objects:
    if o.type == 'MESH':
        o.data.name = o.name

# Medidas do jogo
filhos = [o for o in bpy.data.objects if o.parent == arm]
arm.scale = (ESCALA,) * 3
bpy.ops.object.select_all(action='DESELECT')
arm.select_set(True)
for o in filhos: o.select_set(True)
bpy.context.view_layer.objects.active = arm
bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
print('PECAS', sorted(o.name for o in filhos))

# ---------- 3. Animações ----------
cena = bpy.context.scene
def curvas(acao):
    fcs = []
    for L in acao.layers:
        for st in L.strips:
            for cb in st.channelbags: fcs += list(cb.fcurves)
    return fcs

# Do KayKit: parado, andar e correr (mesmo esqueleto; só troca os nomes dos ossos e ajusta a escala)
DO_KAYKIT = {'Idle_A': 'parado', 'Walking_A': 'andar', 'Running_A': 'correr'}
antes_acoes = set(bpy.data.actions)
for arq in ('Rig_Medium_General.glb', 'Rig_Medium_MovementBasic.glb'):
    for o in importar(arq):
        bpy.data.objects.remove(o)
kaykit = []
for a in [a for a in bpy.data.actions if a not in antes_acoes]:
    base = a.name.split('.')[0]
    if base not in DO_KAYKIT:
        bpy.data.actions.remove(a); continue
    for fc in curvas(a):
        for velho, novo in RENOMEAR.items():
            fc.data_path = fc.data_path.replace(f'pose.bones["{velho}"]', f'pose.bones["{novo}"]')
        if fc.data_path.endswith('.location'):
            for k in fc.keyframe_points:
                k.co[1] *= ESCALA; k.handle_left[1] *= ESCALA; k.handle_right[1] *= ESCALA
    a.use_fake_user = True
    kaykit.append((a, DO_KAYKIT[base]))
for a in [a for a in acoes if a.name.split('.')[0] in DO_KAYKIT.values()]:
    acoes.remove(a); bpy.data.actions.remove(a)  # as do boneco antigo com o mesmo nome saem
for a, n in kaykit:
    a.name = n
    for sl in a.slots:
        sl.name_display = 'corpo'  # mesmo "slot" das animações gravadas no esqueleto 'corpo'

# As outras do boneco antigo: cada osso novo mira a junta equivalente do antigo
SENTADAS = {'sentado', 'pedalar'}  # deitado: o jogo gira o boneco inteiro na cama
def junta_antiga(n, ponta=False):
    pb = antigo.pose.bones[n]
    return antigo.matrix_world @ (pb.tail if ponta else pb.head)
def pose_de(acao):
    antigo.animation_data.action = acao
    cena.frame_set(int(acao.frame_range[0]))
    return junta_antiga('quadril'), junta_antiga('cabeca', True)
antes = {a.name.split('.')[0]: pose_de(a) for a in acoes if a.name.split('.')[0] in SENTADAS}

# O boneco antigo ganha as medidas do chibi (mesmas direções dos ossos, outras posições e comprimentos) e os braços
# um pouco abertos. As animações dele são só rotações, então continuam valendo.
def junta(n): return arm.matrix_world @ arm.data.bones[n].head_local
inv = antigo.matrix_world.inverted()
antigo.animation_data.action = None
bpy.context.view_layer.objects.active = antigo
bpy.ops.object.mode_set(mode='EDIT')
eb = antigo.data.edit_bones
def por(nome, cabeca_mundo, comprimento):
    b = eb[nome]
    d = (b.tail - b.head).normalized()
    b.head = inv @ cabeca_mundo
    b.tail = b.head + d * comprimento
    return antigo.matrix_world @ b.tail
por('quadril', junta('pelvis'), (junta('spine_01') - junta('pelvis')).length)
por('tronco', junta('spine_01'), (junta('Head') - junta('spine_01')).length)
por('cabeca', junta('Head'), 0.25)
for L, s, lado in (('L', 'l', 1), ('R', 'r', -1)):
    cot = por(f'braco_{L}', junta(f'upperarm_{s}'), (junta(f'lowerarm_{s}') - junta(f'upperarm_{s}')).length)
    por(f'antebraco_{L}', cot, (junta(f'hand_{s}') - junta(f'lowerarm_{s}')).length)
    joe = por(f'coxa_{L}', junta(f'thigh_{s}'), (junta(f'calf_{s}') - junta(f'thigh_{s}')).length)
    por(f'canela_{L}', joe, (junta(f'foot_{s}') - junta(f'calf_{s}')).length)
BRACOS_ORIG = {n: (eb[n].head.copy(), eb[n].tail.copy(), eb[n].roll) for n in ('braco_L', 'antebraco_L', 'braco_R', 'antebraco_R')}
bpy.ops.object.mode_set(mode='OBJECT')

def mirar(osso, alvo, ponta=0.0):
    c = arm.pose.bones[osso].constraints.new('DAMPED_TRACK')
    c.target, c.subtarget, c.head_tail = antigo, alvo, ponta
for lado, L in (('l', 'L'), ('r', 'R')):
    mirar(f'upperarm_{lado}', f'antebraco_{L}', 0.0)
    mirar(f'lowerarm_{lado}', f'antebraco_{L}', 1.0)
    mirar(f'thigh_{lado}', f'canela_{L}', 0.0)
    mirar(f'calf_{lado}', f'canela_{L}', 1.0)
# O quadril segue o quadril antigo; sentado, as juntas das pernas ficam onde ficavam as do boneco antigo
# (os assentos do jogo foram medidos com ele)
alvo = bpy.data.objects.new('alvo_quadril', None); bpy.context.collection.objects.link(alvo)
c = alvo.constraints.new('COPY_LOCATION'); c.target, c.subtarget, c.use_offset = antigo, 'quadril', True
c = arm.pose.bones['pelvis'].constraints.new('COPY_LOCATION'); c.target = alvo
mirar('pelvis', 'quadril', 1.0)
mirar('spine_01', 'cabeca', 0.0)
mirar('spine_03', 'cabeca', 0.0)
mirar('Head', 'cabeca', 1.0)
JUNTA = junta('thigh_l').z - junta('pelvis').z
LUGAR_ANTIGO = antigo.location.copy()

aberto = [None]
def editar_pose():
    bpy.ops.object.select_all(action='DESELECT')
    arm.select_set(True)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.mode_set(mode='POSE')
    bpy.ops.pose.select_all(action='SELECT')
def abrir_bracos(angulos):
    if angulos == aberto[0]: return
    abre, inclina = (math.radians(a) for a in angulos)
    bpy.ops.object.mode_set(mode='OBJECT')
    bpy.ops.object.select_all(action='DESELECT')
    antigo.select_set(True)
    bpy.context.view_layer.objects.active = antigo
    bpy.ops.object.mode_set(mode='EDIT')
    eb = antigo.data.edit_bones
    for L, lado in (('L', 1), ('R', -1)):
        for n in (f'braco_{L}', f'antebraco_{L}'):
            eb[n].head, eb[n].tail, eb[n].roll = BRACOS_ORIG[n]
        ombro = eb[f'braco_{L}'].head.copy()
        giro = Matrix.Translation(ombro) @ Matrix.Rotation(-abre * lado, 4, 'Y') @ Matrix.Rotation(inclina, 4, 'X') @ Matrix.Translation(-ombro)
        eb[f'braco_{L}'].transform(giro); eb[f'antebraco_{L}'].transform(giro)
    bpy.ops.object.mode_set(mode='OBJECT')
    aberto[0] = angulos
    editar_pose()

# Sentado: pernas esticadas para a frente (como criança no sofá). As pernas chibi são curtas: dobradas no joelho,
# as botas atravessariam o assento dos móveis, que são fundos para o tamanho delas.
def pernas_esticadas(acao, i, f):
    arm.animation_data.action = acao
    if acao.slots: arm.animation_data.action_slot = acao.slots[0]
    pb = arm.pose.bones
    dedos = Vector((0, -0.6, 1)).normalized()
    def girar(osso, de, para):
        m = osso.matrix.copy(); pos = m.translation.copy()
        m = de.rotation_difference(para).to_matrix().to_4x4() @ m; m.translation = pos
        osso.matrix = m
        bpy.context.view_layer.update()
    for fr in range(i, f + 1):
        cena.frame_set(fr)
        for s in 'lr':
            th, ca, ft = pb[f'thigh_{s}'], pb[f'calf_{s}'], pb[f'foot_{s}']
            girar(ca, (ca.tail - ca.head).normalized(), (th.tail - th.head).normalized())
            girar(ft, (ft.tail - ft.head).normalized(), dedos)
            ca.keyframe_insert('rotation_quaternion', frame=fr)
            ft.keyframe_insert('rotation_quaternion', frame=fr)

editar_pose()
gravadas = []
for acao in acoes:
    nome = acao.name.split('.')[0]
    i, f = (int(v) for v in acao.frame_range)
    abrir_bracos(BRACOS.get(nome, BRACOS_PADRAO))
    alvo.location = (0, 0, 0)
    antigo.location = LUGAR_ANTIGO
    if nome in antes:
        # sentado: o boneco antigo inteiro sobe até o assento (as juntas das pernas no lugar das antigas) e o novo
        # segue; assim todas as direções continuam certas
        q_velho, t_velho = antes[nome]
        q_novo, t_novo = pose_de(acao)
        antigo.location = LUGAR_ANTIGO + q_velho - q_novo - (t_velho - q_velho).normalized() * JUNTA
    antigo.animation_data.action = acao
    arm.animation_data_create()
    arm.animation_data.action = None
    bpy.ops.nla.bake(frame_start=i, frame_end=f, step=1, only_selected=False, visual_keying=True,
                     clear_constraints=False, use_current_action=False, bake_types={'POSE'})
    nova = arm.animation_data.action
    nova.name = nome
    nova.use_fake_user = True
    if nome == 'sentado':
        pernas_esticadas(nova, i, f)
    gravadas.append((nova, nome))
arm.animation_data.action = None
antigo.location = LUGAR_ANTIGO
for pb in arm.pose.bones:
    for c in list(pb.constraints): pb.constraints.remove(c)
bpy.ops.object.mode_set(mode='OBJECT')
bpy.data.objects.remove(antigo)
bpy.data.objects.remove(alvo)
for a in acoes: bpy.data.actions.remove(a)
for a, n in gravadas + kaykit:
    a.name = n
for o in list(bpy.data.objects):
    if o is not arm and o.parent is not arm:
        bpy.data.objects.remove(o)
def usar(acao):
    arm.animation_data_create()
    arm.animation_data.action = acao
    if acao is not None and acao.slots:
        arm.animation_data.action_slot = acao.slots[0]
for a, n in gravadas + kaykit:
    usar(a)
exec(compile(open(os.path.join(AQUI, 'fantasia_maos.py')).read(), 'fantasia_maos.py', 'exec'))
usar(None)
print('ANIMACOES', sorted(a.name for a, n in gravadas + kaykit))

if SAIDA == 'previas':
    os.makedirs(DESTINO, exist_ok=True)
    cena.render.engine = 'BLENDER_EEVEE' if 'BLENDER_EEVEE' in [e.identifier for e in bpy.types.RenderSettings.bl_rna.properties['engine'].enum_items] else 'BLENDER_EEVEE_NEXT'
    cena.render.resolution_x, cena.render.resolution_y = int(os.environ.get('RES', 420)), int(int(os.environ.get('RES', 420)) * 4 / 3)
    cena.view_settings.view_transform = 'Standard'
    w = bpy.data.worlds.new('w'); cena.world = w
    w.use_nodes = True; w.node_tree.nodes['Background'].inputs[0].default_value = (0.35, 0.4, 0.45, 1); w.node_tree.nodes['Background'].inputs[1].default_value = 0.9
    sol = bpy.data.objects.new('sol', bpy.data.lights.new('sol', 'SUN')); sol.data.energy = 3.2
    sol.rotation_euler = Euler((0.8, 0.2, -0.5)); cena.collection.objects.link(sol)
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); cena.collection.objects.link(cam); cena.camera = cam
    cam.location = (1.35, -3.0, 0.9); cam.rotation_euler = (math.radians(85), 0, math.radians(24))
    if os.environ.get('COSTAS'):
        cam.location = (-1.35, 3.0, 0.9); cam.rotation_euler = (math.radians(85), 0, math.radians(180 + 24))
    if os.environ.get('LADO'):
        cam.location = (3.2, -0.25, 0.75); cam.rotation_euler = (math.radians(86), 0, math.radians(90))
    MIXES = {}
    def hexa(h): return tuple(lin(int(h[i:i + 2], 16) / 255) for i in (1, 3, 5))
    CORES = {'pele': '#E9B48C', 'cabelo': '#6B3A1C', 'sobrancelha': '#6B3A1C', 'cima': '#E62A6E', 'cima2': '#F07AA5', 'baixo': '#3C4A6E', 'calcado': '#8A5A3C', 'fixo': '#FFFFFF'}
    for n, m in materiais.items():
        nos = m.node_tree.nodes
        b = next(x for x in nos if x.type == 'BSDF_PRINCIPLED')
        va = nos.new('ShaderNodeVertexColor'); va.layer_name = 'Col'
        mix = nos.new('ShaderNodeMix'); mix.data_type = 'RGBA'; mix.blend_type = 'MULTIPLY'; mix.inputs[0].default_value = 1
        m.node_tree.links.new(va.outputs['Color'], mix.inputs[6]); mix.inputs[7].default_value = (*hexa(CORES[n]), 1)
        m.node_tree.links.new(mix.outputs[2], b.inputs['Base Color'])
        MIXES[n] = mix
    cabelo = 'cabelo_curto' if not FEM else 'cabelo_longo'
    def mostrar(*nomes):
        for o in bpy.data.objects:
            if o.type == 'MESH':
                o.hide_render = o.name not in nomes
    rosto = ('pele', 'olhos', 'sobrancelha')
    # Igual ao jogo (corpoReal.ts FANT + boneco3d.ts FANTASIAS): cabelo, barba, pernas, calçado e peça de mão
    F_CABELO = {'curto': 'raspado', 'compacto': 'coque' if FEM else 'raspado', 'esconde': None}
    F_INFO = {  # cabelo, pernas, calçado, barba
        'pescador': ('compacto', 'pernas_calca', 'sandalia', None), 'pastor': (None, 'pernas_curta', 'sandalia', 'barba_cheia'),
        'mineiro': ('curto', 'pernas_calca', 'bota', None), 'pirata': ('curto', 'pernas_calca', 'bota', 'barba'),
        'anjo': ('compacto', 'pernas_curta', 'sandalia', None), 'viking': ('curto', 'pernas_barbaro', None, 'barba_cheia'),
        'robo': ('esconde', 'pernas_armadura', None, None), 'rei': ('compacto', 'pernas_curta', 'sandalia', 'barba_cheia'),
        'ester': ('curto', 'pernas_curta', 'sapatilha', None), 'jose': ('compacto', 'pernas_curta', 'sandalia', None),
        'tunicaFestiva': ('compacto', 'pernas_curta', 'sandalia', None),
    }
    def conjunto_fant(id_):
        cab, pernas, pe, barba = F_INFO.get(id_, ('curto', 'pernas_calca', 'sandalia', None))
        c = F_CABELO.get(cab, cabelo) if cab else cabelo
        pecas = rosto + ((c if c.startswith('cabelo') else f'cabelo_{c}',) if c else ()) + ('fant_' + id_, pernas)
        if pe: pecas += (f'sapato_{pe}',)
        if barba and not FEM: pecas += (barba,)
        if f'fant_{id_}_mao' in bpy.data.objects: pecas += (f'fant_{id_}_mao',)
        return pecas
    CONJUNTOS = {
        'tunica': rosto + (cabelo, 'roupa_tunica', 'pernas_calca', 'sapato_tenis'),
        'camisa': rosto + (cabelo, 'roupa_camisa', 'pernas_curta', 'sapato_sandalia'),
        'casaco': rosto + (cabelo, 'roupa_casaco', 'pernas_calca', 'sapato_social'),
        'saia': rosto + ('cabelo_rabo', 'roupa_tunica', 'roupa_saia', 'pernas_curta', 'sapato_sapatilha'),
        'vestido_longo': rosto + ('cabelo_coque', 'roupa_casaco_longo', 'pernas_curta', 'sapato_salto'),
        'capuz': rosto + ('chapeu_capuz', 'roupa_capuz', 'pernas_calca', 'sapato_pantufa'),
        'bota': rosto + (cabelo, 'roupa_tunica', 'pernas_calca', 'sapato_bota'),
        **{t: rosto + (cabelo, t, 'baixo_saia' if t in ('topo_blusa',) else 'pernas_curta' if t.startswith(('topo_vestido', 'topo_tunica')) else 'pernas_calca', 'sapato_tenis')
           for t in sorted(o.name for o in bpy.data.objects if o.name.startswith('topo_'))},
        **{o.name: conjunto_fant(o.name[5:]) for o in bpy.data.objects if o.name.startswith('fant_') and not o.name.endswith('_mao')},
        'macacao': rosto + (cabelo, 'topo_camiseta', 'baixo_macacaoJardim', 'pernas_calca', 'sapato_botinha' if False else 'sapato_tenis'),
        'pijama': rosto + (cabelo, 'topo_camiseta', 'baixo_pijamaOvelha', 'pernas_calca', 'sapato_pantufa'),
        'saia_longa': rosto + (cabelo, 'topo_blusa', 'baixo_saiaLonga', 'pernas_curta', 'sapato_sapatilha'),
        'so_pele': ('pele',),
        'so_sobrancelha': ('sobrancelha', 'olhos'),
        'cavaleiro': rosto + ('chapeu_capacete', 'roupa_armadura', 'pernas_armadura', 'capa'),
        'barbaro': rosto + ('chapeu_urso', 'barba_cheia', 'roupa_barbaro', 'pernas_barbaro'),
    }
    usar(None if os.environ.get('REPOUSO') else bpy.data.actions['parado'])
    cena.frame_set(0)
    if os.environ.get('SEMARM'):
        for o in bpy.data.objects:
            if o.type == 'MESH':
                for m in o.modifiers: m.show_render = False
    for nome, pecas in CONJUNTOS.items():
        if os.environ.get('SO') and not any(k in nome for k in os.environ['SO'].split(',')): continue
        if os.environ.get('SEMCAB'): pecas = tuple(x for x in pecas if not x.startswith('cabelo'))
        mostrar(*pecas)
        fc = FANT_CORES.get(nome[5:]) if nome.startswith('fant_') else None
        for cat, i in (('cima', 0), ('cima2', 1), ('baixo', 2), ('calcado', 3)):
            MIXES[cat].inputs[7].default_value = (*hexa(fc[i] if fc else CORES[cat]), 1)
        cena.render.filepath = os.path.join(DESTINO, f'{SEXO}_roupa_{nome}.png')
        bpy.ops.render.render(write_still=True)
    mostrar(*CONJUNTOS[os.environ.get('POSE_COM', 'bota')])
    POSES = [('parado', 0), ('andar', 6), ('correr', 4), ('sentado', 0), ('orar', 0), ('louvor', 0), ('ler', 0), ('deitado', 0), ('exercicio', 6)]
    if os.environ.get('POSES'):
        POSES = [(x.split(':')[0], int(x.split(':')[1])) for x in os.environ['POSES'].split(',')]
    for nome, quadro in POSES:
        usar(bpy.data.actions[nome])
        cena.frame_set(quadro)
        if os.environ.get('POSES'):
            pb = arm.pose.bones
            print('OSSOS', nome, quadro, {n: tuple(round(x, 2) for x in (arm.matrix_world @ pb[n].head)) for n in ('pelvis', 'thigh_l', 'calf_l', 'foot_l', 'ball_l', 'hand_l', 'Head')})
        cena.render.filepath = os.path.join(DESTINO, f'{SEXO}_pose_{nome}_{quadro}.png')
        bpy.ops.render.render(write_still=True)
else:
    for o in bpy.data.objects:
        if o.type == 'MESH':
            while o.data.uv_layers: o.data.uv_layers.remove(o.data.uv_layers[0])  # o jogo não usa textura: arquivo menor
    bpy.ops.export_scene.gltf(filepath=os.path.abspath(SAIDA), export_format='GLB', export_animations=True,
                              export_animation_mode='ACTIONS', export_skins=True, export_morph=False, export_force_sampling=True,
                              export_vertex_color='ACTIVE', export_all_vertex_colors=False, export_optimize_animation_size=True,
                              # malhas comprimidas (Draco): o app descompacta com o DRACOLoader (public/draco/)
                              export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=7,
                              export_draco_position_quantization=14, export_draco_normal_quantization=10,
                              export_draco_color_quantization=10, export_draco_generic_quantization=12)
    print('EXPORTADO', SAIDA, os.path.getsize(SAIDA))
