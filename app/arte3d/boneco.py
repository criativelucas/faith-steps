# Boneco 3D do Faith Steps, feito no Blender por script.
#
#   Gerar o modelo:   blender -b -P arte3d/boneco.py -- exportar public/boneco.glb
#   Gerar prévias:    blender -b -P arte3d/boneco.py -- previas pasta/
#   Fotos da loja:    blender -b -P arte3d/boneco.py -- fantasias assets/fantasias/
#
# O boneco é um "bonequinho" de peças arredondadas presas aos ossos de um esqueleto.
# Tudo o que muda na customização já está no arquivo e o app só liga/desliga e pinta:
#   - objetos com prefixo (cabelo_, olho_, nariz_, sob_, boca_, pe_, extra_) ligam e desligam
#   - materiais com nome (pele, cabelo, cima, cima_claro, cima_escuro, baixo, iris...) recebem a cor do visual
#   - formas do corpo (shape keys): cheinho, atletico, feminino; do rosto: redondo, quadrado, coracao
#   - animações (ações): parado, andar, sentado, deitado, orar, ler, mexer, comer, louvor, exercicio
import bpy, bmesh, math, sys, os, re
from mathutils import Vector, Matrix, Euler

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []

bpy.ops.wm.read_factory_settings(use_empty=True)
cena = bpy.context.scene
cena.render.fps = 24
colecao = cena.collection

# ---------- Materiais (o app troca as cores pelos nomes) ----------
def linear(h):
    h = h.lstrip('#')
    return tuple(((int(h[i:i + 2], 16) / 255 + 0.055) / 1.055) ** 2.4 if int(h[i:i + 2], 16) / 255 > 0.04045 else int(h[i:i + 2], 16) / 255 / 12.92 for i in (0, 2, 4))

MATS = {}
def mat(nome, cor, aspereza=0.62, brilho=0.0):
    if nome in MATS:
        return MATS[nome]
    m = bpy.data.materials.new(nome)
    bsdf = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    bsdf.inputs['Base Color'].default_value = (*linear(cor), 1)
    bsdf.inputs['Roughness'].default_value = aspereza
    if brilho:
        bsdf.inputs['Emission Color'].default_value = (*linear(cor), 1)
        bsdf.inputs['Emission Strength'].default_value = brilho
    m.diffuse_color = (*linear(cor), 1)
    MATS[nome] = m
    return m

PELE = mat('pele', '#C98B62', 0.55)
CABELO = mat('cabelo', '#2A1530', 0.45)
CIMA = mat('cima', '#FE0472', 0.7)
CIMA_CLARO = mat('cima_claro', '#FF8CC4', 0.7)
CIMA_ESCURO = mat('cima_escuro', '#C8005A', 0.7)
BAIXO = mat('baixo', '#3A1044', 0.75)
TINTA = mat('tinta', '#2A0A31', 0.3)
BRANCO = mat('branco', '#FFFFFF', 0.4)
IRIS = mat('iris', '#5A3420', 0.3)
BOCA = mat('boca', '#7A1E3A', 0.5)
LINGUA = mat('lingua', '#FF7AA8', 0.5)
BOCHECHA = mat('bochecha', '#F48FB1', 0.8)
PELE_ESCURA = mat('pele_sombra', '#A86C48', 0.6)
LIMA = mat('lima', '#8AFF00', 0.5)
SOLA = mat('sola', '#FFFFFF', 0.6)
COURO = mat('couro', '#3A2A30', 0.25)
BOTA = mat('bota', '#8A5A3C', 0.6)
SANDALIA = mat('sandalia', '#C9A88A', 0.6)
SAPATILHA = mat('sapatilha', '#E79BB9', 0.5)
GRAVATA = mat('gravata', '#FE0472', 0.5)
LIVRO = mat('livro', '#2A0A31', 0.5)
OCULOS = mat('oculos', '#2A0A31', 0.3)
LACO = mat('laco', '#FE0472', 0.5)

# ---------- Malhas ----------
def cortar(bm, ponto, normal):
    """Corta a malha num plano e fica com o lado para onde a normal aponta (borda lisa)."""
    geom = bm.verts[:] + bm.edges[:] + bm.faces[:]
    bmesh.ops.bisect_plane(bm, geom=geom, plane_co=Vector(ponto), plane_no=Vector(normal).normalized(), clear_inner=True)

def objeto(nome, bm, material, suave=True):
    me = bpy.data.meshes.new(nome)
    bm.to_mesh(me)
    bm.free()
    if suave:
        me.shade_smooth()
    me.materials.append(material)
    ob = bpy.data.objects.new(nome, me)
    colecao.objects.link(ob)
    return ob

def bm_elipse(raios, centro=(0, 0, 0), seg=24, aneis=16, giro=(0, 0, 0), forma=None):
    """Elipsoide (ou superelipsoide com forma<1, mais "caixinha")."""
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=aneis, radius=1)
    for v in bm.verts:
        p = v.co.copy()
        if forma:
            p = Vector([math.copysign(abs(c) ** forma, c) for c in p])
        v.co = Vector((p.x * raios[0], p.y * raios[1], p.z * raios[2]))
    bmesh.ops.rotate(bm, verts=bm.verts, cent=(0, 0, 0), matrix=Euler(giro).to_matrix())
    bmesh.ops.translate(bm, verts=bm.verts, vec=Vector(centro))
    return bm

def juntar(*bms):
    """Junta várias malhas bmesh numa só."""
    alvo = bmesh.new()
    for b in bms:
        me = bpy.data.meshes.new('tmp')
        b.to_mesh(me)
        b.free()
        alvo.from_mesh(me)
        bpy.data.meshes.remove(me)
    return alvo

def elipse(nome, raios, centro, material, **kw):
    return objeto(nome, bm_elipse(raios, centro, **kw), material)

def entre(nome, a, b, raio, material, raio_b=None):
    """Elipsoide esticado entre dois pontos (braços, pernas)."""
    a, b = Vector(a), Vector(b)
    meio, d = (a + b) / 2, b - a
    # Cápsulas de seção contínua: as extremidades se encontram nas articulações,
    # sem os vãos e volumes de 'contas de colar' dos elipsoides antigos.
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=20, v_segments=16, radius=1)
    for v in bm.verts:
        p = v.co.copy()
        radial = math.hypot(p.x, p.y)
        perfil = max(0, 1 - p.z * p.z) ** 0.16
        afinar = 0.92 + 0.08 * p.z
        v.co = Vector((p.x / radial * raio * perfil * afinar if radial > 1e-6 else 0,
                       p.y / radial * (raio_b or raio) * perfil * afinar if radial > 1e-6 else 0,
                       p.z * (d.length / 2 + 0.022)))
    rot = Vector((0, 0, 1)).rotation_difference(d.normalized()).to_matrix()
    bmesh.ops.rotate(bm, verts=bm.verts, cent=(0, 0, 0), matrix=rot)
    bmesh.ops.translate(bm, verts=bm.verts, vec=meio)
    return objeto(nome, bm, material)

def corrente(pontos, raio, seg=10):
    """Fileira de bolinhas que forma um traço curvo (sobrancelhas, sorriso, olhos fechados)."""
    return juntar(*[bm_elipse((raio, raio * 0.7, raio), p, seg=8, aneis=5) for p in pontos])

def arco(cx, cy, cz, largura, altura, n=9, para_cima=True):
    pts = []
    for i in range(n):
        t = i / (n - 1) * 2 - 1
        pts.append((cx + t * largura / 2, cy, cz + (1 - t * t) * altura * (1 if para_cima else -1)))
    return pts

# ---------- Proporções ----------
CZ = 1.27                     # centro da cabeça
RX, RY, RZ = 0.235, 0.22, 0.235  # raios da cabeça
OMBRO, COTOVELO, PULSO = 0.955, 0.78, 0.6
QUADRIL, JOELHO, TORNOZELO = 0.6, 0.33, 0.08
XB, XP = 0.192, 0.1           # distância lateral do ombro e do quadril
FT = -0.145                   # frente do tronco (y)

def rosto(x, z, sai=0.0):
    """Ponto na frente da cabeça (rosto voltado para -Y)."""
    k = 1 - (x / RX) ** 2 - ((z - CZ) / RZ) ** 2
    return (x, -RY * math.sqrt(max(k, 0.02)) - sai, z)

# ---------- Esqueleto ----------
arm_dados = bpy.data.armatures.new('esqueleto')
arm = bpy.data.objects.new('boneco', arm_dados)
colecao.objects.link(arm)
bpy.context.view_layer.objects.active = arm
bpy.ops.object.mode_set(mode='EDIT')
ossos = {}
def osso(nome, cabeca, cauda, pai=None):
    b = arm_dados.edit_bones.new(nome)
    b.head, b.tail, b.roll = Vector(cabeca), Vector(cauda), 0
    if pai:
        b.parent = ossos[pai]
    ossos[nome] = b
osso('raiz', (0, 0, 0), (0, 0, 0.2))
osso('quadril', (0, 0, QUADRIL), (0, 0, 0.74), 'raiz')
osso('tronco', (0, 0, 0.74), (0, 0, 0.98), 'quadril')
osso('cabeca', (0, 0, 0.98), (0, 0, 1.22), 'tronco')
for lado, s in (('L', 1), ('R', -1)):
    osso(f'braco_{lado}', (s * XB, 0, OMBRO), (s * (XB + 0.02), 0, COTOVELO), 'tronco')
    osso(f'antebraco_{lado}', (s * (XB + 0.02), 0, COTOVELO), (s * (XB + 0.03), 0, PULSO), f'braco_{lado}')
    osso(f'coxa_{lado}', (s * XP, 0, QUADRIL), (s * XP, 0, JOELHO), 'quadril')
    osso(f'canela_{lado}', (s * XP, 0, JOELHO), (s * XP, 0, TORNOZELO), f'coxa_{lado}')
bpy.ops.object.mode_set(mode='OBJECT')

def prender(ob, nome_osso):
    """Prende a peça ao osso sem mudar onde ela está."""
    b = arm_dados.bones[nome_osso]
    ob.parent = arm
    ob.parent_type = 'BONE'
    ob.parent_bone = nome_osso
    ob.matrix_parent_inverse = (arm.matrix_world @ b.matrix_local @ Matrix.Translation((0, b.length, 0))).inverted()

# ---------- Corpo ----------
def tronco():
    bm = bm_elipse((0.2, 0.145, 0.215), (0, 0, 0.8), seg=28, aneis=20, forma=0.75)
    ob = objeto('tronco', bm, CIMA)
    ob.shape_key_add(name='Basis')
    def chave(nome, f):
        k = ob.shape_key_add(name=nome)
        for i, v in enumerate(ob.data.vertices):
            k.data[i].co = f(v.co.copy())
    sino = lambda z, c, w: math.exp(-((z - c) / w) ** 2)
    def cheinho(p):
        b = sino(p.z, 0.77, 0.11)
        p.x *= 1 + 0.32 * b
        p.y *= 1 + (0.55 if p.y < 0 else 0.25) * b
        return p
    def atletico(p):
        t = (p.z - 0.585) / 0.43
        p.x *= 0.86 + 0.3 * max(0, t - 0.35)
        p.y *= 0.95
        return p
    def feminino(p):
        p.x *= 1 - 0.1 * sino(p.z, 0.97, 0.07) - 0.1 * sino(p.z, 0.8, 0.06) + 0.07 * sino(p.z, 0.64, 0.06)
        if p.y < 0:
            p.y *= 1 + 0.12 * sino(p.z, 0.9, 0.05)
        return p
    chave('cheinho', cheinho)
    chave('atletico', atletico)
    chave('feminino', feminino)
    prender(ob, 'tronco')

