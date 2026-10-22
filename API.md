# KAPTURE — contrat API & architecture du backend

Récapitulatif de ce que l'API Java doit exposer pour coller au front (`front/public/js/shared.js` fait foi : c'est le contrat exact que consomment `report.js` et `dashboard.js`). Complète `Specs.md`.

## Routes à faire

Deux routes, préfixées `/api`, JSON uniquement. **Aucune autre route** : pas de création de session ni de testeur (gérés par `db/init/02-seed.sql`), pas de route `/end`, pas d'authentification.

### 1. `POST /api/sessions/{id}/bugs` — insérer un bug

Appelé par le popup de signalement. Corps envoyé par `report.js` :

```json
{
  "titre": "BUG1",
  "id_utilisateur": "Storm_X9",
  "description": "Le joueur traverse le mur nord",
  "payload": { "niveau": 3, "position": { "x": 120, "y": 48 }, "comportement": { } },
  "timestamp": "2026-10-19T14:32:05.120Z",
  "type_bug": "MAP"
}
```

| Élément | Règle | Erreur |
| --- | --- | --- |
| `{id}` (path) | entier > 0, session existante | `404` « Session inconnue. » |
| `titre` | obligatoire, ∈ `BUG1`…`BUG5` | `400` « titre invalide » |
| `type_bug` | obligatoire, ∈ `MAP`, `AUTRE_JOUEUR`, `GRAPHIQUE`, `SON`, `INTERFACE`, `PERFORMANCE`, `AUTRE` | `400` « type_bug invalide » |
| `id_utilisateur` | obligatoire, pseudonyme existant (`appariement`) | `400` « id_utilisateur inconnu » |
| `timestamp` | obligatoire, date ISO 8601 parsable (avec ms) | `400` « timestamp invalide » |
| `description` | optionnelle (défaut `""`), 500 caractères max | `400` « description trop longue » |
| `payload` | obligatoire, objet JSON non-null (jamais un tableau) | `400` « payload invalide » |

Réponses :

| Cas | Status | Corps |
| --- | --- | --- |
| Créé | `201` | `{ "id": <id du bug> }` |
| Session inconnue | `404` | `{ "message": "…" }` |
| Donnée invalide | `400` | `{ "message": "…" }` |

Le `payload` est stocké **tel quel** : le popup y ajoute toujours une clé `comportement` (métriques de saisie) et le front ne valide pas son schéma interne.

### 2. `GET /api/bugs` — liste filtrée, triée, paginée

Appelé par le dashboard. Paramètres tous optionnels et cumulables :

| Param | Règle | Défaut |
| --- | --- | --- |
| `type_bug` | égalité exacte | — |
| `titre` | égalité exacte | — |
| `id_utilisateur` | égalité exacte (saisie libre côté front) | — |
| `session_id` | égalité exacte (entier) | — |
| `depuis` / `jusqu_a` | bornes inclusives sur `timestamp` (ISO 8601) | — |
| `tri` | ∈ `timestamp`, `titre`, `type_bug`, `id_utilisateur` | `timestamp` |
| `ordre` | ∈ `asc`, `desc` | `desc` |
| `page` | entier ≥ 0 | `0` |
| `taille` | entier 1…200 | `50` |

Paramètre hors liste → `400` `{ "message": "…" }` (« Paramètre tri invalide : … », « Paramètre ordre invalide : … », « Pagination invalide (taille max : 200). »).

Réponse `200` :

```json
{
  "total": 37,
  "page": 0,
  "taille": 20,
  "resultats": [
    {
      "id": 128,
      "session_id": 42,
      "titre": "BUG1",
      "id_utilisateur": "Storm_X9",
      "description": "Le joueur traverse le mur nord",
      "payload": { "niveau": 3, "position": { "x": 120, "y": 48 } },
      "timestamp": "2026-10-19T14:32:05.120Z",
      "type_bug": "MAP"
    }
  ]
}
```

Détails que le front vérifie :

- `total` = nombre de lignes **après filtres, avant pagination** (le dashboard en déduit le nombre de pages).
- `page` et `taille` sont **renvoyés échoés**, pas lus dans l'état du front.
- `resultats` contient les 8 champs exactement, la tranche `page * taille` → `(page+1) * taille` (une page vide est acceptable).
- `timestamp` sérialisé en ISO 8601 **avec millisecondes**, UTC (`2026-10-19T14:32:05.120Z`) : `formatDate()` affiche les ms.
- Tri sur la colonne demandée, puis par `id` en dédoublonneur (même sens que `ordre`) ; `timestamp` chronologique, les autres colonnes en ordre lexicographique.
- `payload` renvoyé comme objet JSON (le dashboard fait `JSON.stringify(payload, null, 2)`).
- `description` peut être vide/null → le front affiche `—`.

