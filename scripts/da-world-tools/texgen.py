"""Tileable PBR detail textures for Da World (ECYR rebuild).
Each layer: albedo modulation (RGB, 0.5 = unchanged) and normal+roughness (R,G = normal xy, B = roughness).
Everything is periodic (FFT noise, modular patterns), so each layer tiles seamlessly."""
import numpy as np
from PIL import Image
N = 512
rng = np.random.default_rng(2026)
yy, xx = np.mgrid[0:N, 0:N].astype(np.float32)

def fnoise(beta=2.0, lo=1, hi=None, seed=None):
    r = np.random.default_rng(seed) if seed is not None else rng
    w = r.standard_normal((N, N))
    F = np.fft.fft2(w)
    fy = np.fft.fftfreq(N)[:, None] * N; fx = np.fft.fftfreq(N)[None, :] * N
    f = np.sqrt(fx ** 2 + fy ** 2); f[0, 0] = 1
    filt = 1.0 / f ** (beta / 2)
    filt[f < lo] = 0
    if hi: filt[f > hi] = 0
    out = np.real(np.fft.ifft2(F * filt))
    out -= out.mean(); out /= (out.std() + 1e-9)
    return out.astype(np.float32)

def blur(a, s):
    fy = np.fft.fftfreq(N)[:, None]; fx = np.fft.fftfreq(N)[None, :]
    g = np.exp(-2 * (np.pi * s) ** 2 * (fx ** 2 + fy ** 2))
    return np.real(np.fft.ifft2(np.fft.fft2(a) * g)).astype(np.float32)

def normals(h, strength):
    dx = (np.roll(h, -1, 1) - np.roll(h, 1, 1)) * 0.5 * strength
    dy = (np.roll(h, -1, 0) - np.roll(h, 1, 0)) * 0.5 * strength
    # +v is image-up in texture space (rows grow downwards)
    nx, ny, nz = -dx, dy, np.ones_like(h)
    l = np.sqrt(nx ** 2 + ny ** 2 + nz ** 2)
    return nx / l, ny / l

def pack(alb, h, rough, strength):
    nx, ny = normals(h, strength)
    a = np.clip(alb, 0, 1)
    if a.ndim == 2: a = np.stack([a] * 3, -1)
    nr = np.stack([nx * 0.5 + 0.5, ny * 0.5 + 0.5, np.clip(rough, 0, 1)], -1)
    return a, nr

def cells(cols, rows, offset_rows=0.0):
    """Running-bond cell coordinates: (cell id, local u, local v) with half offsets every other row."""
    v = yy / N * rows
    row = np.floor(v)
    u = xx / N * cols + (row % 2) * offset_rows
    col = np.floor(u) % cols
    return row, col, u - np.floor(u), v - row

def cell_rand(row, col, seed):
    h = np.sin(row * 127.1 + col * 311.7 + seed * 74.7) * 43758.5453
    return h - np.floor(h)

layers = {}

# 0 asphalt: aggregate in tar, a few sealed cracks, tyre polish
n1 = fnoise(1.2, 8); n2 = fnoise(2.6, 1, 24)
stones = np.clip(fnoise(0.3, 60) * 1.2 - 0.6, 0, None)
h = 0.55 * stones + 0.25 * n1 + 0.15 * n2
crack = np.zeros((N, N), np.float32)
for k in range(3):
    x, y = rng.uniform(0, N, 2); ang = rng.uniform(0, 2 * np.pi)
    for s in range(rng.integers(120, 320)):
        ang += rng.normal(0, 0.25); x = (x + np.cos(ang) * 1.5) % N; y = (y + np.sin(ang) * 1.5) % N
        crack[int(y), int(x)] = 1
crack = np.clip(blur(crack, 1.2) * 6, 0, 1)
alb = 0.5 + 0.05 * n2 + 0.08 * stones - 0.06 * fnoise(0.8, 30) * 0.5 - 0.06 * crack
rough = 0.86 + 0.06 * n1 * 0.5 - 0.25 * crack - 0.05 * np.clip(n2, 0, None)
layers['asphalt'] = pack(alb, h - 0.35 * crack, rough, 3.0)

