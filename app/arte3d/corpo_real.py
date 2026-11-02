# Corpo realista do Faith Steps, a partir das bases CC0 do Quaternius (arte3d/base, licença em LICENCA_Quaternius.txt).
#
#   blender -b -P arte3d/corpo_real.py -- m public/corpo_m.glb      (homem)
#   blender -b -P arte3d/corpo_real.py -- f public/corpo_f.glb      (mulher)
#   blender -b -P arte3d/corpo_real.py -- m previas pasta/           (fotos de conferência das poses)
#
# 1. Monta o boneco antigo (arte3d/boneco.py) só para ter o esqueleto e as animações dele.
# 2. Importa a base, deixa na altura do jogo e faz cada osso novo apontar para a junta equivalente do antigo
#    (ombro→cotovelo, cotovelo→pulso, quadril→joelho...). Assim as mesmas animações valem para o corpo novo.
# 3. Grava ("bake") cada animação no esqueleto novo e exporta só o corpo novo.
import bpy, sys, os, math
from mathutils import Vector, Euler

AQUI = os.path.dirname(os.path.abspath(__file__))
ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
SEXO, SAIDA = ARGS[0], ARGS[1]
DESTINO = ARGS[2] if len(ARGS) > 2 else None
ALTURA = 1.55

# 1. Boneco antigo
sys.argv = [sys.argv[0], '--', 'biblioteca']
exec(compile(open(os.path.join(AQUI, 'boneco.py')).read(), 'boneco.py', 'exec'))
antigo = bpy.data.objects['boneco']
for ob in list(bpy.data.objects):
    if ob.type == 'MESH':
        bpy.data.objects.remove(ob)
acoes = [a for a in bpy.data.actions]

# 2. Base nova
arquivo = {'m': 'Superhero_Male_FullBody.gltf', 'f': 'Superhero_Female_FullBody.gltf'}[SEXO]
antes = set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=os.path.join(AQUI, 'base', arquivo))
novos = [o for o in bpy.data.objects if o not in antes]
for o in novos:
    if o.type == 'MESH' and o.parent is None:
        bpy.data.objects.remove(o)  # esfera solta que vem no arquivo
novos = [o for o in bpy.data.objects if o not in antes]
arm = next(o for o in novos if o.type == 'ARMATURE')
arm.name = 'corpo'
corpo = max((o for o in novos if o.type == 'MESH'), key=lambda o: len(o.data.vertices))
altura_base = max((corpo.matrix_world @ Vector(c)).z for c in corpo.bound_box)
k = ALTURA / altura_base
arm.scale = (arm.scale.x * k, arm.scale.y * k, arm.scale.z * k)
bpy.ops.object.select_all(action='DESELECT')
for o in novos: o.select_set(True)
bpy.context.view_layer.objects.active = arm
bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
for o in novos:
    if o.type == 'MESH':
        for m in o.modifiers:
            if m.type == 'ARMATURE': m.object = arm

# ---------- Pele, olhos e sobrancelhas ----------
import bmesh, numpy as np
def clarear_textura(img, alvo=0.92):
    """Deixa a textura em tons de cinza com média ~alvo: o app multiplica pela cor escolhida (pele, cabelo)."""
    px = np.array(img.pixels[:], dtype=np.float32).reshape(-1, 4)
    lum = px[:, 0] * 0.3 + px[:, 1] * 0.59 + px[:, 2] * 0.11
    vis = px[:, 3] > 0.5
    media = float(lum[vis].mean()) if vis.any() else 0.5
    lum = np.clip(lum / max(media, 1e-3) * alvo, 0, 1)
    px[:, 0] = px[:, 1] = px[:, 2] = lum
    img.pixels[:] = px.ravel()
    if max(img.size) > 1024:
        img.scale(1024, 1024)  # arquivo leve para o celular
    img.pack()

def mat_simples(m, nome):
    m.name = nome
    return m

corpo.name = 'pele'
pele = corpo.data.materials[0]
pele.name = 'pele'
nos = pele.node_tree.nodes
bsdf = next(n for n in nos if n.type == 'BSDF_PRINCIPLED')
tex = next((n for n in nos if n.type == 'TEX_IMAGE' and n.image and 'Superhero' in n.image.name and 'Normal' not in n.image.name and 'Rough' not in n.image.name), None)
clara = {'m': 'T_Superhero_Male_Ligh.png', 'f': 'T_Superhero_Female_Light_BaseColor.png'}[SEXO]
if tex is None:
    tex = nos.new('ShaderNodeTexImage')
tex.image = bpy.data.images.load(os.path.join(AQUI, 'base', clara))
clarear_textura(tex.image, 0.9)
pele.node_tree.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
# Normal e aspereza ficam de fora (arquivo leve); a luz do jogo já dá volume
for n in list(nos):
    if n.type == 'TEX_IMAGE' and n is not tex:
        nos.remove(n)
