import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await b.newContext();
const p = await ctx.newPage({ viewport: { width: 1400, height: 1000 } });
const errs = []; p.on('pageerror', e => errs.push(e.message));
let reponse = ''; p.on('dialog', d => d.accept(reponse));
await p.goto('file://' + process.argv[2]);
await p.waitForTimeout(500);
const ck = (n, ok, d) => console.log((ok ? '  OK   ' : '  ECHEC') + ' | ' + n + (ok ? '' : '  -> ' + d));

const faire = async (nom, nbRefs, prefixe) => p.evaluate(async ([nom, nbRefs, prefixe]) => {
  PROJET_NOM = nom;
  PAGES = [{ pg: 'P', codes: [], pages: 1, niveaux: {}, pagesContenu: [[]] }];
  PRODUCTS = {}; POOL = []; RESERVE = [];
  for (const k of Object.keys(matchedFiles)) delete matchedFiles[k];
  for (let i = 0; i < nbRefs; i++) {
    const c = prefixe + i;
    PAGES[0].codes.push(c); PAGES[0].pagesContenu[0].push(c);
    PRODUCTS[c] = { lib: 'ART ' + i, prix: '990 F' };
  }
  renderBuilder();
  await enregistrerProjetMemoire();
  return true;
}, [nom, nbRefs, prefixe]);

await faire('Catalogue Jouets', 5, 'J');
await faire('Catalogue Rentrée', 3, 'R');

const idx = await p.evaluate(() => lireIndex());
ck('deux projets coexistent en mémoire', Object.keys(idx).length === 2, JSON.stringify(Object.keys(idx)));
ck('chaque projet garde son compte', idx['Catalogue Jouets'].refs === 5 && idx['Catalogue Rentrée'].refs === 3,
  JSON.stringify({ j: idx['Catalogue Jouets'].refs, r: idx['Catalogue Rentrée'].refs }));

// revenir au premier
const retour = await p.evaluate(async () => {
  await ouvrirProjetMemoire('Catalogue Jouets');
  return { nom: PROJET_NOM, refs: allCodes().length, premier: PAGES[0].codes[0] };
});
ck('retour au projet mis de côté', retour.nom === 'Catalogue Jouets' && retour.refs === 5 && retour.premier === 'J0',
  JSON.stringify(retour));

// le second n'a pas bougé
const second = await p.evaluate(async () => {
  await ouvrirProjetMemoire('Catalogue Rentrée');
  return { refs: allCodes().length, premier: PAGES[0].codes[0] };
});
ck('le second projet est intact', second.refs === 3 && second.premier === 'R0', JSON.stringify(second));

// nom du projet dans le bouton et dans le fichier
const ui = await p.evaluate(() => ({ bouton: $('projetsBtn').textContent, nom: PROJET_NOM }));
ck('le projet en cours est affiché', /Catalogue Rentrée/.test(ui.bouton), ui.bouton);
const nomFichier = await p.evaluate(() => 'projet-' + (safeName(PROJET_NOM) || 'planches') + '-2026-01-01.json');
ck('le nom du projet entre dans le fichier', /Catalogue_Rentree/.test(nomFichier), nomFichier);

// creation d'un nouveau projet : l'ancien est mémorisé avant
reponse = 'Catalogue Noël';
await p.evaluate(() => nouveauProjet());
await p.waitForTimeout(300);
const apresNouveau = await p.evaluate(async () => ({
  nom: PROJET_NOM, refs: allCodes().length,
  index: Object.keys(await lireIndex()).length,
  rentreeIntacte: (await idbGet(cleProjet('Catalogue Rentrée'))).pages[0].codes.length
}));
ck('nouveau projet vide, les autres conservés',
  apresNouveau.nom === 'Catalogue Noël' && apresNouveau.refs === 0 &&
  apresNouveau.index === 3 && apresNouveau.rentreeIntacte === 3, JSON.stringify(apresNouveau));

// fenetre des projets
await p.evaluate(() => montrerProjets());
await p.waitForTimeout(250);
const fen = await p.evaluate(() => {
  const ov = document.getElementById('projOverlay');
  return { lignes: ov.querySelectorAll('button').length, texte: ov.textContent.includes('Catalogue Jouets') && ov.textContent.includes('en cours') };
});
ck('fenêtre des projets listée', fen.texte, 'liste incomplète');

// suppression d'un projet de la mémoire
reponse = '';
const suppr = await p.evaluate(async () => {
  const i = await lireIndex(); delete i['Catalogue Jouets']; await ecrireIndex(i);
  await idbDel(cleProjet('Catalogue Jouets'));
  return { reste: Object.keys(await lireIndex()).length, efface: (await idbGet(cleProjet('Catalogue Jouets'))) === undefined };
});
ck('retrait de la mémoire effectif', suppr.reste === 2 && suppr.efface, JSON.stringify(suppr));
if (errs.length) console.log('Erreurs JS : ' + errs.join(' | '));
await b.close();
