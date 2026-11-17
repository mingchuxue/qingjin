"""对数学二级结论的公式与例题答案做符号/数值校验（sympy + 随机数值）。"""
import random, math, itertools
from fractions import Fraction as F
import sympy as sp
ok = 0; fails = []
def check(name, cond):
    global ok
    if cond: ok += 1
    else: fails.append(name)
R = random.Random(7)
x, y, a, b, c, t, n, q = sp.symbols("x y a b c t n q", real=True)
# m-05 平均数链
for _ in range(200):
    u, v = R.uniform(0.01, 9), R.uniform(0.01, 9)
    H, G, A, Q = 2/(1/u+1/v), math.sqrt(u*v), (u+v)/2, math.sqrt((u*u+v*v)/2)
    check("m-05", H <= G+1e-12 <= A+2e-12 <= Q+3e-12)
# m-06 例题最小值 3+2√2
best = min((1/xx + 1/((1-xx)/2)) for xx in [i/100000 for i in range(1, 100000)])
check("m-06", abs(best - (3+2*math.sqrt(2))) < 1e-4)
# m-07 糖水
for _ in range(100):
    aa = R.uniform(0.1, 5); bb = aa + R.uniform(0.1, 5); mm = R.uniform(0.1, 5)
    check("m-07", (aa+mm)/(bb+mm) > aa/bb)
# m-08 例题 0<=k<4
for k in [0, 0.5, 3.9]: check("m-08", all(k*xx*xx-k*xx+1 > 0 for xx in [i/50-10 for i in range(1000)]))
check("m-08b", not all(4*xx*xx-4*xx+1 > 0 for xx in [0.5]))
# m-09 例题
def both_gt1(m):
    d = 4*m*m-4*(m+2)
    if d < 0: return False
    r1 = (2*m - math.sqrt(d))/2; return r1 > 1
check("m-09", all(both_gt1(m) for m in [2, 2.5, 2.99]) and not any(both_gt1(m) for m in [1.9, 3, 3.5, -2]))
# m-14
check("m-14", sp.simplify((x+1)/(x-1) + ((2-x)+1)/((2-x)-1) - 2) == 0)
# m-19 例题
check("m-19", abs(min(( (xx*xx+5)/math.sqrt(xx*xx+4)) for xx in [i/1000-5 for i in range(10001)]) - 2.5) < 1e-6)
# m-22
check("m-22", abs(math.log(9,4)*math.log(8,27) - 1) < 1e-12)
# 三角恒等式
al = sp.symbols("alpha", real=True)
check("m-27", sp.simplify((sp.sin(al)+sp.cos(al))**2 - (1+2*sp.sin(al)*sp.cos(al))) == 0)
check("m-28", sp.simplify(sp.sqrt(3)*sp.sin(x)+sp.cos(x) - 2*sp.sin(x+sp.pi/6)) == 0)
check("m-29", sp.simplify(sp.sin(x)**2 + sp.sqrt(3)*sp.sin(x)*sp.cos(x) - (sp.sin(2*x-sp.pi/6)+sp.Rational(1,2))) == 0)
check("m-30", sp.simplify(sp.sin(2*al) - 2*sp.tan(al)/(1+sp.tan(al)**2)) == 0 and sp.simplify(sp.cos(2*al) - (1-sp.tan(al)**2)/(1+sp.tan(al)**2)) == 0)
tv = 2.0; check("m-30ex", abs((2*tv/(1+tv*tv)) + (1-tv*tv)/(1+tv*tv) - 0.2) < 1e-12)
# 三角形：射影定理、面积、正切恒等式
for _ in range(100):
    A_, B_ = R.uniform(0.1, 1.4), R.uniform(0.1, 1.4); C_ = math.pi - A_ - B_
    if C_ <= 0.05 or abs(C_-math.pi/2) < 1e-3: continue
    Rr = 1.3; aa, bb, cc = 2*Rr*math.sin(A_), 2*Rr*math.sin(B_), 2*Rr*math.sin(C_)
    check("m-34", abs(aa - (bb*math.cos(C_)+cc*math.cos(B_))) < 1e-9)
    S = 0.5*aa*bb*math.sin(C_); check("m-35", abs(S - aa*bb*cc/(4*Rr)) < 1e-9)
    check("m-37", abs(math.tan(A_)+math.tan(B_)+math.tan(C_) - math.tan(A_)*math.tan(B_)*math.tan(C_)) < 1e-6)
check("m-37ex", abs(1+2+3 - 1*2*3) == 0)
# m-36 例题 √5<x<√13
def acute(p, q2, r):
    s = sorted([p, q2, r]); return s[0]+s[1] > s[2] and s[0]**2+s[1]**2 > s[2]**2
