# KAPTURE — contrat API v1 & architecture du backend

Contrat de l'API Java. Le front actuel (`front/`) est un POC avec des données factices, voué à être remplacé par une autre stack : **ce document fait foi**. Il complète `Specs.md` (qui décrit le POC).

## Standards retenus pour la v1

| Sujet | Choix |
| --- | --- |
| Clés JSON | **français snake_case**, mêmes noms que les colonnes de la base (`titre`, `id_utilisateur`, `type_bug`…) |
| Erreurs | `{"message": "..."}` avec le status HTTP adapté (`400` / `404`) |
| Messages d'erreur | en français, affichés tels quels au joueur |
| Dates | ISO 8601 UTC avec millisecondes, ex. `2026-10-19T14:32:05.120Z` |
| Validation | Jakarta Bean Validation (`@Valid` dans le contrôleur) |
| Pagination | `{ total, page, taille, resultats }` |

## Routes à faire

Deux routes, préfixées `/api`, JSON uniquement. **Aucune autre route** : pas de création de session ni de testeur (gérés par `db/init/02-seed.sql`), pas de route `/end`, pas d'authentification.

### 1. `POST /api/sessions/{id}/bugs` — insérer un bug

```json
{
  "titre": "BUG1",
  "id_utilisateur": "Storm_X9",
  "description": "Le joueur traverse le mur nord",
  "payload": { "niveau": 3, "position": { "x": 120, "y": 48 } },
  "timestamp": "2026-10-19T14:32:05.120Z",
  "type_bug": "MAP"
}
```

| Élément | Règle | Erreur |
| --- | --- | --- |
| `{id}` (path) | entier > 0, session existante | `404` « Session inconnue. » |
| `titre` | obligatoire, texte libre, 100 caractères max | `400` « Le titre est obligatoire. » / « Le titre ne doit pas dépasser 100 caractères. » |
| `type_bug` | obligatoire, ∈ `MAP`, `AUTRE_JOUEUR`, `GRAPHIQUE`, `SON`, `INTERFACE`, `PERFORMANCE`, `AUTRE` | `400` « La catégorie est obligatoire. » / « Catégorie inconnue. » |
| `id_utilisateur` | obligatoire, 30 caractères max, pseudonyme existant (`appariement`) | `400` « Le pseudonyme est obligatoire. » / « Pseudonyme inconnu. » |
| `timestamp` | obligatoire, date ISO 8601 parsable | `400` « Le timestamp est obligatoire. » / « Timestamp invalide. » |
| `description` | optionnelle, 500 caractères max | `400` « La description ne doit pas dépasser 500 caractères. » |
| `payload` | obligatoire, objet JSON non-null (jamais un tableau) | `400` « Le payload est obligatoire. » / « Le payload doit être un objet JSON. » |

Réponses :

| Cas | Status | Corps |
| --- | --- | --- |
| Créé | `201` | `{ "id": 128 }` |
| Session inconnue | `404` | `{ "message": "Session inconnue." }` |
| Donnée invalide | `400` | `{ "message": "…" }` |

Les messages de format proviennent de Jakarta (`BugRequest`), les messages sémantiques du `BugService`. Le `payload` est stocké **tel quel** : le client peut y ajouter ce qu'il veut (le popup POC y glisse une clé `comportement`) — aucun schéma interne n'est imposé.

### 2. `GET /api/bugs` — liste filtrée, triée, paginée

Paramètres tous optionnels et cumulables :

| Param | Exemple | Effet | Défaut |
| --- | --- | --- | --- |
| `type_bug` | `MAP` | filtre par catégorie (égalité exacte) | — |
| `titre` | `BUG2` | filtre par libellé (égalité exacte) | — |
| `id_utilisateur` | `Storm_X9` | filtre par pseudonyme (égalité exacte) | — |
| `session_id` | `42` | filtre par session (égalité exacte) | — |
| `depuis` / `jusqu_a` | `2026-10-19T00:00:00Z` | bornes inclusives sur `timestamp` | — |
| `tri` | | ∈ `timestamp`, `titre`, `type_bug`, `id_utilisateur` | `timestamp` |
| `ordre` | | ∈ `asc`, `desc` | `desc` |
| `page` | | entier ≥ 0 | `0` |
| `taille` | | entier 1…200 | `50` |

Paramètre invalide → `400 {"message": "…"}` : « Paramètre de tri invalide : … », « Ordre de tri invalide : … », « Pagination invalide (taille max : 200). »

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

Détails du contrat :

- `total` = nombre de lignes **après filtres, avant pagination** (le client en déduit le nombre de pages).
- `page` et `taille` sont **renvoyés échoés**.
- `resultats` contient la tranche `page * taille` → `(page+1) * taille` ; une page vide est acceptable.
- Chaque bug porte exactement les 8 champs ci-dessus.
- `timestamp` en ISO 8601 avec millisecondes, UTC.
- Tri sur la colonne demandée, puis par `id` en dédoublonneur (même sens que `ordre`) ; `timestamp` chronologique, les autres colonnes en ordre lexicographique.
- `payload` renvoyé comme objet JSON ; `description` peut être vide (le client affiche alors un tiret).