tronco()
prender(elipse('quadril_roupa', (0.177, 0.128, 0.072), (0, 0, 0.61), BAIXO, forma=0.8), 'quadril')
prender(elipse('pescoco', (0.055, 0.052, 0.06), (0, 0, 1.03), PELE), 'tronco')

for lado, s in (('L', 1), ('R', -1)):
    prender(elipse(f'ombro_{lado}', (0.062, 0.067, 0.060), (s * XB, 0, OMBRO), CIMA), 'tronco')
    prender(entre(f'braco_{lado}', (s * XB, 0, OMBRO), (s * (XB + 0.02), 0, COTOVELO), 0.066, CIMA), f'braco_{lado}')
    prender(entre(f'antebraco_{lado}', (s * (XB + 0.02), 0, COTOVELO), (s * (XB + 0.03), 0, PULSO), 0.058, CIMA), f'antebraco_{lado}')
    prender(elipse(f'punho_{lado}', (0.062, 0.062, 0.018), (s * (XB + 0.03), 0, PULSO + 0.03), CIMA_CLARO), f'antebraco_{lado}')
    prender(elipse(f'mao_{lado}', (0.046, 0.038, 0.066), (s * (XB + 0.034), 0, PULSO - 0.04), PELE), f'antebraco_{lado}')
    prender(entre(f'coxa_{lado}', (s * XP, 0, QUADRIL), (s * XP, 0, JOELHO), 0.088, BAIXO), f'coxa_{lado}')
    prender(entre(f'canela_{lado}', (s * XP, 0, JOELHO), (s * XP, 0, TORNOZELO + 0.02), 0.072, BAIXO), f'canela_{lado}')
    x = s * XP
    # Calçados
    tenis = juntar(bm_elipse((0.08, 0.13, 0.055), (x, -0.04, 0.065), forma=0.8))
    prender(objeto(f'pe_tenis_{lado}', tenis, LIMA), f'canela_{lado}')
    prender(elipse(f'pe_tenis_sola_{lado}', (0.085, 0.136, 0.018), (x, -0.04, 0.018), SOLA, forma=0.6), f'canela_{lado}')
    prender(elipse(f'pe_social_{lado}', (0.075, 0.128, 0.046), (x, -0.04, 0.046), COURO, forma=0.8), f'canela_{lado}')
    bota = juntar(bm_elipse((0.082, 0.128, 0.05), (x, -0.035, 0.05), forma=0.8), bm_elipse((0.078, 0.08, 0.08), (x, 0, 0.11), forma=0.85))
    prender(objeto(f'pe_botinha_{lado}', bota, BOTA), f'canela_{lado}')
    prender(elipse(f'pe_aberto_{lado}', (0.065, 0.115, 0.036), (x, -0.035, 0.042), PELE), f'canela_{lado}')
    prender(elipse(f'pe_aberto_sola_{lado}', (0.078, 0.128, 0.011), (x, -0.035, 0.011), SANDALIA, forma=0.6), f'canela_{lado}')
    prender(elipse(f'pe_aberto_tira_{lado}', (0.07, 0.018, 0.015), (x, -0.07, 0.066), LACO), f'canela_{lado}')
    prender(elipse(f'pe_sapatilha_{lado}', (0.074, 0.124, 0.038), (x, -0.04, 0.038), SAPATILHA, forma=0.8), f'canela_{lado}')
    prender(entre(f'pe_salto_tacao_{lado}', (x, 0.06, 0.0), (x, 0.06, 0.06), 0.017, COURO), f'canela_{lado}')

# ---------- Cabeça e rosto ----------
cabeca = elipse('cabeca', (RX, RY, RZ), (0, 0, CZ), PELE, seg=32, aneis=24)
cabeca.shape_key_add(name='Basis')
def chave_cabeca(nome, f):
    k = cabeca.shape_key_add(name=nome)
    for i, v in enumerate(cabeca.data.vertices):
        k.data[i].co = f(v.co.copy())
chave_cabeca('redondo', lambda p: Vector((p.x * 1.07, p.y * 1.02, CZ + (p.z - CZ) * 0.95)))
def quadrado(p):
    t = max(0, (CZ - p.z) / RZ)
    return Vector((p.x * (1 + 0.14 * t), p.y, p.z - 0.01 * t))
def coracao(p):
    t = (CZ - p.z) / RZ
    return Vector((p.x * (1 - 0.22 * max(0, t) + 0.05 * max(0, -t)), p.y * (1 - 0.05 * max(0, t)), p.z - 0.015 * max(0, t)))
chave_cabeca('quadrado', quadrado)
chave_cabeca('coracao', coracao)
prender(cabeca, 'cabeca')

def na_cabeca(ob):
    prender(ob, 'cabeca')
    return ob

for lado, s in (('L', 1), ('R', -1)):
    na_cabeca(elipse(f'orelha_{lado}', (0.028, 0.04, 0.05), (s * 0.207, 0.0, CZ - 0.01), PELE))
    na_cabeca(elipse(f'orelha_dentro_{lado}', (0.012, 0.024, 0.03), (s * 0.228, -0.006, CZ - 0.01), PELE_ESCURA))

# Olhos: cada tipo é um par de objetos; "olhos_fechados" vale para dormir e orar
EY = CZ + 0.005
for lado, s in (('L', 1), ('R', -1)):
    x = s * 0.085
    p = Vector(rosto(x, EY, -0.006))
    na_cabeca(objeto(f'olho_pontinho_{lado}', juntar(bm_elipse((0.024, 0.013, 0.032), p)), TINTA))
    na_cabeca(elipse(f'olho_pontinho_brilho_{lado}', (0.007, 0.004, 0.007), p + Vector((0.006, -0.011, 0.01)), BRANCO))
    q = Vector(rosto(x, EY, -0.003))
    na_cabeca(elipse(f'olho_grande_{lado}', (0.033, 0.01, 0.038), q, BRANCO))
    na_cabeca(elipse(f'olho_grande_iris_{lado}', (0.023, 0.008, 0.027), q + Vector((0, -0.006, -0.002)), IRIS))
    na_cabeca(elipse(f'olho_grande_pupila_{lado}', (0.012, 0.006, 0.014), q + Vector((0, -0.011, -0.002)), TINTA))
    na_cabeca(elipse(f'olho_grande_brilho_{lado}', (0.008, 0.004, 0.008), q + Vector((0.008, -0.015, 0.01)), BRANCO))
    a = Vector(rosto(x, EY, -0.004))
    na_cabeca(elipse(f'olho_amendoado_{lado}', (0.036, 0.009, 0.02), a, BRANCO))
    na_cabeca(elipse(f'olho_amendoado_iris_{lado}', (0.017, 0.008, 0.018), a + Vector((0, -0.005, 0)), IRIS))
    na_cabeca(elipse(f'olho_amendoado_pupila_{lado}', (0.009, 0.005, 0.01), a + Vector((0, -0.01, 0)), TINTA))
    na_cabeca(objeto(f'olho_amendoado_palpebra_{lado}', corrente([rosto(x + t * 0.04, EY + 0.012 + (1 - (t * 1.15) ** 2) * 0.008, 0.004) for t in [i / 6 - 0.5 for i in range(7)]], 0.0055), TINTA))
    na_cabeca(objeto(f'olho_sorridente_{lado}', corrente([rosto(*pp[::2], 0.002) for pp in arco(x, 0, EY - 0.008, 0.05, 0.02)], 0.0065), TINTA))
    na_cabeca(objeto(f'olho_fechado_{lado}', corrente([rosto(*pp[::2], 0.002) for pp in arco(x, 0, EY + 0.008, 0.05, 0.016, para_cima=False)], 0.006), TINTA))
    na_cabeca(objeto(f'extra_cilios_{lado}', corrente([rosto(s * (0.098 + i * 0.008), EY + 0.02 + i * 0.008, 0.003) for i in range(3)], 0.0045), TINTA))
    na_cabeca(elipse(f'bochecha_{lado}', (0.034, 0.006, 0.02), rosto(s * 0.13, CZ - 0.055, -0.004), BOCHECHA))
    # Sobrancelhas (cor do cabelo)
    for tipo, raio, curva, inclina in (('fina', 0.0055, 0.008, 0), ('grossa', 0.0095, 0.006, 0), ('arqueada', 0.0068, 0.016, 0.004)):
        pts = [(x + t * 0.055, 0, EY + 0.06 + (1 - (t * 2) ** 2) * curva + inclina * t * s) for t in [i / 8 - 0.5 for i in range(9)]]
        na_cabeca(objeto(f'sob_{tipo}_{lado}', corrente([rosto(pp[0], pp[2], 0.003) for pp in pts], raio), CABELO))

