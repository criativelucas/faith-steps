# Objetos na mão das fantasias (machado e escudo, cajado, picareta, pergaminho, sabre). Executado em corpo_chibi.py
# depois das animações. Cada um é modelado na pose "parado" (medidas do jogo, em metros) e levado de volta para a
# pose de descanso, preso 100% ao osso da mão: acompanha a mão em qualquer animação. O jogo só mostra parado ou andando.
usar(bpy.data.actions['parado']); cena.frame_set(0); bpy.context.view_layer.update()

def _osso(n):
    return arm.pose.bones[n].matrix.copy(), arm.data.bones[n].matrix_local.copy()

def punho(n):
    """Centro da mão fechada na pose parado."""
    mp, mr = _osso(n)
    b = arm.data.bones[n]
    return mp @ mr.inverted() @ (b.head_local + (b.tail_local - b.head_local) * 0.55)

def peca_mao(id_, osso, montar):
    pc = Roupa(f'fant_{id_}_mao')
    montar(pc, punho(osso) + Vector((0, -0.03, 0)))  # um pouco à frente: o braço não esconde
    mp, mr = _osso(osso)
    volta = mr @ mp.inverted()
    for v in pc.bm.verts: v.co = volta @ v.co
    o = pc.objeto()
    if 'tipo' in o.data.attributes: o.data.attributes.remove(o.data.attributes['tipo'])
    g = o.vertex_groups.get(osso) or o.vertex_groups.new(name=osso)
    g.add(list(range(len(o.data.vertices))), 1.0, 'REPLACE')

def _disco(pc, c, n, r, esp, cor, seg=24):
    """Disco virado para a direção n."""
    giro = Vector((0, -1, 0)).rotation_difference(Vector(n).normalized()).to_matrix()
    return pc.oval(c, (r, esp, r), 'fixo', cor, seg, giro=giro)

def _aro(pc, c, n, r, esp, cor, k=28):
    n = Vector(n).normalized()
    u = n.cross(Vector((0, 0, 1))).normalized(); w = n.cross(u)
    tubo_caminho(pc, [c + (u * math.cos(t) + w * math.sin(t)) * r for t in (2 * math.pi * i / k for i in range(k))], [esp] * k, 'fixo', cor, lados=6, fechado=True)

MADEIRA, MADEIRA_CLARA, FERRO = '#7A5232', '#B07A45', '#9A9CA0'

def machado(pc, f):
    tubo_caminho(pc, [f + Vector((0, 0, -0.1)), f + Vector((0, 0, 0.4))], [0.021, 0.021], 'fixo', MADEIRA, lados=8)
    t = f + Vector((0, 0, 0.33))
    pts = [t + Vector((x * 1.35, -0.014, z * 1.35)) for x, z in ((0.02, -0.05), (-0.05, -0.075), (-0.12, -0.095), (-0.14, 0.0), (-0.12, 0.095), (-0.05, 0.075), (0.02, 0.05))]
    pc.placa(pts, 0.028, (0, 1, 0), 'fixo', FERRO)
    pc.oval(t + Vector((0.01, 0, 0)), (0.03, 0.022, 0.05), 'fixo', '#6E6C66', 8)

def escudo(pc, f):
    c, n = f + Vector((0.07, -0.03, 0.04)), Vector((0.8, -0.6, 0))
    _disco(pc, c, n, 0.17, 0.02, '#8A5A36', 28)
    for d in (-0.06, 0.06):  # tábuas
        u = n.cross(Vector((0, 0, 1))).normalized()
        tubo_caminho(pc, [c + n * 0.021 + u * d + Vector((0, 0, -0.15)), c + n * 0.021 + u * d + Vector((0, 0, 0.15))], [0.004, 0.004], 'fixo', '#5E3C22', lados=4)
    _aro(pc, c, n, 0.17, 0.02, '#7D7A74')
    _disco(pc, c + n * 0.02, n, 0.055, 0.035, '#8A8780', 14)

