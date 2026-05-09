# 🎮 Guide d'Optimisation du Mouvement

## Analyse des problèmes résolus
1. **Glissement du joueur** : Utilisation d'une accélération progressive et d'un damping linéaire.
2. **Saccades de la caméra** : Interpolation (LERP) fluide basée sur la rotation du joueur.
3. **Mouvement mondial** : Les contrôles WASD sont désormais relatifs à l'orientation de la caméra.
4. **Performance Réseau** : Throttling des émissions socket à 20Hz au lieu de 60Hz.

## Paramètres recommandés
- **WALK_SPEED** : 8 (Arcade) / 5 (Réaliste)
- **ACCELERATION** : 0.15 pour un bon feeling réactif.
- **CAMERA_LERP** : 0.08 pour un suivi fluide sans retard excessif.