# Sardas acompanhando a superfície do rosto (opcionais no estúdio).
sardas = []
for sinal in (-1, 1):
    for i in range(7):
        sardas.append(bm_elipse((0.0035, 0.0025, 0.003), rosto(sinal * (0.066 + (i % 4) * 0.017), CZ - 0.032 - (i // 4) * 0.016, 0.004), seg=8, aneis=6))
na_cabeca(objeto('extra_sardas', juntar(*sardas), PELE_ESCURA))

# Narizes
na_cabeca(elipse('nariz_pequeno', (0.017, 0.012, 0.014), rosto(0, CZ - 0.035, -0.006), PELE_ESCURA))
na_cabeca(elipse('nariz_redondo', (0.026, 0.016, 0.02), rosto(0, CZ - 0.035, -0.008), PELE_ESCURA))
na_cabeca(elipse('nariz_reto', (0.014, 0.02, 0.032), rosto(0, CZ - 0.025, -0.012), PELE_ESCURA))

# Bocas por humor
MY = CZ - 0.085
na_cabeca(objeto('boca_sorriso', corrente([rosto(*pp[::2], 0.002) for pp in arco(0, 0, MY + 0.012, 0.07, 0.016, n=11, para_cima=False)], 0.0062), BOCA))
na_cabeca(objeto('boca_triste', corrente([rosto(*pp[::2], 0.002) for pp in arco(0, 0, MY - 0.004, 0.06, 0.012, n=9)], 0.0062), BOCA))
na_cabeca(objeto('boca_calma', corrente([rosto(*pp[::2], 0.002) for pp in arco(0, 0, MY + 0.004, 0.035, 0.006, n=7, para_cima=False)], 0.0055), BOCA))
aberta = bm_elipse((0.036, 0.008, 0.024), rosto(0, MY, 0.0))
cortar(aberta, (0, 0, MY + 0.002), (0, 0, -1))
na_cabeca(objeto('boca_aberta', juntar(aberta), BOCA))
na_cabeca(elipse('boca_aberta_lingua', (0.018, 0.006, 0.009), rosto(0, MY - 0.012, 0.003), LINGUA))

# Barbas
def calota_rosto(raios, centro, corte_z, nome, extra=None):
    bm = bm_elipse(raios, centro, seg=30, aneis=22)
    cortar(bm, (0, 0, corte_z), (0, 0, -1))
    cortar(bm, (0, 0.04, 0), (0, -1, 0))
    partes = [bm] + ([extra] if extra else [])
    return na_cabeca(objeto(nome, juntar(*partes), CABELO))
bigode = lambda: bm_elipse((0.048, 0.012, 0.012), rosto(0, MY + 0.024, 0.008))
calota_rosto((RX + 0.008, RY + 0.01, RZ + 0.008), (0, 0, CZ), MY - 0.016, 'extra_barba_curta', bigode())
calota_rosto((RX + 0.02, RY + 0.024, RZ + 0.024), (0, 0, CZ - 0.01), MY - 0.012, 'extra_barba_cheia', bigode())

# Óculos e fones
def anel(cx, cz, r, n=30):
    return [rosto(cx + math.cos(i / n * 2 * math.pi) * r, cz + math.sin(i / n * 2 * math.pi) * r, 0.022) for i in range(n)]
na_cabeca(objeto('extra_oculos', corrente(anel(0.085, EY, 0.045) + anel(-0.085, EY, 0.045) + [rosto(t * 0.04, EY + 0.012, 0.022) for t in [i / 6 - 0.5 for i in range(7)]], 0.0068), OCULOS))
fones = juntar(
    corrente([(math.sin(a) * 0.235, 0.0, CZ + math.cos(a) * 0.235) for a in [i / 16 * math.pi - math.pi / 2 for i in range(17)]], 0.016),
)
na_cabeca(objeto('extra_fones_arco', fones, TINTA))
na_cabeca(objeto('extra_fones', juntar(bm_elipse((0.03, 0.05, 0.055), (0.225, 0, CZ - 0.01)), bm_elipse((0.03, 0.05, 0.055), (-0.225, 0, CZ - 0.01))), LIMA))

# ---------- Cabelos ----------
def calota(espessura=0.02, frente=0.07, tras=-0.07, lados=0.0, raio_extra=0.0, seg=32):
    """Calota de cabelo: esfera um pouco maior que a cabeça, cortada abaixo de um plano inclinado (rosto livre)."""
    rx, ry, rz = RX + espessura + raio_extra, RY + espessura + raio_extra, RZ + espessura + raio_extra
    bm = bm_elipse((rx, ry, rz), (0, 0, CZ), seg=seg, aneis=28)
    # Plano inclinado: mais alto na testa, mais baixo na nuca
    k = (frente - tras) / 2
    cortar(bm, (0, 0, CZ + (frente + tras) / 2 + lados * 0.5), (0, k, ry))
    return bm

def bolinhas_na_cabeca(raio_bola, raio_casca, z_min, frente_z, n=90, jitter=0.0):
    """Muitas bolinhas sobre a cabeça (cachos)."""
    bms = []
    ouro = math.pi * (3 - math.sqrt(5))
    for i in range(n):
        y = 1 - (i / (n - 1)) * 2
        r = math.sqrt(1 - y * y)
        a = ouro * i
        d = Vector((math.cos(a) * r, y, math.sin(a) * r))  # y aqui vira profundidade
        p = Vector((d.x * (RX + raio_casca), d.y * (RY + raio_casca), CZ + d.z * (RZ + raio_casca)))
        if p.z < z_min or (p.y < -0.08 and p.z < frente_z):
            continue
        k = 1 + jitter * math.sin(i * 12.9898)
        bms.append(bm_elipse((raio_bola * k,) * 3, p, seg=9, aneis=6))
    return juntar(*bms)

def cabelo(nome, *partes):
    na_cabeca(objeto(f'cabelo_{nome}', juntar(*partes), CABELO))

frente_curta = lambda: bm_elipse((0.15, 0.06, 0.05), (0.02, -0.15, CZ + 0.15), giro=(0.55, 0, 0.12))
cabelo('curto', calota(0.022, 0.1, -0.03, 0.02), frente_curta())
cabelo('raspado', calota(0.007, 0.12, 0.0, 0.03))
cabelo('topete', calota(0.02, 0.11, -0.03, 0.02), bm_elipse((0.11, 0.075, 0.06), (0.01, -0.13, CZ + 0.2), giro=(-0.5, 0, 0.1)), bm_elipse((0.08, 0.06, 0.05), (0.03, -0.06, CZ + 0.23)))
cabelo('lateral', calota(0.022, 0.1, -0.03, 0.02), bm_elipse((0.15, 0.05, 0.045), (-0.04, -0.165, CZ + 0.13), giro=(0.3, 0.25, 0)))
cabelo('moicano', calota(0.006, 0.14, 0.02, 0.04), *[bm_elipse((0.03, 0.05, 0.055), (0, math.sin(a) * (RY + 0.03), CZ + math.cos(a) * (RZ + 0.03)), giro=(a, 0, 0)) for a in [i / 6 * 2.2 - 0.9 for i in range(7)]])
cabelo('crespo', bolinhas_na_cabeca(0.045, 0.018, CZ - 0.02, CZ + 0.1, n=110))
cabelo('cacheado', bolinhas_na_cabeca(0.06, 0.04, CZ - 0.11, CZ + 0.09, n=120, jitter=0.15))
black = calota(0.0, 0.13, -0.08, 0.0, raio_extra=0.11)
cabelo('black', black, bolinhas_na_cabeca(0.07, 0.12, CZ - 0.06, CZ + 0.16, n=70, jitter=0.2))
costas_longo = lambda alt=0.2: bm_elipse((0.215, 0.11, alt), (0, 0.09, CZ - 0.1 - (alt - 0.2) * 0.6), forma=0.9)
mechas = lambda: juntar(bm_elipse((0.05, 0.06, 0.16), (0.19, -0.05, CZ - 0.08)), bm_elipse((0.05, 0.06, 0.16), (-0.19, -0.05, CZ - 0.08)))
cabelo('longo', calota(0.022, 0.1, -0.12, 0.0), bm_elipse((0.12, 0.05, 0.05), (0.04, -0.165, CZ + 0.13), giro=(0.3, 0.3, 0)), costas_longo(0.24), mechas())
ondas = [bm_elipse((0.07, 0.07, 0.07), (math.sin(a) * 0.2, 0.08 + math.cos(a) * 0.05, CZ - 0.1 - k * 0.09), seg=12, aneis=8) for k in range(4) for a in [i / 5 * 3.4 - 1.7 for i in range(6)]]
cabelo('ondulado', calota(0.024, 0.1, -0.12, 0.0), bm_elipse((0.12, 0.05, 0.05), (-0.04, -0.165, CZ + 0.13), giro=(0.3, -0.3, 0)), *ondas)
cabelo('franja', calota(0.022, 0.1, -0.12, 0.0), bm_elipse((0.19, 0.055, 0.06), (0, -0.165, CZ + 0.105), forma=0.85), costas_longo(0.24), mechas())
chanel = bm_elipse((0.272, 0.258, 0.23), (0, 0.012, CZ - 0.005), seg=32, aneis=24)
cortar(chanel, (0, -0.06, 0), (0, 1, 0))
cortar(chanel, (0, 0, CZ - 0.17), (0, 0, 1))
cabelo('chanel', calota(0.026, 0.11, -0.05, 0.0), chanel, bm_elipse((0.2, 0.06, 0.065), (0, -0.165, CZ + 0.12), forma=0.85))
cabelo('rabo', calota(0.02, 0.11, -0.06, 0.0), bm_elipse((0.065, 0.065, 0.17), (0, 0.24, CZ - 0.08), giro=(0.35, 0, 0)), bm_elipse((0.12, 0.05, 0.05), (0.03, -0.165, CZ + 0.13), giro=(0.3, 0.3, 0)))
cabelo('coque', calota(0.02, 0.11, -0.06, 0.0), bm_elipse((0.085, 0.085, 0.08), (0, 0.11, CZ + 0.2)), bm_elipse((0.12, 0.05, 0.05), (-0.03, -0.165, CZ + 0.13), giro=(0.3, -0.3, 0)))
trancas = [bm_elipse((0.036, 0.036, 0.04), (s * 0.08, 0.2 - k * 0.012, CZ - 0.06 - k * 0.06), seg=12, aneis=8) for s in (1, -1) for k in range(8)]
cabelo('trancas', calota(0.02, 0.1, -0.1, 0.0), *trancas)
dreads = [bm_elipse((0.026, 0.026, 0.15 + (i % 3) * 0.03), (math.sin(a) * 0.2, math.cos(a) * 0.19, CZ - 0.1 - (i % 3) * 0.03), seg=10, aneis=8) for i, a in enumerate([j / 13 * 3.6 - 1.8 for j in range(14)])]
cabelo('dreads', calota(0.022, 0.1, -0.06, 0.0), *dreads)
na_cabeca(elipse('extra_rabo_laco', (0.03, 0.03, 0.03), (0, 0.205, CZ + 0.07), LACO))

# ---------- Roupas ----------
def no_tronco(ob):
    prender(ob, 'tronco')
    return ob
no_tronco(objeto('extra_capuz', juntar(bm_elipse((0.17, 0.09, 0.065), (0, 0.085, 1.02), forma=0.85)), CIMA_CLARO))
no_tronco(objeto('extra_cordao', juntar(bm_elipse((0.006, 0.006, 0.05), (0.035, FT - 0.004, 0.93)), bm_elipse((0.006, 0.006, 0.05), (-0.035, FT - 0.004, 0.93)),
                                       bm_elipse((0.01, 0.01, 0.01), (0.035, FT - 0.006, 0.87)), bm_elipse((0.01, 0.01, 0.01), (-0.035, FT - 0.006, 0.87))), BRANCO))
no_tronco(elipse('extra_bolso', (0.115, 0.022, 0.06), (0, FT + 0.012, 0.72), CIMA_ESCURO, forma=0.8))
no_tronco(objeto('extra_gola', juntar(bm_elipse((0.05, 0.03, 0.022), (0.05, -0.105, 1.0), giro=(0.4, 0, -0.5)), bm_elipse((0.05, 0.03, 0.022), (-0.05, -0.105, 1.0), giro=(0.4, 0, 0.5))), CIMA_CLARO))
no_tronco(objeto('extra_botoes_camisa', juntar(*[bm_elipse((0.011, 0.006, 0.011), (0, FT - 0.004, z), seg=10, aneis=6) for z in (0.93, 0.86, 0.79, 0.72)]), BRANCO))
no_tronco(objeto('extra_botoes_polo', juntar(*[bm_elipse((0.01, 0.006, 0.01), (0, FT - 0.004, z), seg=10, aneis=6) for z in (0.95, 0.9)]), BRANCO))
no_tronco(elipse('extra_camisa_interna', (0.052, 0.022, 0.17), (0, FT + 0.012, 0.85), BRANCO, forma=0.8))
no_tronco(objeto('extra_gravata', juntar(bm_elipse((0.022, 0.012, 0.014), (0, FT - 0.006, 0.99)), bm_elipse((0.026, 0.01, 0.11), (0, FT - 0.008, 0.87))), GRAVATA))
no_tronco(objeto('extra_lapelas', juntar(bm_elipse((0.04, 0.012, 0.12), (0.058, FT + 0.004, 0.9), giro=(0, 0.35, 0)), bm_elipse((0.04, 0.012, 0.12), (-0.058, FT + 0.004, 0.9), giro=(0, -0.35, 0))), CIMA_ESCURO))
no_tronco(objeto('extra_babado', corrente([(math.sin(a) * 0.095, -math.cos(a) * 0.095 - 0.025, 1.01) for a in [i / 12 * 2.6 - 1.3 for i in range(13)]], 0.016), BRANCO))
def saia(nome, z0, z1, r0, r1, material, osso_nome):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=False, segments=28, radius1=r1, radius2=r0, depth=z0 - z1)
    for v in bm.verts:
        v.co.y *= 0.82
    bmesh.ops.translate(bm, verts=bm.verts, vec=Vector((0, 0, (z0 + z1) / 2)))
    ob = objeto(nome, bm, material)
    prender(ob, osso_nome)
    ob.data.materials[0] = material
    return ob
saia('extra_vestido_saia', 0.7, 0.36, 0.2, 0.3, CIMA, 'quadril')
saia('extra_vestido_longo_saia', 0.7, 0.08, 0.2, 0.33, CIMA, 'quadril')
saia('extra_saia', 0.66, 0.38, 0.195, 0.28, BAIXO, 'quadril')
saia('extra_saia_longa', 0.66, 0.12, 0.195, 0.31, BAIXO, 'quadril')
cinto = bm_elipse((0.195, 0.142, 0.02), (0, 0, 0.64), forma=0.8)
prender(objeto('extra_cinto', juntar(cinto, bm_elipse((0.028, 0.012, 0.022), (0, -0.146, 0.64))), TINTA), 'quadril')

# Livro (aparece quando lê)
livro = juntar(bm_elipse((0.11, 0.022, 0.078), (0, -0.29, 0.8), forma=0.4))
no_tronco(objeto('extra_livro', livro, LIVRO))
no_tronco(elipse('extra_livro_paginas', (0.1, 0.024, 0.07), (0, -0.282, 0.8), BRANCO, forma=0.4))

# ---------- Fantasias (compradas na loja) ----------
# Cada fantasia é um conjunto de peças "fant_<id>_..." com cores fixas. O app liga as peças,
# pinta a roupa de base (cima/baixo/calçado) com as cores da fantasia e esconde ou troca o cabelo.
METAL = mat('f_metal', '#A3ACB8', 0.35)
METAL_ESCURO = mat('f_metal_escuro', '#7E8794', 0.4)
OURO = mat('f_ouro', '#E8B83A', 0.3)
AZUL = mat('f_azul', '#2F6FD6', 0.5)
MADEIRA_F = mat('f_madeira', '#8A5A3C', 0.7)
COURO_F = mat('f_couro', '#5E3A26', 0.6)
PANO = mat('f_pano', '#F5F0E6', 0.85)
LISTRA = mat('f_listra', '#6E4A2E', 0.8)
VERMELHO = mat('f_vermelho', '#B3203A', 0.6)
VINHO = mat('f_vinho', '#7A1426', 0.6)
BRANCO_F = mat('f_branco', '#F7F4EE', 0.6)
PRETO_F = mat('f_preto', '#1E1622', 0.5)
MARFIM = mat('f_marfim', '#F1E6CF', 0.5)
VERDE_OLIVA = mat('f_oliva', '#6B7F4A', 0.8)
CAQUI = mat('f_caqui', '#C9B48A', 0.8)
LARANJA = mat('f_laranja', '#F07A22', 0.45)
AZUL_ESCURO = mat('f_azul_escuro', '#24345C', 0.6)
CIANO = mat('f_ciano', '#46E6FF', 0.3, brilho=2.2)
LUZ = mat('f_luz', '#FFE9A0', 0.3, brilho=3.0)
AURA = mat('f_aura', '#FFD54A', 0.3, brilho=1.2)
PENA = mat('f_pena', '#F4F7FB', 0.7)
PEIXE = mat('f_peixe', '#FF8A3D', 0.5)

def bm_cil(a, b, r1, r2=None, seg=12, tampa=True):
    """Cilindro (ou cone) entre dois pontos."""
    a, b = Vector(a), Vector(b)
    d = b - a
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=tampa, segments=seg, radius1=r1, radius2=r2 if r2 is not None else r1, depth=d.length)
    rot = Vector((0, 0, 1)).rotation_difference(d.normalized()).to_matrix()
    bmesh.ops.rotate(bm, verts=bm.verts, cent=(0, 0, 0), matrix=rot)
    bmesh.ops.translate(bm, verts=bm.verts, vec=(a + b) / 2)
    return bm

def bm_caixa(tam, centro=(0, 0, 0), forma=0.35):
    """Caixinha de cantos arredondados (superelipsoide)."""
    return bm_elipse(tuple(t / 2 for t in tam), centro, seg=12, aneis=8, forma=forma)

def anel_bolas(centro, raio, r_bola, n=24, eixo='z', inclina=0.0):
    """Argola feita de bolinhas (aro, auréola, coroa, gola)."""
    cx, cy, cz = centro
    pts = []
    for i in range(n):
        a = i / n * 2 * math.pi
        if eixo == 'z':
            pts.append((cx + math.cos(a) * raio[0], cy + math.sin(a) * raio[1], cz + math.sin(a) * inclina))
        else:  # aro de pé, no plano YZ (escudo virado para o lado)
            pts.append((cx, cy + math.cos(a) * raio[0], cz + math.sin(a) * raio[1]))
    return juntar(*[bm_elipse((r_bola,) * 3, p, seg=8, aneis=5) for p in pts])

def mover(bm, giro=(0, 0, 0), pos=(0, 0, 0)):
    """Gira em volta da origem e leva para a posição (peças montadas em coordenadas locais)."""
    bmesh.ops.rotate(bm, verts=bm.verts, cent=(0, 0, 0), matrix=Euler(giro).to_matrix())
    bmesh.ops.translate(bm, verts=bm.verts, vec=Vector(pos))
    return bm

MAO_R = Vector((-(XB + 0.034), -0.01, PULSO - 0.035))
MAO_L = Vector(((XB + 0.034), -0.01, PULSO - 0.035))

def peca(nome, bm, material, osso_nome):
    ob = objeto(nome, bm, material)
    prender(ob, osso_nome)
    return ob

def na_mao_direita(nome, partes):
    """partes: [(bm, material)] em coordenadas locais com a empunhadura na origem."""
    for i, (bm, m) in enumerate(partes):
        peca(f'{nome}{i}', mover(bm, (0, 0, 0), MAO_R), m, 'antebraco_R')

def no_braco_esquerdo(nome, partes, giro, pos):
    for i, (bm, m) in enumerate(partes):
        peca(f'{nome}{i}', mover(bm, giro, pos), m, 'antebraco_L')

def elmo(espessura, frente, tras):
    return calota(espessura, frente, tras, 0.0)

# --- Cavaleiro da Fé (armadura de Deus) ---
crista = [bm_elipse((0.022, 0.03, 0.03), (0, -math.cos(a) * (RY + 0.055), CZ + math.sin(a) * (RZ + 0.055)), seg=8, aneis=6) for a in [math.radians(40 + i * 11) for i in range(10)]]
na_cabeca(objeto('fant_cavaleiro_elmo', juntar(elmo(0.04, 0.075, -0.16),
    bm_elipse((0.05, 0.06, 0.09), (0.215, -0.04, CZ - 0.07)), bm_elipse((0.05, 0.06, 0.09), (-0.215, -0.04, CZ - 0.07))), METAL))
na_cabeca(objeto('fant_cavaleiro_crista', juntar(*crista), OURO))
no_tronco(objeto('fant_cavaleiro_peito', bm_elipse((0.215, 0.16, 0.175), (0, -0.004, 0.83), seg=24, aneis=16, forma=0.75), METAL))
no_tronco(objeto('fant_cavaleiro_cruz', juntar(bm_caixa((0.032, 0.016, 0.13), (0, -0.165, 0.85)), bm_caixa((0.1, 0.016, 0.032), (0, -0.165, 0.875))), AZUL))
no_tronco(objeto('fant_cavaleiro_borda', anel_bolas((0, -0.004, 0.68), (0.205, 0.155), 0.016, n=30), OURO))
no_tronco(objeto('fant_cavaleiro_capa', mover(bm_elipse((0.21, 0.028, 0.33), seg=16, aneis=12, forma=0.85), (-0.12, 0, 0), (0, 0.19, 0.64)), AZUL))
for lado, s in (('L', 1), ('R', -1)):
    peca(f'fant_cavaleiro_ombreira_{lado}', bm_elipse((0.09, 0.09, 0.065), (s * (XB + 0.01), 0, OMBRO + 0.02), forma=0.8), METAL, f'braco_{lado}')
prender(objeto('fant_cavaleiro_cinto', juntar(bm_elipse((0.198, 0.146, 0.024), (0, 0, 0.665), forma=0.8), bm_caixa((0.05, 0.02, 0.04), (0, -0.15, 0.665))), COURO_F), 'quadril')
no_braco_esquerdo('fant_cavaleiro_mao_escudo', [
    (bm_elipse((0.022, 0.13, 0.17), seg=20, aneis=12, forma=0.7), AZUL),
    (bm_elipse((0.014, 0.142, 0.182), (-0.008, 0, 0), seg=20, aneis=12, forma=0.7), OURO),
    (juntar(bm_caixa((0.014, 0.03, 0.2), (0.022, 0, 0)), bm_caixa((0.014, 0.15, 0.03), (0.022, 0, 0.04))), OURO),
], (0, 0, -0.75), MAO_L + Vector((0.075, -0.03, 0.12)))
espada = [
    (bm_cil((0, 0.04, 0), (0, -0.06, 0), 0.016), COURO_F),
    (juntar(bm_caixa((0.14, 0.022, 0.026), (0, -0.07, 0)), bm_elipse((0.022,) * 3, (0, 0.05, 0))), OURO),
    (bm_elipse((0.01, 0.2, 0.03), (0, -0.28, 0), seg=10, aneis=8, forma=0.55), METAL),
]
na_mao_direita('fant_cavaleiro_mao_espada', [(mover(b, (0.55, 0, -0.35)), m) for b, m in espada])

# --- Pastor Davi ---
na_cabeca(objeto('fant_pastor_manto', juntar(calota(0.035, 0.095, -0.32, 0.0), bm_elipse((0.21, 0.085, 0.17), (0, 0.15, CZ - 0.2), forma=0.9)), PANO))
na_cabeca(objeto('fant_pastor_listras', juntar(*[bm_elipse((0.035, 0.03, 0.17), (s * 0.235, 0.05, CZ - 0.13), seg=10, aneis=8) for s in (1, -1)]), LISTRA))
na_cabeca(objeto('fant_pastor_faixa', anel_bolas((0, 0.01, CZ + 0.07), (RX + 0.045, RY + 0.045), 0.02, n=34, inclina=-0.03), MADEIRA_F))
for lado, s in (('L', 1), ('R', -1)):
    colete_p = bm_elipse((0.212, 0.158, 0.185), (0, -0.002, 0.82), seg=24, aneis=16, forma=0.78)
    cortar(colete_p, (s * 0.035, 0, 0), (s, 0, 0))
    no_tronco(objeto(f'fant_pastor_colete_{lado}', colete_p, PANO))
prender(objeto('fant_pastor_cinto', juntar(bm_elipse((0.202, 0.15, 0.028), (0, 0, 0.67), forma=0.8), bm_caixa((0.048, 0.02, 0.04), (0, -0.15, 0.67))), COURO_F), 'quadril')
gancho = corrente([(-0.075 + math.cos(a) * 0.075, 0, 0.98 + math.sin(a) * 0.075) for a in [i / 10 * (math.pi + 0.7) for i in range(11)]], 0.017)
na_mao_direita('fant_pastor_mao_cajado', [(juntar(bm_cil((0, 0, -0.5), (0, 0, 0.98), 0.016), gancho), MADEIRA_F)])

# --- Rei Davi ---
pontas = [bm_cil((math.cos(a) * 0.19, math.sin(a) * 0.18, CZ + 0.2), (math.cos(a) * 0.19, math.sin(a) * 0.18, CZ + 0.29), 0.03, 0.004, seg=6) for a in [i / 8 * 2 * math.pi for i in range(8)]]
coroa = bm_cil((0, 0, CZ + 0.15), (0, 0, CZ + 0.215), 0.195, 0.2, seg=28, tampa=False)
for v in coroa.verts:
    v.co.y *= 0.95
na_cabeca(objeto('fant_rei_coroa', juntar(coroa, *pontas), OURO))
na_cabeca(objeto('fant_rei_joias', juntar(*[bm_elipse((0.02, 0.012, 0.02), (math.cos(a) * 0.2, math.sin(a) * 0.19, CZ + 0.18)) for a in [-math.pi / 2 + k * 0.6 for k in (-1, 0, 1)]]), VERMELHO))
no_tronco(objeto('fant_rei_capa', mover(bm_elipse((0.24, 0.03, 0.43), seg=16, aneis=12, forma=0.85), (-0.06, 0, 0), (0, 0.195, 0.56)), VERMELHO))
no_tronco(objeto('fant_rei_gola', anel_bolas((0, -0.005, 0.99), (0.155, 0.125), 0.024, n=22), OURO))
no_tronco(objeto('fant_rei_detalhe', juntar(bm_caixa((0.032, 0.016, 0.18), (0, -0.155, 0.84)), bm_caixa((0.095, 0.016, 0.03), (0, -0.155, 0.87))), OURO))
aba_r = bm_cil((0, 0, 0.7), (0, 0, 0.42), 0.204, 0.255, seg=28, tampa=False)
for v in aba_r.verts:
    v.co.y *= 0.82
cortar(aba_r, (0, -0.055, 0), (0, 1, 0))
prender(objeto('fant_rei_aba', aba_r, mat('f_roxo_real', '#6A2A8C', 0.65)), 'quadril')
prender(objeto('fant_rei_cinto', juntar(bm_elipse((0.202, 0.15, 0.028), (0, 0, 0.67), forma=0.8), bm_caixa((0.052, 0.022, 0.044), (0, -0.152, 0.67))), OURO), 'quadril')
harpa = juntar(
    corrente([(-0.06 - 0.02 * math.sin(t * math.pi), 0, t * 0.22) for t in [i / 8 for i in range(9)]], 0.014),
    corrente([(0.06 + 0.02 * math.sin(t * math.pi), 0, t * 0.22) for t in [i / 8 for i in range(9)]], 0.014),
    bm_cil((-0.075, 0, 0.215), (0.075, 0, 0.215), 0.013),
    bm_elipse((0.075, 0.035, 0.035), (0, 0, 0.0)),
)
cordas = juntar(*[bm_cil((x, 0, 0.02), (x, 0, 0.21), 0.0035, seg=6) for x in (-0.03, -0.01, 0.01, 0.03)])
no_braco_esquerdo('fant_rei_mao_harpa', [(harpa, OURO), (cordas, BRANCO_F)], (0, 0, 0.2), MAO_L + Vector((0.03, -0.05, 0.0)))

# --- Rainha Ester (perfil feminino) ---
pontas_e = [bm_cil((math.cos(a) * 0.175, math.sin(a) * 0.168, CZ + 0.205), (math.cos(a) * 0.175, math.sin(a) * 0.168, CZ + 0.28 + (0.03 if i == 6 else 0)), 0.024, 0.004, seg=6) for i, a in enumerate([k / 8 * 2 * math.pi for k in range(8)])]
coroa_e = bm_cil((0, 0, CZ + 0.16), (0, 0, CZ + 0.215), 0.18, 0.185, seg=28, tampa=False)
for v in coroa_e.verts:
    v.co.y *= 0.95
na_cabeca(objeto('fant_ester_coroa', juntar(coroa_e, *pontas_e), OURO))
na_cabeca(objeto('fant_ester_joias', juntar(*[bm_elipse((0.02, 0.012, 0.02), (math.cos(a) * 0.185, math.sin(a) * 0.176, CZ + 0.188)) for a in [-math.pi / 2 + k * 0.55 for k in (-1, 0, 1)]]), mat('f_rubi_rosa', '#FE0472', 0.35)))
no_tronco(objeto('fant_ester_capa', mover(bm_elipse((0.23, 0.028, 0.42), seg=16, aneis=12, forma=0.85), (-0.06, 0, 0), (0, 0.195, 0.56)), mat('f_manto_ester', '#9A2B6E', 0.6)))
no_tronco(objeto('fant_ester_gola', anel_bolas((0, -0.005, 0.995), (0.16, 0.13), 0.028, n=18), BRANCO_F))
prender(objeto('fant_ester_cinto', bm_elipse((0.205, 0.152, 0.024), (0, 0, 0.71), forma=0.8), OURO), 'quadril')
cetro = [
    (bm_cil((0, 0, -0.22), (0, 0, 0.34), 0.013), OURO),
    (bm_elipse((0.038,) * 3, (0, 0, 0.37)), mat('f_joia_cetro', '#FE0472', 0.3)),
    (anel_bolas((0, 0, 0.37), (0.044, 0.044), 0.01, n=14), OURO),
]
na_mao_direita('fant_ester_mao_cetro', [(mover(b, (0.35, 0, -0.15)), m) for b, m in cetro])

# --- Pescador Pedro ---
copa = bm_elipse((0.25, 0.24, 0.17), (0, 0.005, CZ + 0.095), seg=28, aneis=18)
cortar(copa, (0, 0, CZ + 0.085), (0, 0, 1))
aba = bm_cil((0, 0.005, CZ + 0.09), (0, 0.005, CZ + 0.035), 0.25, 0.33, seg=28, tampa=False)
na_cabeca(objeto('fant_pescador_chapeu', juntar(copa, aba), VERDE_OLIVA))
na_cabeca(objeto('fant_pescador_fita', bm_cil((0, 0.005, CZ + 0.09), (0, 0.005, CZ + 0.125), 0.252, 0.247, seg=28, tampa=False), COURO_F))
for lado, s in (('L', 1), ('R', -1)):
    painel = bm_elipse((0.212, 0.157, 0.19), (0, -0.002, 0.82), seg=24, aneis=16, forma=0.78)
    cortar(painel, (s * 0.03, 0, 0), (s, 0, 0))
    no_tronco(objeto(f'fant_pescador_colete_{lado}', painel, CAQUI))
no_tronco(objeto('fant_pescador_bolsos', juntar(*[bm_caixa((0.06, 0.02, 0.05), (s * 0.095, -0.155, z)) for s in (1, -1) for z in (0.76, 0.86)]), CAQUI))
vara = [
    (juntar(bm_cil((0, 0.06, 0), (0, -0.08, 0), 0.017), bm_cil((0.03, -0.02, 0), (0.06, -0.02, 0), 0.03)), PRETO_F),
    (bm_cil((0, -0.08, 0), (0, -0.82, 0), 0.008, 0.004, seg=8), MADEIRA_F),
]
na_mao_direita('fant_pescador_mao_vara', [(mover(b, (-0.85, 0, -0.25)), m) for b, m in vara])
ponta = Vector((0, -0.82, 0))
ponta.rotate(Euler((-0.85, 0, -0.25)))
linha = bm_cil(ponta, ponta - Vector((0, 0, 0.42)), 0.0025, seg=5)
peixe = juntar(bm_elipse((0.03, 0.06, 0.035), ponta - Vector((0, 0, 0.47))), bm_cil(ponta - Vector((0, -0.05, 0.47)), ponta - Vector((0, -0.09, 0.47)), 0.002, 0.03, seg=6))
na_mao_direita('fant_pescador_mao_linha', [(linha, BRANCO_F)])
na_mao_direita('fant_pescador_mao_peixe', [(peixe, PEIXE)])

# --- Anjo ---
na_cabeca(objeto('fant_anjo_aureola', anel_bolas((0, 0.02, CZ + 0.4), (0.14, 0.13), 0.024, n=30), AURA))
asa = lambda s: juntar(*[bm_elipse((0.24 - k * 0.035, 0.026, 0.065), (s * (0.24 + k * 0.03), 0.2 + k * 0.012, 1.0 - k * 0.085), giro=(0, s * (-0.6 + k * 0.3), s * 0.35), seg=14, aneis=8) for k in range(5)])
no_tronco(objeto('fant_anjo_asas', juntar(asa(1), asa(-1)), PENA))
prender(objeto('fant_anjo_cordao', bm_elipse((0.205, 0.152, 0.018), (0, 0, 0.71), forma=0.8), OURO), 'quadril')

# --- Pirata ---
copa_p = bm_elipse((0.2, 0.19, 0.11), (0, 0.01, CZ + 0.2), seg=24, aneis=14)
aba_p = bm_elipse((0.37, 0.18, 0.045), (0, 0.0, 0), seg=32, aneis=12)
for v in aba_p.verts:
    v.co.z += 0.9 * v.co.x * v.co.x
bmesh.ops.translate(aba_p, verts=aba_p.verts, vec=Vector((0, 0.01, CZ + 0.16)))
na_cabeca(objeto('fant_pirata_chapeu', juntar(copa_p, aba_p), VINHO))
borda_p = juntar(*[bm_elipse((0.013,) * 3, (math.cos(a) * 0.37, 0.01 + math.sin(a) * 0.18, CZ + 0.16 + 0.9 * (math.cos(a) * 0.37) ** 2 + 0.02), seg=6, aneis=4) for a in [i / 40 * 2 * math.pi for i in range(40)]])
na_cabeca(objeto('fant_pirata_borda', borda_p, OURO))
na_cabeca(objeto('fant_pirata_caveira', juntar(bm_elipse((0.032, 0.012, 0.03), (0, -0.2, CZ + 0.2)), bm_elipse((0.022, 0.01, 0.012), (0, -0.2, CZ + 0.17))), BRANCO_F))
olho_d = rosto(-0.085, EY, 0.014)
pts_tira = []
for i in range(26):
    f = -0.5 - i / 25 * (2 * math.pi - 1.6)
    z = EY + 0.02 + max(0.0, (-f - 3.4)) * 0.09
    pts_tira.append((math.sin(f) * (RX + 0.01), -math.cos(f) * (RY + 0.01), z))
na_cabeca(objeto('fant_pirata_tapa', juntar(bm_elipse((0.05, 0.014, 0.045), olho_d), corrente(pts_tira, 0.008)), PRETO_F))
no_tronco(objeto('fant_pirata_camisa', bm_elipse((0.055, 0.022, 0.17), (0, FT + 0.01, 0.85), forma=0.8), BRANCO_F))
no_tronco(objeto('fant_pirata_botoes', juntar(*[bm_elipse((0.011, 0.007, 0.011), (s * 0.075, FT - 0.004, z), seg=8, aneis=5) for s in (1, -1) for z in (0.92, 0.84, 0.76)]), OURO))
aba_c = bm_cil((0, 0, 0.7), (0, 0, 0.4), 0.205, 0.27, seg=28, tampa=False)
for v in aba_c.verts:
    v.co.y *= 0.82
cortar(aba_c, (0, -0.06, 0), (0, 1, 0))
prender(objeto('fant_pirata_aba', aba_c, VERMELHO), 'quadril')
prender(objeto('fant_pirata_cinto', juntar(bm_elipse((0.2, 0.148, 0.026), (0, 0, 0.665), forma=0.8)), PRETO_F), 'quadril')
prender(objeto('fant_pirata_fivela', bm_caixa((0.05, 0.02, 0.042), (0, -0.152, 0.665)), OURO), 'quadril')
lamina = bm_elipse((0.009, 0.17, 0.03), (0, -0.25, 0), seg=10, aneis=8, forma=0.6)
for v in lamina.verts:
    v.co.z += 2.2 * (v.co.y + 0.08) ** 2
cutelo = [(bm_cil((0, 0.04, 0), (0, -0.06, 0), 0.016), COURO_F), (juntar(bm_caixa((0.1, 0.02, 0.022), (0, -0.07, 0)), bm_elipse((0.03, 0.012, 0.035), (0, -0.06, -0.035))), OURO), (lamina, METAL)]
na_mao_direita('fant_pirata_mao_espada', [(mover(b, (0.5, 0, -0.35)), m) for b, m in cutelo])

# --- Viking ---
chifre = lambda s: juntar(*[bm_elipse((0.055 - k * 0.0055,) * 3, (s * (0.21 + 0.15 * (k / 8) ** 0.8), -0.02, CZ + 0.06 + 0.2 * (k / 8) ** 1.7), seg=10, aneis=6) for k in range(9)])
na_cabeca(objeto('fant_viking_elmo', elmo(0.04, 0.09, -0.08), METAL))
na_cabeca(objeto('fant_viking_faixa', anel_bolas((0, 0.0, CZ + 0.055), (RX + 0.045, RY + 0.045), 0.02, n=34, inclina=-0.04), COURO_F))
na_cabeca(objeto('fant_viking_chifres', juntar(chifre(1), chifre(-1)), MARFIM))
no_tronco(objeto('fant_viking_tiras', juntar(*[bm_caixa((0.035, 0.02, 0.3), (s * 0.08, -0.15, 0.84)) for s in (1, -1)], *[bm_caixa((0.035, 0.02, 0.3), (s * 0.08, 0.15, 0.84)) for s in (1, -1)]), COURO_F))
prender(objeto('fant_viking_cinto', juntar(bm_elipse((0.2, 0.148, 0.03), (0, 0, 0.665), forma=0.8)), COURO_F), 'quadril')
prender(objeto('fant_viking_fivela', bm_elipse((0.03, 0.014, 0.03), (0, -0.152, 0.665)), METAL), 'quadril')
for lado, s in (('L', 1), ('R', -1)):
    peca(f'fant_viking_pelo_{lado}', anel_bolas((s * XP, 0, 0.16), (0.08, 0.075), 0.032, n=14), BRANCO_F, f'canela_{lado}')
no_braco_esquerdo('fant_viking_mao_escudo', [
    (bm_cil((-0.012, 0, 0), (0.012, 0, 0), 0.165, seg=28), AZUL),
    (anel_bolas((0, 0, 0), (0.165, 0.165), 0.016, n=30, eixo='x'), METAL),
    (bm_elipse((0.03, 0.045, 0.045), (0.018, 0, 0)), METAL),
], (0, 0, -0.7), MAO_L + Vector((0.08, -0.03, 0.12)))
machado = [(bm_cil((0, 0.05, 0), (0, -0.36, 0), 0.015), MADEIRA_F), (mover(bm_elipse((0.012, 0.06, 0.08), forma=0.6), (0, 0, 0), (0, -0.32, 0.05)), METAL)]
na_mao_direita('fant_viking_mao_machado', [(mover(b, (0.45, 0, -0.3)), m) for b, m in machado])

# --- Robô ---
na_cabeca(objeto('fant_robo_cabeca', bm_elipse((0.27, 0.25, 0.24), (0, 0, CZ + 0.01), seg=28, aneis=20, forma=0.32), METAL))
na_cabeca(objeto('fant_robo_olhos', juntar(*[bm_elipse((0.048, 0.014, 0.032), (s * 0.09, -0.252, CZ + 0.04), forma=0.45) for s in (1, -1)]), CIANO))
na_cabeca(objeto('fant_robo_boca', bm_elipse((0.1, 0.012, 0.035), (0, -0.252, CZ - 0.09), forma=0.4), PRETO_F))
na_cabeca(objeto('fant_robo_grade', juntar(*[bm_caixa((0.012, 0.012, 0.045), (x, -0.262, CZ - 0.09)) for x in (-0.06, -0.03, 0, 0.03, 0.06)]), METAL_ESCURO))
na_cabeca(objeto('fant_robo_antena', bm_cil((0, 0, CZ + 0.24), (0, 0, CZ + 0.38), 0.009), METAL_ESCURO))
na_cabeca(objeto('fant_robo_luzes', juntar(bm_elipse((0.03,) * 3, (0, 0, CZ + 0.4)), *[bm_cil((s * 0.268, 0, CZ), (s * 0.292, 0, CZ), 0.045, seg=16) for s in (1, -1)]), CIANO))
no_tronco(objeto('fant_robo_painel', bm_caixa((0.18, 0.03, 0.17), (0, -0.152, 0.83)), LARANJA))
no_tronco(objeto('fant_robo_tela', juntar(bm_cil((0, -0.165, 0.86), (0, -0.172, 0.86), 0.035, seg=20)), CIANO))
no_tronco(objeto('fant_robo_linhas', juntar(*[bm_caixa((0.1, 0.01, 0.01), (0, -0.168, z)) for z in (0.8, 0.78, 0.76)]), PRETO_F))

# --- Mineiro ---
casco = bm_elipse((0.255, 0.245, 0.18), (0, 0.0, CZ + 0.08), seg=28, aneis=18)
cortar(casco, (0, 0, CZ + 0.075), (0, 0, 1))
aba_m = bm_cil((0, 0, CZ + 0.08), (0, 0, CZ + 0.06), 0.255, 0.3, seg=28, tampa=False)
na_cabeca(objeto('fant_mineiro_capacete', juntar(casco, aba_m, corrente([(0, -math.cos(a) * 0.25, CZ + 0.08 + math.sin(a) * 0.18) for a in [math.radians(25 + i * 13) for i in range(11)]], 0.02)), LARANJA))
na_cabeca(objeto('fant_mineiro_lanterna', bm_cil((0, -0.23, CZ + 0.15), (0, -0.29, CZ + 0.15), 0.04, 0.045, seg=16), METAL_ESCURO))
na_cabeca(objeto('fant_mineiro_luz', bm_cil((0, -0.288, CZ + 0.15), (0, -0.297, CZ + 0.15), 0.034, seg=16), LUZ))
no_tronco(objeto('fant_mineiro_suspensorio', juntar(*[bm_caixa((0.035, 0.02, 0.32), (s * 0.085, -0.15, 0.82)) for s in (1, -1)], *[bm_caixa((0.035, 0.02, 0.32), (s * 0.085, 0.15, 0.82)) for s in (1, -1)], *[bm_elipse((0.014, 0.01, 0.014), (s * 0.085, -0.162, 0.7)) for s in (1, -1)]), AZUL_ESCURO))
cabeca_pic = bm_elipse((0.016, 0.022, 0.15), (0, -0.35, 0), seg=10, aneis=12, forma=0.8)
for v in cabeca_pic.verts:
    v.co.y += 1.6 * v.co.z * v.co.z
picareta = [(bm_cil((0, 0.05, 0), (0, -0.36, 0), 0.015), MADEIRA_F), (cabeca_pic, METAL_ESCURO)]
na_mao_direita('fant_mineiro_mao_picareta', [(mover(b, (0.45, 0, -0.3)), m) for b, m in picareta])

# Peças exclusivas da expansão: costuras, jardineira, pantufas e estampas.
DENIM = mat('denim_jardim', '#385F79', 0.85)
LINHO = mat('linho_festa', '#F7E9C9', 0.85)
LA = mat('la_ovelha', '#FFF4E0', 0.95)
no_tronco(objeto('extra_macacao', juntar(
    bm_caixa((0.20, 0.018, 0.24), (0, -0.156, 0.79)),
    *[bm_caixa((0.033, 0.024, 0.17), (sg * 0.075, -0.135, 0.96)) for sg in (-1,1)]), DENIM))
no_tronco(objeto('extra_macacao_bolso', bm_caixa((0.10, 0.014, 0.08), (0, -0.174, 0.79)), AZUL_ESCURO))
for lado, sg in [('L',1),('R',-1)]:
    x=sg*XP
    prender(objeto(f'pe_ovelha_{lado}', juntar(
        bm_elipse((0.091,0.145,0.068),(x,-0.045,0.067)),
        *[bm_elipse((0.025,0.026,0.050),(x+e*0.050,-0.080,0.144)) for e in (-1,1)]), LA), f'canela_{lado}')
    prender(objeto(f'pe_ovelha_rosto_{lado}', juntar(
        *[bm_elipse((0.009,0.009,0.009),(x+e*0.025,-0.174,0.085)) for e in (-1,1)],
        bm_elipse((0.012,0.009,0.010),(x,-0.184,0.060))), PRETO_F), f'canela_{lado}')
    prender(objeto(f'extra_pijama_{lado}', juntar(*[
        bm_elipse((0.026,0.010,0.023),(x+dx,-0.084,z)) for dx,z in [(-.022,.47),(.025,.40),(0,.53)]
    ]), LA), f'coxa_{lado}')

def estampa(nome, texto, z, tamanho, material):
    bpy.ops.object.select_all(action='DESELECT')
    curva=bpy.data.curves.new(nome, 'FONT'); curva.body=texto; curva.align_x='CENTER'; curva.size=tamanho; curva.extrude=.0003
    ob=bpy.data.objects.new(nome,curva); bpy.context.collection.objects.link(ob)
    ob.location=(0,-.168,z); ob.rotation_euler=(math.pi/2,0,0); curva.materials.append(material)
    bpy.context.view_layer.objects.active=ob; ob.select_set(True)
    bpy.ops.object.convert(target='MESH'); bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
    prender(ob,'tronco'); ob.select_set(False)
estampa('extra_estampa_paz','PAZ & GRAÇA',.83,.026,LA)
estampa('extra_estampa_conf','FÉ EM AÇÃO',.83,.029,LA)
for k,cor in enumerate(['#CA4E50','#DEB54E','#3F8B86','#3C679F','#9473AC']):
    tecido=mat(f'jose_faixa_{k}',cor,.8)
    no_tronco(objeto(f'fant_jose_faixa{k}',bm_caixa((.040,.012,.27),(-.08+k*.04,-.159,.80)),tecido))
no_tronco(objeto('fant_tunicaFestiva_faixa',bm_caixa((.31,.025,.045),(0,-.136,.68)),OURO))
no_tronco(objeto('fant_tunicaFestiva_gola',juntar(*[bm_caixa((.026,.02,.12),(sg*.075,-.139,.955)) for sg in (-1,1)]),OURO))

# Proporções mais naturais, mantendo a linguagem estilizada e todas as peças do rig.
# Transformamos juntas, malhas, roupas, cabelos e shape keys no mesmo espaço.
def proporcao(p, cabeca=False):
    q = p.copy()
    q.x *= 0.66 if cabeca else 0.96
    q.y *= 0.7 if cabeca else 0.94
    if cabeca:
        q.z = 1.22 + (p.z - 1.03) * 0.66
    elif p.z <= 0.6:
        q.z = p.z * (0.73 / 0.6)
    else:
        q.z = 0.73 + (p.z - 0.6) * (0.49 / 0.43)
    return q

for ob in list(bpy.data.objects):
    if ob.type != 'MESH':
        continue
    eh_cabeca = ob.parent_bone == 'cabeca'
    if ob.data.shape_keys:
        for chave in ob.data.shape_keys.key_blocks:
            for v in chave.data:
                v.co = proporcao(v.co, eh_cabeca)
    else:
        for v in ob.data.vertices:
            v.co = proporcao(v.co, eh_cabeca)
    ob.data.update()
bpy.context.view_layer.objects.active = arm
bpy.ops.object.mode_set(mode='EDIT')
for b in arm.data.edit_bones:
    b.head = proporcao(b.head)
    b.tail = proporcao(b.tail)
bpy.ops.object.mode_set(mode='OBJECT')
for ob in list(bpy.data.objects):
    if ob.type == 'MESH' and ob.parent_bone:
        b = arm.data.bones[ob.parent_bone]
        ob.matrix_parent_inverse = (arm.matrix_world @ b.matrix_local @ Matrix.Translation((0, b.length, 0))).inverted()

# ---------- Animações ----------
ROT = {}
def pose(t, **giros):
    """Guarda rotações (graus) de cada osso num quadro."""
    ROT.setdefault(t, {}).update(giros)

def acao(nome, quadros, loc=None):
    """quadros: {quadro: {osso: (x, y, z) em graus}}; loc: {quadro: z da raiz}"""
    act = bpy.data.actions.new(nome)
    act.use_fake_user = True
    arm.animation_data_create()
    arm.animation_data.action = act
    for pb in arm.pose.bones:
        pb.rotation_mode = 'XYZ'
    for f, ossos_q in sorted(quadros.items()):
        for pb in arm.pose.bones:
            g = ossos_q.get(pb.name, (0, 0, 0))
            pb.rotation_euler = Euler([math.radians(a) for a in g], 'XYZ')
            pb.keyframe_insert('rotation_euler', frame=f)
        raiz = arm.pose.bones['raiz']
        raiz.location = (0, 0, 0)
        raiz.location[1] = (loc or {}).get(f, 0)  # osso da raiz aponta para +Z: o eixo Y local é a altura
        raiz.keyframe_insert('location', frame=f)
    return act

def lados(nome, l, r=None):
    """Mesmo giro nos dois lados, espelhando y e z."""
    r = r if r is not None else (l[0], -l[1], -l[2])
    return {f'{nome}_L': l, f'{nome}_R': r}

parado = {}
for f, k in ((0, 0), (24, 1), (48, 0)):
    parado[f] = {'tronco': (1.5 * k, 0, 0), 'cabeca': (-2 * k, 0, 2 * k), **lados('braco', (3 * k, 0, -4)), **lados('antebraco', (-6, 0, 0))}
acao('parado', parado, {0: 0, 24: -0.006, 48: 0})

andar = {}
for f, s in ((0, 1), (6, 0), (12, -1), (18, 0), (24, 1)):
    andar[f] = {
        'coxa_L': (-24 * s, 0, 0), 'coxa_R': (24 * s, 0, 0),
        'canela_L': (8 + (22 if f == 6 else 4), 0, 0),
        'canela_R': (8 + (22 if f == 18 else 4), 0, 0),
        'braco_L': (20 * s, 0, -4), 'braco_R': (-20 * s, 0, 4),
        'antebraco_L': (-14, 0, 0), 'antebraco_R': (-14, 0, 0),
        'tronco': (3, 0, 4 * s), 'cabeca': (-2, 0, -3 * s),
    }
acao('andar', andar, {0: 0, 6: 0.025, 12: 0, 18: 0.025, 24: 0})

sentado = {f: {**lados('coxa', (-88, 0, 4)), **lados('canela', (92, 0, 0)), **lados('braco', (-18, 0, -6)), **lados('antebraco', (-50, 0, 6)), 'tronco': (-4 + k, 0, 0), 'cabeca': (2 * k, 0, 0)} for f, k in ((0, 0), (36, 2), (72, 0))}
acao('sentado', sentado)

# Separate running, cycling and singing from jumping jacks.
correr = {}
pedalar = {}
for f in range(0, 25, 3):
    t = f / 24 * 2 * math.pi
    s = math.cos(t)
    correr[f] = {'coxa_L': (-42*s,0,0), 'coxa_R': (42*s,0,0),
        'canela_L': (35+30*math.sin(t),0,0), 'canela_R': (35-30*math.sin(t),0,0),
        'braco_L': (32*s,0,-5), 'braco_R': (-32*s,0,5),
        **lados('antebraco',(-75,0,0)), 'tronco': (8,0,0)}
    pedalar[f] = {'coxa_L': (-60-28*s,0,0), 'coxa_R': (-60+28*s,0,0),
        'canela_L': (78+36*math.sin(t),0,0), 'canela_R': (78-36*math.sin(t),0,0),
        **lados('braco',(-48,0,-8)), **lados('antebraco',(-25,0,0)), 'tronco': (12,0,0), 'cabeca':(-8,0,0)}
acao('correr',correr,{f:abs(math.sin(f/24*2*math.pi))*.045 for f in correr})
acao('pedalar',pedalar)
acao('cantar',{f:{'braco_R':(-38,0,-12),'antebraco_R':(-105,0,0),
    'braco_L':(-15,0,-16-k),'antebraco_L':(-25,0,0),'tronco':(0,0,k),'cabeca':(-4,0,-k)} for f,k in ((0,-2),(24,2),(48,-2))})

deitado = {f: {**lados('braco', (0, 0, -10 - k)), **lados('antebraco', (-10, 0, 0)), 'cabeca': (0, 0, k)} for f, k in ((0, 0), (48, 3), (96, 0))}
acao('deitado', deitado)
orar = {f: {**lados('braco', (-38, 0, 22)), **lados('antebraco', (-100, 0, 12)), 'cabeca': (14 + k, 0, 0), 'tronco': (4, 0, 0)} for f, k in ((0, 0), (36, 3), (72, 0))}
acao('orar', orar)
ler = {f: {**lados('braco', (-24, 0, 12)), **lados('antebraco', (-72, 0, 8)), 'cabeca': (18, 0, k), 'tronco': (3, 0, 0)} for f, k in ((0, -3), (48, 3), (96, -3))}
acao('ler', ler)
mexer = {}
for f, s in ((0, 1), (6, 0), (12, -1), (18, 0), (24, 1)):
    mexer[f] = {'braco_L': (-32 + 6 * s, 0, 14), 'braco_R': (-32 - 6 * s, 0, -14), 'antebraco_L': (-52 - 10 * s, 0, 10), 'antebraco_R': (-52 + 10 * s, 0, -10), 'cabeca': (12, 0, 0), 'tronco': (5, 0, 2 * s)}
acao('mexer', mexer)
comer = {f: {'braco_R': (-40, 0, -18), 'antebraco_R': (-118 + k, 0, -8), 'braco_L': (2, 0, -4), 'antebraco_L': (-8, 0, 0), 'cabeca': (4, 0, 0)} for f, k in ((0, 0), (12, 14), (24, 0))}
acao('comer', comer)
louvor = {}
for f, s in ((0, 1), (24, -1), (48, 1)):
    louvor[f] = {'braco_L': (0, 0, -150 + 6 * s), 'braco_R': (0, 0, 150 + 6 * s), 'antebraco_L': (0, 0, -12), 'antebraco_R': (0, 0, 12), 'cabeca': (-10, 0, 5 * s), 'tronco': (-3, 0, 4 * s)}
acao('louvor', louvor)
exercicio = {}
for f, k in ((0, 0), (6, 0.5), (12, 1), (18, 0.5), (24, 0)):
    exercicio[f] = {'braco_L': (0, 0, -165 * k - 4), 'braco_R': (0, 0, 165 * k + 4), 'coxa_L': (0, 0, -16 * k), 'coxa_R': (0, 0, 16 * k), 'canela_L': (0, 0, 8 * k), 'canela_R': (0, 0, -8 * k)}
acao('exercicio', exercicio, {0: 0, 6: 0.09, 12: 0.02, 18: 0.09, 24: 0})
arm.animation_data.action = None
for pb in arm.pose.bones:
    pb.rotation_euler = (0, 0, 0)
    pb.location = (0, 0, 0)

# ---------- Saída ----------
BASE = ('cabeca', 'pescoco', 'tronco', 'quadril_roupa', 'ombro', 'braco', 'antebraco', 'mao', 'coxa', 'canela', 'orelha', 'orelha_dentro', 'bochecha', 'punho')

# cores: cima, cima_claro, cima_escuro, baixo, calçado
FANT = {
    'cavaleiro': dict(cabelo='esconde', pe='botinha', cores=('#AEB6C2', '#D6DCE4', '#7E8794', '#8F97A3', '#9AA2AE')),
    'pastor': dict(cabelo='esconde', pe='aberto', cores=('#8B6B4E', '#A8876A', '#6B4E36', '#5A412C', '#6E4A2E')),
    'rei': dict(cabelo='compacto', pe='social', cores=('#6A2A8C', '#8E4FB0', '#4A1A63', '#36134A', '#E8B83A')),
    'ester': dict(cabelo='compacto', pe='sapatilha', saia=True, cores=('#C95B9E', '#E384BE', '#9A2B6E', '#9A2B6E', '#E8B83A')),
    'pescador': dict(cabelo='compacto', pe='botinha', cores=('#3E6FA8', '#6A93C6', '#2A4F80', '#3A4A66', '#3F5A3A')),
    'anjo': dict(pe='aberto', saia=True, cores=('#F7F4EE', '#FFFFFF', '#E6DFD2', '#E6DFD2', '#E8B83A')),
    'pirata': dict(cabelo='compacto', pe='botinha', cores=('#B3203A', '#D4475F', '#7A1426', '#2A2230', '#5E3A26')),
    'viking': dict(cabelo='esconde', pe='botinha', cores=('#5B7FA6', '#7E9EC0', '#3F5E80', '#6B4A32', '#5E3A26')),
    'robo': dict(cabelo='esconde', rosto=False, pe='botinha', luvas='#8F96A0', cores=('#A9B0BA', '#C9CED6', '#7B838F', '#8F96A0', '#7B838F')),
    'mineiro': dict(cabelo='compacto', pe='botinha', luvas='#F2F2F2', cores=('#F07A22', '#FF9A4A', '#B85512', '#2F5B9A', '#3A2A30')),
}
PADRAO = {m: tuple(next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED').inputs['Base Color'].default_value) for m in (CIMA, CIMA_CLARO, CIMA_ESCURO, BAIXO, BOTA, LACO, COURO, LIMA, PELE)}
LUVA = mat('luva_previa', '#FFFFFF', 0.6)
def pintar_mat(m, cor):
    next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED').inputs['Base Color'].default_value = (*linear(cor), 1) if isinstance(cor, str) else cor
ROSTO_PECAS = ('cabeca', 'orelha', 'orelha_dentro', 'bochecha', 'olho_', 'sob_', 'nariz_', 'boca_', 'cabelo_', 'extra_cilios', 'extra_barba', 'extra_oculos')

def visual(cabelo='curto', fem=False, olhos='pontinho', sob=None, nariz='pequeno', boca='sorriso', topo='moletom', baixo='calca', pe='tenis', extras=(), forma=0.5, rosto_forma=None, fantasia=None, mao=True):
    """Liga só as peças de um visual (para as prévias). As regras são as mesmas do app."""
    sob = sob or ('arqueada' if fem else 'grossa')
    olho_pecas = {'pontinho': ('olho_pontinho', 'olho_pontinho_brilho'), 'grande': ('olho_grande', 'olho_grande_iris', 'olho_grande_pupila', 'olho_grande_brilho'),
                  'amendoado': ('olho_amendoado', 'olho_amendoado_iris', 'olho_amendoado_pupila', 'olho_amendoado_palpebra'), 'sorridente': ('olho_sorridente',), 'fechado': ('olho_fechado',)}[olhos]
    liga = set(BASE) | set(olho_pecas) | {f'sob_{sob}', f'nariz_{nariz}', f'boca_{boca}', f'cabelo_{cabelo}'} | set(extras)
    liga |= {'tenis': {'pe_tenis', 'pe_tenis_sola'}, 'social': {'pe_social'}, 'botinha': {'pe_botinha'}, 'aberto': {'pe_aberto', 'pe_aberto_sola', 'pe_aberto_tira'}, 'sapatilha': {'pe_sapatilha'}, 'salto': {'pe_sapatilha', 'pe_salto_tacao'}}[pe]
    if topo == 'moletom': liga |= {'extra_capuz', 'extra_cordao', 'extra_bolso'}
    if topo == 'camisa': liga |= {'extra_gola', 'extra_botoes_camisa'}
    if topo == 'terno': liga |= {'extra_camisa_interna', 'extra_gravata', 'extra_lapelas'}
    if topo == 'vestido': liga |= {'extra_vestido_saia'}
    if topo == 'vestido_longo': liga |= {'extra_vestido_longo_saia'}
    if topo == 'blusa': liga |= {'extra_babado'}
    if baixo == 'saia' and not topo.startswith('vestido'): liga.add('extra_saia')
    if baixo == 'saia_longa' and not topo.startswith('vestido'): liga.add('extra_saia_longa')
    if fem: liga.add('extra_cilios')
    if cabelo == 'rabo': liga.add('extra_rabo_laco')
    for ob in bpy.data.objects:
        if ob.type != 'MESH':
            continue
        n = re.sub(r'_(L|R)$', '', ob.name)
        ob.hide_render = ob.hide_viewport = n not in liga
    # Mangas, pernas e quadril trocam para pele conforme a roupa (o app faz o mesmo)
    pele_em = set()
    if topo in ('vestido', 'vestido_longo', 'blusa'): pele_em |= {'antebraco', 'punho'}
    if topo == 'camiseta': pele_em |= {'antebraco', 'punho'}
    if topo in ('vestido', 'vestido_longo') or baixo in ('saia', 'saia_longa'): pele_em |= {'coxa', 'canela'}
    if baixo == 'bermuda': pele_em |= {'canela'}
    for ob in bpy.data.objects:
        n = re.sub(r'_(L|R)$', '', ob.name)
        if n in ('antebraco', 'punho', 'coxa', 'canela'):
            ob.data.materials[0] = PELE if n in pele_em else (CIMA if n in ('antebraco', 'punho') else BAIXO)
            if n == 'punho' and n not in pele_em: ob.data.materials[0] = CIMA_CLARO
        if n == 'quadril_roupa':
            ob.data.materials[0] = CIMA if topo.startswith('vestido') else BAIXO
    for m, c in PADRAO.items():
        pintar_mat(m, c)
    if fantasia:
        fz = FANT[fantasia]
        cima, claro, escuro, de_baixo, calc = fz['cores']
        for m, c in ((CIMA, cima), (CIMA_CLARO, claro), (CIMA_ESCURO, escuro), (BAIXO, de_baixo)):
            pintar_mat(m, c)
        pintar_mat({'botinha': BOTA, 'aberto': LACO, 'social': COURO, 'tenis': LIMA, 'sapatilha': LACO}[fz['pe']], calc)
        pecas_pe = {'tenis': {'pe_tenis', 'pe_tenis_sola'}, 'social': {'pe_social'}, 'botinha': {'pe_botinha'}, 'aberto': {'pe_aberto', 'pe_aberto_sola', 'pe_aberto_tira'}, 'sapatilha': {'pe_sapatilha'}}[fz['pe']]
        cab = fz.get('cabelo')
        cabelo_f = None if cab == 'esconde' else ('longo' if fem else 'curto') if cab == 'compacto' else cabelo
        if fz.get('luvas'):
            pintar_mat(LUVA, fz['luvas'])
        for ob in bpy.data.objects:
            if ob.type != 'MESH':
                continue
            n = re.sub(r'_(L|R)$', '', ob.name)
            if n.startswith('fant_'):
                on = n.startswith(f'fant_{fantasia}_') and (mao or '_mao_' not in n)
            elif n.startswith('cabelo_'):
                on = n == f'cabelo_{cabelo_f}'
            elif n.startswith('pe_'):
                on = n in pecas_pe
            elif n.startswith('extra_'):
                on = (n == 'extra_vestido_longo_saia' and fz.get('saia')) or (n == 'extra_cilios' and fem) or n in extras
            else:
                on = not ob.hide_render
            if fz.get('rosto') is False and (n in ROSTO_PECAS or n.startswith(ROSTO_PECAS)):
                on = False
            ob.hide_render = ob.hide_viewport = not on
            if n in ('antebraco', 'punho', 'coxa', 'canela', 'ombro', 'braco'):
                ob.data.materials[0] = CIMA_CLARO if n == 'punho' else (CIMA if n in ('antebraco', 'ombro', 'braco') else BAIXO)
            if n == 'quadril_roupa':
                ob.data.materials[0] = CIMA if fz.get('saia') else BAIXO
            if n == 'mao':
                ob.data.materials[0] = LUVA if fz.get('luvas') else PELE
            if n == 'pescoco':
                ob.data.materials[0] = CIMA_ESCURO if fz.get('rosto') is False else PELE
    else:
        for ob in bpy.data.objects:
            n = re.sub(r'_(L|R)$', '', ob.name)
            if ob.type == 'MESH' and n in ('mao', 'pescoco'):
                ob.data.materials[0] = PELE
    kb = bpy.data.objects['tronco'].data.shape_keys.key_blocks
    kb['feminino'].value = 1 if fem else 0
    kb['cheinho'].value = max(0, (0.5 - forma) * 2)
    kb['atletico'].value = max(0, (forma - 0.5) * 2)
    kc = bpy.data.objects['cabeca'].data.shape_keys.key_blocks
    for nome in ('redondo', 'quadrado', 'coracao'):
        kc[nome].value = 1 if rosto_forma == nome else 0

modo = ARGS[0] if ARGS else 'exportar'
if modo == 'exportar':
    saida = os.path.abspath(ARGS[1] if len(ARGS) > 1 else 'public/boneco.glb')
    for ob in bpy.data.objects:
        ob.hide_viewport = False
        ob.hide_render = False
    bpy.ops.export_scene.gltf(
        filepath=saida, export_format='GLB', export_yup=True, export_apply=False, use_visible=False,
        export_animations=True, export_animation_mode='ACTIONS', export_morph=True, export_skins=True,
        export_force_sampling=True, export_optimize_animation_size=True, export_texcoords=False,
    )
    print('EXPORTADO', saida, os.path.getsize(saida))
else:
    pasta = os.path.abspath(ARGS[1] if len(ARGS) > 1 else 'previas')
    os.makedirs(pasta, exist_ok=True)
    cena.render.engine = 'BLENDER_EEVEE' if 'BLENDER_EEVEE' in [e.identifier for e in bpy.types.RenderSettings.bl_rna.properties['engine'].enum_items] else 'BLENDER_EEVEE_NEXT'
    cena.render.resolution_x, cena.render.resolution_y = 700, 900
    cena.render.film_transparent = False
    cena.view_settings.view_transform = 'Standard'
    mundo = bpy.data.worlds.new('mundo')
    cena.world = mundo
    if getattr(mundo, 'node_tree', None) is None:
        mundo.use_nodes = True
    fundo = next(n for n in mundo.node_tree.nodes if n.type == 'BACKGROUND')
    fundo.inputs['Color'].default_value = (*linear('#FAF6F0'), 1)
    fundo.inputs['Strength'].default_value = 0.9
    sol = bpy.data.objects.new('sol', bpy.data.lights.new('sol', 'SUN'))
    sol.data.energy = 3.2
    sol.rotation_euler = Euler((math.radians(50), math.radians(10), math.radians(-30)))
    colecao.objects.link(sol)
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
    cam.data.lens = 50
    colecao.objects.link(cam)
    cena.camera = cam
    def foto(nome, giro=0.0, acao_nome=None, quadro=0, r=2.9, z=1.1, inclina=82):
        cam.location = (math.sin(giro) * r, -math.cos(giro) * r, z)
        cam.rotation_euler = Euler((math.radians(inclina), 0, giro))
        if acao_nome:
            arm.animation_data.action = bpy.data.actions[acao_nome]
            cena.frame_set(quadro)
        else:
            arm.animation_data.action = None
            for pb in arm.pose.bones:
                pb.rotation_euler = (0, 0, 0)
        cena.render.filepath = os.path.join(pasta, nome + '.png')
        bpy.ops.render.render(write_still=True)
    LOTE = [
        ('a_curto', dict(cabelo='curto'), 0.0, None, 0),
        ('a_andar', dict(cabelo='topete', topo='camisa', baixo='calca', pe='social'), 0.6, 'andar', 6),
        ('a_louvor', dict(cabelo='black', topo='camiseta', olhos='sorridente', boca='aberta', extras=('extra_fones',)), 0.3, 'louvor', 0),
        ('a_terno', dict(cabelo='lateral', topo='terno', pe='social', extras=('extra_barba_curta',), rosto_forma='quadrado', olhos='amendoado'), 0.4, None, 0),
        ('a_moicano', dict(cabelo='moicano', topo='camiseta', baixo='bermuda', pe='aberto', forma=0.9, extras=('extra_oculos',)), 0.5, 'exercicio', 12),
        ('b_vestido', dict(cabelo='coque', fem=True, topo='vestido', pe='sapatilha', olhos='grande'), 0.0, None, 0),
        ('b_orar', dict(cabelo='longo', fem=True, olhos='fechado', boca='calma'), 0.4, 'orar', 0),
        ('b_ler', dict(cabelo='rabo', fem=True, topo='blusa', baixo='saia_longa', pe='salto', extras=('extra_livro', 'extra_livro_paginas')), 0.5, 'ler', 0),
        ('b_cacheado', dict(cabelo='cacheado', fem=True, topo='vestido_longo', pe='aberto', olhos='grande', rosto_forma='coracao', forma=0.2), 0.3, None, 0),
        ('b_chanel', dict(cabelo='chanel', fem=True, topo='camiseta', baixo='saia', pe='tenis', olhos='amendoado'), 0.6, 'mexer', 6),
        ('b_trancas', dict(cabelo='trancas', fem=True, topo='moletom'), 2.6, None, 0),
        ('b_dreads', dict(cabelo='dreads', fem=False, topo='moletom', extras=('extra_barba_cheia',)), 2.4, 'sentado', 0),
    ]
    if modo == 'fantasias':
        cena.render.film_transparent = True
        cena.render.resolution_x, cena.render.resolution_y = 360, 420
        cam.data.lens = 58
        for nome in FANT:
            fem_f = nome in ('anjo', 'ester')
            visual(cabelo='longo' if fem_f else 'curto', fem=fem_f, fantasia=nome, olhos='grande' if fem_f else 'pontinho')
            foto(nome, 0.55, r=3.55, z=1.08, inclina=84)
        print('FANTASIAS', pasta)
    else:
        for nome, v, giro, an, q in LOTE:
            visual(**v)
            foto(nome, giro, an, q)
        print('PREVIAS', pasta)
