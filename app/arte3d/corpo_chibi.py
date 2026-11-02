# Personagem chibi do Faith Steps no estilo KayKit (arte3d/kaykit, CC0 de Kay Lousberg, licença em LICENCA_KayKit.txt).
#
#   blender -b -P arte3d/corpo_chibi.py -- m public/corpo_m.glb      (homem)
#   blender -b -P arte3d/corpo_chibi.py -- f public/corpo_f.glb      (mulher)
#   blender -b -P arte3d/corpo_chibi.py -- m previas pasta/           (fotos de conferência das poses)
#
# 1. Monta o boneco antigo (arte3d/boneco.py) só para ter o esqueleto e as 13 animações do jogo.
# 2. Usa o esqueleto e a cabeça (rosto) de um personagem KayKit: Rogue para mulher, Ranger para homem.
#    Os cabelos e barbas vêm das cabeças dos outros personagens do pacote.
# 3. Faz o corpo liso (tronco, braços, mãos, pernas, pés) e as roupas em cascas por cima dele.
# 4. Cada osso novo aponta para a junta equivalente do boneco antigo; grava as animações e exporta.
# Os ossos ganham os mesmos nomes do corpo anterior (pelvis, spine_03, hand_r...), então o app não muda.
import bpy, sys, os, math, bmesh
import numpy as np
from collections import Counter
from mathutils import Vector, Matrix, Euler

AQUI = os.path.dirname(os.path.abspath(__file__))
KK = os.path.join(AQUI, 'kaykit')
ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
SEXO, SAIDA = ARGS[0], ARGS[1]
DESTINO = ARGS[2] if len(ARGS) > 2 else None
FEM = SEXO == 'f'
ESCALA = 0.70  # medidas KayKit -> metros do jogo (~1,45 m com cabelo)

# 1. Boneco antigo
sys.argv = [sys.argv[0], '--', 'biblioteca']
exec(compile(open(os.path.join(AQUI, 'boneco.py')).read(), 'boneco.py', 'exec'))
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

def importar(nome):
    antes = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=os.path.join(KK, nome + '.glb'))
    nomes = [o.name for o in bpy.data.objects if o not in antes]
    for n in nomes:
        o = bpy.data.objects[n]
        if o.type == 'MESH' and o.parent is None:
            bpy.data.objects.remove(o)  # esfera solta que vem no arquivo
    return [bpy.data.objects[n] for n in nomes if n in bpy.data.objects]

# 2. Esqueleto e cabeça do personagem base
base = importar('Rogue' if FEM else 'Ranger')
arm = next(o for o in base if o.type == 'ARMATURE')
arm.name = 'corpo'
for b in list(arm.data.bones):
    if b.name in RENOMEAR:
        b.name = RENOMEAR[b.name]
cabeca_base = next(o for o in base if o.type == 'MESH' and o.name.endswith('_Head'))
for o in base:
    if o.type == 'MESH' and o is not cabeca_base:
        bpy.data.objects.remove(o)

def adotar(o):
    """Malha passa a seguir o esqueleto 'corpo' (coordenadas de mundo, grupos com os nomes novos)."""
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

def partes_soltas(me):
    """Partes soltas da malha: [(faces, quadrado da paleta, centro)]. A textura KayKit é uma paleta 8x4."""
    bm = bmesh.new(); bm.from_mesh(me); uv = bm.loops.layers.uv.active
    vistos, res = set(), []
    for f0 in bm.faces:
        if f0 in vistos: continue
        pilha, comp = [f0], []
        vistos.add(f0)
        while pilha:
            x = pilha.pop(); comp.append(x)
            for e in x.edges:
                for y in e.link_faces:
                    if y not in vistos: vistos.add(y); pilha.append(y)
        cont = Counter()
        for x in comp:
            u = sum(l[uv].uv[0] for l in x.loops) / len(x.loops); v = sum(l[uv].uv[1] for l in x.loops) / len(x.loops)
            cont[(int(u * 8), int((1 - v) * 4))] += 1
        vs = {v for x in comp for v in x.verts}
        centro = sum((v.co for v in vs), Vector()) / len(vs)
        res.append(([x.index for x in comp], cont.most_common(1)[0][0], centro))
    bm.free()
    return res