Format d'erreur commun : JSON avec un champ `message` (le front lit `data.message || data.error`). Pas de `nom`, `email`, `iban`, `date_naissance`, `region` dans les réponses : les bugs ne portent que le pseudonyme (cloisonnement nominatif).

## Architecture de l'API Java

Spring Boot 4 / Java 21, base de code existante `fr.kapture.api` (un seul module Maven : `api/`).

```
api/src/main/java/fr/kapture/api/
├── ApiApplication.java
├── controller/
│   └── BugController.java          # les 2 routes, délègue au service
├── dto/
│   ├── BugRequest.java             # corps du POST + validations Jakarta
│   ├── BugResponse.java            # les 8 champs du bug
│   └── PageResponse.java           # { total, page, taille, resultats[] }
├── entity/
│   ├── Testeur.java                # table testeur (jamais exposée)
│   ├── Appariement.java            # @OneToOne Testeur (clé partagée id_testeur)
│   ├── Session.java                # @ManyToOne Appariement (pseudonyme)
│   └── Evenement.java              # @ManyToOne Session + Appariement = un bug
├── repository/
│   ├── TesteurRepository.java
│   ├── AppariementRepository.java
│   ├── SessionRepository.java
│   └── EvenementRepository.java    # filtres dynamiques (Specification ou @Query)
├── service/
│   └── BugService.java             # validation métier, tri, pagination
└── exception/
    ├── RequeteInvalideException.java   # → 400
    ├── RessourceIntrouvableException.java  # → 404
    └── GlobalExceptionHandler.java     # corps { "message": "…" }
```

Répartition des responsabilités :

| Couche | Rôle |
| --- | --- |
| `BugController` | mapping HTTP, rien d'autre : `@PostMapping("/api/sessions/{id}/bugs")`, `@GetMapping("/api/bugs")` |
| `BugRequest` | `@NotBlank` sur `titre`, `id_utilisateur`, `timestamp` ; `@Size(max = 500)` sur `description` ; validation objet pour `payload` |
| `BugService` | récupère la session (404 si absente) et l'appariement du pseudonyme (400 si inconnu), les associe à l'événement, contrôle des listes fermées (`titre`, `type_bug`), parsage du `timestamp`, construction de la `PageResponse` |
| `EvenementRepository` | filtres optionnels cumulés + `count` sur la même requête pour `total` |
| `GlobalExceptionHandler` | traduit les exceptions en `{"message": …}` avec les bons status (400/404), y compris les erreurs de désérialisation JSON |

Choix d'implémentation conseillés :

- **Enums** `TitreBug` (`BUG1`…`BUG5`) et `TypeBug` (7 valeurs) pour les listes fermées ; sérialisés en texte.
- **Associations JPA** (liens réels, pas de colonnes FK brutes) : `Evenement → Session` et `Evenement → Appariement` en `@ManyToOne`, `Session → Appariement` en `@ManyToOne` sur la colonne unique `pseudonyme`, `Appariement → Testeur` en `@OneToOne` à clé partagée. Le DTO se déduit par navigation : `bug.getSession().getId()` → `session_id`, `bug.getUtilisateur().getPseudonyme()` → `id_utilisateur`. Fetch `LAZY` partout ; pour la liste, une projection DTO en JPQL (une seule requête, pas de N+1).
- **`timestamp`** : `Instant` côté Java, colonne `DATETIME(3)`, sérialisation Jackson ISO avec ms (comportement par défaut de Spring Boot).
- **`payload`** : `JsonNode` (Jackson 3 sous Boot 4 : `tools.jackson.databind.JsonNode`) + `@JdbcTypeCode(SqlTypes.JSON)` sur l'entité, colonne `JSON`.
- **Tri + filtres** : `JpaSpecificationExecutor<Evenement>` (souple pour des filtres optionnels) ou une `@Query` avec paramètres nullable + `countQuery`.
- **`ddl-auto`** : le schéma vient de `db/init/01-schema.sql` ; garder `update` ou passer à `validate` pour éviter toute divergence.

## Points d'attention

- **Dépendance manquante** : `pom.xml` n'a pas `spring-boot-starter-validation` (nécessaire pour `jakarta.validation` sur les DTO).
- **Pas de CORS** : le front parle à Nginx, qui relaie `/api/*` vers `api:8080` (même origine).
- **Seed** : `db/init/02-seed.sql` crée les pseudos (`Storm_X9`, `Nova_K42`, `Echo_R7`, `Vortex_B3`, `Cipher_M8`, `Drift_Z5`) et les sessions 41 à 48. Le popup de démo propose par défaut `session=1`, qui n'existe pas en base : renseigner une session du seed (ex. `42`) pour tester l'insertion.
- **Mode démo du front** : `USE_MOCK = true` dans `front/public/js/shared.js` coupe tous les appels réseau ; le passer à `false` pour brancher le backend.