# 1 paving: 4x4 slabs with recessed joints, per-slab tone, grain and stains
row, col, lu, lv = cells(4, 4)
edge = np.minimum(np.minimum(lu, 1 - lu), np.minimum(lv, 1 - lv))
joint = 1 - np.clip(edge / 0.03, 0, 1)
tone = (cell_rand(row, col, 1) - 0.5) * 0.06
grain = fnoise(0.6, 40)
stain = np.clip(fnoise(2.4, 1, 10), 0, None)
alb = 0.52 + tone + 0.025 * grain - 0.05 * stain * 0.5 - 0.12 * joint
h = -joint * 1.0 + 0.05 * grain + 0.12 * np.clip(edge / 0.06, 0, 1)
rough = 0.8 + 0.06 * grain * 0.5 + 0.08 * joint - 0.06 * stain * 0.3
layers['paving'] = pack(alb, h, rough, 4.0)

# 2 grass: blades and clumps, a little yellowing
bl = blur(rng.standard_normal((N, N)).astype(np.float32), 0.6)
streak = blur(np.roll(bl, 1, 0) + bl + np.roll(bl, -1, 0), 0.5)
clump = fnoise(2.2, 2, 30)
dry = np.clip(fnoise(2.6, 1, 8) - 0.6, 0, None)
a = 0.5 + 0.09 * streak / (streak.std() + 1e-6) * 0.5 + 0.05 * clump
alb = np.stack([a + 0.05 * dry, a + 0.02 * dry, a - 0.06 * dry], -1)
layers['grass'] = pack(alb, streak / (streak.std() + 1e-6) * 0.4 + clump * 0.4, 0.92 + 0.04 * clump * 0.3, 2.2)

# 3 plaster: bumpy render, rain streaks running down
bump = fnoise(0.9, 30) * 0.6 + fnoise(1.8, 4, 60) * 0.4
rain = blur(np.repeat(rng.standard_normal((1, N)).astype(np.float32), N, 0), 2) * np.clip(fnoise(2.5, 1, 6), 0, None)
alb = 0.52 + 0.02 * bump - 0.05 * np.clip(rain, 0, None) - 0.03 * np.clip(fnoise(2.2, 1, 12), 0, None)
layers['plaster'] = pack(alb, bump, 0.86 + 0.04 * bump * 0.3, 1.6)

# 4 brick: running bond, 6 x 16 courses, recessed mortar, varied fired tones, chipped edges
row, col, lu, lv = cells(6, 16, 0.5)
eu = np.minimum(lu, 1 - lu) * 6 / 16 * 3.2  # make mortar width equal both ways
ev = np.minimum(lv, 1 - lv)
e = np.minimum(eu, ev)
chip = fnoise(0.8, 30) * 0.03
mortar = 1 - np.clip((e - 0.06 + chip) / 0.04, 0, 1)
t1 = cell_rand(row, col, 2) - 0.5; t2 = cell_rand(row, col, 5) - 0.5
face = fnoise(1.0, 20)
br = np.stack([0.5 + 0.10 * t1 + 0.03 * face, 0.5 + 0.07 * t1 + 0.04 * t2 + 0.03 * face, 0.5 + 0.05 * t1 + 0.06 * t2 + 0.03 * face], -1)
mo = np.stack([0.68 + 0.03 * face] * 3, -1)
alb = br * (1 - mortar[..., None]) + mo * mortar[..., None]
h = (1 - mortar) * (0.8 + 0.08 * face) - mortar * 0.2 + 0.1 * np.clip(e / 0.12, 0, 1)
layers['brick'] = pack(alb, h, 0.88 + 0.05 * mortar, 5.0)

# 5 concrete: formwork panels with tie holes, pores and drips
row, col, lu, lv = cells(2, 3)
seam = 1 - np.clip(np.minimum(np.minimum(lu, 1 - lu) * 2, np.minimum(lv, 1 - lv) * 3) / 0.012, 0, 1)
ties = np.zeros((N, N), np.float32)
for cu in (0.2, 0.8):
    for cv in (0.25, 0.75):
        d = np.sqrt(((lu - cu) * 256) ** 2 + ((lv - cv) * 170) ** 2)
        ties = np.maximum(ties, 1 - np.clip((d - 5) / 3, 0, 1))