check("m-36", acute(2,3,2.3) and acute(2,3,3.5) and not acute(2,3,2.2) and not acute(2,3,3.7))
# m-40 例题：正方形 ABCD 边长 2，P 在 CD 上
Ax, Ay, Bx, By = 0, 0, 2, 0
vals = [ (Ax-px)*(Bx-px) + (Ay-2)*(By-2) for px in [i/1000*2 for i in range(1001)] ]
check("m-40", abs(min(vals) - 3) < 1e-9)
# m-42 面积公式 = 叉积
x1,y1,x2,y2 = sp.symbols("x1 y1 x2 y2", real=True)
check("m-42", sp.expand((x1**2+y1**2)*(x2**2+y2**2) - (x1*x2+y1*y2)**2 - (x1*y2-x2*y1)**2) == 0)
# m-43 例题
check("m-43", abs(math.sqrt(2*(4+4) - 12) - 2) < 1e-12)
# m-44 例题
check("m-44", abs(abs((3+4j)*(1-1j)/(2+1j)) - math.sqrt(10)) < 1e-12)
# m-45 例题
check("m-45", sum(1j**k for k in range(1, 2027)) - (1j-1) == 0 or abs(sum(1j**k for k in range(1, 2027)) - (1j-1)) < 1e-6)
# m-47 正四面体
aa = 1.0; Hh = math.sqrt(6)/3*aa; Rr = math.sqrt(6)/4*aa; rr = math.sqrt(6)/12*aa
check("m-47", abs(Rr**2 - ((Hh-Rr)**2 + aa*aa/3)) < 1e-12 and abs(Rr - 3*rr) < 1e-12)
# m-48 例题：点 A(0,0,0) 到平面 A1(0,0,1) B(1,0,0) D(0,1,0)
nrm = (1,1,1); d = abs(0 - 1)/math.sqrt(3); check("m-48", abs(d - math.sqrt(3)/3) < 1e-12)
# m-49 三余弦
for _ in range(50):
    th1, th2 = R.uniform(0, 1.5), R.uniform(0, 3.1)
    e = (math.cos(th1), 0, math.sin(th1)); v = (math.cos(th2), math.sin(th2), 0)
    check("m-49", abs(sum(p*q2 for p, q2 in zip(e, v)) - math.cos(th1)*math.cos(th2)) < 1e-12)
# m-52 例题
check("m-52", abs(abs(-5 - 2.5)/5 - 1.5) < 1e-12)
# m-54 对称
for _ in range(20):
    pa, pb, cc = R.uniform(-5,5), R.uniform(-5,5), R.uniform(-3,3)
    qa, qb = pb-cc, pa+cc
    check("m-54", abs((pb+qb)/2 - ((pa+qa)/2 + cc)) < 1e-9 and abs((qb-pb)*(1) + (qa-pa)*1) < 1e-9)
# m-57 例题
check("m-57", abs(2*math.sqrt(4-0.5) - math.sqrt(14)) < 1e-12)
# m-59 / m-60 焦点三角形面积
A2, B2 = 25, 9; cc = 4
for _ in range(50):
    th = R.uniform(0.1, 3.0); px, py = 5*math.cos(th), 3*math.sin(th)
    m1 = math.hypot(px+cc, py); m2 = math.hypot(px-cc, py)
    ang = math.acos(((px+cc)*(px-cc) + py*py)/(m1*m2)) if False else math.acos(((-cc-px)*(cc-px) + py*py)/(m1*m2))
    S = 0.5*abs((-cc-px)*(-py) - (cc-px)*(-py))
    check("m-59", abs(S - B2*math.tan(ang/2)) < 1e-7)
    check("m-61", abs(m1 - (5 + 0.8*px)) < 1e-9)
A2, B2 = 9, 16; cc = 5
for _ in range(50):
    u = R.uniform(-2, 2); px, py = 3*math.cosh(u), 4*math.sinh(u)
    if abs(py) < 1e-3: continue
    m1 = math.hypot(px+cc, py); m2 = math.hypot(px-cc, py)
    ang = math.acos(((-cc-px)*(cc-px) + py*py)/(m1*m2))
    S = 0.5*abs((-cc-px)*(-py) - (cc-px)*(-py))
    check("m-60", abs(S - B2/math.tan(ang/2)) < 1e-6)
# m-62 例题
xs = sp.solve(sp.Eq(x**2/16 + ((4-x)/2)**2/4, 1), x)
check("m-62", abs(float(sum(xs))/2 - 2) < 1e-12)
# m-63 例题 判别式
check("m-63", 4*4 - 4*2*3 < 0)
# m-64
for _ in range(20):
    th = R.uniform(0.2, 2.9); px, py = 2*math.cos(th), math.sqrt(3)*math.sin(th)
    check("m-64", abs(py/(px+2) * py/(px-2) + 0.75) < 1e-9)
# m-65 / m-66 抛物线焦点弦 y^2 = 2px
p = 2.0
for _ in range(30):
    th = R.uniform(0.2, 2.9); mm = 1/math.tan(th)
    ys = [ (2*p*mm + s*math.sqrt(4*p*p*mm*mm + 4*p*p))/2 for s in (1, -1)]
    pts = [(yy*yy/(2*p), yy) for yy in ys]
    L = math.dist(*pts); check("m-65", abs(L - 2*p/math.sin(th)**2) < 1e-7 and abs(pts[0][0]*pts[1][0] - p*p/4) < 1e-7)
    fa, fb = [math.dist(pt, (p/2, 0)) for pt in pts]; check("m-66", abs(1/fa + 1/fb - 2/p) < 1e-9)