bsdf.inputs['Roughness'].default_value = 0.6
for o in novos:
    if o.type == 'MESH' and o is not corpo:
        n = o.name.lower()
        o.name = 'olhos' if 'eye' in n and 'brow' not in n else 'sobrancelha' if 'brow' in n else o.name
        if o.data.materials:
            o.data.materials[0].name = o.name if o.name in ('olhos', 'sobrancelha') else o.data.materials[0].name
        if o.name == 'sobrancelha' and o.data.materials:
            for n in o.data.materials[0].node_tree.nodes:
                if n.type == 'TEX_IMAGE' and n.image and 'Normal' not in n.image.name:
                    n.image = n.image.copy(); clarear_textura(n.image, 0.8)
                elif n.type == 'TEX_IMAGE':
                    o.data.materials[0].node_tree.nodes.remove(n)

# ---------- Cabelos do pacote (presos ao osso da cabeça) ----------
PASTA_CAB = os.path.join(AQUI, 'base', 'cabelos')
img_cabelo = {}
for arq in sorted(os.listdir(PASTA_CAB)):
    if not arq.endswith('.gltf') or arq.startswith('Eyebrows'):
        continue
    nome = 'cabelo_' + arq[5:-5].lower() if arq.startswith('Hair_') else arq[:-5].lower()
    if nome == 'cabelo_beard':
        nome = 'barba'
    antes_c = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=os.path.join(PASTA_CAB, arq))
    vindos = [o for o in bpy.data.objects if o not in antes_c]
    for o in vindos:
        if o.type != 'MESH':
            continue
        mw = o.matrix_world.copy()
        o.parent = None
        o.data.transform(mw)
        o.matrix_world = o.matrix_world.Identity(4)
        o.data.transform(__import__('mathutils').Matrix.Scale(k, 4))
        o.parent = arm
        for m in o.modifiers:
            if m.type == 'ARMATURE': m.object = arm
        if not any(m.type == 'ARMATURE' for m in o.modifiers):
            m = o.modifiers.new('esqueleto', 'ARMATURE'); m.object = arm
        if 'Head' not in o.vertex_groups:
            g = o.vertex_groups.new(name='Head'); g.add(list(range(len(o.data.vertices))), 1.0, 'REPLACE')
        o.name = nome
        mt = o.data.materials[0] if o.data.materials else None
        if mt:
            mt.name = 'cabelo'
            for n in mt.node_tree.nodes:
                if n.type == 'TEX_IMAGE' and n.image and 'Normal' in n.image.name:
                    mt.node_tree.nodes.remove(n)
            for n in mt.node_tree.nodes:
                if n.type == 'TEX_IMAGE' and n.image and n.image.name not in img_cabelo:
                    clarear_textura(n.image, 0.85); img_cabelo[n.image.name] = True
    for o in vindos:
        if o.type != 'MESH':
            bpy.data.objects.remove(o)

# Os arquivos de cabelo trazem a malha em duas partes com o mesmo nome: junta numa só
grupos_nome = {}
for o in bpy.data.objects:
    if o.type == 'MESH' and o.name.startswith(('cabelo_', 'barba')):
        grupos_nome.setdefault(o.name.split('.')[0], []).append(o)
for nome, obs in grupos_nome.items():
    if len(obs) > 1:
        bpy.ops.object.select_all(action='DESELECT')
        for o in obs: o.select_set(True)
        bpy.context.view_layer.objects.active = obs[0]
        bpy.ops.object.join()
    bpy.context.view_layer.objects.active.name = nome if len(obs) > 1 else obs[0].name
    (obs[0]).name = nome

# ---------- Roupas: cascas justas tiradas do próprio corpo ----------
# Cada roupa é uma cópia de uma região da pele, afastada alguns milímetros e com os mesmos pesos de osso:
# acompanha qualquer pose sem vazar. O app liga a peça certa e pinta pela cor da roupa.
ossos = arm.data.bones
def z_osso(n): return (arm.matrix_world @ ossos[n].head_local).z
CINTURA = z_osso('spine_01') - 0.01
JOELHO_Z = z_osso('calf_l')
TORNOZ_Z = z_osso('foot_l') + 0.03
PULSO_Z = None
def dominante(o, v):
    melhor, nome = 0, ''
    for g in v.groups:
        if g.weight > melhor:
            melhor, nome = g.weight, o.vertex_groups[g.group].name
    return nome
