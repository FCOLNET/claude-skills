# Exemples de planogrammes — Référentiel

## Exemple 1 — Rayon Hygiène/Beauté, 6m, 5 niveaux

**Contexte :** 6 mètres linéaires, 5 niveaux, grandes surfaces, univers shampoings + soins cheveux

```
RAYON HYGIÈNE CHEVEUX — 6m — 5 niveaux — Blocking vertical par marque
═══════════════════════════════════════════════════════════════════════════════
         │◄── MDD (25%) ──►│◄── Marque A (30%) ──►│◄── Marque B (25%) ──►│◄─ C ─►│
N5 (chap)│ MDD stockage    │ Shamp. A grand format │ Soins B grand format │ Promo │
N4 (œil) │ MDD Shamp x3 ██│ Shamp A normal  x4 ██│ Shamp B normal  x3 ██│ B x2 █│
N3 (main)│ MDD Soin   x3 ██│ Soin A après-sh x4 ██│ Soin B après-sh x3 ██│ B x2 █│
N2 (main)│ MDD Masque x2 ██│ Masque A        x3 ██│ Masque B        x3 ██│ C x1 │
N1 (sol) │ MDD Pack 2x1 ██ │ Pack A économique x2  │ Pack B économique x2  │Grand F│
═══════════════════════════════════════════════════════════════════════════════
Métriques : MDD 25% ✓ | Produits A au N4 ✓ | Taux remplissage 97% ✓
```

**Tableau d'implantation :**

| Niveau | Position | Référence | Désignation | Larg.(cm) | Facings | Rotation |
|---|---|---|---|---|---|---|
| N4 | 1 | MDD001 | Shampoing MDD Normal | 8 | 3 | B |
| N4 | 2 | MDD002 | Shampoing MDD Sec | 8 | 3 | B |
| N4 | 3 | A001 | Shampoing Marque A Normal | 8 | 4 | A |
| N4 | 4 | A002 | Shampoing Marque A Cheveux Colorés | 8 | 3 | A |
| N4 | 5 | B001 | Shampoing Marque B Nutrition | 8 | 3 | A |

---

## Exemple 2 — Rayon Boissons, 4m, 4 niveaux (blocking horizontal)

**Contexte :** 4 mètres, 4 niveaux, supermarché, eaux + jus

```
RAYON BOISSONS (hors alcool) — 4m — 4 niveaux — Blocking horizontal par prix
═══════════════════════════════════════════════════════════════════════════════
N4 (œil) │ ── EAUX PLATES (60%) ──────────────│─ EAUX GAZEUSES (40%) ─────│
         │ MDD x4 │ Marque A x3 │ Marque B x2 │ MDD x3 │ Marque A x2 │ M.B│
N3 (main)│ ─── JUS DE FRUITS ────────────────────────────────────────────────│
         │ MDD Orangex4│ M.A Tropx3│ M.B Mix x2 │ BIO x2      │ Premium x1 │
N2 (main)│ ─── SODAS / LIMONADES ────────────────────────────────────────────│
         │ MDD x4   │ Cola Mx3  │ Lemon x3  │ Energy x2   │ Tonic x2       │
N1 (sol) │ ─── PACKS ÉCONOMIQUES & GRANDS FORMATS ───────────────────────────│
         │ Pack eau 6x1,5L ████████ │ Pack jus 6x1L ████████│ Pack soda ████│
═══════════════════════════════════════════════════════════════════════════════
```

---

## Exemple 3 — Tête de gondole promotionnelle

```
TÊTE DE GONDOLE — 1,2m × 5 niveaux — Opération "Rentrée Scolaire"
══════════════════════════════
N5 │ BANDEAU PROMO ROUGE    │
   │ "RENTRÉE -30%"         │
N4 │ Cahiers 96p MDD  ████  │  → 4 facings, prix : 0,59€ (-30%)
N3 │ Stylos bille x10 ████  │  → 4 facings, prix : 1,29€ (-25%)
N2 │ Classeurs A4 MDD ████  │  → 4 facings, prix : 1,99€ (-20%)
N1 │ Pack fournitures ██    │  → 2 facings, prix : 5,99€ (-30%)
══════════════════════════════
Règles respectées :
✓ Max 3 références (lisibilité)
✓ Prix barré + nouveau prix affiché
✓ % remise clairement indiqué
✓ Durée opération affichée
```

---

## Exemple 4 — Audit rayon (format rapport)

```
AUDIT PLANOGRAMME — Rayon Entretien — Magasin Lyon-Centre — 12/05/2026

CONSTAT ACTUEL                     RECOMMANDATION
────────────────────────────────────────────────────────────────
❌ Produit A (best-seller) en N1   → Déplacer en N3-N4
❌ MDD à 18% (cible 25%)           → Ajouter 2 références MDD N3
❌ 3 références à 0 facing (rupture)→ Retirer du planogramme
⚠️ TDG vide depuis 2 semaines      → Programmer opération promo
✓  Blocking vertical cohérent      → Conserver
✓  Prix bien affichés              → RAS

PRIORITÉ ACTIONS :
1. [URGENT] Remonter REF-001 en N3 (perte CA estimée : 150€/sem)
2. [Cette semaine] Installer TDG opération "Back to school"
3. [Révision mensuelle] Intégrer 2 nouvelles MDD
```