pores = np.clip(-fnoise(0.2, 120) - 1.6, 0, None)
cl = fnoise(1.6, 2, 40)
alb = 0.5 + 0.035 * cl + (cell_rand(row, col, 3) - 0.5) * 0.04 - 0.08 * pores - 0.1 * ties - 0.05 * seam
h = 0.15 * cl - 0.5 * pores - 0.8 * ties - 0.4 * seam
layers['concrete'] = pack(alb, h, 0.74 + 0.06 * cl * 0.3 + 0.1 * pores, 2.4)

# 6 roof: clay tile courses, overlapping, with lichen
row, col, lu, lv = cells(8, 8, 0.5)
curve = np.sin(lu * np.pi)
overlap = lv
h = curve * 0.6 + overlap * 0.8 + fnoise(1.0, 30) * 0.05
t = cell_rand(row, col, 9) - 0.5
lichen = np.clip(fnoise(1.6, 4, 60) - 1.0, 0, None)
a = 0.5 + 0.08 * t + 0.1 * (overlap - 0.5) + 0.04 * curve
alb = np.stack([a - 0.03 * lichen, a + 0.02 * lichen, a - 0.05 * lichen], -1)
layers['roof'] = pack(alb, h, 0.7 + 0.1 * lichen + 0.05 * (1 - overlap), 4.0)

# 7 metal: painted metal, brushed, with fine scratches
brush = blur(np.repeat(rng.standard_normal((N, 1)).astype(np.float32), N, 1) + 0.3 * rng.standard_normal((N, N)).astype(np.float32), 0.5)
scr = np.zeros((N, N), np.float32)
for k in range(60):
    x, y = rng.uniform(0, N, 2); ang = rng.uniform(0, np.pi); L = rng.integers(10, 60)
    for s in range(L):
        scr[int(y + np.sin(ang) * s) % N, int(x + np.cos(ang) * s) % N] = 1
alb = 0.5 + 0.015 * brush / (brush.std() + 1e-6) + 0.06 * scr
layers['metal'] = pack(alb, brush * 0.03 - scr * 0.3, 0.38 + 0.05 * brush / (brush.std() + 1e-6) * 0.3 + 0.12 * scr, 2.0)

# 8 leaf: overlapping leaves for canopies and hedges
leaf_h = np.zeros((N, N), np.float32)
for k in range(1400):
    cx, cy = rng.uniform(0, N, 2); r = rng.uniform(5, 11); ang = rng.uniform(0, np.pi)
    x0, x1 = int(cx - r - 2), int(cx + r + 2); y0, y1 = int(cy - r - 2), int(cy + r + 2)
    ys, xs = np.mgrid[y0:y1, x0:x1]
    u = (xs - cx) * np.cos(ang) + (ys - cy) * np.sin(ang); v = -(xs - cx) * np.sin(ang) + (ys - cy) * np.cos(ang)
    m = 1 - (u / r) ** 2 - (v / (r * 0.5)) ** 2
    hh = np.clip(m, 0, None) ** 0.5 * (0.6 + 0.4 * rng.random())
    sl = (ys % N, xs % N)
    leaf_h[sl] = np.maximum(leaf_h[sl], hh + k / 1400 * 0.2)
a = 0.5 + 0.12 * (leaf_h - leaf_h.mean())
alb = np.stack([a - 0.01, a + 0.02, a - 0.02], -1)
layers['leaf'] = pack(alb, leaf_h * 0.8, 0.62 + 0.15 * (1 - leaf_h), 3.0)

order = ['asphalt', 'paving', 'grass', 'plaster', 'brick', 'concrete', 'roof', 'metal', 'leaf']
A = np.concatenate([layers[k][0] for k in order], 0)
B = np.concatenate([layers[k][1] for k in order], 0)
Image.fromarray((np.clip(A, 0, 1) * 255).astype(np.uint8)).save('surfaces-albedo.webp', quality=86, method=6)
Image.fromarray((np.clip(B, 0, 1) * 255).astype(np.uint8)).save('surfaces-normal.webp', quality=84, method=6)
# preview: each layer albedo (x2 contrast) next to its normal
prev = np.concatenate([np.concatenate([np.clip((layers[k][0] - 0.5) * 2 + 0.5, 0, 1), layers[k][1]], 1)[::2, ::2] for k in order], 0)
Image.fromarray((prev * 255).astype(np.uint8)).save('preview.png')
print(order)