def classe(q, c, n):
    if q == (0, 0): return 'pele'
    if q == (2, 0): return 'olhos'
    if q == (1, 0):
        if n <= 120 and c.y < -0.25 and 1.6 < c.z < 1.9 and abs(c.x) > 0.06: return 'sobrancelha'
        if c.z < 1.56 and c.y < -0.25: return 'barba'
        return 'cabelo'
    return None  # brincos e enfeites

def dividir(o, sufixo=''):
    """Separa a cabeça em pele, olhos, sobrancelha, cabelo e barba (cada um vira um objeto)."""
    grupos = {}
    for faces, q, c in partes_soltas(o.data):
        k = classe(q, c, len(faces))
        if k: grupos.setdefault(k, set()).update(faces)
    saida = {}
    for k, faces in grupos.items():
        n = o.copy(); n.data = o.data.copy(); n.name = k + sufixo
        bpy.context.collection.objects.link(n)
        bm = bmesh.new(); bm.from_mesh(n.data); bm.faces.ensure_lookup_table()
        bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.index not in faces], context='FACES')
        bm.to_mesh(n.data); bm.free()
        saida[k] = n
    bpy.data.objects.remove(o)
    return saida

def caixa(o):
    ps = [v.co for v in o.data.vertices]
    mn = Vector([min(p[i] for p in ps) for i in range(3)]); mx = Vector([max(p[i] for p in ps) for i in range(3)])
    return mn, mx

adotar(cabeca_base)
cab = dividir(cabeca_base)
cranio_base = caixa(cab['pele'])
CABELO_DE = {'Rogue': 'longo', 'Ranger': 'curto', 'Mage': 'liso', 'Knight': 'tigela'}
cabelos = {}
cabelos[CABELO_DE['Rogue' if FEM else 'Ranger']] = cab.pop('cabelo')
if FEM and 'barba' in cab: bpy.data.objects.remove(cab.pop('barba'))

def encaixar(o, cranio_origem):
    """Ajusta cabelo/barba de outra cabeça ao crânio da cabeça base."""
    (a0, a1), (b0, b1) = cranio_origem, cranio_base
    ca, cb = (a0 + a1) / 2, (b0 + b1) / 2
    s = Vector([(b1[i] - b0[i]) / (a1[i] - a0[i]) for i in range(3)])
    for v in o.data.vertices:
        d = v.co - ca
        v.co = cb + Vector((d.x * s.x, d.y * s.y, d.z * s.z))

extras = [n for n in ('Rogue', 'Ranger', 'Mage', 'Knight') if n != ('Rogue' if FEM else 'Ranger')] + ([] if FEM else ['Barbarian'])
for nome in extras:
    vindos = importar(nome)
    cabeca = next(o for o in vindos if o.type == 'MESH' and o.name.endswith('_Head'))
    resto = [o.name for o in vindos if o is not cabeca]
    adotar(cabeca)
    partes = dividir(cabeca, '_' + nome)
    cranio = caixa(partes['pele'])
    for k, o in partes.items():
        if nome == 'Barbarian' and k == 'barba':
            encaixar(o, cranio); o.name = 'barba_cheia'
        elif k == 'cabelo' and nome in CABELO_DE:
            encaixar(o, cranio); cabelos[CABELO_DE[nome]] = o
        else:
            bpy.data.objects.remove(o)
    for n in resto:
        if n in bpy.data.objects: bpy.data.objects.remove(bpy.data.objects[n])
for k, o in cabelos.items():
    o.name = 'cabelo_' + k

