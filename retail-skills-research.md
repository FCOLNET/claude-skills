# Meilleurs Skills pour un Réseau de Distribution Retail

> Recherche effectuée le 16 mai 2026 — sources : LobeHub, GitHub (jezweb, ComposioHQ, finsilabs, w95, VoltAgent/OpenClaw), Claude Code Docs.

---

## 1. Vue d'ensemble de l'écosystème

Les skills Claude Code sont des fichiers `SKILL.md` packagant instructions, métadonnées et ressources (scripts, templates) activés automatiquement selon le contexte. Ce document couvre **l'intégralité de l'écosystème d'un réseau de distribution physique** : du sourcing à la caisse, de la RH au merchandising.

**Sources principales :**
- [w95/awesome-claude-corporate-skills](https://github.com/w95/awesome-claude-corporate-skills) — 166 skills corporate production-ready, 14 catégories
- [finsilabs/awesome-ecommerce-skills](https://github.com/finsilabs/awesome-ecommerce-skills) — 178 skills retail/e-commerce, +31% qualité IA
- [LobeHub / OpenClaw](https://lobehub.com/skills) — 5 200+ skills, dont transport, ERP, logistique
- [jezweb/claude-skills](https://github.com/jezweb/claude-skills) — plugins Shopify
- [ComposioHQ/awesome-claude-skills](https://github.com/ComposioHQ/awesome-claude-skills) — Shopify, Square, Stripe

---

## 2. Cartographie complète par domaine

---

### 🌍 Import / Export & Achats

| Skill | Source | Ce qu'il fait |
|---|---|---|
| **rfp-builder** | [w95 — Procurement](https://github.com/w95/awesome-claude-corporate-skills) | Rédaction d'appels d'offres fournisseurs (RFP/AO) |
| **vendor-evaluation** | w95 — Procurement | Grilles comparatives fournisseurs, scoring multicritères |
| **contract-negotiation** | w95 — Procurement | Préparation des négociations, argumentaires, contre-propositions |
| **supplier-scorecard** | w95 — Procurement | Tableaux de bord performance fournisseurs (qualité, délais, prix) |
| **vendor-management** | w95 — Operations | Gestion relation fournisseurs au quotidien |
| **Researching Consumer Goods** | [LobeHub](https://lobehub.com/skills/yanchuk-skill-arsenal-researching-consumer-goods) | Comparaison prix cross-fournisseurs, disponibilité, benchmark marché, aide à la décision achat |
| **Odoo ERP Connector** | [LobeHub — OpenClaw](https://lobehub.com/skills/openclaw-skills-odoo-erp-connector) | 153+ modules Odoo : achats, fournisseurs, inventaire, facturation via langage naturel |
| **ERPNext** | [LobeHub](https://lobehub.com/skills/2nth-ai-skills-erpnext) | Automatisation ERPNext : stocks, nomenclatures, ordres de fabrication, reporting |

---

### 🚚 Transport & Logistique

| Skill | Source | Ce qu'il fait |
|---|---|---|
| **Logistics Operations Optimizer** | [LobeHub](https://lobehub.com/skills/openclaw-skills-afrexai-logistics-optimizer) | Analyse et optimisation des flux supply chain, réseaux de distribution |
| **MTA / Transport Manager** | [LobeHub](https://lobehub.com/skills/openclaw-skills-mta) | Gestion de portefeuille de transporteurs, négociation tarifaire fret, KPI carriers, allocation fret — 15 ans d'expertise codifiée |
| **Logistics Exception Management** | OpenClaw | Gestion des exceptions fret : retards, avaries, litiges transporteurs — expertise 15 ans |
| **Track17** | [LobeHub](https://lobehub.com/skills/openclaw-skills-track17) | Suivi colis multi-transporteurs via l'API 17TRACK, historique en base SQLite |
| **inventory-forecasting** | w95 — Procurement | Prévision de la demande, déclenchement réapprovisionnement |
| **Retail Demand Planner** | OpenClaw | Prévisions demande, optimisation stock de sécurité, planification réassort, gestion promotions, analyse ABC/XYZ — multi-sites, centaines de SKUs |

---

### 🏭 ERP & Systèmes d'information retail

| Skill | Source | Ce qu'il fait |
|---|---|---|
| **Odoo ERP Connector** | [LobeHub](https://lobehub.com/skills/openclaw-skills-odoo-erp-connector) | Pilotage complet Odoo 19 : ventes, achats, stocks, RH, compta, manufacturing, e-commerce — 80+ actions automatisées |
| **Odoo Manager** | [LobeHub](https://lobehub.com/skills/openclaw-skills-odoo-manager) | Administration Odoo via XML-RPC : CRUD, migrations, syncs de données |
| **ERPNext** | [LobeHub](https://lobehub.com/skills/2nth-ai-skills-erpnext) | API REST ERPNext : stocks, nomenclatures, ordres de travail, dashboards BI |
| **WooCommerce** | [LobeHub](https://lobehub.com/skills/openclaw-skills-woocommerce) | Gestion boutique WooCommerce (produits, commandes, clients) |

---

### 🏪 Implantation & Merchandising

> **Constat :** aucun skill Claude Code dédié au planogramme ou à l'implantation rayon n'existe encore dans les marketplaces publics (au 16/05/2026). C'est une **opportunité de création** de skill propriétaire.

| Skill | Source | Ce qu'il fait |
|---|---|---|
| **Product Data Modeling** | [finsilabs](https://github.com/finsilabs/awesome-ecommerce-skills) | Structure des catalogues produits par modèle de données natif plateforme (applicable au référentiel article magasin) |
| **data-visualization** | w95 — Analytics | Visualisation des données de ventes par rayon/famille (aide au réassortiment et à l'implantation) |
| **Researching Consumer Goods** | [LobeHub](https://lobehub.com/skills/yanchuk-skill-arsenal-researching-consumer-goods) | Benchmark produits grande conso, analyse concurrentielle, aide au choix de gamme |
| **canvas-design** | w95 — Marketing | Création de visuels (plans d'implantation, affiches PLV, kakémonos) en PNG/PDF |
| **brand-guidelines** | w95 — Marketing | Standards identité visuelle (applicable à la charte merchandising réseau) |

---

### 🛒 Service Client & Expérience en magasin

| Skill | Source | Ce qu'il fait |
|---|---|---|
| **ticket-triage** | w95 — Customer Success | Routage et priorisation des réclamations clients |
| **escalation** | w95 — Customer Success | Gestion des escalades et situations sensibles |
| **response-drafting** | w95 — Customer Success | Rédaction de réponses clients (email, courrier, chat) |
| **churn-analysis** | w95 — Customer Success | Analyse du risque de perte client, plan de rétention |
| **onboarding-playbook** | w95 — Customer Success | Parcours d'intégration nouveau client / programme fidélité |
| **knowledge-management** | w95 — Customer Success | Base de connaissances (FAQ, procédures SAV, fiches produits) |
| **qbr-builder** | w95 — Customer Success | Bilans trimestriels pour comptes clés / grands clients B2B |
| **Recruitment Automation** | [LobeHub](https://lobehub.com/skills/openclaw-skills-recruitment-automation) | Utilisable pour qualifier les retours clients (signaux faibles, verbatims) |

---

### 👥 Ressources Humaines & Recrutement

| Skill | Source | Ce qu'il fait |
|---|---|---|
| **job-description-writer** | w95 — HR | Rédaction de fiches de poste inclusives et attractives |
| **interview-kit-builder** | w95 — HR | Grilles d'entretien structurées (vendeur, chef de rayon, responsable magasin…) |
| **onboarding-planner** | w95 — HR | Plans d'intégration 30/60/90 jours |
| **performance-review-assistant** | w95 — HR | Entretiens annuels, plans d'amélioration (PIP), feedback 360° |
| **compensation-benchmarking** | w95 — HR | Grilles de salaires, équité salariale, benchmark secteur |
| **employee-handbook-builder** | w95 — HR | Rédaction du règlement intérieur et des politiques RH |
| **dei-strategy** | w95 — HR | Programmes diversité, équité, inclusion |
| **employee-engagement-survey** | w95 — HR | Conception et analyse des enquêtes d'engagement (baromètre social) |
| **Recruitment Automation** | [LobeHub](https://lobehub.com/skills/openclaw-skills-recruitment-automation) | Sourcing automatisé (LinkedIn, GitHub, web) : 8+ candidats qualifiés, scoring, emails de contact — idéal profils techniques (responsable logistique, DSI, data) |

---

### 📣 Communication & Marketing réseau

| Skill | Source | Ce qu'il fait |
|---|---|---|
| **internal-comms** | w95 — Executive | Communications internes réseau (notes de direction, newsletters enseigne) |
| **executive-communication** | w95 — Executive | All-hands, lettres CEO, communication de crise |
| **campaign-planner** | w95 — Marketing | Planification campagnes promotionnelles end-to-end |
| **email-marketing** | w95 — Marketing | Séquences emails (CRM clients, programme fidélité) |
| **social-media-strategy** | w95 — Marketing | Stratégie multi-plateforme (local store marketing) |
| **brand-voice-enforcement** | w95 — Marketing | Cohérence de la voix de marque sur tous les supports |
| **brand-guidelines** | w95 — Marketing | Charte graphique et guidelines enseigne |
| **content-research-writer** | w95 — Marketing | Rédaction de contenus (catalogues, fiches produits, argumentaires) |
| **Cart Abandonment Recovery** | finsilabs | Séquences email/SMS relance clients (applicable CRM magasin) |
| **slack-messaging** | w95 — Customer Success | Communication équipe via Slack (coordination réseau) |

---

### 💰 Comptabilité & Finance

| Skill | Source | Ce qu'il fait |
|---|---|---|
| **invoice-organizer** | w95 — Finance | Gestion et organisation des factures fournisseurs/clients |
| **financial-plan** | w95 — Finance | Plans financiers complets (budget annuel, prévisionnel magasin) |
| **unit-economics** | w95 — Finance | Analyse de la rentabilité par magasin / par SKU / par rayon |
| **kpi-dashboard** | w95 — Executive | Tableaux de bord KPI dirigeants (CA, marges, rotations, productivité) |
| **Xero** | [LobeHub](https://lobehub.com/skills/openclaw-skills-xero) | Intégration comptable Xero : réconciliation, reporting |
| **Revolut Business** | [LobeHub](https://lobehub.com/skills/openclaw-skills-revolut-business) | Bookkeeping, réconciliation, virements automatisés, gestion FX |
| **Expense Tracker Pro** | [LobeHub](https://lobehub.com/skills/openclaw-skills-expense-tracker-pro) | Saisie et analyse des dépenses en langage naturel |
| **3-statements** | w95 — Finance | Modèles financiers 3 états (compte de résultat, bilan, trésorerie) |
| **dcf-model** | w95 — Finance | Valorisation DCF (utile pour ouverture/acquisition de magasin) |
| **competitive-analysis** | w95 — Executive | Analyse concurrentielle (positionnement prix, zones de chalandise) |
| **risk-assessment** | w95 — Executive | Évaluation des risques entreprise |
| **Odoo ERP (comptabilité)** | [LobeHub](https://lobehub.com/skills/openclaw-skills-odoo-erp-connector) | Module comptabilité Odoo : facturation, rapprochement bancaire, reporting fiscal |

---

### ⚙️ Productivité & Opérations réseau

| Skill | Source | Ce qu'il fait |
|---|---|---|
| **sop-builder** | w95 — Operations | Rédaction de procédures opérationnelles standard (ouverture/fermeture magasin, réception marchandises…) |
| **kaizen** | w95 — Operations | Amélioration continue (méthode Kaizen) appliquée aux processus magasin |
| **process-optimization** | w95 — Operations | Identification et élimination des gaspillages de processus |
| **resource-planning** | w95 — Operations | Planification des ressources (effectifs, budgets, équipements) |
| **project-status-report** | w95 — Operations | Rapports d'avancement projets (ouverture magasin, rénovation, déménagement) |
| **business-case-builder** | w95 — Operations | ROI et business cases (nouvel emplacement, investissement) |
| **incident-postmortem** | w95 — Operations | Analyse post-incident (rupture de stock majeure, panne caisse, crise qualité) |
| **change-management** | w95 — Executive | Conduite du changement organisationnel |
| **task-management** | w95 — Executive | Gestion des tâches et suivi des actions |
| **meeting-insights-analyzer** | w95 — Operations | Analyse et compte-rendu des réunions (CODIR, réunion réseau) |
| **deep-research** | w95 — Executive | Recherche multi-sources autonome (veille marché, réglementation) |

---

### 📄 Documents & Reporting

| Skill | Source | Ce qu'il fait |
|---|---|---|
| **xlsx** | w95 — Documents | Manipulation tableurs (planning, reporting ventes, inventaires) |
| **pdf** | w95 — Documents | Extraction, fusion, annotation de PDFs (BL, contrats, fiches produits) |
| **pptx** | w95 — Documents | Création et édition de présentations (revues de performance, présentation fournisseurs) |
| **docx** | w95 — Documents | Rédaction et mise en forme de documents Word (courriers, procédures) |
| **csv-data-summarizer** | w95 — Analytics | Analyse automatique de fichiers CSV (exports caisse, inventaires) |
| **sql-queries** | w95 — Analytics | Génération de requêtes SQL (extraction données WMS, ERP) |
| **interactive-dashboard-builder** | w95 — Analytics | Tableaux de bord interactifs (performance magasin, suivi KPI) |

---

## 3. Skills à fort potentiel retail physique : détails

### Odoo ERP Connector — le couteau suisse du distributeur

Couvre en un seul skill l'intégralité de l'écosystème d'un réseau :

```
Ventes / CRM → Achats → Stocks → Fabrication (MRP)
Comptabilité → RH → Flotte → e-Commerce → Projets
```

- **153 modules** pilotables en langage naturel
- **80+ opérations automatisées** (fuzzy matching, auto-création)
- Compatible Odoo 19

### Retail Demand Planner (OpenClaw)

Spécialisé multi-sites, centaines de SKUs :
- Sélection de méthode de prévision (ARIMA, lissage exponentiel, ML)
- Analyse ABC/XYZ des références
- Gestion des transitions saisonnières
- Estimation du lift promotionnel
- Cadres de négociation fournisseurs basés sur les données

### Transport Manager / MTA (OpenClaw)

15 ans d'expertise logistique codifiée :
- Gestion de portefeuille transporteurs
- Négociation des tarifs fret
- Suivi KPI carriers (taux de service, ponctualité, sinistralité)
- Allocation du fret selon les règles métier
- Gestion des exceptions (retards, avaries, litiges)

---

## 4. Lacunes identifiées — Opportunités de création

| Domaine manquant | Pourquoi c'est un gap | Skill à créer |
|---|---|---|
| **Planogramme / implantation rayon** | Aucun skill public dédié | `planogram-builder` |
| **Merchandising visuel** | Pas de skill spécifique retail physique | `visual-merchandising` |
| **Réglementation retail** (affichage prix, étiquetage, normes hygiène) | Gap réglementaire sectoriel | `retail-compliance-fr` |
| **Caisse / POS** | Skills POS = code, pas opérations métier | `pos-operations` |
| **Gestion zones de chalandise** | Pas de skill géo-marketing local | `catchment-area-analysis` |
| **Formation vendeurs** | Pas de skill dédié retail terrain | `sales-training-retail` |

---

## 5. Recommandations par profil

### Réseau de distribution — Socle minimal (8 skills)

```
1. Odoo ERP Connector        → Achats, stocks, compta, RH en un seul outil
2. sop-builder               → Standardiser les procédures magasin
3. Retail Demand Planner     → Anticiper les ruptures et surstocks
4. job-description-writer    → Recruter efficacement en réseau
5. kpi-dashboard             → Piloter la performance par point de vente
6. internal-comms            → Fédérer le réseau
7. invoice-organizer         → Maîtriser les flux fournisseurs
8. customer-response-drafting → Uniformiser la relation client
```

### Pour le responsable achats / import-export

```
rfp-builder + vendor-evaluation + contract-negotiation
+ supplier-scorecard + Researching Consumer Goods
+ Odoo ERP (module achats)
```

### Pour le directeur logistique

```
Transport Manager (MTA) + Logistics Operations Optimizer
+ Logistics Exception Management + Track17
+ Retail Demand Planner + inventory-forecasting
```

### Pour le DRH réseau

```
job-description-writer + interview-kit-builder
+ onboarding-planner + performance-review-assistant
+ compensation-benchmarking + employee-engagement-survey
+ Recruitment Automation (pour profils techniques)
```

### Pour le DAF / Contrôle de gestion

```
unit-economics + financial-plan + 3-statements
+ kpi-dashboard + Xero ou Odoo (compta)
+ csv-data-summarizer + interactive-dashboard-builder
```

### Pour la direction marketing / communication

```
brand-guidelines + brand-voice-enforcement
+ campaign-planner + internal-comms
+ social-media-strategy + content-research-writer
```

---

## 6. Comment installer un skill

```bash
# Via npx skills (Vercel Labs)
npx skills add <nom-du-skill>

# Manuellement
mkdir -p .claude/skills/<nom>
# Créer SKILL.md avec frontmatter YAML + instructions markdown

# Depuis un repo GitHub
gh repo clone w95/awesome-claude-corporate-skills
cp -r awesome-claude-corporate-skills/hr .claude/skills/
```

---

## Sources complètes

- [LobeHub Skills Marketplace](https://lobehub.com/skills)
- [w95/awesome-claude-corporate-skills](https://github.com/w95/awesome-claude-corporate-skills) — 166 skills corporate
- [finsilabs/awesome-ecommerce-skills](https://github.com/finsilabs/awesome-ecommerce-skills) — 178 skills retail
- [VoltAgent/awesome-openclaw-skills](https://github.com/VoltAgent/awesome-openclaw-skills) — 5 200+ skills OpenClaw
- [jezweb/claude-skills — Shopify](https://github.com/jezweb/claude-skills)
- [ComposioHQ/awesome-claude-skills](https://github.com/ComposioHQ/awesome-claude-skills)
- [Claude Code Skills Docs](https://code.claude.com/docs/en/skills)
- [Odoo ERP Connector — LobeHub](https://lobehub.com/skills/openclaw-skills-odoo-erp-connector)
- [Logistics Operations Optimizer — LobeHub](https://lobehub.com/skills/openclaw-skills-afrexai-logistics-optimizer)
- [Recruitment Automation — LobeHub](https://lobehub.com/skills/openclaw-skills-recruitment-automation)
- [Researching Consumer Goods — LobeHub](https://lobehub.com/skills/yanchuk-skill-arsenal-researching-consumer-goods)
- [Track17 — LobeHub](https://lobehub.com/skills/openclaw-skills-track17)
- [Xero — LobeHub](https://lobehub.com/skills/openclaw-skills-xero)
- [Revolut Business — LobeHub](https://lobehub.com/skills/openclaw-skills-revolut-business)
