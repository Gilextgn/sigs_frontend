# Commercialiser SIGS

## 1. Positionnement

SIGS est une solution de gestion scolaire destinée aux établissements qui souhaitent :

- gérer les élèves et les classes ;
- suivre les tranches de scolarité et les autres frais ;
- sécuriser les encaissements ;
- calculer automatiquement les restes dus ;
- suivre les débiteurs ;
- produire des reçus PDF ;
- contrôler les accès des utilisateurs ;
- conserver un historique des opérations ;
- suivre les statistiques et l'évolution des encaissements.

### Proposition de valeur

> SIGS aide les établissements scolaires à suivre leurs élèves, sécuriser leurs paiements et connaître en temps réel les montants restant dus.

SIGS ne doit pas être présenté comme un simple logiciel de saisie. Sa valeur principale est le **contrôle financier et administratif** : chaque paiement est associé à un élève, une classe, une ligne de frais, un montant attendu et un reste dû.

## 2. SIGS est-il commercialisable ?

### Oui pour un pilote payant

SIGS peut déjà être proposé à une ou deux écoles pilotes. Les fonctionnalités principales sont présentes :

- élèves et classes ;
- tranches de scolarité ;
- autres frais obligatoires ou optionnels ;
- recherche d'un élève par matricule ou par nom ;
- paiements et reçus PDF ;
- calcul du reste dû ;
- liste des débiteurs ;
- statistiques d'encaissement ;
- utilisateurs, rôles et permissions ;
- journalisation des opérations ;
- limitation des tentatives de connexion ;
- sauvegardes SQL planifiées.

### Avant une commercialisation à grande échelle

Les points suivants doivent encore être durcis :

1. **Multi-école réel** : chaque établissement doit voir uniquement ses propres données.
2. **Tests automatisés** : paiements partiels, doublons, permissions, suppressions et calculs.
3. **Clôture de caisse complète** : validation, verrouillage, rapport et export de la journée.
4. **Sauvegardes vérifiables** : restauration testée et copie hors du serveur principal.
5. **Déploiement sécurisé** : HTTPS, secrets de production, sauvegardes protégées et surveillance.
6. **Gestion commerciale** : abonnements, factures, échéances, relances et suspensions.

## 3. Modèle économique recommandé

Le modèle recommandé est un **paiement d'installation suivi d'un abonnement**.

### Installation initiale

La facturation initiale peut couvrir :

- configuration de l'établissement ;
- import des élèves et classes existants ;
- création des utilisateurs ;
- paramétrage des frais ;
- ajout du logo et des informations de l'école ;
- formation du responsable et des caissiers.

### Abonnement

L'abonnement couvre les coûts récurrents :

- hébergement ;
- sauvegardes ;
- support ;
- mises à jour ;
- maintenance ;
- sécurité ;
- évolutions du produit.

Un abonnement annuel peut bénéficier d'une remise de 10 à 15 % par rapport au paiement mensuel.

### Pourquoi éviter la vente unique ?

Une vente unique ne finance pas durablement :

- les serveurs ;
- les sauvegardes ;
- les corrections ;
- l'assistance ;
- les mises à jour de sécurité.

La vente unique peut éventuellement être proposée pour une installation locale, mais elle doit être plus chère et prévoir un contrat de maintenance séparé.

## 4. Offre commerciale de départ

### Offre pilote de 30 jours

L'objectif est de réduire le risque pour l'école et de recueillir des retours réels.

L'offre peut inclure :

- installation et configuration ;
- formation de l'équipe ;
- utilisation pendant 30 jours ;
- suivi des encaissements ;
- assistance prioritaire ;
- bilan à la fin du pilote.

À la fin du pilote, l'école choisit un abonnement mensuel ou annuel.

### Exemple de niveaux d'offre

Les tarifs doivent être adaptés au marché local et à l'effectif de l'école.

- **Essentiel** : élèves, classes, frais et paiements.
- **Professionnel** : statistiques, débiteurs, reçus, rôles et sauvegardes.
- **Accompagnement** : import des données, formation, support prioritaire et rapports personnalisés.

Il vaut mieux commencer avec des tarifs simples et les ajuster après les premiers pilotes.

## 5. Relances des abonnements impayés