# Cabelo preso (coque e rabo de cavalo) e raspado: uma touca justa tirada do próprio crânio
def touca(nome, afasta):
    o = cab['pele'].copy(); o.data = cab['pele'].data.copy(); o.name = nome
    bpy.context.collection.objects.link(o)
    mn, mx = cranio_base
    bm = bmesh.new(); bm.from_mesh(o.data)
    maior = max(partes_soltas_bm(bm), key=len)
    testa = mn.z + (mx.z - mn.z) * 0.62
    nuca = mn.z + (mx.z - mn.z) * 0.25
    fica = lambda v: v.co.z > testa or (v.co.y > -0.05 and v.co.z > nuca) or (v.co.y > -0.22 and v.co.z > (testa + nuca) / 2)
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if f not in maior or not all(fica(v) for v in f.verts)], context='FACES')
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
    bm.normal_update()
    for v in bm.verts: v.co += v.normal * afasta
    bm.to_mesh(o.data); bm.free()
    return o
def partes_soltas_bm(bm):
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
def bola(o, centro, raios, seg=12):
    """Junta uma bola (coque, rabo) à malha do cabelo, presa ao osso da cabeça."""
    bm = bmesh.new(); bm.from_mesh(o.data)
    novo = bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=8, radius=1)['verts']
    for v in novo:
        v.co = Vector((v.co.x * raios[0], v.co.y * raios[1], v.co.z * raios[2])) + Vector(centro)
    bm.to_mesh(o.data); bm.free()
    g = o.vertex_groups.get('Head')
    if g: g.add([v.index for v in o.data.vertices], 1.0, 'REPLACE')
mn, mx = cranio_base
ctop = ((mn.x + mx.x) / 2, mx.y, mx.z)
touca('cabelo_raspado', 0.012)
coque = touca('cabelo_coque', 0.03); bola(coque, (0, mx.y - 0.02, mx.z - 0.12), (0.17, 0.15, 0.15))
rabo = touca('cabelo_rabo', 0.03); bola(rabo, (0, mx.y + 0.02, mx.z - 0.22), (0.12, 0.12, 0.13)); bola(rabo, (0, mx.y + 0.08, mx.z - 0.48), (0.11, 0.11, 0.26))

# Olhos fechados (orar, dormir): os mesmos olhos achatados numa linha
fechados = cab['olhos'].copy(); fechados.data = cab['olhos'].data.copy(); fechados.name = 'olhos_fechados'
bpy.context.collection.objects.link(fechados)
bm = bmesh.new(); bm.from_mesh(fechados.data)
for comp in partes_soltas_bm(bm):
    vs = {v for f in comp for v in f.verts}
    c = sum((v.co for v in vs), Vector()) / len(vs)
    if len(comp) < 10:
        bmesh.ops.delete(bm, geom=list(comp), context='FACES'); continue  # brilho do olho
    for v in vs:
        v.co.z = c.z - 0.03 + (v.co.z - c.z) * 0.12
        v.co.y -= 0.01
bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
bm.to_mesh(fechados.data); bm.free()

# ---------- Textura: a paleta KayKit em tons de cinza; o app multiplica pela cor escolhida ----------
paleta = bpy.data.images.load(os.path.join(KK, 'rogue_texture.png'))
W, H = paleta.size
px = np.array(paleta.pixels[:], dtype=np.float32).reshape(H, W, 4)
lum = px[..., 0] * 0.3 + px[..., 1] * 0.59 + px[..., 2] * 0.11
cw, ch = W // 8, H // 4
for i in range(8):
    for j in range(4):
        bloco = lum[j * ch:(j + 1) * ch, i * cw:(i + 1) * cw]
        lum[j * ch:(j + 1) * ch, i * cw:(i + 1) * cw] = np.clip(bloco / max(float(bloco.mean()), 1e-3) * 0.92, 0, 1)
px[..., 0] = px[..., 1] = px[..., 2] = lum
paleta.pixels[:] = px.ravel()
paleta.scale(256, 256)
paleta.name = 'paleta_cinza'
paleta.pack()

