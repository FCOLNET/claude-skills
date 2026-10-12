# Provenance

Skill tiers importé tel quel depuis
[nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill)
(licence MIT, voir `LICENSE`).

- Version : 2.13.0 — commit `026b6e172c47fa09246b89b6e1d414b8e15f1057` (12 oct. 2026)
- Source : `.claude/skills/ui-ux-pro-max/` du dépôt amont

Adaptations locales :
- Chemins du script : `${CLAUDE_PLUGIN_ROOT}/.claude/skills/ui-ux-pro-max/scripts/`
  remplacé par `${CLAUDE_SKILL_DIR}/scripts/` (la variable plugin n'existe pas
  pour un skill de projet).
- `scripts/tests/` retiré : les tests dépendent de scripts à la racine du dépôt amont.

Mise à jour : recopier le dossier amont, réappliquer les deux adaptations ci-dessus,
puis vérifier avec `python3 .claude/skills/ui-ux-pro-max/scripts/validate_data.py`.