Le scénario recommandé est progressif :

| Moment | Action |
|---|---|
| 7 jours avant l'échéance | Rappel préventif par e-mail ou WhatsApp |
| Jour de l'échéance | Notification de paiement |
| 3 jours après | Première relance |
| 7 jours après | Avertissement de suspension |
| 15 jours après | Accès limité, lecture et exports conservés |
| 30 jours après | Suspension complète |
| Après paiement | Réactivation automatique |

Les données de l'école ne doivent jamais être supprimées à cause d'un impayé.

### Statuts d'abonnement à prévoir

- `active` : abonnement à jour ;
- `grace_period` : délai de tolérance ;
- `past_due` : paiement en retard ;
- `suspended` : accès suspendu ;
- `cancelled` : abonnement résilié.

### Canaux de relance

Prévoir progressivement :

1. e-mail automatique ;
2. notification dans SIGS ;
3. WhatsApp ou SMS selon les outils disponibles ;
4. relance manuelle par le propriétaire.

## 6. Fonctionnalités SaaS à développer

Pour gérer les écoles clientes, il faudra ajouter :

- comptes d'écoles séparés ;
- espace propriétaire SIGS ;
- plans et tarifs ;
- abonnements ;
- factures ;
- échéances ;
- historique des paiements d'abonnement ;
- relances automatiques ;
- suspension et réactivation ;
- paiement en ligne ;
- gestion des essais gratuits ou pilotes ;
- tableau de bord commercial.

## 7. Comment vendre les premiers pilotes

### Cibles prioritaires

Commencer par :

- écoles privées de petite ou moyenne taille ;
- établissements qui utilisent encore des cahiers ou des fichiers Excel ;
- écoles où le directeur suit directement les paiements ;
- établissements ayant plusieurs caissiers ou plusieurs classes.

### Démonstration recommandée

La démonstration doit suivre un cas réel :

1. rechercher un élève par nom ;
2. afficher sa classe ;
3. sélectionner une tranche ;
4. voir le montant déjà payé et le reste dû ;
5. enregistrer un paiement ;
6. générer le reçu PDF ;
7. consulter la liste des débiteurs ;
8. afficher les statistiques ;
9. montrer le journal et les permissions.

La démonstration doit durer environ 15 à 20 minutes et parler des problèmes de l'école, pas uniquement des fonctionnalités techniques.

### Questions à poser au prospect

- Comment suivez-vous actuellement les paiements ?
- Combien de personnes encaissent les frais ?
- Comment vérifiez-vous les restes dus ?
- Avez-vous déjà eu des erreurs ou des doublons ?
- Combien de temps faut-il pour préparer un état des débiteurs ?
- Qui doit pouvoir consulter ou modifier les données ?

## 8. Plan d'action conseillé

### Étape 1 : pilote

- choisir une première école ;
- importer un échantillon réel ;
- faire utiliser SIGS par un caissier ;
- recueillir les erreurs et demandes ;
- mesurer le temps gagné.

### Étape 2 : fiabilisation

- compléter le multi-école ;
- tester la restauration des sauvegardes ;
- finaliser la clôture de caisse ;
- ajouter les tests automatisés ;
- sécuriser le serveur de production.

### Étape 3 : offre payante

- définir trois niveaux d'offre maximum ;
- fixer les frais d'installation ;
- rédiger les conditions d'abonnement ;
- définir la politique de relance ;
- préparer une facture et un contrat simples.

### Étape 4 : acquisition

- contacter directement les directeurs ;
- organiser des démonstrations ;
- proposer un pilote encadré ;
- demander un témoignage après réussite ;
- utiliser les premiers résultats pour convaincre d'autres écoles.

## 9. Conclusion

La stratégie recommandée est :

> **installation payante + abonnement mensuel ou annuel + pilote de 30 jours + relances progressives.**

SIGS peut être présenté dès maintenant à des écoles pilotes. Pour une commercialisation plus large, la priorité est de terminer le multi-école, la clôture de caisse, les tests, la gestion des abonnements et les relances automatiques.

Les pages déjà prévues dans l'application sont :

- `/commercial` : présentation publique de SIGS ;
- `/owner` : espace privé de pilotage ;
- `/statistics` : statistiques et évolution des encaissements.