def material(nome, cor=(1, 1, 1), textura=True, aspereza=0.75):
    m = bpy.data.materials.new(nome); m.use_nodes = True
    b = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    b.inputs['Base Color'].default_value = (*cor, 1)
    b.inputs['Roughness'].default_value = aspereza
    if textura:
        t = m.node_tree.nodes.new('ShaderNodeTexImage'); t.image = paleta
        t.interpolation = 'Closest'
        m.node_tree.links.new(t.outputs['Color'], b.inputs['Base Color'])
    return m
PELE, CABELO, SOBRAN = material('pele'), material('cabelo'), material('sobrancelha')
OLHOS = material('olhos', (0.06, 0.05, 0.07), False, 0.3)
def rgb(h): return tuple((int(h[i:i + 2], 16) / 255) ** 2.2 for i in (1, 3, 5))
CIMA, BAIXO, CALC = material('cima', rgb('#E62A6E'), False, 0.85), material('baixo', rgb('#3C1446'), False, 0.85), material('calcado', rgb('#F2F2F2'), False, 0.6)
def vestir(o, m):
    o.data.materials.clear(); o.data.materials.append(m)
vestir(cab['pele'], PELE); vestir(cab['olhos'], OLHOS); vestir(fechados, OLHOS)
if 'sobrancelha' in cab: vestir(cab['sobrancelha'], SOBRAN)
for o in bpy.data.objects:
    if o.type == 'MESH' and o.name.startswith(('cabelo_', 'barba')):
        vestir(o, CABELO)
        for p in o.data.polygons: p.use_smooth = True

# ---------- 3. Corpo liso no estilo KayKit ----------
SEG = 16
TRONCO, BRACO, MAO, PERNA, PE = 0, 1, 2, 3, 4
bm = bmesh.new()
parte = bm.verts.layers.int.new('parte')
def anel(c, u, v, ru, rv, p=2.6):
    pts = []
    for i in range(SEG):
        t = 2 * math.pi * i / SEG
        a, b = math.cos(t), math.sin(t)
        pts.append(c + u * (math.copysign(abs(a) ** (2 / p), a) * ru) + v * (math.copysign(abs(b) ** (2 / p), b) * rv))
    return pts
def loft(aneis, tag):
    rs = []
    for a in aneis:
        r = [bm.verts.new(p) for p in a]
        for x in r: x[parte] = tag
        rs.append(r)
    for a, b in zip(rs, rs[1:]):
        for i in range(SEG):
            bm.faces.new((a[i], a[(i + 1) % SEG], b[(i + 1) % SEG], b[i]))
    for r in (rs[0], rs[-1]):
        c = bm.verts.new(sum((x.co for x in r), Vector()) / SEG); c[parte] = tag
        for i in range(SEG):
            bm.faces.new((r[i], r[(i + 1) % SEG], c))
X, Y, Z = Vector((1, 0, 0)), Vector((0, 1, 0)), Vector((0, 0, 1))
# tronco: (altura, meia largura, meia profundidade)
if FEM:
    perfil = [(0.36, 0.19, 0.15), (0.44, 0.29, 0.19), (0.56, 0.31, 0.20), (0.70, 0.27, 0.18), (0.86, 0.28, 0.19), (0.98, 0.29, 0.20), (1.08, 0.27, 0.18), (1.16, 0.21, 0.15), (1.22, 0.12, 0.10), (1.27, 0.09, 0.08)]
else:
    perfil = [(0.36, 0.20, 0.16), (0.44, 0.29, 0.20), (0.56, 0.31, 0.21), (0.70, 0.30, 0.20), (0.86, 0.31, 0.205), (0.98, 0.32, 0.21), (1.08, 0.31, 0.20), (1.16, 0.24, 0.17), (1.22, 0.13, 0.11), (1.27, 0.10, 0.09)]
def mais_aneis(perfil, passo=0.035):
    # aneis intermediários: a roupa corta em qualquer altura sem deixar faixa de pele
    res = []
    for (z0, a0, b0), (z1, a1, b1) in zip(perfil, perfil[1:]):
        n = max(1, round((z1 - z0) / passo))
        res += [(z0 + (z1 - z0) * k / n, a0 + (a1 - a0) * k / n, b0 + (b1 - b0) * k / n) for k in range(n)]
    return res + [perfil[-1]]
