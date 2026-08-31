import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message));
let alerte = '';
p.on('dialog', d => { alerte = d.message(); d.accept(); });
await p.goto('file://' + process.argv[2]);
await p.addScriptTag({ path: process.argv[3] });   // JSZip local (CDN inaccessible ici)
await p.waitForTimeout(300);
const ck = (n, ok, d) => console.log((ok ? '  OK   ' : '  ECHEC') + ' | ' + n + (ok ? '' : '  -> ' + d));

const r = await p.evaluate(async () => {
  const img = async (fond, decor) => {
    const cv = document.createElement('canvas'); cv.width = cv.height = 400;
    const c = cv.getContext('2d');
    c.fillStyle = fond; c.fillRect(0, 0, 400, 400);
    if (decor) { for (let i = 0; i < 400; i += 7) { c.fillStyle = 'hsl(' + (i % 360) + ',70%,45%)'; c.fillRect(i, 0, 4, 400); } }
    c.fillStyle = '#8B1A2B'; c.beginPath(); c.arc(200, 200, 90, 0, 7); c.fill();
    return await new Promise(x => cv.toBlob(x, 'image/jpeg', 0.9));
  };
  PAGES = [
    { pg: 'ÉVEIL & PREMIER ÂGE', codes: ['100001', '100002', '100003'], pages: 4, niveaux: { '100001': 'hero', '100003': 'petit' } },
    { pg: 'JOUETS "GARÇONS" & <ACTION>', codes: ['100004'], pages: 2, niveaux: {} }
  ];
  PRODUCTS = {
    '100001': { lib: 'POUSSEUR BÉBÉ, 2 en 1', prix: '2 690 F', prixInit: '3 490 F', prixPromo: '2 690 F', remise: '' },
    '100002': { lib: 'LAPIN BOIS', prix: '990 F', prixInit: '', prixPromo: '', remise: '' },
    '100003': { lib: 'TAPIS 1ER ÂGE', prix: '5 990 F', prixInit: '', prixPromo: '', remise: '' },
    '100004': { lib: 'SANS VISUEL', prix: '199 F', prixInit: '', prixPromo: '', remise: '' }
  };
  for (const k of Object.keys(matchedFiles)) delete matchedFiles[k];
  for (const k of Object.keys(localBlobs)) delete localBlobs[k];
  renderBuilder();
  const blanc = await img('#ffffff', false), gris = await img('#9a9a9a', false), decor = await img('#ffffff', true);
  matchedFiles['100001'] = new File([blanc], '100001.jpg', { type: 'image/jpeg' });
  matchedFiles['100002'] = new File([gris], '100002.jpg', { type: 'image/jpeg' });
  matchedFiles['100003'] = new File([decor], '100003.jpg', { type: 'image/jpeg' });
  for (const c of ['100001', '100002', '100003']) localBlobs[c] = matchedFiles[c];

  const fonds = {};
  for (const c of ['100001', '100002', '100003']) fonds[c] = (await analysePhoto(c)).verdict;

  const cat = await buildCatalogueWeb();
  const z = await JSZip.loadAsync(cat.blob);
  const racine = Object.keys(z.files)[0].split('/')[0];
  const noms = Object.keys(z.files).filter(n => !z.files[n].dir).map(n => n.split('/').slice(1).join('/'));
  const html = await z.file(racine + '/index.html').async('string');
  return {
    fonds, noms, cat: { planches: cat.planches, produits: cat.produits, visuels: cat.visuels },
    heros: (html.match(/class="prod n-hero"/g) || []).length,
    petit: (html.match(/class="prod n-petit"/g) || []).length,
    eco: /ÉCONOMIE -800 F/.test(html),
    barre: /pv-barre">3 490 F/.test(html),
    prixSansF: /<span class="pv-n">2 690<\/span><span class="pv-d">F/.test(html),
    sansPhoto: /visuel à venir/.test(html),
    echappe: html.includes('GAR&Ccedil;ONS') || html.includes('&lt;ACTION&gt;'),
    imagesRelatives: /src="images\/100001\.jpg"/.test(html) && !/\\\\/.test(html),
    couleurs: (html.match(/#E8871E|#D6408C/g) || []).length >= 2,
    sommaire: /class="som-item"/.test(html),
    cssImpression: /break-after:page/.test(html),
    // le bandeau de titre ne doit plus s'appeler "hero" : sinon la carte heros herite
    // color:#fff et son libelle devient invisible (blanc sur blanc)
    pasDeCollision: !/\.hero\{/.test(html) && /\.entete\{/.test(html),
    couleurCarteExplicite: /\.prod\{background:#fff;color:#141414/.test(html)
  };
});

ck('fond blanc détecté', r.fonds['100001'] === 'blanc', r.fonds['100001']);
ck('fond uni non blanc détecté', r.fonds['100002'] === 'uni', r.fonds['100002']);
ck('fond avec décor détecté', r.fonds['100003'] === 'varie', r.fonds['100003']);
ck('catalogue : 2 planches, 4 produits, 3 visuels',
  r.cat.planches === 2 && r.cat.produits === 4 && r.cat.visuels === 3, JSON.stringify(r.cat));
ck('dossier web complet', r.noms.includes('index.html') && r.noms.includes('images/100001.jpg') && r.noms.includes('LISEZ-MOI.txt'), JSON.stringify(r.noms));
ck('images liées en relatif', r.imagesRelatives, 'chemin absolu détecté');
ck('hiérarchie appliquée (1 héros, 1 petit)', r.heros === 1 && r.petit === 1, 'heros=' + r.heros + ' petit=' + r.petit);
ck('économie affichée en valeur', r.eco, 'absente');
ck('prix barré conservé', r.barre, 'absent');
ck('devise séparée du nombre', r.prixSansF, 'F collé au nombre');
ck('produit sans visuel signalé', r.sansPhoto, 'absent');
ck('titre de planche échappé', r.echappe, 'markup cassé');
ck('couleurs d univers distinctes par planche', r.couleurs, 'palette non appliquée');
ck('sommaire cliquable', r.sommaire, 'absent');
ck('CSS d impression (une planche par page)', r.cssImpression, 'absent');
ck('pas de collision de classe avec le bandeau de titre', r.pasDeCollision, 'classe .hero toujours presente');
ck('couleur de texte posee explicitement sur la carte', r.couleurCarteExplicite, 'heritage possible');
if (errs.length) console.log('Erreurs JS : ' + errs.join(' | '));
await b.close();