## Format des erreurs

Un seul format, quel que soit le cas :

```json
{ "message": "Le titre est obligatoire." }
```

Les réponses ne contiennent **jamais** de données nominatives (`testeur.nom`, `email`, `iban`, `date_naissance`, `region`) : les bugs ne portent que le pseudonyme (cloisonnement).

## Architecture de l'API Java

Spring Boot 4 / Java 21, base de code existante `fr.kapture.api` (un seul module Maven : `api/`).

```
api/src/main/java/fr/kapture/api/
├── ApiApplication.java
├── controller/
│   └── BugController.java          # les 2 routes, délègue au service
├── dto/
│   ├── TypeBug.java                # enum : les 7 catégories
│   ├── BugRequest.java             # corps du POST + validations Jakarta
│   ├── BugResponse.java            # les 8 champs du bug
│   └── PageResponse.java           # { total, page, taille, resultats }
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
| `BugController` | mapping HTTP, rien d'autre : `@PostMapping("/api/sessions/{id}/bugs")`, `@GetMapping("/api/bugs")` — `@Valid` sur le corps du POST |
| `BugRequest` | règles de format avec leurs messages : `@NotBlank` sur `titre`, `id_utilisateur`, `timestamp`, `type_bug` ; `@Size` (100 / 30 / 500) ; `@NotNull` sur `payload` |
| `BugService` | récupère la session (404 si absente) et l'appariement du pseudonyme (400 si inconnu), les associe à l'événement, contrôle la catégorie `type_bug` (liste fermée), parsage du `timestamp`, forme du `payload`, tri + pagination, construction de la `PageResponse` |
| `EvenementRepository` | filtres optionnels cumulés + `count` sur la même requête pour `total` |
| `GlobalExceptionHandler` | traduit les exceptions en `{"message": …}` avec les bons status (400/404) : violations Jakarta, erreurs de désérialisation JSON, exceptions métier |

Choix d'implémentation conseillés :

- **Enum** `TypeBug` (7 valeurs) pour la catégorie, sérialisée en texte. `titre` est un **libellé libre** (≤ 100 caractères) : le dictionnaire `BUG1`…`BUG5` n'est qu'une convention d'analyse du POC (avantageux / désavantageux / neutre), pas une contrainte d'API.
- **Clés JSON snake_case** : les composants des records sont en camelCase (`idUtilisateur`) et portent `@JsonProperty("id_utilisateur")` ; un seul vocabulaire, de la colonne SQL au champ JSON.
- **Associations JPA** (liens réels, pas de colonnes FK brutes) : `Evenement → Session` et `Evenement → Appariement` en `@ManyToOne`, `Session → Appariement` en `@ManyToOne` sur la colonne unique `pseudonyme`, `Appariement → Testeur` en `@OneToOne` à clé partagée. Le DTO se déduit par navigation (`BugResponse.depuis`). Fetch `LAZY` partout ; pour la liste, une requête anti N+1 (`EntityGraph` ou `join fetch`).
- **`timestamp`** : `Instant` côté Java, colonne `DATETIME(3)`, sérialisation Jackson ISO avec ms (comportement par défaut de Spring Boot).
- **`payload`** : `JsonNode` (Jackson 3 sous Boot 4 : `tools.jackson.databind.JsonNode`) + `@JdbcTypeCode(SqlTypes.JSON)` sur l'entité, colonne `JSON`.
- **Tri + filtres** : `JpaSpecificationExecutor<Evenement>` (souple pour des filtres optionnels) ou une `@Query` avec paramètres nullable + `countQuery`.
- **`ddl-auto`** : le schéma vient de `db/init/01-schema.sql` ; garder `update` ou passer à `validate` pour éviter toute divergence.

## Points d'attention

- **Front POC** : le contrat v1 reprend ses clés (`id_utilisateur`, `resultats`, `taille`…) — il se branche tel quel avec `USE_MOCK = false`, sans modification.
- **Pas de CORS** : le front parle à Nginx, qui relaie `/api/*` vers `api:8080` (même origine).
- **Seed** : `db/init/02-seed.sql` crée les pseudos (`Storm_X9`, `Nova_K42`, `Echo_R7`, `Vortex_B3`, `Cipher_M8`, `Drift_Z5`) et les sessions 41 à 48. Le popup POC propose par défaut `session=1`, qui n'existe pas en base : renseigner une session du seed (ex. `42`) pour tester l'insertion.
- **Mode démo du front** : `USE_MOCK = true` dans `front/public/js/shared.js` coupe tous les appels réseau.

## Évolutions prévues (hors POC)

Relevées comme `@TODO` dans les entités, à ne pas confondre avec le contrat v1 :

- `POST /api/sessions` — créer des sessions pour les testeurs (aujourd'hui créées par `db/init/02-seed.sql` uniquement).
- `POST /api/testeurs` — créer des testeurs pour les sessions ; prévoir aussi un accès sécurisé et privé aux données nominatives pour la rémunération.