loft([anel(Vector((0, 0.01, z)), X, Y, rx, ry) for z, rx, ry in mais_aneis(perfil)], TRONCO)
OMBRO_Z = 1.107
for lado in (1, -1):
    # braço: (distância do centro, raio frente/trás, raio altura)
    loft([anel(Vector((lado * x, 0, OMBRO_Z)), Y, Z, ry, rz, 2.2) for x, ry, rz in
          [(0.20, 0.10, 0.10), (0.30, 0.092, 0.095), (0.45, 0.083, 0.085), (0.60, 0.077, 0.078), (0.72, 0.068, 0.07)]], BRACO)
    loft([anel(Vector((lado * x, -0.005, OMBRO_Z - 0.01)), Y, Z, ry, rz, 2.2) for x, ry, rz in
          [(0.71, 0.05, 0.055), (0.75, 0.075, 0.085), (0.82, 0.085, 0.095), (0.89, 0.075, 0.085), (0.935, 0.045, 0.05)]], MAO)
    # perna e pé
    loft([anel(Vector((lado * 0.165, 0, z)), X, Y, r, r * 0.95, 2.2) for z, r in
          [(0.52, 0.125), (0.42, 0.12), (0.30, 0.11), (0.20, 0.10), (0.12, 0.095)]], PERNA)
    loft([anel(Vector((lado * 0.168, y, zc)), X, Z, rx, rz, 2.6) for y, zc, rx, rz in
          [(0.10, 0.075, 0.075, 0.05), (0.07, 0.08, 0.10, 0.075), (-0.04, 0.075, 0.11, 0.075), (-0.15, 0.065, 0.105, 0.062), (-0.22, 0.05, 0.08, 0.045)]], PE)
for v in bm.verts:
    if v[parte] == PE: v.co.z = max(v.co.z, 0.0)
bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
me = bpy.data.meshes.new('corpo_liso'); bm.to_mesh(me); bm.free()
for p in me.polygons: p.use_smooth = True
corpo = bpy.data.objects.new('corpo_liso', me); bpy.context.collection.objects.link(corpo)
corpo.parent = arm; corpo.matrix_parent_inverse = arm.matrix_world.inverted()
m = corpo.modifiers.new('esqueleto', 'ARMATURE'); m.object = arm
uvl = me.uv_layers.new(name='UVMap')
for l in uvl.data: l.uv = (0.5 / 8, 1 - 0.5 / 4)  # meio do quadrado da pele na paleta
vestir(corpo, PELE)

# Pesos: cada parte segue seus ossos, com transição suave nas juntas
def suave(a, b, x):
    t = min(1, max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t)
grupos = {}
def g(n):
    if n not in grupos: grupos[n] = corpo.vertex_groups.new(name=n)
    return grupos[n]
PARTE = [d.value for d in me.attributes['parte'].data]
for v in me.vertices:
    p, c = PARTE[v.index], v.co
    s = 'l' if c.x > 0 else 'r'
    ps = {}
    if p == TRONCO:
        a, b = suave(0.56, 0.70, c.z), suave(0.95, 1.05, c.z)
        ps = {'pelvis': 1 - a, 'spine_01': a * (1 - b), 'spine_03': b}
    elif p == BRACO:
        a, b = suave(0.42, 0.49, abs(c.x)), suave(0.69, 0.74, abs(c.x))
        ps = {f'upperarm_{s}': 1 - a, f'lowerarm_{s}': a * (1 - b), f'hand_{s}': b}
    elif p == MAO:
        ps = {f'hand_{s}': 1}
    elif p == PERNA:
        a = suave(0.27, 0.33, c.z)
        ps = {f'thigh_{s}': a, f'calf_{s}': 1 - a}
    else:
        ps = {f'foot_{s}': 1}
    for n, w in ps.items():
        if w > 0.001: g(n).add([v.index], w, 'REPLACE')

