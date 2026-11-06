# Roupas do dia a dia, modeladas por anéis sobre as medidas do tronco KayKit (executado dentro de corpo_chibi.py).
# Cada parte de cima vira um objeto "topo_<id>" com tronco, mangas, braços de pele e punhos; cada parte de baixo
# nova vira "baixo_<id>". Os pesos dos ossos vêm do tronco KayKit (vizinho mais próximo); mangas e saias têm regra própria.
# Frente = -Y, braço esquerdo em +X (pose T), medidas antes da escala do jogo.

# Perfil do tronco (altura, meia largura, meia profundidade, expoente da superelipse)
PERFIL = [(0.34, 0.355, 0.295, 2.6), (0.42, 0.382, 0.318, 2.8), (0.60, 0.378, 0.318, 2.9), (0.78, 0.372, 0.312, 2.9),
          (0.92, 0.362, 0.305, 2.8), (1.02, 0.345, 0.292, 2.7), (1.12, 0.318, 0.265, 2.6), (1.19, 0.278, 0.222, 2.4),
          (1.245, 0.2, 0.162, 2.2), (1.285, 0.125, 0.112, 2.0)]
if FEM:  # cintura um pouco marcada
    PERFIL = [(z, rx - (0.022 if 0.55 < z < 0.85 else 0), ry, p) for z, rx, ry, p in PERFIL]
BRACO_Z = 1.107
N = 44  # pontos por anel do tronco

def perfil(z):
    if z <= PERFIL[0][0]: return PERFIL[0][1:]
    for a, b in zip(PERFIL, PERFIL[1:]):
        if a[0] <= z <= b[0]:
            t = (z - a[0]) / (b[0] - a[0])
            return tuple(a[i] + (b[i] - a[i]) * t for i in (1, 2, 3))
    return PERFIL[-1][1:]

def sp(v, p): return math.copysign(abs(v) ** (2 / p), v)
def ponto(z, t, folga=0.0, perf=None):
    rx, ry, p = perf or perfil(z)
    return Vector((sp(math.cos(t), p) * (rx + folga), sp(math.sin(t), p) * (ry + folga), z))
def anel_tronco(z, folga=0.0, n=N, perf=None):
    return [ponto(z, 2 * math.pi * i / n, folga, perf) for i in range(n)]
def anel_braco(lado, x, r, n=14):
    return [Vector((x * lado, math.cos(t) * r, BRACO_Z + math.sin(t) * r * 1.04)) for t in (2 * math.pi * i / n for i in range(n))]

_aneis_ref = [anel_tronco(0.34 + i * 0.07, 0.02) for i in range(14)] + [anel_tronco(1.285, 0.0)]
_vs = [p for a in _aneis_ref for p in a]
_fs = [(j * N + i, j * N + (i + 1) % N, (j + 1) * N + (i + 1) % N, (j + 1) * N + i) for j in range(len(_aneis_ref) - 1) for i in range(N)]
BVH_TRONCO = BVHTree.FromPolygons(_vs, _fs + [tuple(range(len(_vs) - N, len(_vs)))])

def hexa_lin(h): return tuple(lin(int(h[i:i + 2], 16) / 255) for i in (1, 3, 5))
TRONCO, BRACO, SAIA, PERNA, CABECA = 0, 1, 2, 3, 4