def casca(nome, material, escolher, afasta, alisar_abaixo=None):
    me = corpo.data.copy()
    o = corpo.copy(); o.data = me; o.name = nome
    bpy.context.collection.objects.link(o)
    o.data.materials.clear()
    o.data.materials.append(material)
    sel = {v.index for v in corpo.data.vertices if escolher(v, dominante(corpo, v))}
    bm = bmesh.new(); bm.from_mesh(me)
    bm.verts.ensure_lookup_table()
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if not all(v.index in sel for v in f.verts)], context='FACES')
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
    bm.normal_update()
    for v in bm.verts:
        v.co += v.normal * afasta
    if alisar_abaixo is not None:
        # sapato: alisa os dedos até virar bico arredondado
        baixos = [v for v in bm.verts if v.co.z < alisar_abaixo]
        for _ in range(14):
            bmesh.ops.smooth_vert(bm, verts=baixos, factor=0.6, use_axis_x=True, use_axis_y=True, use_axis_z=False)
        bm.normal_update()
        for v in baixos:
            v.co += v.normal * 0.006
    bm.to_mesh(me); bm.free()
    for p in me.polygons: p.use_smooth = True
    return o
def mat_roupa(nome, cor, aspereza=0.8):
    m = bpy.data.materials.new(nome); m.use_nodes = True
    b = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    b.inputs['Base Color'].default_value = (*[c / 255 for c in cor], 1); b.inputs['Roughness'].default_value = aspereza
    return m
CIMA, BAIXO, CALC = mat_roupa('cima', (230, 40, 110)), mat_roupa('baixo', (60, 20, 70)), mat_roupa('calcado', (130, 255, 0), 0.5)
TRONCO = ('pelvis', 'spine_01', 'spine_02', 'spine_03', 'clavicle_l', 'clavicle_r')
def eh(n, *pref): return any(n.startswith(p) for p in pref)
acima = lambda v: v.co.z > CINTURA - 0.03
casca('roupa_regata', CIMA, lambda v, n: acima(v) and (n in TRONCO or n.startswith('upperarm') and v.co.z > z_osso('upperarm_l') - 0.06 and abs(v.co.x) < abs((arm.matrix_world @ ossos['upperarm_l'].head_local).x) + 0.02), 0.006)
casca('roupa_curta', CIMA, lambda v, n: acima(v) and (n in TRONCO or eh(n, 'upperarm')), 0.006)
casca('roupa_longa', CIMA, lambda v, n: acima(v) and (n in TRONCO or eh(n, 'upperarm', 'lowerarm')), 0.006)
casca('roupa_calca', BAIXO, lambda v, n: v.co.z < CINTURA + 0.03 and v.co.z > TORNOZ_Z and (n in ('pelvis', 'spine_01') or eh(n, 'thigh', 'calf')), 0.009)
casca('roupa_bermuda', BAIXO, lambda v, n: v.co.z < CINTURA + 0.03 and v.co.z > JOELHO_Z + 0.03 and (n in ('pelvis', 'spine_01') or eh(n, 'thigh')), 0.009)
casca('roupa_sapato', CALC, lambda v, n: v.co.z < TORNOZ_Z + 0.05 and eh(n, 'foot', 'ball', 'calf'), 0.012, TORNOZ_Z - 0.01)
# Saias e vestido: cones presos ao quadril (não grudam nas pernas)
def saia(nome, z0, z1, r0, r1, material):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=False, segments=32, radius1=r1, radius2=r0, depth=z0 - z1)
    for v in bm.verts: v.co.y *= 0.8
    bmesh.ops.translate(bm, verts=bm.verts, vec=Vector((0, 0.01, (z0 + z1) / 2)))
    bm.normal_update()
    if sum(f.normal.dot(Vector((f.calc_center_median().x, f.calc_center_median().y, 0))) for f in bm.faces) < 0:
        bmesh.ops.reverse_faces(bm, faces=bm.faces)  # normais para fora (senão a saia fica preta)
    me = bpy.data.meshes.new(nome); bm.to_mesh(me); bm.free()
    for p in me.polygons: p.use_smooth = True
    me.materials.append(material)
    o = bpy.data.objects.new(nome, me); bpy.context.collection.objects.link(o)
    o.parent = arm
    g = o.vertex_groups.new(name='pelvis'); g.add(list(range(len(me.vertices))), 1.0, 'REPLACE')
    m = o.modifiers.new('esqueleto', 'ARMATURE'); m.object = arm
    return o
quad = max(abs(v.co.x) for v in corpo.data.vertices if abs(v.co.z - (CINTURA - 0.12)) < 0.02)
saia('roupa_saia', CINTURA + 0.01, JOELHO_Z - 0.02, quad * 0.95, quad * 1.45, BAIXO)
saia('roupa_saia_longa', CINTURA + 0.01, TORNOZ_Z + 0.02, quad * 0.95, quad * 1.7, BAIXO)
saia('roupa_vestido_saia', CINTURA + 0.01, JOELHO_Z - 0.04, quad * 0.95, quad * 1.5, CIMA)
saia('roupa_vestido_longo_saia', CINTURA + 0.01, TORNOZ_Z + 0.01, quad * 0.95, quad * 1.75, CIMA)
print('ROUPAS', [o.name for o in bpy.data.objects if o.name.startswith('roupa_')], 'CABELOS', [o.name for o in bpy.data.objects if o.name.startswith(('cabelo_', 'barba'))])