# ---------- Roupas: cascas por cima do corpo, com os mesmos pesos ----------
CINTURA = 0.64
def casca(nome, mat, escolher, afasta):
    o = corpo.copy(); o.data = corpo.data.copy(); o.name = nome
    bpy.context.collection.objects.link(o)
    vestir(o, mat)
    sel = {v.index for v in corpo.data.vertices if escolher(v.co, PARTE[v.index])}
    bm = bmesh.new(); bm.from_mesh(o.data)
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if not all(v.index in sel for v in f.verts)], context='FACES')
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
    bm.normal_update()
    for v in bm.verts: v.co += v.normal * afasta
    bm.to_mesh(o.data); bm.free()
    return o
cima_tronco = lambda c, p: p == TRONCO and c.z > CINTURA - 0.06
casca('roupa_regata', CIMA, cima_tronco, 0.022)
casca('roupa_curta', CIMA, lambda c, p: cima_tronco(c, p) or (p == BRACO and abs(c.x) < 0.44), 0.022)
casca('roupa_longa', CIMA, lambda c, p: cima_tronco(c, p) or p == BRACO, 0.022)
de_baixo = lambda c, p: p == TRONCO and c.z < CINTURA + 0.05
casca('roupa_calca', BAIXO, lambda c, p: de_baixo(c, p) or (p == PERNA and c.z > 0.115), 0.014)
casca('roupa_bermuda', BAIXO, lambda c, p: de_baixo(c, p) or (p == PERNA and c.z > 0.29), 0.014)
casca('roupa_sapato', CALC, lambda c, p: p == PE or (p == PERNA and c.z < 0.21), 0.02)
def saia(nome, z0, z1, r0, r1, mat):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=False, segments=24, radius1=r1, radius2=r0, depth=z0 - z1)
    for v in bm.verts: v.co.y *= 0.75
    bmesh.ops.translate(bm, verts=bm.verts, vec=Vector((0, 0.01, (z0 + z1) / 2)))
    bm.normal_update()
    if sum(f.normal.dot(Vector((f.calc_center_median().x, f.calc_center_median().y, 0))) for f in bm.faces) < 0:
        bmesh.ops.reverse_faces(bm, faces=bm.faces)  # normais para fora
    me = bpy.data.meshes.new(nome); bm.to_mesh(me); bm.free()
    for p in me.polygons: p.use_smooth = True
    o = bpy.data.objects.new(nome, me); bpy.context.collection.objects.link(o)
    vestir(o, mat)
    o.parent = arm; o.matrix_parent_inverse = arm.matrix_world.inverted()
    o.vertex_groups.new(name='pelvis').add(list(range(len(me.vertices))), 1.0, 'REPLACE')
    m = o.modifiers.new('esqueleto', 'ARMATURE'); m.object = arm
saia('roupa_saia', CINTURA + 0.03, 0.25, 0.33, 0.43, BAIXO)
saia('roupa_saia_longa', CINTURA + 0.03, 0.07, 0.33, 0.50, BAIXO)
saia('roupa_vestido_saia', CINTURA + 0.03, 0.23, 0.335, 0.45, CIMA)
saia('roupa_vestido_longo_saia', CINTURA + 0.03, 0.06, 0.335, 0.52, CIMA)

# Pele do corpo e da cabeça num objeto só
bpy.ops.object.select_all(action='DESELECT')
corpo.select_set(True); cab['pele'].select_set(True)
bpy.context.view_layer.objects.active = corpo
bpy.ops.object.join()
corpo.name = 'pele'
if 'parte' in corpo.data.attributes: corpo.data.attributes.remove(corpo.data.attributes['parte'])
for o in bpy.data.objects:
    if o.type == 'MESH' and 'parte' in o.data.attributes: o.data.attributes.remove(o.data.attributes['parte'])

