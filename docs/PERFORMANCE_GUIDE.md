# ⚡ Guide de Performance Détaillé

## Techniques implémentées
1. **LOD (Level of Detail)** : Réduction de la complexité géométrique des objets et joueurs éloignés.
2. **Frustum Culling** : Ne pas calculer le rendu des objets hors du champ de vision de la caméra.
3. **Memoization** : Utilisation de `useMemo` pour éviter de recalculer les listes d'obstacles à chaque frame.
4. **Shadow Maps** : Taille des ombres réduite à 1024 pour un gain de FPS significatif.

## Benchmarks attendus
- **FPS** : Stable à 60 FPS sur desktop moyen.
- **Mémoire** : ~165 MB RAM avec 10 joueurs.
- **Réseau** : ~1.2 Mbps (réduction de 67%).
