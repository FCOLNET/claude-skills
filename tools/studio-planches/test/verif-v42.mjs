// V42 — le déplacement dans la table de travail ne passe plus par le glisser-déposer
// HTML5 mais par les événements de pointeur. On vérifie le GESTE, pas le mécanisme :
// chaque contrôle fait un vrai mouvement de souris et relit le modèle.
import { chromium } from 'playwright-core';
const FICHIER = process.argv[2];
const b = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const errs = [];
const res = [];
const ck = (n, ok, d) => { res.push(ok); console.log((ok ? '  OK   ' : '  ECHEC') + ' | ' + n + (ok ? '' : '  -> ' + d)); };

async function scene(pagesA, pagesB, photos = true, taille = '90') {
  const p = await b.newPage({ viewport: { width: 1500, height: 1000 } });
  p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  p.on('dialog', d => d.accept());
  await p.goto('file://' + FICHIER);
  await p.waitForTimeout(350);
  await p.evaluate(async ([pa, pb, photos, taille]) => {
    PAGES = [
      { pg: 'A', codes: [], pages: pa.length, niveaux: {}, pagesContenu: pa },
      { pg: 'B', codes: [], pages: pb.length, niveaux: {}, pagesContenu: pb }
    ];
    PRODUCTS = {}; POOL = []; RESERVE = []; PROJET_NOM = 'T';
    for (const k of Object.keys(matchedFiles)) delete matchedFiles[k];
    for (const sec of PAGES) { aplatir(sec); for (const c of sec.codes) PRODUCTS[c] = { lib: c, prix: '9 F' }; }
    if (photos) {
      const cv = document.createElement('canvas'); cv.width = cv.height = 60;
      const g = cv.getContext('2d'); g.fillStyle = '#c8a951'; g.fillRect(0, 0, 60, 60);
      const blob = await new Promise(r => cv.toBlob(r, 'image/jpeg'));
      for (const sec of PAGES) for (const c of sec.codes) matchedFiles[c] = new File([blob], c + '.jpg', { type: 'image/jpeg' });
    }
    $('perPage').value = 9;
    renderBuilder();
    ouvrirWorktable();
    const r = document.querySelector('.wt-size input'); r.value = taille; r.dispatchEvent(new Event('input'));
  }, [pagesA, pagesB, photos, taille]);
  await p.waitForTimeout(400);
  // La barre d'outils et les en-têtes de planche occupent le haut de la page : sans
  // cadrage, les vignettes se retrouvent dans la bande basse de la fenêtre et le
  // scénario ne mesure plus le geste mais le défilement. On centre la première grille.
  await p.evaluate(() => {
    const g = document.querySelector('.wt-grid');
    if (g) window.scrollTo(0, Math.max(0, g.getBoundingClientRect().top + window.scrollY - 180));
  });
  await p.waitForTimeout(150);
  return p;
}

const item = (p, g, i) => p.locator('.wt-grid').nth(g).locator('.wt-item').nth(i);
const lire = p => p.evaluate(() => ({
  a: PAGES[0].pagesContenu.map(x => x.join('+')),
  b: PAGES[1].pagesContenu.map(x => x.join('+')),
  pool: POOL.slice(), reserve: RESERVE.map(r => r.code),
  total: PAGES[0].codes.length + PAGES[1].codes.length
}));

// un vrai geste : on prend `src`, on va jusqu'à `dst`, on lâche
async function geste(p, src, dst, cote = 'droite') {
  const bs = await src.boundingBox().catch(() => null);
  const bd = await dst.boundingBox().catch(() => null);
  if (!bs || !bd) return { ko: 'introuvable' };
  const x0 = bs.x + bs.width / 2, y0 = bs.y + bs.height / 2;
  const x1 = cote === 'gauche' ? bd.x + 4 : bd.x + bd.width - 4, y1 = bd.y + bd.height / 2;
  await p.mouse.move(x0, y0);
  await p.mouse.down();
  for (let i = 1; i <= 16; i++) {
    await p.mouse.move(x0 + (x1 - x0) * i / 16, y0 + (y1 - y0) * i / 16);
    await p.waitForTimeout(20);
  }
  await p.mouse.up();
  await p.waitForTimeout(400);
  return {};
}

// --- 1. réordonner dans la page, prise sur le cadre -------------------------
let p = await scene([['a1', 'a2', 'a3']], [['z1']]);
let g = await geste(p, item(p, 0, 2), item(p, 0, 0), 'gauche');
let r = await lire(p);
ck('réordonner dans la page (prise sur le cadre)', !g.ko && r.a[0] === 'a3+a1+a2', g.ko || JSON.stringify(r.a));
await p.close();