# Medidas do jogo
filhos = [o for o in bpy.data.objects if o.parent == arm]
arm.scale = (ESCALA,) * 3
bpy.ops.object.select_all(action='DESELECT')
arm.select_set(True)
for o in filhos: o.select_set(True)
bpy.context.view_layer.objects.active = arm
bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
print('PECAS', sorted(o.name for o in filhos))

# ---------- 4. Animações do boneco antigo no esqueleto novo ----------
cena = bpy.context.scene
SENTADAS = {'sentado', 'pedalar'}  # deitado: o jogo gira o boneco inteiro na cama
def junta_antiga(n, ponta=False):
    pb = antigo.pose.bones[n]
    return antigo.matrix_world @ (pb.tail if ponta else pb.head)
def pose_de(acao):
    antigo.animation_data.action = acao
    cena.frame_set(int(acao.frame_range[0]))
    return junta_antiga('quadril'), junta_antiga('cabeca', True)
antes = {a.name.split('.')[0]: pose_de(a) for a in acoes if a.name.split('.')[0] in SENTADAS}

# O boneco antigo ganha as medidas do chibi (mesmas direções dos ossos, outras posições e comprimentos):
# as animações dele são só rotações, então continuam iguais, e cada osso novo mira a junta certa.
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
for L, s in (('L', 'l'), ('R', 'r')):
    cot = por(f'braco_{L}', junta(f'upperarm_{s}'), (junta(f'lowerarm_{s}') - junta(f'upperarm_{s}')).length)
    por(f'antebraco_{L}', cot, (junta(f'hand_{s}') - junta(f'lowerarm_{s}')).length)
    joe = por(f'coxa_{L}', junta(f'thigh_{s}'), (junta(f'calf_{s}') - junta(f'thigh_{s}')).length)
    por(f'canela_{L}', joe, (junta(f'foot_{s}') - junta(f'calf_{s}')).length)
bpy.ops.object.mode_set(mode='OBJECT')

def mirar(osso, alvo, ponta=0.0):
    c = arm.pose.bones[osso].constraints.new('DAMPED_TRACK')
    c.target, c.subtarget, c.head_tail = antigo, alvo, ponta
for lado, L in (('l', 'L'), ('r', 'R')):
    mirar(f'upperarm_{lado}', f'antebraco_{L}', 0.0)
    mirar(f'lowerarm_{lado}', f'antebraco_{L}', 1.0)
    mirar(f'thigh_{lado}', f'canela_{L}', 0.0)
    mirar(f'calf_{lado}', f'canela_{L}', 1.0)
# O quadril segue o quadril antigo; sentado ou deitado, as juntas das pernas ficam onde ficavam as do boneco
# antigo (os assentos e a cama do jogo foram medidos com ele)
alvo = bpy.data.objects.new('alvo_quadril', None); bpy.context.collection.objects.link(alvo)
c = alvo.constraints.new('COPY_LOCATION'); c.target, c.subtarget, c.use_offset = antigo, 'quadril', True
c = arm.pose.bones['pelvis'].constraints.new('COPY_LOCATION'); c.target = alvo
mirar('pelvis', 'quadril', 1.0)
mirar('spine_01', 'cabeca', 0.0)
mirar('spine_03', 'cabeca', 0.0)
mirar('Head', 'cabeca', 1.0)
QUADRIL_NOVO = junta('pelvis').z
JUNTA = junta('thigh_l').z - QUADRIL_NOVO

bpy.context.view_layer.objects.active = arm
bpy.ops.object.mode_set(mode='POSE')
bpy.ops.pose.select_all(action='SELECT')
gravadas = []
for acao in acoes:
    nome = acao.name.split('.')[0]
    i, f = (int(v) for v in acao.frame_range)
    alvo.location = (0, 0, 0)
    if nome in antes:
        q_velho, t_velho = antes[nome]
        q_novo, t_novo = pose_de(acao)
        d = (t_velho - q_velho).normalized()
        alvo.location = q_velho - q_novo - d * JUNTA
    antigo.animation_data.action = acao
    arm.animation_data_create()
    arm.animation_data.action = None
    bpy.ops.nla.bake(frame_start=i, frame_end=f, step=1, only_selected=False, visual_keying=True,
                     clear_constraints=False, use_current_action=False, bake_types={'POSE'})
    nova = arm.animation_data.action
    nova.name = nome
    nova.use_fake_user = True
    gravadas.append(nova)