def cajado(pc, f):
    pts = [Vector((f.x + 0.012 * math.sin(k * 1.7), f.y - 0.01 * math.sin(k * 1.1), 0.03 + (f.z + 0.72 - 0.03) * k / 8)) for k in range(9)]
    tubo_caminho(pc, pts, [0.027, 0.028, 0.026, 0.029, 0.027, 0.028, 0.026, 0.029, 0.031], 'fixo', MADEIRA, lados=8)
    for k in (3, 6): pc.oval(pts[k] + Vector((0.012, 0, 0)), (0.022, 0.02, 0.03), 'fixo', '#5E3C22', 6)
    pc.oval(pts[-1], (0.04, 0.04, 0.036), 'fixo', MADEIRA, 8)

def picareta(pc, f):
    tubo_caminho(pc, [f + Vector((0, 0, -0.08)), f + Vector((0, 0, 0.44))], [0.021, 0.021], 'fixo', MADEIRA_CLARA, lados=8)
    t = f + Vector((0, 0, 0.42))
    pts = [t + Vector((0, y, -0.1 * (y / 0.24) ** 2 + 0.02)) for y in (-0.24, -0.16, -0.08, 0.0, 0.08, 0.16, 0.24)]
    tubo_caminho(pc, pts, [0.008, 0.024, 0.034, 0.04, 0.034, 0.024, 0.008], 'fixo', '#4A4D52', lados=8)

def pergaminho(pc, f):
    tubo_caminho(pc, [f + Vector((0, 0, -0.13)), f + Vector((0, 0, 0.13))], [0.045, 0.045], 'fixo', '#F1E6C8', lados=14)
    for z in (-0.135, 0.135): pc.oval(f + Vector((0, 0, z)), (0.054, 0.054, 0.02), 'fixo', '#E4D3AE', 12)
    p = f + Vector((0, -0.047, 0.04))
    pc.oval(p, (0.026, 0.01, 0.026), 'fixo', '#C0263A', 10)

def sabre(pc, f):
    pc.oval(f + Vector((0, 0, 0.075)), (0.022, 0.022, 0.022), 'fixo', '#E2B23A', 8)
    tubo_caminho(pc, [f + Vector((0, 0, 0.06)), f + Vector((0, 0, -0.06))], [0.015, 0.015], 'fixo', '#4A2E1C', lados=6)
    tubo_caminho(pc, [f + Vector((0.0, 0.05, -0.07)), f + Vector((0.0, -0.045, -0.07)), f + Vector((0.0, -0.06, 0.0)), f + Vector((0.0, -0.035, 0.06))], [0.012, 0.012, 0.01, 0.009], 'fixo', '#E2B23A', lados=6)
    c = lambda t: f + Vector((0, -0.01 - 0.12 * t * t, -0.08 - 0.36 * t))
    costas = [c(i / 8) for i in range(9)]
    fio = [c(i / 8) + Vector((0, -0.065 * (1 - 0.7 * i / 8), -0.006)) for i in range(9)]
    fio[-1] = costas[-1] + Vector((0, -0.012, -0.03))
    pc.grade([costas, fio], 'fixo', TRONCO, '#C9D6DE')

for id_, osso, montar in (('viking', 'hand_r', machado), ('viking_escudo', 'hand_l', escudo), ('pastor', 'hand_r', cajado),
                          ('mineiro', 'hand_r', picareta), ('rei', 'hand_r', pergaminho), ('pirata', 'hand_r', sabre)):
    peca_mao(id_, osso, montar)
# o escudo vai junto com o machado na mesma peça do viking
_v, _e = bpy.data.objects['fant_viking_mao'], bpy.data.objects['fant_viking_escudo_mao']
bpy.ops.object.select_all(action='DESELECT'); _v.select_set(True); _e.select_set(True)
bpy.context.view_layer.objects.active = _v; bpy.ops.object.join()
print('MAOS', punho('hand_r'), punho('hand_l'))