// --- 2. même geste, prise sur l'image --------------------------------------
p = await scene([['a1', 'a2', 'a3']], [['z1']]);
g = await geste(p, item(p, 0, 2).locator('.wt-img'), item(p, 0, 0), 'gauche');
r = await lire(p);
ck('réordonner dans la page (prise sur l image)', !g.ko && r.a[0] === 'a3+a1+a2', g.ko || JSON.stringify(r.a));
await p.close();

// --- 3. d'une page à l'autre dans la même planche ---------------------------
p = await scene([['a1', 'a2'], ['b1', 'b2']], [['z1']]);
g = await geste(p, item(p, 0, 0), item(p, 1, 1));
r = await lire(p);
ck('page 1 → page 2 de la même planche',
  !g.ko && r.a[0] === 'a2' && r.a[1].split('+').includes('a1') && r.total === 5, g.ko || JSON.stringify(r));
await p.close();

// --- 4. d'une planche à l'autre ---------------------------------------------
p = await scene([['a1', 'a2']], [['z1']]);
g = await geste(p, item(p, 0, 0), item(p, 1, 0));
r = await lire(p);
ck('planche A → planche B', !g.ko && r.b[0].split('+').includes('a1') && r.a[0] === 'a2' && r.total === 3, g.ko || JSON.stringify(r));
await p.close();

// --- 5. page de destination HORS ÉCRAN : le défilement automatique y mène ----
// 9 pages de 9 produits en vignettes de 150 px : la dernière est très loin sous la
// fenêtre. C'est le cas réel d'une sélection de plusieurs centaines de références,
// et celui où l'ancien glisser n'avait nulle part où aller.
const grosA = []; for (let i = 0; i < 9; i++) { const pg = []; for (let j = 0; j < 9; j++) pg.push('p' + i + 'x' + j); grosA.push(pg); }
p = await scene(grosA, [['z1']], true, '150');
const avant = await p.evaluate(() => ({
  haut: window.scrollY,
  derniere: PAGES[0].pagesContenu[8].length,
  premiere: PAGES[0].pagesContenu[0][0]
}));
{
  const src = item(p, 0, 0);
  const bs = await src.boundingBox();
  await p.mouse.move(bs.x + bs.width / 2, bs.y + bs.height / 2);
  await p.mouse.down();
  await p.mouse.move(bs.x + bs.width / 2, bs.y + bs.height / 2 - 40);   // on sort de la bande basse : le bord s'arme
  const vp = p.viewportSize();
  // on tient le pointeur contre le bord bas jusqu'à ce que la 9e page soit à l'écran
  let vue = false;
  for (let i = 0; i < 220 && !vue; i++) {
    await p.mouse.move(vp.width / 2, vp.height - 12 + (i % 2));
    await p.waitForTimeout(12);
    const bb = await p.locator('.wt-grid').nth(8).boundingBox().catch(() => null);
    vue = !!bb && bb.y > 60 && bb.y + 40 < vp.height;
  }
  const defile = await p.evaluate(() => window.scrollY);
  const bd = await p.locator('.wt-grid').nth(8).boundingBox().catch(() => null);
  if (vue && bd) {
    await p.mouse.move(bd.x + bd.width - 6, bd.y + 20);
    await p.waitForTimeout(80);
    await p.mouse.move(bd.x + bd.width - 6, bd.y + 22);
    await p.waitForTimeout(80);
  }
  await p.mouse.up();
  await p.waitForTimeout(450);
  const apres = await lire(p);
  const ou = apres.a.findIndex(x => x.split('+').includes(avant.premiere));
  ck('défilement automatique pendant le geste', defile > avant.haut + 200, 'scrollY ' + avant.haut + ' → ' + defile);
  ck('la 9e page, hors écran au départ, devient atteignable', vue, 'jamais amenée à l écran');
  ck('produit déposé sur cette page, rien de perdu',
    ou === 8 && apres.total === 82,
    JSON.stringify({ arrive_page: ou + 1, total: apres.total, p9: apres.a[8] }));
}
await p.close();