class Roupa(Peca):
    def __init__(self, nome, queda=0.3):
        super().__init__(nome)
        self.queda = queda
        self.tipo = self.bm.verts.layers.int.new('tipo')
        self._bvh = None
        self.folga_tronco = 0.0
    def pintar(self, faces, cat, cor=None):
        zs = [v.co.z for f in faces for v in f.verts]
        z0, z1 = min(zs), max(zs)
        base = hexa_lin(cor) if cor else None
        q = 0.16 if cat == 'fixo' else min(QUEDA.get(cat, 0.3), self.queda)
        for f in faces:
            f.material_index = MATS.index(cat); f.smooth = True
            for l in f.loops:
                t = (z1 - l.vert.co.z) / max(z1 - z0, 1e-4)
                k = lin(1 - q * t)
                l[self.col] = (base[0] * k, base[1] * k, base[2] * k, 1) if base else (k, k, k, 1)
    def pesar(self, verts, pesos): pass
    def marcar(self, verts, tipo):
        for v in verts: v[self.tipo] = tipo
    def loft2(self, aneis, cat, tipo=TRONCO, cor=None, tampa=(False, False)):
        rs = [[self.bm.verts.new(p) for p in a] for a in aneis]
        n, faces = len(rs[0]), []
        for a, b in zip(rs, rs[1:]):
            for i in range(n): faces.append(self.bm.faces.new((a[i], a[(i + 1) % n], b[(i + 1) % n], b[i])))
        for r, fecha in zip((rs[0], rs[-1]), tampa):
            if not fecha: continue
            c = self.bm.verts.new(sum((v.co for v in r), Vector()) / n); r.append(c)
            for i in range(n): faces.append(self.bm.faces.new((r[i], r[(i + 1) % n], c)))
        self.pintar(faces, cat, cor); self.marcar({v for f in faces for v in f.verts}, tipo)
        self._bvh = None
        return faces
    def grade(self, linhas, cat, tipo=TRONCO, cor=None):
        """Superfície aberta: linhas de pontos (todas do mesmo tamanho)."""
        rs = [[self.bm.verts.new(p) for p in a] for a in linhas]
        faces = [self.bm.faces.new((a[i], a[i + 1], b[i + 1], b[i])) for a, b in zip(rs, rs[1:]) for i in range(len(a) - 1)]
        self.pintar(faces, cat, cor); self.marcar({v for f in faces for v in f.verts}, tipo)
        self._bvh = None
        return faces
    def oval(self, centro, raios, cat, cor=None, seg=10, tipo=TRONCO, giro=None):
        g = bmesh.ops.create_uvsphere(self.bm, u_segments=seg, v_segments=max(4, seg * 2 // 3), radius=1)
        for v in g['verts']:
            p = Vector((v.co.x * raios[0], v.co.y * raios[1], v.co.z * raios[2]))
            if giro: p = giro @ p
            v.co = p + Vector(centro)
        faces = list({f for v in g['verts'] for f in v.link_faces})
        self.pintar(faces, cat, cor); self.marcar(g['verts'], tipo)
        return faces
    def placa(self, pts, espessura, normal, cat, cor=None, tipo=TRONCO):
        """Polígono com espessura (golas, lapelas, bolsos)."""
        normal = Vector(normal).normalized()
        a = [self.bm.verts.new(p) for p in pts]
        b = [self.bm.verts.new(Vector(p) + normal * espessura) for p in pts]
        n = len(pts)
        faces = [self.bm.faces.new(a[::-1]), self.bm.faces.new(b)]
        for i in range(n): faces.append(self.bm.faces.new((a[i], a[(i + 1) % n], b[(i + 1) % n], b[i])))
        self.pintar(faces, cat, cor); self.marcar(a + b, tipo)
        return faces
    def superficie(self, origem, direcao):
        if self._bvh is None: self._bvh = BVHTree.FromBMesh(self.bm)
        loc, nor, _, _ = self._bvh.ray_cast(Vector(origem), Vector(direcao).normalized())
        return loc, nor
    def _lado(self, x, z, folga, sy, base=0.0):
        """Ponto da superelipse do tronco (na frente sy=-1, nas costas sy=1) com a normal para fora."""
        perf = getattr(self, 'perf_tronco', None)
        perf = perf(z) if perf else perfil(z)
        rx = perf[0] + self.folga_tronco
        lo, hi = (math.pi, 2 * math.pi) if sy < 0 else (math.pi, 0.0)
        alvo = max(-rx * 0.999, min(rx * 0.999, x))
        for _ in range(40):
            m = (lo + hi) / 2
            if ponto(z, m, self.folga_tronco, perf).x < alvo: lo = m
            else: hi = m
        t = (lo + hi) / 2
        p = ponto(z, t, self.folga_tronco, perf)
        tan = ponto(z, t + 1e-3, self.folga_tronco, perf) - ponto(z, t - 1e-3, self.folga_tronco, perf)
        nor = Vector((tan.y, -tan.x, 0)).normalized()
        if nor.y * sy < 0: nor = -nor
        return p + nor * (folga + 0.008), nor
    def frente(self, x, z, folga=0.0): return self._lado(x, z, folga, -1)
    def costas(self, x, z, folga=0.0): return self._lado(x, z, folga, 1)

# ---------- Pesos: vizinho mais próximo no tronco KayKit; braços e saias por regra ----------
def fonte_pesos(o):
    me = o.data
    nomes = {g.index: g.name for g in o.vertex_groups}
    pesos = [{nomes[g.group]: g.weight for g in v.groups if g.weight > 0.001} for v in me.vertices]
    return me, BVHTree.FromPolygons([v.co for v in me.vertices], [p.vertices[:] for p in me.polygons]), pesos
FONTE_TRONCO = fonte_pesos(P[BASE]['Body'])
FONTE_PERNA = [fonte_pesos(P['Rogue']['LegLeft']), fonte_pesos(P['Rogue']['LegRight'])]

def vizinho(fonte, co):
    me, bvh, pesos = fonte
    loc, _, i, _ = bvh.find_nearest(co)
    soma = {}
    for vi in me.polygons[i].vertices:
        d = 1 / ((me.vertices[vi].co - loc).length + 1e-3)
        for g, w in pesos[vi].items(): soma[g] = soma.get(g, 0) + w * d
    return soma

def suave(a, b, x): t = min(1, max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t)
def peso_braco(co):
    s = 'l' if co.x > 0 else 'r'; x = abs(co.x)
    ombro = suave(0.14, 0.27, x); cotovelo = suave(0.40, 0.52, x); mao = suave(0.76, 0.84, x)
    return {'spine_03': 1 - ombro, f'upperarm_{s}': ombro * (1 - cotovelo), f'lowerarm_{s}': ombro * cotovelo * (1 - mao), f'hand_{s}': ombro * cotovelo * mao}
def peso_saia(co):
    s = 'l' if co.x > 0 else 'r'
    coxa = 0.42 * suave(0.03, 0.22, abs(co.x)) * suave(0.5, 0.3, co.z)
    return {'pelvis': 1 - coxa, f'thigh_{s}': coxa}

def aplicar_pesos(o):
    me = o.data
    tipos = me.attributes['tipo'].data if 'tipo' in me.attributes else None
    grupos = {}
    for v in me.vertices:
        tipo = tipos[v.index].value if tipos else TRONCO
        if tipo == BRACO: w = peso_braco(v.co)
        elif tipo == SAIA: w = peso_saia(v.co) if v.co.z < 0.5 else vizinho(FONTE_TRONCO, v.co)
        elif tipo == PERNA: w = vizinho(FONTE_PERNA[0 if v.co.x > 0 else 1], v.co)
        elif tipo == CABECA: w = {'Head': 1.0}
        else: w = vizinho(FONTE_TRONCO, v.co)
        tot = sum(w.values()) or 1
        for g, peso in w.items():
            if peso / tot < 0.01: continue
            if g not in grupos: grupos[g] = o.vertex_groups.get(g) or o.vertex_groups.new(name=g)
            grupos[g].add([v.index], peso / tot, 'REPLACE')
    if 'tipo' in me.attributes: me.attributes.remove(me.attributes['tipo'])

# Punhos (mão fechada KayKit) para os braços de pele
punhos = juntar('punhos_base', [P['Rogue']['ArmLeft'], P['Rogue']['ArmRight']])
tirar_faces(punhos, lambda f: f.material_index != MATS.index('pele'))
def com_punhos(o):
    p = copia(punhos)
    bpy.ops.object.select_all(action='DESELECT')
    o.select_set(True); p.select_set(True)
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.join()
    return o

# ---------- Peças comuns ----------
PELE_BRACO = [(0.12, 0.104), (0.3, 0.1), (0.45, 0.092), (0.6, 0.086), (0.75, 0.082), (0.86, 0.088), (0.915, 0.092)]
def bracos_pele(pc, de=0.12):
    for lado in (1, -1):
        pts = [(x, r) for x, r in PELE_BRACO if x >= de - 1e-6]
        pc.loft2([anel_braco(lado, x, r) for x, r in pts], 'pele', BRACO, tampa=(True, False))

def tronco(pc, base=0.36, topo=1.285, folga=0.0, cat='cima', passos=14, perf=None, cor=None):
    zs = [base + (topo - base) * i / passos for i in range(passos + 1)]
    pc.folga_tronco, pc.perf_tronco = folga, perf
    return pc.loft2([anel_tronco(z, folga, perf=perf(z) if perf else None) for z in zs], cat, cor=cor, tampa=(True, True))

def faixa(pc, z0, z1, folga, cat, cor=None, tipo=TRONCO):
    """Barra/ribana em volta do tronco."""
    pc.loft2([anel_tronco(z0, folga), anel_tronco((z0 + z1) / 2, folga + 0.006), anel_tronco(z1, folga)], cat, tipo, cor, tampa=(True, False))

def raio_em(perfil_r, x):
    for (x0, r0), (x1, r1) in zip(perfil_r, perfil_r[1:]):
        if x0 <= x <= x1: return r0 + (r1 - r0) * (x - x0) / (x1 - x0)
    return perfil_r[-1][1] if x > perfil_r[-1][0] else perfil_r[0][1]
def manga(pc, ate, perfil_r, cat='cima', punho=None, bufante=0.0, cor=None, cor_punho=None):
    """perfil_r: lista (x, raio); punho: (largura, cat) da barra no fim; bufante: manga fofinha."""
    xs = [x for x, _ in perfil_r if x < ate - 0.02] + [ate]
    for lado in (1, -1):
        pts = [(x, raio_em(perfil_r, x) + bufante * math.sin(math.pi * min(1, (x - xs[0]) / max(ate - xs[0], 1e-3)) * 0.8)) for x in xs]
        pc.loft2([anel_braco(lado, x, r) for x, r in pts], cat, BRACO, cor, tampa=(True, False))
        if punho:
            larg, pcat = punho
            r = pts[-1][1] + 0.008
            pc.loft2([anel_braco(lado, ate - larg, r), anel_braco(lado, ate - larg / 2, r + 0.006), anel_braco(lado, ate + 0.004, r)], pcat, BRACO, cor_punho, tampa=(False, False))
MANGA = [(0.12, 0.142), (0.3, 0.136), (0.45, 0.124), (0.6, 0.118), (0.72, 0.114), (0.8, 0.112)]

def gola_redonda(pc, cat='cima2', cor=None, folga=0.012):
    pc.loft2([anel_tronco(1.215, folga + 0.004), anel_tronco(1.25, folga + 0.012), anel_tronco(1.285, folga)], cat, TRONCO, cor)

def gola_camisa(pc, cat='cima2', cor=None, aberta=0.03):
    """Colarinho: pé de gola em volta do pescoço e duas pontas na frente."""
    pc.loft2([anel_tronco(1.225, 0.02), anel_tronco(1.275, 0.03), anel_tronco(1.3, 0.012)], cat, TRONCO, cor)
    for s in (1, -1):
        a, nor = pc.frente(s * aberta, 1.245, 0.018)
        b, _ = pc.frente(s * 0.15, 1.225, 0.018)
        c, _ = pc.frente(s * (aberta + 0.05), 1.115, 0.024)
        pts = [a, b, c] if s > 0 else [a, c, b]
        pc.placa(pts, 0.016, nor, cat, cor)

def botoes(pc, zs, cor='#F4F2EE', x=0.0, r=0.019):
    for z in zs:
        p, nor = pc.frente(x, z, 0.004)
        pc.oval(p, (r, r * 0.45, r), 'fixo', cor, seg=8)

def carcela(pc, z0, z1, cat='cima2', cor=None, larg=0.026):
    """Tira dos botões na frente."""
    linhas = []
    for i in range(7):
        z = z1 + (z0 - z1) * i / 6
        linhas.append([pc.frente(x, z, 0.006)[0] for x in (-larg, 0, larg)])
    pc.grade(linhas, cat, TRONCO, cor)

def bolso_frente(pc, x, z, w, h, cat='cima2', cor=None, aba=False):
    linhas = [[pc.frente(x + dx, z + dz, 0.007)[0] for dx in (-w / 2, 0, w / 2)] for dz in (h / 2, 0, -h / 2)]
    pc.grade(linhas, cat, TRONCO, cor)
    if aba:
        linhas = [[pc.frente(x + dx, z + dz, 0.013)[0] for dx in (-w / 2 - 0.006, 0, w / 2 + 0.006)] for dz in (h / 2 + 0.008, h / 2 - 0.03)]
        pc.grade(linhas, cat, TRONCO, cor)

def estampa_pomba(pc, z=0.86, cor='#FFFFFF'):
    p, _ = pc.frente(0, z, 0.003)
    giro = Matrix.Rotation(0.35, 3, 'Y')
    pc.oval(p + Vector((0.0, 0, 0)), (0.07, 0.008, 0.035), 'fixo', cor, 12, giro=giro)                 # corpo
    pc.oval(p + Vector((0.065, -0.001, 0.025)), (0.026, 0.008, 0.024), 'fixo', cor, 10)                # cabeça
    pc.oval(p + Vector((-0.02, -0.002, 0.05)), (0.06, 0.007, 0.03), 'fixo', cor, 10, giro=Matrix.Rotation(-0.6, 3, 'Y'))  # asa
    pc.oval(p + Vector((-0.085, 0, -0.012)), (0.035, 0.007, 0.018), 'fixo', cor, 8, giro=Matrix.Rotation(0.3, 3, 'Y'))   # cauda
    pc.oval(p + Vector((0.098, -0.002, 0.022)), (0.014, 0.006, 0.007), 'fixo', '#E8B83A', 8)           # bico
    pc.oval(p + Vector((0.032, -0.004, -0.045)), (0.03, 0.006, 0.012), 'fixo', '#7FB069', 8, giro=Matrix.Rotation(0.5, 3, 'Y'))  # ramo

def estampa_cruz(pc, z=0.84, cor='#FFFFFF', fundo=None):
    p, nor = pc.frente(0, z, 0.003)
    if fundo: pc.oval(p, (0.11, 0.006, 0.11), 'fixo', fundo, 16)
    q = p + Vector((0, -0.005, 0))
    pc.placa([q + Vector((-0.018, 0, -0.075)), q + Vector((0.018, 0, -0.075)), q + Vector((0.018, 0, 0.075)), q + Vector((-0.018, 0, 0.075))], 0.006, (0, -1, 0), 'fixo', cor)
    pc.placa([q + Vector((-0.055, 0, 0.012)), q + Vector((0.055, 0, 0.012)), q + Vector((0.055, 0, 0.044)), q + Vector((-0.055, 0, 0.044))], 0.006, (0, -1, 0), 'fixo', cor)

def capuz_dobrado(pc, cat='cima'):
    # rolo do capuz em volta do pescoço e o capuz caído nas costas
    pc.loft2([anel_tronco(1.2, 0.03), anel_tronco(1.235, 0.06), anel_tronco(1.275, 0.05), anel_tronco(1.3, 0.015)], cat, TRONCO)
    p, _ = pc.costas(0, 1.12, -0.01)
    pc.oval(p + Vector((0, 0.04, 0.02)), (0.21, 0.07, 0.13), cat, seg=14)
    pc.oval(p + Vector((0, 0.075, 0.0)), (0.13, 0.03, 0.08), 'cima2', seg=12)

def cordoes(pc, cor='#F4F2EE'):
    for s in (1, -1):
        topo, _ = pc.frente(s * 0.07, 1.2, 0.02)
        pts = [topo + Vector((0, -0.006 * i, -0.04 * i)) for i in range(5)]
        pc.loft2([[p + Vector((math.cos(t) * 0.009, math.sin(t) * 0.009, 0)) for t in (2 * math.pi * k / 6 for k in range(6))] for p in pts], 'fixo', TRONCO, cor, tampa=(True, True))
        pc.oval(pts[-1] + Vector((0, 0, -0.012)), (0.012, 0.012, 0.018), 'fixo', cor, 8)

def saia_rodada(pc, z_cintura, z_barra, abertura, cat, tipo=SAIA, babado=None, dentes=0.0):
    passos = 7
    linhas = []
    for i in range(passos + 1):
        t = i / passos
        z = z_cintura + (z_barra - z_cintura) * t
        rx, ry, p = perfil(z_cintura)
        k = abertura * (t ** 0.85)
        linhas.append(anel_tronco(z, 0.012, perf=(rx + k, ry + k * 0.85, max(2.0, p - 0.8 * t))))
    if dentes:  # barra recortada em pontas (couro/pele)
        linhas[-1] = [q + Vector((0, 0, -dentes * (i % 2))) for i, q in enumerate(linhas[-1])]
    pc.loft2(linhas, cat, tipo, tampa=(False, not dentes))
    if babado:
        rx, ry, p = perfil(z_cintura); k = abertura
        pc.loft2([anel_tronco(z_barra + 0.035, 0.016, perf=(rx + k * 0.97, ry + k * 0.83, 2.0)), anel_tronco(z_barra - 0.004, 0.02, perf=(rx + k + 0.012, ry + k * 0.85 + 0.01, 2.0))], babado, tipo)

def cinto_faixa(pc, z, cat='cima2', cor=None, folga=0.018, laco=False):
    faixa(pc, z - 0.03, z + 0.03, folga, cat, cor)
    if laco:
        p, _ = pc.costas(0, z, folga + 0.01)
        for s in (1, -1): pc.oval(p + Vector((s * 0.06, 0.01, 0.01)), (0.06, 0.025, 0.04), cat, cor, 10)
        pc.oval(p + Vector((0, 0.015, 0)), (0.025, 0.025, 0.03), cat, cor, 8)

# ---------- Partes de cima ----------
def topo(nome):
    return Roupa('topo_' + nome)

def fazer_moletom(paz=False):
    pc = topo('moletomPaz' if paz else 'moletom')
    tronco(pc, base=0.37, folga=0.03)
    faixa(pc, 0.345, 0.42, 0.04, 'cima2')
    capuz_dobrado(pc)
    bolso = [[pc.frente(dx * (1 - 0.22 * (dz > 0.05)), 0.56 + dz, 0.006)[0] for dx in (-0.22, -0.08, 0.08, 0.22)] for dz in (0.12, 0.04, -0.04, -0.12)]
    pc.grade(bolso, 'cima2')
    cordoes(pc)
    if paz: estampa_pomba(pc, 0.86)
    manga(pc, 0.8, [(x, r + 0.006) for x, r in MANGA], 'cima', punho=(0.07, 'cima2'))
    bracos_pele(pc, 0.7)
    return pc

def fazer_camiseta(conf=False):
    pc = topo('camisetaConf' if conf else 'camiseta')
    tronco(pc, base=0.38, folga=0.02)
    faixa(pc, 0.37, 0.4, 0.024, 'cima')
    gola_redonda(pc)
    if conf: estampa_cruz(pc, 0.84, '#FFFFFF', None)
    manga(pc, 0.4, MANGA, 'cima', punho=(0.035, 'cima2'))
    bracos_pele(pc, 0.3)
    return pc

def fazer_regata():
    pc = topo('regata')
    afinar = lambda z: (lambda rx, ry, p: (rx - 0.07 * suave(1.05, 1.2, z), ry, p))(*perfil(z))
    tronco(pc, base=0.38, folga=0.02, perf=afinar)
    pc.loft2([anel_tronco(1.22, 0.012, perf=afinar(1.22)), anel_tronco(1.255, 0.014, perf=afinar(1.255)), anel_tronco(1.285, 0.004)], 'cima2')
    bracos_pele(pc, 0.12)
    # ombro de pele arredondado onde a regata é cavada
    for s in (1, -1): pc.oval((s * 0.27, 0, BRACO_Z + 0.02), (0.11, 0.105, 0.11), 'pele', seg=12, tipo=BRACO)
    return pc

def fazer_polo():
    pc = topo('polo')
    tronco(pc, base=0.38, folga=0.02)
    faixa(pc, 0.37, 0.4, 0.024, 'cima')
    carcela(pc, 1.02, 1.23)
    botoes(pc, (1.17, 1.08), '#F4F2EE', r=0.016)
    gola_camisa(pc, 'cima2', aberta=0.035)
    manga(pc, 0.4, MANGA, 'cima', punho=(0.035, 'cima2'))
    bracos_pele(pc, 0.3)
    return pc

def fazer_camisa():
    pc = topo('camisa')
    tronco(pc, base=0.37, folga=0.02)
    carcela(pc, 0.4, 1.23, 'cima')
    botoes(pc, (1.15, 1.0, 0.85, 0.7, 0.55), '#F4F2EE', r=0.015)
    bolso_frente(pc, 0.17, 0.95, 0.11, 0.11, 'cima', aba=True)
    gola_camisa(pc, 'cima', aberta=0.025)
    manga(pc, 0.79, MANGA, 'cima', punho=(0.07, 'cima'))
    bracos_pele(pc, 0.7)
    return pc

def fazer_blusa():
    pc = topo('blusa')
    tronco(pc, base=0.4, folga=0.018)
    # babado na gola e na barra
    pc.loft2([anel_tronco(1.2, 0.03), anel_tronco(1.235, 0.06), anel_tronco(1.27, 0.02)], 'cima2')
    pc.loft2([anel_tronco(0.43, 0.03), anel_tronco(0.39, 0.06), anel_tronco(0.37, 0.065)], 'cima', tampa=(False, False))
    for z in (1.05, 0.93): botoes(pc, (z,), '#F4F2EE', r=0.014)
    manga(pc, 0.42, MANGA, 'cima', punho=(0.03, 'cima2'), bufante=0.035)
    bracos_pele(pc, 0.32)
    return pc

def fazer_jaqueta():
    pc = topo('jaqueta')
    tronco(pc, base=0.37, folga=0.035)
    faixa(pc, 0.35, 0.4, 0.045, 'cima')
    # camiseta por dentro (abertura da frente) e zíper
    linhas = [[pc.frente(x, z, 0.004)[0] for x in (-0.055, 0, 0.055)] for z in (1.2, 1.0, 0.8, 0.6, 0.42)]
    pc.grade(linhas, 'fixo', TRONCO, '#F4F2EE')
    for s in (1, -1):
        linhas = [[pc.frente(s * x, z, 0.01)[0] for x in (0.055, 0.075)] for z in (1.21, 1.0, 0.8, 0.6, 0.38)]
        pc.grade(linhas if s > 0 else [l[::-1] for l in linhas], 'cima2')
        bolso_frente(pc, s * 0.2, 0.92, 0.1, 0.09, 'cima', aba=True)
        botoes(pc, (0.94,), '#C9A45C', x=s * 0.2, r=0.012)
    # gola larga dobrada
    pc.loft2([anel_tronco(1.17, 0.05), anel_tronco(1.23, 0.085), anel_tronco(1.29, 0.04)], 'cima2')
    manga(pc, 0.8, [(x, r + 0.012) for x, r in MANGA], 'cima', punho=(0.06, 'cima2'))
    bracos_pele(pc, 0.7)
    return pc

def fazer_blazer():
    pc = topo('blazer')
    tronco(pc, base=0.36, folga=0.03)
    # camisa branca em V e gravata
    v = [[pc.frente(x * k, z, 0.004)[0] for x in (-0.12, 0, 0.12)] for z, k in ((1.24, 1), (1.12, 0.75), (1.0, 0.45), (0.86, 0.15))]
    pc.grade(v, 'fixo', TRONCO, '#F7F5F0')
    gravata = [[pc.frente(x * k, z, 0.012)[0] for x in (-0.03, 0, 0.03)] for z, k in ((1.21, 0.8), (1.12, 1), (0.98, 1.25), (0.9, 0.2))]
    pc.grade(gravata, 'fixo', TRONCO, '#7A1F2B')
    p, nor = pc.frente(0, 1.215, 0.016); pc.oval(p, (0.028, 0.012, 0.022), 'fixo', '#7A1F2B', 8)
    # lapelas
    for s in (1, -1):
        a, nor = pc.frente(s * 0.1, 1.25, 0.02); b, _ = pc.frente(s * 0.2, 1.17, 0.02); c, _ = pc.frente(s * 0.14, 1.07, 0.022); d, _ = pc.frente(s * 0.03, 0.86, 0.02)
        pts = [a, b, c, d] if s > 0 else [a, d, c, b]
        pc.placa(pts, 0.014, nor, 'cima2')
        bolso_frente(pc, s * 0.22, 0.6, 0.12, 0.02, 'cima2')
    botoes(pc, (0.78, 0.66), '#2B201C', x=0.03, r=0.015)
    manga(pc, 0.79, [(x, r + 0.01) for x, r in MANGA], 'cima', punho=(0.03, 'fixo'))
    bracos_pele(pc, 0.7)
    return pc

def fazer_vestido(longo=False):
    pc = topo('vestidoLongo' if longo else 'vestido')
    tronco(pc, base=0.6, folga=0.016)
    saia_rodada(pc, 0.62, 0.08 if longo else 0.27, 0.2 if longo else 0.15, 'cima', babado='cima2' if longo else None)
    cinto_faixa(pc, 0.64, 'cima2', laco=True)
    gola_redonda(pc, 'cima2')
    if longo:
        manga(pc, 0.62, MANGA, 'cima', punho=(0.04, 'cima2'))
        bracos_pele(pc, 0.55)
    else:
        manga(pc, 0.4, MANGA, 'cima', punho=(0.03, 'cima2'), bufante=0.03)
        bracos_pele(pc, 0.3)
    return pc

def fazer_tunica():
    pc = topo('tunicaCoral')
    tronco(pc, base=0.5, folga=0.022)
    saia_rodada(pc, 0.52, 0.22, 0.07, 'cima')
    cinto_faixa(pc, 0.55, 'cima2', folga=0.03)
    # gola com bordado
    pc.loft2([anel_tronco(1.2, 0.03), anel_tronco(1.24, 0.034), anel_tronco(1.28, 0.012)], 'cima2')
    linhas = [[pc.frente(x, z, 0.01)[0] for x in (-0.035, 0, 0.035)] for z in (1.2, 1.1, 1.0)]
    pc.grade(linhas, 'cima2')
    for z in (1.15, 1.05): botoes(pc, (z,), '#E8B83A', r=0.013)
    manga(pc, 0.62, [(x, r + 0.01) for x, r in MANGA], 'cima', punho=(0.05, 'cima2'), bufante=0.01)
    bracos_pele(pc, 0.55)
    return pc

TOPOS_NOVOS = [fazer_moletom(), fazer_moletom(True), fazer_camiseta(), fazer_camiseta(True), fazer_regata(), fazer_polo(),
               fazer_camisa(), fazer_blusa(), fazer_jaqueta(), fazer_blazer(), fazer_vestido(), fazer_vestido(True), fazer_tunica()]
for pc in TOPOS_NOVOS:
    o = pc.objeto(); aplicar_pesos(o); com_punhos(o)

# ---------- Partes de baixo ----------
def fazer_saia(longa=False):
    pc = Roupa('baixo_saiaLonga' if longa else 'baixo_saia')
    pc.loft2([anel_tronco(0.5, 0.008), anel_tronco(0.43, 0.012)], 'baixo', TRONCO, tampa=(True, False))
    saia_rodada(pc, 0.43, 0.07 if longa else 0.25, 0.17 if longa else 0.12, 'baixo')
    faixa(pc, 0.42, 0.48, 0.02, 'baixo')
    return pc

def fazer_macacao():
    pc = Roupa('baixo_macacaoJardim')
    pc.loft2([anel_tronco(0.33, 0.02), anel_tronco(0.45, 0.042)], 'baixo', TRONCO, tampa=(True, False))  # cós por cima da blusa
    # peitilho, alças e bolso
    zs = [0.42, 0.55, 0.68, 0.8, 0.9]
    linhas = [[ponto(z, t, 0.048) for t in (-math.pi / 2 + k * 0.42 for k in (-1, -0.5, 0, 0.5, 1))] for z in zs]
    pc.grade(linhas, 'baixo')
    pc.grade([[ponto(z, t, 0.05) for t in (-math.pi / 2 + k * 0.42 for k in (-1, 0, 1))] for z in (0.9, 0.925)], 'baixo')
    bolso = [[ponto(z, -math.pi / 2 + k * 0.2, 0.054) for k in (-1, 0, 1)] for z in (0.83, 0.75, 0.68)]
    pc.grade(bolso, 'baixo')
    for s in (1, -1):
        p = ponto(0.88, -math.pi / 2 + s * 0.36, 0.06)
        pc.oval(p, (0.022, 0.01, 0.022), 'fixo', '#E8B83A', 8)
        # alça: sobe do peitilho, passa no ombro e desce nas costas
        caminho = []
        for k in range(13):
            ang = math.radians(-80 + 160 * k / 12)
            loc, nor, _, _ = BVH_TRONCO.ray_cast(Vector((s * 0.16, 0, 0.95)), Vector((0, math.sin(ang), math.cos(ang))))
            caminho.append((loc, nor))
        linhas = [[loc + nor * 0.03 + Vector((dx, 0, 0)) for dx in (-0.032, 0.032)] for loc, nor in caminho]
        pc.grade(linhas if s > 0 else [l[::-1] for l in linhas], 'baixo')
    return pc

def fazer_pijama():
    pc = Roupa('baixo_pijamaOvelha')
    # bolinhas de lã nas pernas (a calça é a de sempre) e faixa no cós
    pc.loft2([anel_tronco(0.4, 0.03), anel_tronco(0.44, 0.036), anel_tronco(0.48, 0.03)], 'fixo', TRONCO, '#F4F1EA')
    for s in (1, -1):
        for x, y, z in ((0.2, -0.105, 0.44), (0.12, -0.1, 0.36), (0.23, -0.06, 0.3), (0.13, 0.1, 0.42), (0.24, 0.07, 0.36), (0.27, 0.0, 0.45)):
            pc.oval((s * x, y, z), (0.03, 0.03, 0.03), 'fixo', '#FFFFFF', 8, PERNA)
    return pc

for fazer in (fazer_saia, lambda: fazer_saia(True), fazer_pijama):
    o = fazer().objeto(); aplicar_pesos(o)
mac = fazer_macacao()
o = mac.objeto(); aplicar_pesos(o)

# ---------- Rosto: olhos e brilhos colados na pele (no perfil eles saltavam para fora do rosto) ----------
_pele = bpy.data.objects['pele'].data
_bvh_rosto = BVHTree.FromPolygons([v.co for v in _pele.vertices], [p.vertices[:] for p in _pele.polygons])
def colar_no_rosto(o, folga_olho=0.004, folga_brilho=0.009):
    me = o.data
    col = me.color_attributes.get('Col')
    branco = set()
    if col:
        for p in me.polygons:
            for li in p.loop_indices:
                c = col.data[li].color
                if min(c[0], c[1], c[2]) > 0.95: branco.add(me.loops[li].vertex_index)
    for v in me.vertices:
        loc, nor, _, _ = _bvh_rosto.find_nearest(v.co)
        if loc is None: continue
        if nor.dot(loc - CC) < 0: nor = -nor
        alvo = loc + nor * (folga_brilho if v.index in branco else folga_olho)
        # só puxa para dentro (o que saltava); nunca empurra para fora
        if (v.co - CC).length > (alvo - CC).length: v.co = alvo
for nome in ('olhos', 'olhos_fechados'):
    colar_no_rosto(bpy.data.objects[nome])

# =====================================================================================================
# Fantasias: cada uma tem o próprio modelo "fant_<id>" (roupa, acessórios e chapéu), no lugar das peças medievais.
# =====================================================================================================
def _bvh_de(nomes):
    vs, fs = [], []
    for n in nomes:
        o = bpy.data.objects.get(n)
        if not o: continue
        base = len(vs); vs += [v.co.copy() for v in o.data.vertices]
        fs += [tuple(base + i for i in p.vertices) for p in o.data.polygons]
    return BVHTree.FromPolygons(vs, fs)
CASCA = _bvh_de(['pele', 'cabelo_raspado', 'cabelo_coque'])
_pv = bpy.data.objects['pele'].data.vertices
TOPO_CABECA = max(v.co.z for v in _pv)
LARG_CABECA = max(abs(v.co.x) for v in _pv)
FRENTE_CABECA = min(v.co.y for v in _pv)
TRAS_CABECA = max(v.co.y for v in _pv)

def borda_cabeca(z, t, folga=0.0):
    """Ponto mais externo da cabeça (pele + cabelo curto) na altura z, ângulo t (frente = -pi/2)."""
    centro = Vector((0, CC.y, z))
    fora = centro + Vector((math.cos(t), math.sin(t), 0)) * 2
    d = (centro - fora).normalized()
    hit, _, _, _ = CASCA.ray_cast(fora, d)
    return (hit - d * folga) if hit else centro + Vector((math.cos(t) * 0.2, math.sin(t) * 0.2, 0))
def anel_cabeca(z, folga, n=32):
    pts = [borda_cabeca(z, 2 * math.pi * i / n, 0) for i in range(n)]
    c = Vector((0, CC.y, z))
    rs = [(p - c).length for p in pts]
    rs = [max(rs[i - 1], rs[i], rs[(i + 1) % n]) + folga for i in range(n)]  # sem calombos
    return [c + Vector((math.cos(2 * math.pi * i / n), math.sin(2 * math.pi * i / n), 0)) * rs[i] for i in range(n)]

def domo(pc, cat, cor=None, corte=1.78, folga=0.03, escala=1.1, achata=1.0, inclina=0.0, seg=(40, 24), alto=1.0):
    """Cobertura da cabeça (capacete, chapéu, lenço): elipsoide que envolve pele e cabelo curto.
    O raio é suavizado entre vizinhos (sem degraus que viravam manchas) e nunca entra na cabeça;
    a borda é cortada por um plano, sem dentes."""
    antes = set(pc.bm.verts)
    g = bmesh.ops.create_uvsphere(pc.bm, u_segments=seg[0], v_segments=seg[1], radius=1)
    vs = g['verts']
    dirs, minimo, r = {}, {}, {}
    for v in vs:
        d = Vector((v.co.x, v.co.y, v.co.z * achata)).normalized()
        hit, _, _, dist = CASCA.ray_cast(CC + d * 3, -d)
        dirs[v] = d
        minimo[v] = (3 - dist) + folga if hit else 0.0
        r[v] = max(Vector((d.x * RC.x, d.y * RC.y, d.z * RC.z)).length * escala, minimo[v])
    for _ in range(14):
        r = {v: max(minimo[v], (r[v] + sum(r[e.other_vert(v)] for e in v.link_edges) / len(v.link_edges)) / 2) for v in vs}
    for v in vs:
        v.co = CC + dirs[v] * r[v]
        if v.co.z > CC.z: v.co.z = CC.z + (v.co.z - CC.z) * alto  # copa mais alta (só afasta da cabeça)
    geom = list(vs) + list({e for v in vs for e in v.link_edges}) + list({f for v in vs for f in v.link_faces})
    no = Vector((0, -inclina, 1)).normalized()
    bmesh.ops.bisect_plane(pc.bm, geom=geom, plane_co=(0, CC.y, corte), plane_no=no, clear_inner=True)
    novas = [v for v in pc.bm.verts if v.is_valid and v not in antes]
    faces = list({f for v in novas for f in v.link_faces})
    pc.pintar(faces, cat, cor); pc.marcar(novas, CABECA); pc._bvh = None
    return faces

def tricornio(pc, cat, z=1.86, aba=0.2, alto=0.15, debrum='#E2B23A', n=60):
    """Chapéu de três pontas: copa sobre a cabeça e aba virada para cima nos lados, pontas na frente e atrás."""
    domo(pc, cat, corte=z - 0.03, folga=0.05, escala=1.06, achata=1.1)
    base = anel_cabeca(z, 0.035, n)
    c = Vector((0, CC.y, z))
    def aba_em(p, u):
        rad = (p - c).normalized()
        t = math.atan2(p.y - CC.y, p.x)
        fi = abs(((t + math.pi / 2) % (2 * math.pi / 3)) - math.pi / 3)   # 0 no meio do lado, pi/3 na ponta
        ponta = (fi / (math.pi / 3)) ** 2
        ext = aba * (0.3 + 0.7 * ponta)
        sobe = alto * (1 - 0.7 * ponta)
        return p + rad * ext * u + Vector((0, 0, sobe * u ** 1.6))
    us = [0, 0.25, 0.5, 0.75, 1.0]
    cima = [[aba_em(p, u) for p in base] for u in us]
    baixo = [[q + Vector((0, 0, -0.03)) - (q - c).normalized() * 0.004 for q in a] for a in cima[::-1]]
    pc.loft2(cima + baixo, cat, CABECA)
    if debrum: tubo_caminho(pc, [aba_em(p, 1.0) + Vector((0, 0, -0.012)) for p in base], [0.017] * n, 'fixo', debrum, CABECA, lados=6, fechado=True)
    else: tubo_caminho(pc, [aba_em(p, 1.0) + Vector((0, 0, -0.015)) for p in base], [0.016] * n, cat, None, CABECA, lados=6, fechado=True)
    return aba_em

def _bvh_faces(faces):
    vs = list({v for f in faces if f.is_valid for v in f.verts}); ix = {v: i for i, v in enumerate(vs)}
    return BVHTree.FromPolygons([v.co for v in vs], [[ix[v] for v in f.verts] for f in faces if f.is_valid])

def anel_sobre(bvh, z, folga, n=40):
    """Anel em volta de uma peça já feita (ex.: domo do capacete), na altura z."""
    pts = []
    for k in range(n):
        t = 2 * math.pi * k / n
        d = Vector((math.cos(t), math.sin(t), 0))
        hit = bvh.ray_cast(Vector((0, CC.y, z)) + d * 3, -d)[0]
        pts.append((hit if hit else Vector((0, CC.y, z)) + d * 0.5) + d * folga)
    return pts

def tubo_caminho(pc, pontos, raios, cat, cor=None, tipo=TRONCO, lados=8, fechado=False):
    """Tubo ao longo de uma linha (cordas, chifres, auréola). raios: um por ponto."""
    pontos = [Vector(p) for p in pontos]
    aneis = []
    n = len(pontos)
    for i, p in enumerate(pontos):
        a = pontos[(i + 1) % n] if fechado else pontos[min(i + 1, n - 1)]
        b = pontos[i - 1] if (fechado or i > 0) else pontos[0]
        tan = (a - b).normalized()
        u = tan.cross(Vector((0, 0, 1)))
        if u.length < 1e-3: u = tan.cross(Vector((1, 0, 0)))
        u.normalize(); w = tan.cross(u).normalized()
        aneis.append([p + (u * math.cos(k * 2 * math.pi / lados) + w * math.sin(k * 2 * math.pi / lados)) * raios[i] for k in range(lados)])
    if fechado: aneis.append(aneis[0])
    return pc.loft2(aneis, cat, tipo, cor, tampa=(not fechado, not fechado))

def anel_tubo(pc, centro, raio, espessura, cat, cor=None, tipo=TRONCO, n=28, inclina=0.0):
    pts = [Vector(centro) + Vector((math.cos(2 * math.pi * i / n) * raio[0], math.sin(2 * math.pi * i / n) * raio[1], inclina * math.sin(2 * math.pi * i / n))) for i in range(n)]
    tubo_caminho(pc, pts, [espessura] * n, cat, cor, tipo, fechado=True)

def faixa_cabeca(pc, z, folga, espessura, cat, cor=None):
    pts = anel_cabeca(z, folga, n=36)
    tubo_caminho(pc, pts, [espessura] * len(pts), cat, cor, CABECA, fechado=True)

def colete(pc, z0, z1, folga, cat, cor=None, abertura=0.45):
    """Colete aberto na frente (cobre costas e laterais)."""
    ts = [-math.pi / 2 + abertura + (2 * math.pi - 2 * abertura) * k / 30 for k in range(31)]
    linhas = [[ponto(z, t, folga) for t in ts] for z in (z1, (z0 + z1) / 2, z0)]
    pc.grade(linhas, cat, TRONCO, cor)

def cinto(pc, z, folga, cor, fivela=None, cat='fixo'):
    faixa(pc, z - 0.028, z + 0.028, folga, cat, cor)
    if fivela:
        p, _ = pc.frente(0, z, folga - 0.006)
        pc.oval(p, (0.045, 0.012, 0.035), 'fixo', fivela, 10)

def fivela_quadrada(pc, z, folga, cor, miolo, w=0.1, h=0.085, x=0.0):
    p, nor = pc.frente(x, z, folga)
    u = Vector((0, 0, 1)).cross(nor).normalized(); v = Vector((0, 0, 1))
    ret = lambda c, a, b: [c + u * (-a) + v * (-b), c + u * a + v * (-b), c + u * a + v * b, c + u * (-a) + v * b]
    pc.placa(ret(p, w / 2, h / 2), 0.014, nor, 'fixo', cor)
    pc.placa(ret(p + nor * 0.014, w / 2 - 0.018, h / 2 - 0.018), 0.004, nor, 'fixo', miolo)
    pc.placa(ret(p + nor * 0.018 + u * 0.012, 0.008, h / 2 - 0.018), 0.006, nor, 'fixo', cor)

def cinto_largo(pc, z, folga, cor, fivela='#8C877E', alt=0.075):
    pc.loft2([anel_tronco(z - alt / 2, folga), anel_tronco(z - alt / 2 + 0.01, folga + 0.01), anel_tronco(z + alt / 2 - 0.01, folga + 0.01), anel_tronco(z + alt / 2, folga)], 'fixo', TRONCO, cor)
    fivela_quadrada(pc, z, folga + 0.006, fivela, cor)

def corda_cintura(pc, z, folga, cor, grossa=0.016):
    pts = [ponto(z + 0.008 * math.sin(3 * t), t, folga + 0.006) for t in (2 * math.pi * k / 40 for k in range(40))]
    tubo_caminho(pc, pts, [grossa] * 40, 'fixo', cor, fechado=True)
    for s in (1, -1):
        topo, _ = pc.frente(s * 0.05, z, folga)
        tubo_caminho(pc, [topo, topo + Vector((s * 0.01, -0.015, -0.12)), topo + Vector((s * 0.02, -0.02, -0.22))], [grossa * 0.9] * 3, 'fixo', cor)
        pc.oval(topo + Vector((s * 0.02, -0.02, -0.23)), (grossa * 1.4,) * 3, 'fixo', cor, 8)
    p, _ = pc.frente(0, z, folga + 0.01)
    pc.oval(p, (0.035, 0.025, 0.03), 'fixo', cor, 8)

def tunica_longa(pc, ate=0.08, abre=0.18, cat='cima', folga=0.018, listras=None, cor=None):
    tronco(pc, base=0.6, folga=folga, cat=cat, cor=cor)
    if listras:
        # anéis coloridos por cima do tronco
        zs = [0.62 + i * 0.07 for i in range(9)]
        for i, (a, b) in enumerate(zip(zs, zs[1:])):
            pc.loft2([anel_tronco(a, folga + 0.006), anel_tronco(b, folga + 0.006)], 'fixo', TRONCO, listras[i % len(listras)])
    passos = 8
    linhas = []
    rx, ry, p = perfil(0.62)
    for i in range(passos + 1):
        t = i / passos
        z = 0.62 + (ate - 0.62) * t
        k = abre * (t ** 0.85)
        linhas.append(anel_tronco(z, folga, perf=(rx + k, ry + k * 0.85, max(2.0, p - 0.8 * t))))
    if listras:
        for i, (a, b) in enumerate(zip(linhas, linhas[1:])):
            pc.loft2([a, b], 'fixo', SAIA, listras[(i + 3) % len(listras)], tampa=(False, i == passos - 1))
    else:
        pc.loft2(linhas, cat, SAIA, cor, tampa=(False, True))
    return lambda z: (lambda t: (rx + abre * (t ** 0.85), ry + abre * 0.85 * (t ** 0.85), max(2.0, p - 0.8 * t)))(min(1, max(0, (0.62 - z) / (0.62 - ate))))

def barra_tunica(pc, perf_saia, z, cat, cor=None, alt=0.04):
    pc.loft2([anel_tronco(z + alt, 0.03, perf=perf_saia(z + alt)), anel_tronco(z, 0.034, perf=perf_saia(z))], cat, SAIA, cor)

def capa_costas(pc, cor, forro=None, de=1.2, ate=0.18, abre=0.12, largura=1.05, arminho=None):
    linhas = []
    for i in range(9):
        t = i / 8
        z = de + (ate - de) * t
        ang = largura * (0.75 + 0.4 * t)
        ts = [math.pi / 2 - ang + 2 * ang * k / 14 for k in range(15)]
        linhas.append([ponto(z, tt, 0.05 + abre * t) for tt in ts])
    pc.grade(linhas, 'fixo', TRONCO, cor)
    if forro:
        pc.grade([[p + (Vector((p.x, p.y - CC.y * 0, 0)).normalized() * -0.012) for p in l][::-1] for l in linhas], 'fixo', TRONCO, forro)
    if arminho:
        # gola de arminho: branca com pintinhas pretas
        for t in (2 * math.pi * k / 18 for k in range(18)):
            p = ponto(1.2, t, 0.07)
            pc.oval(p, (0.06, 0.06, 0.05), 'fixo', arminho, 8)
        for t in (2 * math.pi * k / 6 + 0.3 for k in range(6)):
            pc.oval(ponto(1.2, t, 0.125), (0.012, 0.012, 0.02), 'fixo', '#1A1A1A', 6)

def asas(pc, cor='#FFFFFF', sombra='#E4E0F2'):
    p0, _ = pc.costas(0, 1.0, 0.02)
    for s in (1, -1):
        for k, (dx, dz, rx, rz, ang) in enumerate(((0.16, 0.12, 0.2, 0.09, 0.55), (0.24, 0.0, 0.24, 0.08, 0.3), (0.26, -0.13, 0.22, 0.07, 0.05), (0.2, -0.24, 0.17, 0.06, -0.2))):
            giro = Matrix.Rotation(-s * ang, 3, 'Y')
            pc.oval(p0 + Vector((s * dx * 1.3, 0.06 + 0.02 * k, dz * 1.2 + 0.05)), (rx * 1.3, 0.04, rz * 1.25), 'fixo', cor if k % 2 == 0 else sombra, 12, giro=giro)

def coroa(pc, z=1.86, cor='#E8B83A', gema='#C0263A', pontas=8, alt=0.1, folga=0.02, tiara=False):
    if tiara:
        ts = [-math.pi / 2 + a for a in (-1.1, -0.7, -0.35, 0, 0.35, 0.7, 1.1)]
        pts = [borda_cabeca(z + 0.02 * math.cos(t + math.pi / 2), t, folga) for t in ts]
        tubo_caminho(pc, pts, [0.018] * len(pts), 'fixo', cor, CABECA)
        pc.oval(borda_cabeca(z + 0.06, -math.pi / 2, folga + 0.01), (0.04, 0.02, 0.055), 'fixo', cor, 10, CABECA)
        pc.oval(borda_cabeca(z + 0.06, -math.pi / 2, folga + 0.025), (0.022, 0.012, 0.028), 'fixo', gema, 8, CABECA)
        return
    # aro grosso e arredondado, pontas em triângulo com bolinha e rubis
    aneis = [anel_cabeca(z + alt * k, folga + 0.012 + 0.014 * math.sin(math.pi * k)) for k in (0, 0.25, 0.5, 0.75, 1)]
    pc.loft2(aneis + [[q + Vector((0, 0, 0.006)) - (q - Vector((0, CC.y, q.z))).normalized() * 0.02 for q in aneis[-1]]], 'fixo', CABECA, cor)
    n = len(aneis[0])
    for k in range(pontas):
        i = (k * n // pontas + n // 4) % n
        q = aneis[-1][i]
        fora = (q - Vector((0, CC.y, q.z))).normalized()
        lado = Vector((0, 0, 1)).cross(fora).normalized()
        pc.placa([q - lado * 0.075, q + lado * 0.075, q + fora * 0.004 + Vector((0, 0, 0.14))], 0.026, fora, 'fixo', cor, CABECA)
        pc.oval(q + Vector((0, 0, 0.155)) + fora * 0.014, (0.037, 0.037, 0.037), 'fixo', '#F2C94C', 10, CABECA)
        meio = aneis[2][i]
        pc.oval(meio + fora * 0.018, (0.026, 0.012, 0.03), 'fixo', gema if k % 2 == 0 else '#2E6FC0', 10, CABECA)

def veu(pc, cor):
    # véu leve: cobre a nuca e cai sobre os ombros
    domo(pc, 'fixo', cor, corte=1.58, folga=0.05, escala=1.16, inclina=-0.75)
    linhas = []
    for i, z in enumerate((1.4, 1.28, 1.16)):
        ts = [math.pi / 2 + a for a in (-1.4, -0.9, -0.45, 0, 0.45, 0.9, 1.4)]
        linhas.append([CC + Vector((math.cos(t) * RC.x * (1.05 + 0.12 * i), math.sin(t) * RC.y * (1.0 + 0.12 * i), z - CC.z)) for t in ts])
    pc.grade(linhas, 'fixo', CABECA, cor)

def fazer_fantasia(nome, montar):
    pc = Roupa('fant_' + nome)
    montar(pc)
    o = pc.objeto(); aplicar_pesos(o); com_punhos(o)

def f_pescador(pc):
    tronco(pc, base=0.36, folga=0.022)
    saia_rodada(pc, 0.4, 0.27, 0.06, 'cima', tipo=SAIA)
    # listras de tecido rústico e corda na cintura
    for z in (0.95, 0.75): faixa(pc, z - 0.012, z + 0.012, 0.028, 'cima2')
    corda_cintura(pc, 0.52, 0.03, '#B98A57')
    manga(pc, 0.5, [(x, r + 0.01) for x, r in MANGA], 'cima', punho=(0.04, 'cima2'))
    bracos_pele(pc, 0.4)
    # faixa na cabeça e rede de pesca no ombro
    faixa_cabeca(pc, 1.82, 0.03, 0.035, 'cima2')
    for k in range(5):
        p = ponto(1.05 - 0.12 * k, math.pi * 0.25 - 0.18 * k, 0.04)
        pc.oval(p, (0.05, 0.05, 0.05), 'fixo', '#C9B48A', 6)

def f_pastor(pc):
    # túnica clara por baixo, manto marrom aberto, mangas largas e cinto de corda com pontas
    tunica_longa(pc, 0.1, 0.12, 'fixo', cor='#E9DCC2')
    v = [pc.frente(x, z, 0.014)[0] for x, z in ((-0.08, 1.255), (0, 1.15), (0.08, 1.255))]
    tubo_caminho(pc, v, [0.012] * 3, 'fixo', '#D2C2A2', lados=6)
    casaca(pc, 'cima', de=1.27, ate=0.12, folga=0.045, abre=(0.3, 0.5), roda=0.13, debrum='#6E5038', grosso=0.02)
    corda_cintura(pc, 0.64, 0.06, '#CDB386', grossa=0.024)
    manga(pc, 0.7, [(0.12, 0.155), (0.4, 0.16), (0.7, 0.19)], 'cima', punho=(0.05, 'cima2'))
    bracos_pele(pc, 0.6)

def f_mineiro(pc):
    # camisa cáqui de botão com bolsos, cinto de ferramentas e capacete com aba inteira e lanterna
    tronco(pc, base=0.37, folga=0.02)
    gola_camisa(pc, 'cima')
    carcela(pc, 0.5, 1.2, 'fixo', '#C99A5A')
    botoes(pc, (1.12, 0.98, 0.84, 0.7, 0.58), '#6B4A33')
    for s_ in (1, -1):
        bolso_frente(pc, s_ * 0.15, 0.96, 0.13, 0.12, 'fixo', '#C99A5A', aba=True)
        botoes(pc, (1.0,), '#6B4A33', x=s_ * 0.15, r=0.014)
    manga(pc, 0.78, MANGA, 'cima', punho=(0.05, 'fixo'), cor_punho='#C99A5A')
    bracos_pele(pc, 0.7)
    cinto_largo(pc, 0.45, 0.03, '#5A3A24', '#B9BDC2', alt=0.075)
    for s_ in (1, -1):  # bolsinhas de ferramenta no quadril
        p, nor = pc.frente(s_ * 0.2, 0.4, 0.05)
        u = Vector((0, 0, 1)).cross(nor).normalized()
        pc.placa([p - u * 0.06 + Vector((0, 0, -0.06)), p + u * 0.06 + Vector((0, 0, -0.06)), p + u * 0.06 + Vector((0, 0, 0.05)), p - u * 0.06 + Vector((0, 0, 0.05))], 0.05, nor, 'fixo', '#6B4428')
        pc.placa([p - u * 0.065 + Vector((0, 0, 0.0)) + nor * 0.05, p + u * 0.065 + Vector((0, 0, 0.0)) + nor * 0.05, p + u * 0.065 + Vector((0, 0, 0.055)) + nor * 0.03, p - u * 0.065 + Vector((0, 0, 0.055)) + nor * 0.03], 0.012, nor, 'fixo', '#5A3A24')
    domo(pc, 'cima2', corte=1.79, folga=0.06, escala=1.16, achata=0.95)
    a0, a1 = anel_cabeca(1.8, 0.04, n=40), anel_cabeca(1.77, 0.17, n=40)
    a2 = [q + Vector((0, 0, -0.035)) for q in a1]
    pc.loft2([a0, a1, a2, [q + Vector((0, 0, -0.025)) for q in a0]], 'cima2', CABECA)
    tubo_caminho(pc, [q + Vector((0, 0, -0.017)) for q in a1], [0.02] * len(a1), 'cima2', None, CABECA, lados=6, fechado=True)
    p = borda_cabeca(1.96, -math.pi / 2, 0.09)
    pc.oval(p, (0.08, 0.05, 0.075), 'fixo', '#4A4A50', 12, CABECA)
    aro = [p + Vector((math.cos(t) * 0.07, -0.05, math.sin(t) * 0.065)) for t in (2 * math.pi * k / 20 for k in range(20))]
    tubo_caminho(pc, aro, [0.016] * 20, 'fixo', '#D7DCE0', CABECA, lados=6, fechado=True)
    pc.oval(p + Vector((0, -0.045, 0)), (0.06, 0.012, 0.055), 'fixo', '#FFF4C2', 12, CABECA)

def casaca(pc, cat, de=1.24, ate=0.24, folga=0.042, abre=(0.3, 0.75), roda=0.1, debrum=None, grosso=0.014):
    """Casaco comprido aberto na frente (abre: meia abertura no peito e na barra, em radianos)."""
    linhas = []
    for i in range(13):
        t = i / 12
        z = de + (ate - de) * t
        a = abre[0] + (abre[1] - abre[0]) * t ** 1.5
        f = folga + roda * suave(0.62, ate, z)
        linhas.append([ponto(z, -math.pi / 2 + a + (2 * math.pi - 2 * a) * k / 36, f) for k in range(37)])
    pc.grade(linhas, cat, TRONCO)
    pc.grade([l[::-1] for l in linhas], cat, TRONCO)  # avesso: o tecido aparece dos dois lados
    if debrum:
        for borda in (0, -1):
            tubo_caminho(pc, [l[borda] for l in linhas], [grosso] * len(linhas), 'fixo', debrum, lados=8)
        tubo_caminho(pc, linhas[-1], [grosso] * len(linhas[-1]), 'fixo', debrum, lados=8)
    return linhas

def f_pirata(pc):
    # camisa clara, colete vermelho com botões dourados, cinto largo, bandana, tapa-olho e chapelão com caveira
    clara = '#E6DED0'
    tronco(pc, base=0.37, folga=0.02, cat='fixo', cor=clara)
    manga(pc, 0.76, [(x, r + 0.02) for x, r in MANGA], 'fixo', punho=(0.06, 'fixo'), cor=clara, cor_punho='#D6CCBA')
    bracos_pele(pc, 0.7)
    ab = 0.42
    linhas = [[ponto(z, -math.pi / 2 + ab + (2 * math.pi - 2 * ab) * k / 30, 0.042) for k in range(31)] for z in (1.25, 1.1, 0.9, 0.72, 0.56, 0.48)]
    pc.grade(linhas, 'cima', TRONCO); pc.grade([l[::-1] for l in linhas], 'cima', TRONCO)
    for z in (1.0, 0.8, 0.62):
        q = ponto(z, -math.pi / 2 + ab + 0.06, 0.06)
        pc.oval(q, (0.026, 0.02, 0.026), 'fixo', '#E8B83A', 10)
    cinto_largo(pc, 0.47, 0.055, '#4A2E1C', '#E8B83A', alt=0.07)
    tricornio(pc, 'cima2', z=1.87, aba=0.27, alto=0.2, debrum=None)
    # caveira e ossos cruzados na frente do chapéu
    p = pc.superficie((0, CC.y - 3, 2.0), (0, 1, 0))[0] + Vector((0, -0.012, 0))
    for s_ in (1, -1):
        tubo_caminho(pc, [p + Vector((s_ * -0.085, -0.005, -0.06)), p + Vector((s_ * 0.085, -0.005, 0.03))], [0.014, 0.014], 'fixo', '#DCEBF2', CABECA, lados=6)
        for d in (-1, 1): pc.oval(p + Vector((s_ * 0.085 * d, -0.006, -0.06 if d < 0 else 0.03)) + Vector((0, 0, 0.012 * d)), (0.022, 0.012, 0.016), 'fixo', '#DCEBF2', 8, CABECA)
    pc.oval(p + Vector((0, -0.016, 0.01)), (0.058, 0.02, 0.05), 'fixo', '#DCEBF2', 12, CABECA)
    pc.oval(p + Vector((0, -0.014, -0.035)), (0.035, 0.016, 0.025), 'fixo', '#DCEBF2', 10, CABECA)
    for s_ in (1, -1): pc.oval(p + Vector((s_ * 0.022, -0.033, 0.01)), (0.014, 0.006, 0.016), 'fixo', '#3F4E5F', 8, CABECA)
    # bandana vermelha por baixo do chapéu, com nó e pontas atrás
    faixa_cabeca(pc, 1.82, 0.035, 0.032, 'fixo', '#D9473A')
    b = borda_cabeca(1.82, math.pi / 2 + 0.6, 0.06)
    pc.oval(b, (0.04, 0.035, 0.035), 'fixo', '#D9473A', 10, CABECA)
    for k, (dx, dz) in enumerate(((0.06, -0.12), (0.1, -0.08))):
        pc.placa([b + Vector((0, 0.01, 0.02)), b + Vector((0, 0.01, -0.02)), b + Vector((dx, 0.04, dz))], 0.018, (0, 1, 0), 'fixo', '#C63A2E', CABECA)
    olhos = bpy.data.objects['olhos'].data.vertices
    ox = [v.co for v in olhos if v.co.x > 0]
    if ox:
        c = sum(ox, Vector()) / len(ox)
        pc.oval(c + Vector((0, -0.02, 0)), (0.075, 0.018, 0.065), 'fixo', '#2A2E36', 12, CABECA)
        t0 = math.atan2(c.y - CC.y, c.x)
        pts = [borda_cabeca(c.z + 0.03 + 0.12 * k / 10, t0 + (math.pi / 2 - t0) * k / 10, 0.01) for k in range(1, 11)]
        tubo_caminho(pc, pts, [0.01] * len(pts), 'fixo', '#2A2E36', CABECA, lados=6)

def f_anjo(pc):
    perf = tunica_longa(pc, 0.07, 0.2, 'cima')
    barra_tunica(pc, perf, 0.07, 'fixo', '#E8B83A', 0.03)
    cinto(pc, 0.64, 0.03, '#E8B83A')
    gola_redonda(pc, 'fixo', '#E8B83A')
    manga(pc, 0.7, [(x, r + 0.02) for x, r in MANGA], 'cima', punho=(0.04, 'fixo'), bufante=0.03)
    bracos_pele(pc, 0.62)
    asas(pc)
    anel_tubo(pc, (0, CC.y, TOPO_CABECA + 0.13), (0.24, 0.22), 0.028, 'fixo', '#F5CF52', CABECA)

def f_viking(pc):
    # túnica de couro com barra recortada, cinto largo, gola de pele e capacete com aba, crista, rebite e chifres
    tronco(pc, base=0.36, folga=0.024)
    saia_rodada(pc, 0.46, 0.22, 0.09, 'cima', tipo=SAIA, dentes=0.055)
    cinto_largo(pc, 0.52, 0.05, '#4A3020', '#8C877E', alt=0.085)
    for k in range(16):  # gola de pele: tufos grandes e irregulares
        t = 2 * math.pi * k / 16 + 0.1 * ((k * 3) % 2)
        rr = 0.085 + 0.03 * ((k * 7) % 3) / 2
        p = ponto(1.16 - 0.03 * ((k * 5) % 2), t, 0.06)
        fora = (p - Vector((0, 0, p.z))).normalized()
        pc.oval(p + fora * 0.02 + Vector((0, 0, -0.03)), (rr, rr * 0.8, rr * 1.15), 'cima2', seg=8, giro=Matrix.Rotation(0.6 * ((k % 3) - 1), 3, 'Y'))
    for s_ in (1, -1):  # pele caindo sobre os ombros
        for k in range(3):
            pc.oval(ponto(1.06 - 0.06 * k, -math.pi / 2 + s_ * (1.0 + 0.3 * k), 0.07), (0.08, 0.06, 0.1), 'cima2', seg=8)
    manga(pc, 0.6, [(x, r + 0.016) for x, r in MANGA], 'cima', punho=(0.08, 'cima2'))
    bracos_pele(pc, 0.52)
    cor, aro = '#8A8780', '#74716A'
    casco = domo(pc, 'fixo', cor, corte=1.76, folga=0.06, escala=1.06, alto=1.25)
    bvh = _bvh_faces(casco)
    zs, fs = (1.76, 1.77, 1.81, 1.85, 1.87), (-0.01, 0.025, 0.035, 0.025, -0.01)
    pc.loft2([anel_sobre(bvh, z, f) for z, f in zip(zs, fs)], 'fixo', CABECA, aro, tampa=(False, False))
    # crista da frente até a nuca, por cima do domo
    # crista: segue os vértices do próprio domo no meridiano do meio (x = 0), da aba da frente à de trás
    meio = sorted({v for f in casco if f.is_valid for v in f.verts if abs(v.co.x) < 1e-4 and v.co.z > 1.8},
                  key=lambda v: math.atan2(v.co.z - CC.z, -(v.co.y - CC.y)))
    crista = [v.co + (v.co - CC).normalized() * 0.012 for v in meio]
    tubo_caminho(pc, crista, [0.03] * len(crista), 'fixo', aro, CABECA, lados=8)
    loc, _ = pc.superficie((0, CC.y - 3, 1.81), (0, 1, 0))
    pc.oval(loc + Vector((0, -0.012, 0)), (0.042, 0.03, 0.042), 'fixo', aro, 12, CABECA)
    for s_ in (1, -1):
        b = pc.superficie((s_ * 3, CC.y, 1.95), (-s_, 0, 0))[0] + Vector((s_ * -0.01, 0, 0))
        pts = [b + Vector((s_ * dx, -0.012 * k, dz)) for k, (dx, dz) in enumerate(((-0.04, 0), (0.06, 0.0), (0.15, 0.04), (0.22, 0.13), (0.25, 0.25), (0.23, 0.36), (0.18, 0.44)))]
        tubo_caminho(pc, pts, [0.085, 0.082, 0.072, 0.058, 0.042, 0.025, 0.006], 'fixo', '#EFE4C6', CABECA, lados=12)

def f_robo(pc):
    # tronco quadrado de lata com painel e luzes
    caixa_perf = lambda z: (perfil(z)[0] + 0.02, perfil(z)[1] + 0.02, 5.0)
    tronco(pc, base=0.37, folga=0.0, cat='cima', perf=caixa_perf)
    pc.folga_tronco = 0.0
    linhas = [[pc.frente(x, z, 0.004)[0] for x in (-0.16, 0, 0.16)] for z in (0.98, 0.8, 0.62)]
    pc.grade(linhas, 'fixo', TRONCO, '#3A4350')
    for k, cor in enumerate(('#4FD1E0', '#F5CF52', '#E85A5A')):
        p, _ = pc.frente(-0.08 + 0.08 * k, 0.9, 0.012); pc.oval(p, (0.025, 0.01, 0.025), 'fixo', cor, 8)
    for k in range(3):
        p, _ = pc.frente(0, 0.72 - 0.0 * k, 0.012); pc.oval(p + Vector((-0.08 + 0.08 * k, 0, 0)), (0.03, 0.008, 0.012), 'fixo', '#9AA3AD', 6)
    faixa(pc, 0.4, 0.46, 0.02, 'fixo', '#7B838F')
    for lado in (1, -1):
        pc.loft2([anel_braco(lado, x, r) for x, r in ((0.12, 0.15), (0.45, 0.14), (0.8, 0.13))], 'cima', BRACO, tampa=(True, False))
        for x in (0.3, 0.6): pc.loft2([anel_braco(lado, x - 0.02, 0.15), anel_braco(lado, x + 0.02, 0.15)], 'fixo', BRACO, '#7B838F')
    bracos_pele(pc, 0.8)
    # cabeça de robô: caixa com visor, olhos de luz e antena
    zb, zt = 1.25, TOPO_CABECA + 0.05
    hx, hy = LARG_CABECA + 0.05, max(-FRENTE_CABECA, TRAS_CABECA) + 0.05
    aneis = [[Vector((sp(math.cos(t), 6) * hx * k, CC.y + sp(math.sin(t), 6) * hy * k, z)) for t in (2 * math.pi * i / 32 for i in range(32))] for z, k in ((zb, 0.9), (zb + 0.04, 1.0), (zt - 0.05, 1.0), (zt, 0.9))]
    pc.loft2(aneis, 'cima', CABECA, tampa=(True, True))
    vz = (zb + zt) / 2 + 0.02
    pc.placa([Vector((x, CC.y - hy - 0.008, z)) for x, z in ((-hx * 0.75, vz - 0.13), (hx * 0.75, vz - 0.13), (hx * 0.75, vz + 0.13), (-hx * 0.75, vz + 0.13))], 0.012, (0, -1, 0), 'fixo', '#1E2A36', CABECA)
    for s in (1, -1):
        pc.oval((s * 0.17, CC.y - hy - 0.024, vz + 0.02), (0.06, 0.01, 0.045), 'fixo', '#4FD1E0', 12, CABECA)
        pc.oval((s * (hx + 0.02), CC.y, vz), (0.03, 0.08, 0.08), 'fixo', '#7B838F', 10, CABECA)
    tubo_caminho(pc, [(0, CC.y, zt), (0, CC.y, zt + 0.16)], [0.015, 0.012], 'fixo', '#7B838F', CABECA)
    pc.oval((0, CC.y, zt + 0.19), (0.04, 0.04, 0.04), 'fixo', '#E85A5A', 8, CABECA)

def f_rei(pc):
    # túnica creme com gola em V, manto roxo aberto com debrum dourado largo, cinto com rubi e coroa de pontas
    perf = tunica_longa(pc, 0.07, 0.12, 'fixo', cor='#F1E4C8')
    v = [pc.frente(x, z, 0.014)[0] for x, z in ((-0.1, 1.255), (-0.05, 1.19), (0, 1.12), (0.05, 1.19), (0.1, 1.255))]
    tubo_caminho(pc, v, [0.016] * 5, 'fixo', '#E2B23A', lados=8)
    casaca(pc, 'cima', de=1.27, ate=0.05, folga=0.05, abre=(0.42, 0.52), roda=0.15, debrum='#E2B23A', grosso=0.032)
    cinto_largo(pc, 0.64, 0.03, '#E2B23A', '#E2B23A', alt=0.06)
    p, nor = pc.frente(0, 0.64, 0.05)
    pc.oval(p + nor * 0.012, (0.035, 0.016, 0.035), 'fixo', '#C0263A', 12)
    manga(pc, 0.74, [(0.12, 0.16), (0.35, 0.165), (0.55, 0.185), (0.74, 0.215)], 'cima', punho=(0.075, 'cima2'))
    bracos_pele(pc, 0.6)
    coroa(pc, z=1.85, pontas=7, alt=0.09)

def f_ester(pc):
    perf = tunica_longa(pc, 0.07, 0.24, 'cima')
    barra_tunica(pc, perf, 0.07, 'cima2', alt=0.04)
    barra_tunica(pc, perf, 0.3, 'cima2', alt=0.02)
    cinto(pc, 0.64, 0.024, '#E8B83A', '#E8B83A')
    pc.loft2([anel_tronco(1.2, 0.03), anel_tronco(1.24, 0.034), anel_tronco(1.28, 0.012)], 'cima2')
    for t in (-math.pi / 2 + a for a in (-0.5, -0.25, 0, 0.25, 0.5)):
        pc.oval(ponto(1.15 + 0.03 * abs(t + math.pi / 2), t, 0.045), (0.018, 0.018, 0.018), 'fixo', '#F7F1D0', 6)
    manga(pc, 0.62, [(x, r + 0.01) for x, r in MANGA], 'cima', punho=(0.05, 'cima2'), bufante=0.04)
    bracos_pele(pc, 0.55)
    veu(pc, '#F6E6F0')
    coroa(pc, z=1.84, tiara=True)

def f_jose(pc):
    listras = ['#E65100', '#FFB300', '#1E88E5', '#8E24AA', '#43A047', '#D81B60']
    perf = tunica_longa(pc, 0.08, 0.17, 'cima', listras=listras)
    cinto(pc, 0.64, 0.035, '#F4EEDF')
    gola_redonda(pc, 'fixo', '#F4EEDF', folga=0.03)
    for lado in (1, -1):
        xs = [0.12, 0.25, 0.38, 0.5, 0.62]
        for i, (a, b) in enumerate(zip(xs, xs[1:])):
            pc.loft2([anel_braco(lado, a, raio_em(MANGA, a) + 0.02), anel_braco(lado, b, raio_em(MANGA, b) + 0.02)], 'fixo', BRACO, listras[(i + lado) % len(listras)], tampa=(i == 0, False))
    bracos_pele(pc, 0.55)

def f_festiva(pc):
    perf = tunica_longa(pc, 0.08, 0.18, 'cima')
    for z in (0.08, 0.2): barra_tunica(pc, perf, z, 'cima2', alt=0.03)
    pc.loft2([anel_tronco(1.18, 0.03), anel_tronco(1.23, 0.04), anel_tronco(1.28, 0.015)], 'cima2')
    linhas = [[pc.frente(x, z, 0.008)[0] for x in (-0.03, 0, 0.03)] for z in (1.2, 1.05, 0.9)]
    pc.grade(linhas, 'cima2')
    cinto(pc, 0.64, 0.03, '#D4AF37', '#F7F1D0')
    manga(pc, 0.66, [(x, r + 0.02) for x, r in MANGA], 'cima', punho=(0.05, 'cima2'), bufante=0.05)
    bracos_pele(pc, 0.58)

for nome, montar in (('pescador', f_pescador), ('pastor', f_pastor), ('mineiro', f_mineiro), ('pirata', f_pirata), ('anjo', f_anjo),
                     ('viking', f_viking), ('robo', f_robo), ('rei', f_rei), ('ester', f_ester), ('jose', f_jose), ('tunicaFestiva', f_festiva)):
    fazer_fantasia(nome, montar)

bpy.data.objects.remove(bpy.data.objects['punhos_base'])

FANT_CORES = {  # cima, cima2, baixo, calçado
    'pescador': ('#3E6FA8', '#E9DFC8', '#3A4A66', '#6E4A2E'), 'pastor': ('#7A5232', '#6E5038', '#5A412C', '#6E4A2E'),
    'mineiro': ('#D6A464', '#D99A3E', '#6B4A33', '#5A3A24'), 'pirata': ('#D24A3A', '#3F4E5F', '#3E5C8A', '#6B4226'),
    'anjo': ('#F7F4EE', '#E8B83A', '#E6DFD2', '#E8B83A'), 'viking': ('#6B4A32', '#D8C79E', '#4A3424', '#5E3A26'),
    'robo': ('#A9B0BA', '#4FD1E0', '#8F96A0', '#7B838F'), 'rei': ('#5E2A7E', '#E2B23A', '#E9DCC2', '#6B4226'),
    'ester': ('#C95B9E', '#E8B83A', '#9A2B6E', '#E8B83A'), 'jose': ('#E65100', '#FFB300', '#8E24AA', '#6E4A2E'),
    'tunicaFestiva': ('#F5EFE6', '#D4AF37', '#C5A059', '#8B6B4E'),
}