check("m-65ex", abs(2*2/math.sin(math.pi/4)**2 - 8) < 1e-9)
# m-69 例题
check("m-69", abs(math.dist((0,1), (-4/3, -1/3)) - 4*math.sqrt(2)/3) < 1e-12)
# 数列
aq = [R.uniform(-3,3) + 0.7*k for k in range(40)]
S = lambda k: sum(aq[:k])
check("m-70", abs((S(20)-S(10)) - S(10) - ((S(30)-S(20)) - (S(20)-S(10)))) < 1e-9 and abs((S(20)-2*S(10)) - 100*0.7) < 1e-9) if False else None
ar = [1.3 + 0.7*k for k in range(40)]; S = lambda k: sum(ar[:k])
check("m-70", abs((S(20)-S(10)) - S(10) - 100*0.7) < 1e-9 and abs((S(30)-S(20)) - (S(20)-S(10)) - 100*0.7) < 1e-9)
check("m-72", abs(S(9) - 9*ar[4]) < 1e-9)
gq = [1.5*(1.2**k) for k in range(30)]; G = lambda k: sum(gq[:k])
check("m-73", abs((G(10)-G(5))**2 - G(5)*(G(15)-G(10))) < 1e-6)
k_ = sp.symbols("k", integer=True, positive=True); N_ = sp.symbols("N", integer=True, positive=True)
check("m-74", sp.simplify(sp.summation(1/((2*k_-1)*(2*k_+1)), (k_, 1, N_)) - N_/(2*N_+1)) == 0)
qq = sp.Rational(3, 7)
for NN in range(1, 8):
    check("m-75", sum(kk*qq**(kk-1) for kk in range(1, NN+1)) == (1-(NN+1)*qq**NN + NN*qq**(NN+1))/(1-qq)**2)
    check("m-75b", sum(kk*2**(kk-1) for kk in range(1, NN+1)) == (NN-1)*2**NN + 1)
a_ = 1
for NN in range(1, 10):
    check("m-76", a_ == 2**NN - 1); a_ = 2*a_ + 1
# m-79
A3, B3, C3, D3 = sp.symbols("A3 B3 C3 D3", real=True)
f = lambda z: A3*z**3 + B3*z**2 + C3*z + D3
x0 = -B3/(3*A3)
check("m-79", sp.simplify(f(x0+t) + f(x0-t) - 2*f(x0)) == 0)
fc = lambda z: z**3 - 3*z**2 + 1; check("m-79ex", fc(-1) + fc(3) == -2)
# m-80 例题
check("m-80", 3**math.pi > math.pi**3)
# m-81 对数平均
for _ in range(200):
    bb = R.uniform(0.01, 5); aa = bb + R.uniform(0.001, 5)
    L = (aa-bb)/(math.log(aa)-math.log(bb)); check("m-81", math.sqrt(aa*bb) < L < (aa+bb)/2)
# m-82 例题：ln x + 1/x 最小值 1
check("m-82", abs(min(math.log(xx)+1/xx for xx in [i/10000 for i in range(1, 100000)]) - 1) < 1e-6)
# m-84 例题
coef = sp.Poly(sp.expand((2*x-1)**5), x).all_coeffs()[::-1]
check("m-84", coef[1]+coef[3]+coef[5] == 122)
# m-85
check("m-85", sum(1 for c4 in itertools.product(range(1, 11), repeat=4) if sum(c4) == 10) == math.comb(9, 3) == 84)
# m-86 错排
def der(nn): return sum(1 for pm in itertools.permutations(range(nn)) if all(pm[i] != i for i in range(nn)))
check("m-86", [der(i) for i in range(2, 6)] == [1, 2, 9, 44])
# m-87 二项分布
nn, pp = 10, F(4, 5)
E = sum(kk*math.comb(nn, kk)*pp**kk*(1-pp)**(nn-kk) for kk in range(nn+1))
E2 = sum(kk*kk*math.comb(nn, kk)*pp**kk*(1-pp)**(nn-kk) for kk in range(nn+1))
check("m-87", E == 8 and E2 - E*E == F(8, 5))
# m-88 超几何
E = sum(kk*F(math.comb(3, kk)*math.comb(7, 4-kk), math.comb(10, 4)) for kk in range(0, 4))
check("m-88", E == F(6, 5))
# m-90 例题
pr = [F(2,10), F(5,10), F(3,10)]; Ex = sum(i*p_ for i, p_ in enumerate(pr)); Ex2 = sum(i*i*p_ for i, p_ in enumerate(pr))
check("m-90", Ex2 - Ex*Ex == F(49, 100))
# m-93 例题
check("m-93", abs(0.012/(0.6*0.02+0.4*0.03) - 0.5) < 1e-12)
# m-95
check("m-95", 1 - F(1,2)*F(2,3)*F(3,4) == F(3,4))
print(f"通过 {ok} 项，失败 {len(fails)} 项", sorted(set(fails)))
raise SystemExit(1 if fails else 0)
