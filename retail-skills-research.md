# Meilleurs Skills Retail pour Claude Code

> Recherche effectuée le 16 mai 2026 — sources : LobeHub, GitHub (jezweb, ComposioHQ, finsilabs, VoltAgent), Claude Code Docs.

---

## 1. Vue d'ensemble de l'écosystème

Les skills Claude Code sont des fichiers `SKILL.md` qui packagèrent instructions, métadonnées et ressources (scripts, templates) que Claude utilise automatiquement selon le contexte. Le marketplace LobeHub recense **1 234+ skills** multi-agents (Claude Code, Codex, Gemini CLI, Cursor…). Pour le retail, deux grandes familles émergent :

- **Platform automation** : Shopify, Amazon, WooCommerce, BigCommerce, Square, Stripe
- **Opérations retail** : inventaire, pricing dynamique, SEO produit, CRM, fulfillment

---

## 2. Top Skills par catégorie

### 🛍️ Plateformes e-commerce

| Skill | Source | Points forts |
|---|---|---|
| **Shopify Products** | [jezweb/claude-skills](https://github.com/jezweb/claude-skills) | Création/import produits via GraphQL Admin API ou CSV ; variantes, inventaire, images, collections |
| **Shopify Content** | [jezweb/claude-skills](https://github.com/jezweb/claude-skills) | Pages, articles de blog, navigation, métadonnées SEO |
| **Shopify Setup** | [jezweb/claude-skills](https://github.com/jezweb/claude-skills) | Connexion API, configuration initiale de boutique |
| **OpenClaw Commerce (Shopify)** | [LobeHub](https://lobehub.com/skills/openclaw-skills-openclaw-commerce-shopify) | Opérations GraphQL unifiées : CRUD entités boutique, mises à jour en masse, gestion des remises |
| **BigCommerce** | [LobeHub](https://lobehub.com/skills/terminalskills-skills-bigcommerce) | Gestion catalogue, commandes et clients sur BigCommerce |
| **Payload CMS E-commerce** | [LobeHub](https://lobehub.com/skills/tangledgroup-tangled-skills-payloadcms-ecommerce-3-82-1) | Collections pré-configurées (produits avec variantes, prix multi-devises), Stripe, comptes clients |

### 🏪 Amazon & Marketplaces

| Skill | Source | Points forts |
|---|---|---|
| **Amazon Seller** | [LobeHub](https://lobehub.com/skills/claude-office-skills-skills-amazon-seller) | Sync inventaire, alertes réapprovisionnement, traitement commandes, repricing dynamique, monitoring concurrents |

### 💳 Paiements & Transactions

| Skill | Source | Points forts |
|---|---|---|
| **Square Automation** | [ComposioHQ/awesome-claude-skills](https://github.com/ComposioHQ/awesome-claude-skills) | Paiements, clients, catalogue, commandes, emplacements |
| **Stripe Automation** | [ComposioHQ/awesome-claude-skills](https://github.com/ComposioHQ/awesome-claude-skills) | Charges, clients, produits, abonnements, remboursements |

### 📦 Opérations retail (finsilabs — 178 skills, +31% qualité IA)

| Skill | Ce qu'il fait |
|---|---|
| **Inventory Tracking** | Suivi temps réel des niveaux de stock + alertes rupture |
| **Checkout Flow Optimization** | Réduction abandon panier (autocomplete, indicateurs de progression) |
| **Cart Abandonment Recovery** | Séquences email/SMS de récupération |
| **Discount Engine** | Remises en %, montant fixe, paliers |
| **Shipping Rate Calculator** | Calcul des frais de port en temps réel au checkout |
| **Product Reviews** | Système d'avis + Google Rich Snippets |
| **Customer Accounts** | Inscription, profils, historique commandes |
| **E-commerce SEO** | Meta tags, données structurées, optimisation moteurs |
| **Product Data Modeling** | Structure catalogue via modèles de données natifs plateforme |
| **OpenClaw E-commerce (CLI)** | Monitoring prix, suivi commandes, calcul marges, alertes seuil |

**Source :** [finsilabs/awesome-ecommerce-skills](https://github.com/finsilabs/awesome-ecommerce-skills) — 178 skills sur 17 catégories (operations, CRM, analytics, fulfillment, payments, marketing, security…)

### 🔬 Recherche consommateurs & insights

| Skill | Source | Points forts |
|---|---|---|
| **Researching Consumer Goods** | [LobeHub](https://lobehub.com/skills/yanchuk-skill-arsenal-researching-consumer-goods) | Analyse de produits grande consommation, benchmark marché |

---

## 3. Skill à fort impact : Amazon Seller (détail)

```yaml
# Extrait SKILL.md (Amazon Seller — LobeHub)
triggers:
  - "sync inventory"
  - "replenishment alert"
  - "reprice products"
  - "monitor competitors"
```

**Fonctionnalités clés :**
- Sync inventaire automatique + règles de réapprovisionnement
- Traitement et fulfillment des commandes
- Règles de repricing dynamique + monitoring concurrents
- Optimisation stockage (inventaire vieillissant)
- Automatisation des expéditions

---

## 4. Skill à fort impact : Shopify Products (détail)

**Déclencheurs :** "add products to Shopify", "bulk import", "update variants or prices", "manage inventory quantities"

**Workflow en 7 étapes :**
1. Collecte des infos produit (titre, description, variantes, images, SEO)
2. Choix de méthode : GraphQL (1-20 produits) ou CSV import (20+)
3. Création via mutations `productCreate` / `productUpdate`
4. Upload images
5. Assignation collections
6. Ajustement niveaux inventaire
7. Vérification résultats

**Limites importantes :** max 100 variantes/produit, 3 options max, nouveaux produits en DRAFT par défaut.

---

## 5. Recommandations prioritaires

### Pour un retailer en démarrage
1. **Shopify Products + Shopify Setup** (jezweb) — base indispensable
2. **Stripe Automation** (ComposioHQ) — paiements
3. **Inventory Tracking** (finsilabs) — gestion stock

### Pour un vendeur marketplace
1. **Amazon Seller** (LobeHub) — automation complète
2. **OpenClaw E-commerce CLI** (LobeHub) — monitoring prix/marges

### Pour scaler les opérations
1. **OpenClaw Commerce Shopify** (LobeHub) — opérations GraphQL en masse
2. **Cart Abandonment Recovery** (finsilabs) — conversion
3. **E-commerce SEO** (finsilabs) — acquisition organique
4. **Discount Engine** (finsilabs) — pricing promotionnel

---

## 6. Comment installer un skill

```bash
# Via npx skills (Vercel Labs)
npx skills add shopify-products

# Manuellement : créer .claude/skills/<nom>/SKILL.md
mkdir -p .claude/skills/shopify-products
# Copier le contenu SKILL.md depuis GitHub
```

---

## Sources

- [LobeHub Skills Marketplace](https://lobehub.com/skills)
- [jezweb/claude-skills — Shopify plugins](https://github.com/jezweb/claude-skills)
- [ComposioHQ/awesome-claude-skills](https://github.com/ComposioHQ/awesome-claude-skills)
- [finsilabs/awesome-ecommerce-skills (178 skills)](https://github.com/finsilabs/awesome-ecommerce-skills)
- [VoltAgent/awesome-agent-skills](https://github.com/VoltAgent/awesome-agent-skills)
- [Claude Code Skills Docs](https://code.claude.com/docs/en/skills)
- [Amazon Seller Skill — LobeHub](https://lobehub.com/skills/claude-office-skills-skills-amazon-seller)
- [OpenClaw Commerce Shopify — LobeHub](https://lobehub.com/skills/openclaw-skills-openclaw-commerce-shopify)
- [Shopify Products SKILL.md](https://github.com/jezweb/claude-skills/blob/main/plugins/shopify/skills/shopify-products/SKILL.md)
- [Researching Consumer Goods — LobeHub](https://lobehub.com/skills/yanchuk-skill-arsenal-researching-consumer-goods)