arm.animation_data.action = None
for pb in arm.pose.bones:
    for c in list(pb.constraints): pb.constraints.remove(c)
bpy.ops.object.mode_set(mode='OBJECT')
bpy.data.objects.remove(antigo)
bpy.data.objects.remove(alvo)
nomes = {a: a.name.split('.')[0] for a in gravadas}
for a in acoes: bpy.data.actions.remove(a)
for a, n in nomes.items(): a.name = n
for o in list(bpy.data.objects):
    if o is not arm and o.parent is not arm:
        bpy.data.objects.remove(o)
print('ANIMACOES', [a.name for a in gravadas])

if SAIDA == 'previas':
    os.makedirs(DESTINO, exist_ok=True)
    cena.render.engine = 'BLENDER_EEVEE' if 'BLENDER_EEVEE' in [e.identifier for e in bpy.types.RenderSettings.bl_rna.properties['engine'].enum_items] else 'BLENDER_EEVEE_NEXT'
    cena.render.resolution_x, cena.render.resolution_y = 500, 600
    cena.view_settings.view_transform = 'Standard'
    w = bpy.data.worlds.new('w'); cena.world = w
    w.use_nodes = True; w.node_tree.nodes['Background'].inputs[0].default_value = (0.35, 0.4, 0.45, 1)
    sol = bpy.data.objects.new('sol', bpy.data.lights.new('sol', 'SUN')); sol.data.energy = 3.5
    sol.rotation_euler = Euler((0.8, 0.2, -0.5)); cena.collection.objects.link(sol)
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); cena.collection.objects.link(cam); cena.camera = cam
    cam.location = (1.5, -3.2, 0.95); cam.rotation_euler = (math.radians(84), 0, math.radians(25))
    cabelo = 'cabelo_curto' if not FEM else 'cabelo_longo'
    def tingir(mat, cor):
        nos = mat.node_tree.nodes
        t = next(n for n in nos if n.type == 'TEX_IMAGE'); b = next(n for n in nos if n.type == 'BSDF_PRINCIPLED')
        mix = nos.new('ShaderNodeMix'); mix.data_type = 'RGBA'; mix.blend_type = 'MULTIPLY'; mix.inputs[0].default_value = 1
        mat.node_tree.links.new(t.outputs['Color'], mix.inputs[6]); mix.inputs[7].default_value = (*rgb(cor), 1)
        mat.node_tree.links.new(mix.outputs[2], b.inputs['Base Color'])
    tingir(PELE, '#E9B48C'); tingir(CABELO, '#6B3A1C'); tingir(SOBRAN, '#6B3A1C')
    for o in bpy.data.objects:
        if o.type == 'MESH':
            o.hide_render = not (o.name in ('pele', 'olhos', 'sobrancelha', cabelo, 'roupa_curta', 'roupa_calca', 'roupa_sapato'))
    for nome, quadro in (('parado', 0), ('andar', 6), ('sentado', 0), ('orar', 0), ('louvor', 0), ('deitado', 0)):
        arm.animation_data.action = bpy.data.actions[nome]
        cena.frame_set(quadro)
        cena.render.filepath = os.path.join(DESTINO, f'{SEXO}_{nome}.png')
        bpy.ops.render.render(write_still=True)
else:
    bpy.ops.export_scene.gltf(filepath=os.path.abspath(SAIDA), export_format='GLB', export_animations=True,
                              export_animation_mode='ACTIONS', export_skins=True, export_morph=False, export_force_sampling=True)
    print('EXPORTADO', SAIDA, os.path.getsize(SAIDA))
