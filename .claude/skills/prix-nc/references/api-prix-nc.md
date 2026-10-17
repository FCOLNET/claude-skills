# API prix.nc — référence

Observatoire des prix du gouvernement de la Nouvelle-Calédonie (DAE), opéré par la DINUM.
Constaté le 17/10/2026 ; l'API n'est pas versionnée au-delà de `v1`, revérifier la
spécification si un appel change de comportement.

- Base : `https://prix.nc/api/v1`
- Spécification OpenAPI 3 : `https://prix.nc/api/v1/v3/api-docs`
- Interface Swagger : `https://prix.nc/api/v1/swagger-obsprix.html`
- **Aucune authentification.** Lecture seule, toutes les routes sont en `GET`.

---

## 1. Cadre réglementaire

| Point | Contenu |
|---|---|
| Obligation | Les détaillants d'au moins **350 m²** transmettent au gouvernement les prix de leurs produits alimentaires et non alimentaires (art. Lp. 412-4 du code de commerce applicable en NC ; décision QPC 2019-774). |
| Destinataire | Le **gouvernement** (DAE, service des prix), **pas** l'Autorité de la concurrence de NC. |
| Rythme | Transmission automatisée hebdomadaire de toutes les références, plus à chaque changement de tarif, complétée par des relevés terrain trimestriels des agents de la DAE. |
| Format du fichier transmis | Fixé par arrêté ; **non publié** dans l'API. L'API expose les prix une fois intégrés. |
| BQP | Les fichiers « Bouclier Qualité Prix » déposés par les points de vente sont téléchargeables tels quels (`/bqp/files`). |

Conséquence : les magasins de moins de 350 m² présents dans l'API (petites surfaces,
stations, boucheries) le sont par les relevés terrain, donc avec un assortiment et une
fréquence bien plus faibles. Ne pas les comparer aux grandes surfaces sans le dire.

---

## 2. Ressources utiles

| Route | Contenu | Volume (17/10/2026) |
|---|---|---|
| `/relevesprix` | **Prix en vigueur** : un seul prix par couple produit × magasin, le dernier relevé | 222 159 |
| `/magasins` | Points de vente : commune, province, zone, type de commerce, GPS | 230 |
| `/produits` | Référentiel produit : EAN (`gencod`), marque, variété, secteur, origine | 24 705 |
| `/bqp/files` | Liste des fichiers BQP déposés | 3 |
| `/bqp/file?filename=…` | Téléchargement d'un fichier BQP (xlsx ou pdf) | |
| `/paniers/comparaison?produitIds=&quantites=&magasinIds=` | Comparaison de panier calculée par le serveur | |
| `/communes`, `/marques`, `/secteurs`, `/ss-secteurs`, `/typesCommerce`, `/varietes` | Référentiels | |

Recherches ciblées (évitent de tout télécharger) :

```
/relevesprix/search/findByIdMagasinIn?magasinIds=<id>[,<id>…]
/relevesprix/search/findByIdProduitOrderByPrixParUniteAscPrixAscMagasinAsc?idProduit=<id>
/relevesprix/search/findByIdProduitInAndIdMagasinIn?produitIds=…&magasinIds=…
/produits/search?name=<texte>
/produits/search/findByIdNeolan?idNeolan=<n>
/magasins/search/findByLabelIgnoreCaseStartsWith?label=<début>
/magasins/search/findByIdCommuneIgnoreCaseOrderByLabelAsc?idCommune=<id>
```

Routes éditoriales sans intérêt pour l'analyse : `/actualites`, `/faq`, `/lexique`,
`/carrousel`, `/comite`, `/aPropos`, `/reglementations`, `/boucliers`.

---

## 3. Champs d'un relevé

| Champ API | Colonne CSV | Remarque |
|---|---|---|
| `dateReleve` | `date_releve` | Horodatage en millisecondes. **Convertir à l'heure de Nouméa (UTC+11, sans heure d'été)** : en UTC, les relevés tombent la veille. |
| `idProduit`, `nom` | `id_produit`, `produit` | Jointure avec `/produits` pour l'EAN, la marque et le secteur |
| `idMagasin`, `magasin` | `id_magasin`, `magasin` | Jointure avec `/magasins` pour la commune et le type |
| `prix` | `prix` | Entier, **francs CFP (XPF)** TTC |
| `prixParUnite`, `uniteLabelCourt` | `prix_par_unite`, `unite` | XPF par kg, L ou pièce |
| `promotion` | `promotion` | `oui` / `non` |
| `origine` | `origine` | `IMPORT` ou `LOCAL` |
| `idCommune` | — | Parfois un id court (`"1"`), parfois un UUID : utiliser la commune du magasin |

---

## 4. Pièges constatés

- **Pagination plafonnée à 1 000 lignes** (`size` au-delà est ramené à 1 000). Toujours
  trier par `id` (`sort=id,asc`) pour que les pages restent stables si la base change
  pendant la collecte, et dédoublonner par `id`.
- **Lent** : environ 6 s et 1 Mo par page de relevés, côté serveur. Une collecte complète
  fait ~250 appels et dure ~15 min ; le script en lance 3 en parallèle, pas plus, par
  égard pour un service public.
- **Pas d'historique** : `/relevesprix` ne garde que le dernier prix de chaque couple
  (environ 3 mois de dates). Toute analyse d'évolution exige d'**archiver un
  instantané par semaine** soi-même.
- `/produitsprix` (liste complète) a coupé la connexion lors des tests : ne pas l'utiliser.
- **`typeCommerce` n'est pas fiable** : vide pour une cinquantaine de magasins (dont
  Auchan Auteuil, Discount Teari, Super U Koumac), et des magasins à gros assortiment
  sont classés « Moyenne surface » (Discount, Carrefour Market, Casino) voire « Petite
  surface » (Auchan Koné, Leader Price Koné). Sélectionner les magasins par le nombre de
  prix publiés, pas par ce champ.
- **Magasins hors référentiel** : des relevés pointent vers des `idMagasin` absents de
  `/magasins` (404 en accès direct). Au 17/10/2026 : Auchan Savannah (3 692 prix),
  L'Épicerie du coin, Korail Lifou, K-Gou Pouembout, Darty Centre Ville. Le nom du
  magasin reste lisible dans le relevé ; la commune et le type manquent.
- **Prix aberrants** : une centaine de prix sont à plus de 3× ou moins de 1/3 de la
  médiane de leur produit (lot saisi comme l'unité, erreur de frappe). Les écarter des
  indices et des écarts, et les signaler plutôt que les corriger.
- **Prix identiques au sein d'une enseigne** : Géant Sainte-Marie et Géant Dumbéa,
  ou les trois Casino, affichent souvent exactement le même prix ; une comparaison par
  enseigne vaut alors autant qu'une comparaison par magasin.
- Le nom d'enseigne n'est pas un champ : il faut le déduire du nom de magasin
  (`CARREFOUR MARKET DUCOS`, `LEADER PRICE POINDIMIE`…), ce qui reste approximatif.
- Le jeu `prixnc` de data.gouv.nc n'est pas interrogeable par l'API du portail :
  la source est l'API prix.nc elle-même.