// --- 6. un geste parti d'un champ éditable n'emporte pas la vignette ---------
p = await scene([['a1', 'a2', 'a3']], [['z1']]);
{
  const champ = item(p, 0, 2).locator('.wt-lib');
  const cible = item(p, 0, 0);
  await champ.click();
  await p.keyboard.press('Control+a');
  await p.keyboard.type('SAISI ICI');
  await p.keyboard.press('Enter');
  await p.waitForTimeout(150);
  const g2 = await geste(p, champ, cible, 'gauche');
  r = await lire(p);
  const saisi = await p.evaluate(() => PRODUCTS['a3'].lib);
  ck('saisie enregistrée dans la vignette', saisi === 'SAISI ICI', String(saisi));
  ck('geste parti du champ : la vignette ne bouge pas',
    !g2.ko && r.a[0] === 'a1+a2+a3', g2.ko || JSON.stringify(r.a));
  // …et après la saisie, la vignette reste déplaçable : c'est ce que l'ancien
  // basculement draggable=false ne garantissait pas
  const g3 = await geste(p, item(p, 0, 2).locator('.wt-img'), item(p, 0, 0), 'gauche');
  r = await lire(p);
  ck('après saisie, la vignette se déplace encore',
    !g3.ko && r.a[0] === 'a3+a1+a2', g3.ko || JSON.stringify(r.a));
}
await p.close();

// --- 7. un petit mouvement reste un clic ------------------------------------
p = await scene([['a1', 'a2', 'a3']], [['z1']]);
{
  const bs = await item(p, 0, 2).boundingBox();
  await p.mouse.move(bs.x + bs.width / 2, bs.y + bs.height / 2);
  await p.mouse.down();
  await p.mouse.move(bs.x + bs.width / 2 + 2, bs.y + bs.height / 2 + 2);
  await p.mouse.up();
  await p.waitForTimeout(250);
  r = await lire(p);
  const corps = await p.evaluate(() => document.body.classList.contains('wt-glisse'));
  ck('2 px : aucun déplacement, aucun état de glisser laissé',
    r.a[0] === 'a1+a2+a3' && !corps, JSON.stringify({ a: r.a, corps }));
}
await p.close();

// --- 8. ⇄ sur une vignette : déplacer sans glisser --------------------------
p = await scene([['a1', 'a2'], ['b1']], [['z1']]);
{
  await item(p, 0, 0).hover();
  await item(p, 0, 0).locator('.wt-move').click();
  await p.waitForTimeout(200);
  const choix = await p.evaluate(() => [...document.querySelectorAll('#choixOverlay .wt-cible')].map(b => b.textContent));
  ck('⇄ propose chaque page, le vivier et la réserve',
    choix.length === 7 && /A · page 2/.test(choix[1]) && /Vivier/.test(choix.join('|')) && /Réserve/.test(choix.join('|')),
    JSON.stringify(choix));
  await p.locator('#choixOverlay .wt-cible').nth(1).click();   // A · page 2
  await p.waitForTimeout(300);
  r = await lire(p);
  ck('⇄ déplace le produit vers la page choisie',
    r.a.join(',') === 'a2,b1+a1' && r.b.join(',') === 'z1' && r.total === 4, JSON.stringify(r));
}
await p.close();

// --- 9. ⇄ sur une page entière ----------------------------------------------
p = await scene([['a1'], ['a2']], [['z1']]);
{
  await p.locator('.wt-planche').nth(0).locator('.wt-page').nth(0).locator('.wt-vers').click();
  await p.waitForTimeout(200);
  const choix = await p.evaluate(() => [...document.querySelectorAll('#choixOverlay .wt-cible')].map(b => b.textContent));
  ck('⇄ page : aucune destination qui ne mène nulle part', choix.length === 3, JSON.stringify(choix));
  const iB = choix.findIndex(t => /^B · en fin/.test(t));
  await p.locator('#choixOverlay .wt-cible').nth(iB).click();
  await p.waitForTimeout(300);
  r = await lire(p);
  ck('⇄ page : la page change de planche avec son contenu',
    r.a.join(',') === 'a2' && r.b.join(',') === 'z1,a1' && r.total === 3, JSON.stringify(r));
}
await p.close();

// --- 10. l'en-tête de page déplace toujours la page -------------------------
p = await scene([['a1'], ['b1'], ['c1']], [['z1']]);
{
  const src = p.locator('.wt-planche').nth(0).locator('.wt-page-t').nth(2);
  const dst = p.locator('.wt-planche').nth(0).locator('.wt-page').nth(0);
  g = await geste(p, src, dst, 'gauche');
  r = await lire(p);
  ck('page ramenée en tête par son en-tête', !g.ko && r.a.join(',') === 'c1,a1,b1', g.ko || JSON.stringify(r.a));
}
await p.close();

await b.close();
const ko = res.filter(x => !x).length;
if (errs.length) { console.log('\nErreurs JS :'); [...new Set(errs)].forEach(e => console.log('  ' + e)); }
console.log('\n' + (res.length - ko) + '/' + res.length + ' verifications passees');
process.exit(ko || errs.length ? 1 : 0);