# Cada osso novo aponta para a junta do antigo
def mirar(osso, alvo, ponta=0.0):
    c = arm.pose.bones[osso].constraints.new('DAMPED_TRACK')
    c.target, c.subtarget, c.head_tail = antigo, alvo, ponta
for lado, L in (('l', 'L'), ('r', 'R')):
    mirar(f'upperarm_{lado}', f'antebraco_{L}', 0.0)
    mirar(f'lowerarm_{lado}', f'antebraco_{L}', 1.0)
    mirar(f'thigh_{lado}', f'canela_{L}', 0.0)
    mirar(f'calf_{lado}', f'canela_{L}', 1.0)
mirar('pelvis', 'tronco', 0.0)
for s in ('spine_01', 'spine_02', 'spine_03'):
    mirar(s, 'cabeca', 0.0)
mirar('neck_01', 'cabeca', 0.5)
mirar('Head', 'cabeca', 1.0)
c = arm.pose.bones['root'].constraints.new('COPY_LOCATION')
c.target, c.subtarget = antigo, 'raiz'

# 3. Grava cada animação no esqueleto novo
bpy.context.view_layer.objects.active = arm
bpy.ops.object.mode_set(mode='POSE')
bpy.ops.pose.select_all(action='SELECT')
gravadas = []
for acao in acoes:
    antigo.animation_data.action = acao
    i, f = (int(v) for v in acao.frame_range)
    arm.animation_data_create()
    arm.animation_data.action = None
    bpy.ops.nla.bake(frame_start=i, frame_end=f, step=1, only_selected=False, visual_keying=True,
                     clear_constraints=False, use_current_action=False, bake_types={'POSE'})
    nova = arm.animation_data.action
    nova.name = acao.name
    nova.use_fake_user = True
    gravadas.append(nova)
arm.animation_data.action = None
for pb in arm.pose.bones:
    for c in list(pb.constraints): pb.constraints.remove(c)
bpy.ops.object.mode_set(mode='OBJECT')
bpy.data.objects.remove(antigo)
nomes = {a: a.name.split('.')[0] for a in gravadas}
for a in acoes: bpy.data.actions.remove(a)
for a, n in nomes.items(): a.name = n
print('ANIMACOES', [a.name for a in gravadas])

if SAIDA == 'previas':
    os.makedirs(DESTINO, exist_ok=True)
    cena = bpy.context.scene
    cena.render.engine = 'BLENDER_EEVEE' if 'BLENDER_EEVEE' in [e.identifier for e in bpy.types.RenderSettings.bl_rna.properties['engine'].enum_items] else 'BLENDER_EEVEE_NEXT'
    cena.render.resolution_x, cena.render.resolution_y = 500, 700
    cena.view_settings.view_transform = 'Standard'
    w = bpy.data.worlds.new('w'); cena.world = w
    sol = bpy.data.objects.new('sol', bpy.data.lights.new('sol', 'SUN')); sol.data.energy = 3.5
    sol.rotation_euler = Euler((0.8, 0.2, -0.5)); cena.collection.objects.link(sol)
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); cena.collection.objects.link(cam); cena.camera = cam
    cam.location = (1.6, -3.4, 1.1); cam.rotation_euler = (math.radians(84), 0, math.radians(25))
    cab = 'cabelo_simpleparted' if SEXO == 'm' else 'cabelo_long'
    for o in bpy.data.objects:
        if o.type == 'MESH':
            o.hide_render = not (o.name in ('pele', 'olhos', 'sobrancelha', cab, 'roupa_curta', 'roupa_calca', 'roupa_sapato'))
    for nome, quadro in (('parado', 0), ('andar', 6), ('sentado', 0), ('orar', 0), ('louvor', 0), ('ler', 0)):
        arm.animation_data.action = bpy.data.actions[nome]
        cena.frame_set(quadro)
        cena.render.filepath = os.path.join(DESTINO, f'{SEXO}_{nome}.png')
        bpy.ops.render.render(write_still=True)
else:
    bpy.ops.export_scene.gltf(filepath=os.path.abspath(SAIDA), export_format='GLB', export_animations=True,
                              export_animation_mode='ACTIONS', export_skins=True, export_morph=True, export_force_sampling=True)
    print('EXPORTADO', SAIDA, os.path.getsize(SAIDA))
