# Spécification POC — KAPTURE FAIRPLAY Analytics

Oct 19, 2026 · @Melvin

## Objet et périmètre

Le POC prouve deux choses sur une seule instance locale : l'insertion de bugs par API dans une base cloisonnée, et leur consultation filtrée et triée. Il n'y a pas de jeu de démo : les bugs sont envoyés par un script de seed ou une collection Postman.

| Inclus | Exclu |
| --- | --- |
| Deux routes API : insérer un bug, consulter les bugs | Jeu de démo |
| Mini base de données (4 tables) | Classement et export |
| Page minimaliste listant les bugs | Multi-site, console admin, replays |
|  | Rémunération, authentification poussée |

## Les 3 stacks

Chaque brique tourne dans son propre conteneur Docker, tous orchestrés par un seul `docker-compose.yml`.

| Brique | Technologie | Rôle dans le POC |
| --- | --- | --- |
| Backend | Java 21 / Spring Boot 3 (Spring Web, Spring Data JPA, Validation) | API REST : insertion et consultation des bugs |
| Base de données | MariaDB 11 | Stockage cloisonné : nominatif, appariement, sessions, bugs |
| Front-office | HTML / CSS / JavaScript sans framework, servi par Nginx | Page externe à l'API : liste des bugs avec filtres et tri |

Nginx sert aussi de reverse proxy : les appels `/api/*` du front sont redirigés vers le backend. Le navigateur ne parle qu'à une seule origine, ce qui évite toute configuration CORS.

## Architecture du dépôt GitHub

Un seul dépôt (monorepo) contient les trois briques : un `git clone` puis un `docker compose up` suffisent pour lancer tout le POC. Chaque brique a son dossier et son propre Dockerfile.

```
kapture-poc/
├── README.md                    # présentation + démarrage rapide
├── docker-compose.yml           # orchestre db, api, front
├── .env.example                 # variables à copier en .env
├── .gitignore
├── .github/
│   └── workflows/
│       └── ci.yml               # build Maven + tests, build des 3 images
│
├── api/                         # BRIQUE 1 : Spring Boot
│   ├── Dockerfile
│   ├── pom.xml
│   ├── mvnw, .mvn/
│   └── src/
│       ├── main/
│       │   ├── java/fr/maki/kapture/
│       │   │   ├── KaptureApplication.java
│       │   │   ├── controller/  # BugController (POST et GET)
│       │   │   ├── dto/         # BugRequest, BugResponse, PageResponse
│       │   │   ├── entity/      # Testeur, Appariement, Session, Evenement
│       │   │   ├── repository/  # repositories JPA + filtres dynamiques
│       │   │   ├── service/     # BugService : validation, tri, pagination
│       │   │   └── exception/   # GlobalExceptionHandler (400, 404)
│       │   └── resources/
│       │       └── application.yml
│       └── test/java/fr/maki/kapture/
│           └── BugControllerTest.java
│
├── front/                       # BRIQUE 2 : page HTML externe
│   ├── Dockerfile
│   ├── nginx.conf               # sert public/ + proxy /api vers api:8080
│   └── public/
│       ├── index.html
│       ├── css/style.css
│       └── js/app.js            # appels GET /api/bugs, filtres, tri, pagination
│
├── db/                          # BRIQUE 3 : MariaDB
│   └── init/
│       ├── 01-schema.sql
│       └── 02-seed.sql
│
└── postman/
    └── kapture-poc.postman_collection.json   # insertion de bugs de test
```

**api/Dockerfile** (build en deux étapes, l'image finale ne contient que le JRE)

```
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn -q package -DskipTests

FROM eclipse-temurin:21-jre
COPY --from=build /app/target/*.jar /app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app.jar"]
```

**front/Dockerfile et nginx.conf**

```
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY public /usr/share/nginx/html
```

```
server {
  listen 80;
  root /usr/share/nginx/html;

  location /api/ {
    proxy_pass http://api:8080;
  }
}
```

La page n'est jamais servie par Spring Boot. Nginx la sert et relaie les appels `/api/` vers le backend : la page et l'API partagent la même origine, donc aucune configuration CORS n'est nécessaire.

**Conventions Git**

- `main` protégée : on y fusionne uniquement par pull request, relue par un autre membre.
- Une branche par tâche : `feature/<sujet>`, `fix/<sujet>`.
- La CI (`ci.yml`) doit passer avant toute fusion.

## Ports utilisés

| Service | Conteneur | Port hôte | Port conteneur | URL locale |
| --- | --- | --- | --- | --- |
| Front-office (Nginx) | `front` | 8081 | 80 | http://localhost:8081 |
| API Spring Boot | `api` | 8080 | 8080 | http://localhost:8080/api |
| MariaDB | `db` | 3306 | 3306 | `jdbc:mariadb://localhost:3306/kapture` |

Entre conteneurs, les services se joignent par leur nom : l'API se connecte à `db:3306`, Nginx redirige vers `api:8080`. Si le port 3306 est déjà pris sur une machine (MariaDB ou MySQL local), on change seulement le port hôte, par exemple `3307:3306`.

## Démarrage avec Docker

Une seule commande lance les trois services. Prérequis : Docker et Docker Compose v2.

Le fichier `docker-compose.yml` se trouve à la racine du dépôt (voir l'architecture ci-dessus).

**docker-compose.yml**

```yaml
services:
  db:
    image: mariadb:11
    environment:
      MARIADB_DATABASE: kapture
      MARIADB_USER: ${DB_USER}
      MARIADB_PASSWORD: ${DB_PASSWORD}
      MARIADB_ROOT_PASSWORD: ${DB_ROOT_PASSWORD}
    ports:
      - "3306:3306"
    volumes:
      - db-data:/var/lib/mysql
      - ./db/init:/docker-entrypoint-initdb.d
    healthcheck:
      test: ["CMD", "healthcheck.sh", "--connect", "--innodb_initialized"]
      interval: 5s
      retries: 10

  api:
    build: ./api
    environment:
      SPRING_DATASOURCE_URL: jdbc:mariadb://db:3306/kapture
      SPRING_DATASOURCE_USERNAME: ${DB_USER}
      SPRING_DATASOURCE_PASSWORD: ${DB_PASSWORD}
    ports:
      - "8080:8080"
    depends_on:
      db:
        condition: service_healthy

  front:
    build: ./front
    ports:
      - "8081:80"
    depends_on:
      - api

volumes:
  db-data:
```

**.env** (non versionné, un `.env.example` est fourni)

```
DB_USER=kapture
DB_PASSWORD=changeme
DB_ROOT_PASSWORD=changeme-root
```

**Commandes**

| Action | Commande |
| --- | --- |
| Construire et lancer | `docker compose up -d --build` |
| Suivre les logs de l'API | `docker compose logs -f api` |
| Arrêter | `docker compose down` |
| Repartir d'une base vide (rejoue le schéma et le seed) | `docker compose down -v` puis `up -d --build` |

Les scripts de `db/init/` ne s'exécutent qu'au premier démarrage du volume. Toute modification du schéma demande donc un `down -v`.

## Routes API

> **Note** : le contrat exact de l'API v1 (clés JSON ci-dessous, validation Jakarta, messages d'erreur en français) est figé dans [`API.md`](API.md), qui fait foi pour l'implémentation.

Deux routes sont retenues. Toutes deux sont préfixées par `/api` et échangent du JSON.

| Méthode | Route | Rôle | Réponse |
| --- | --- | --- | --- |
| POST | `/api/sessions/{id}/bugs` | Insère un bug pour une session existante | `201` + id du bug · `404` session inconnue · `400` payload invalide |
| GET | `/api/bugs` | Liste les bugs, avec filtres, tri et pagination | `200` + liste paginée · `400` paramètre invalide |

**Format d'un événement**

Chaque appel à `POST /api/sessions/{id}/bugs` porte les six champs suivants, tous obligatoires sauf la description.

| Champ JSON | Type | Valeurs | Rôle |
| --- | --- | --- | --- |
| `titre` | texte libre, 100 caractères max | ex. `BUG1` à `BUG5` | Libellé du bug rencontré, choisi par le testeur |
| `id_utilisateur` | texte | pseudonyme du testeur | Qui a rencontré le bug, jamais l'id nominatif |
| `description` | texte, 500 caractères max | libre | Précision éventuelle |
| `payload` | objet JSON | libre | État du jeu au moment du bug |
| `timestamp` | date ISO 8601 avec millisecondes | ex. `2026-10-19T14:32:05.120Z` | Instant de l'événement, fourni par le client |
| `type_bug` | texte, liste fermée | voir ci-dessous | Catégorie, choisie par le testeur |

Un payload qui ne respecte pas ce format (champ manquant, catégorie hors liste, `id_utilisateur` inconnu) est rejeté en `400`.

**Titres du POC : dictionnaire d'analyse (non contraignant)**

Les titres ci-dessous servent uniquement à l'analyse avantageux / désavantageux / neutre pendant le POC : `titre` est un libellé libre (100 caractères max) et l'API n'impose pas cette liste.

| Titre | Nature | Effet dans le jeu |
| --- | --- | --- |
| `BUG1` | Avantageux | Le joueur traverse les murs |
| `BUG2` | Désavantageux | Perte d'une vie sans raison |
| `BUG3` | Avantageux | Score doublé pendant 30 secondes |
| `BUG4` | Désavantageux | Commandes inversées pendant 10 secondes |
| `BUG5` | Neutre | Texture manquante sur le décor |

La colonne « Nature » sert uniquement à l'analyse : elle n'est ni stockée avec le bug ni renvoyée par l'API.

**Valeurs de `type_bug`**

| Valeur | Signification |
| --- | --- |
| `MAP` | Décor, collision, zone inaccessible |
| `AUTRE_JOUEUR` | Bug impliquant un autre joueur |
| `GRAPHIQUE` | Affichage, textures, animations |
| `SON` | Son absent, décalé ou en boucle |
| `INTERFACE` | Menus, HUD, boutons |
| `PERFORMANCE` | Ralentissement, gel, plantage |
| `AUTRE` | Tout ce qui ne rentre pas ailleurs |

**Exemple d'appel**

```
POST /api/sessions/42/bugs
{
  "titre": "BUG1",
  "id_utilisateur": "Storm_X9",
  "description": "Le joueur traverse le mur nord",
  "payload": { "niveau": 3, "position": { "x": 120, "y": 48 } },
  "timestamp": "2026-10-19T14:32:05.120Z",
  "type_bug": "MAP"
}
```

**Paramètres de `GET /api/bugs`**

Tous les paramètres sont optionnels et se combinent.

| Paramètre | Exemple | Effet |
| --- | --- | --- |
| `type_bug` | `MAP` | Filtre sur la catégorie |
| `titre` | `BUG1` | Filtre sur le libellé du bug |
| `id_utilisateur` | `Storm_X9` | Filtre sur un pseudonyme |
| `session_id` | `42` | Filtre sur une session |
| `depuis` / `jusqu_a` | `2026-10-19T00:00:00Z` | Bornes sur le `timestamp` |
| `tri` | `timestamp`, `titre`, `type_bug`, `id_utilisateur` | Champ de tri (défaut : `timestamp`) |
| `ordre` | `asc`, `desc` | Sens du tri (défaut : `desc`) |
| `page` / `taille` | `0` / `50` | Pagination (défaut 0 et 50, taille max 200) |

**Exemple**

```
GET /api/bugs?type_bug=MAP&tri=timestamp&ordre=desc&page=0&taille=20

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

La route de fin de session (`/end`) est retirée du POC.

## Modèle de données

Quatre tables, dans `db/init/01-schema.sql`. Le nom, l'email et l'IBAN de `testeur` ne sont jamais renvoyés par l'API : les bugs ne portent que le pseudonyme.

```sql
CREATE TABLE testeur (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  nom             VARCHAR(100) NOT NULL,
  email           VARCHAR(255) NOT NULL,
  iban            VARCHAR(34),
  date_naissance  DATE NOT NULL,
  region          VARCHAR(50) NOT NULL
);

CREATE TABLE appariement (
  id_testeur  INT PRIMARY KEY,
  pseudonyme  VARCHAR(30) NOT NULL UNIQUE,
  FOREIGN KEY (id_testeur) REFERENCES testeur(id)
);

CREATE TABLE session (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  pseudonyme   VARCHAR(30) NOT NULL,
  application  VARCHAR(50) NOT NULL,
  debut        DATETIME(3) NOT NULL,
  FOREIGN KEY (pseudonyme) REFERENCES appariement(pseudonyme)
);

CREATE TABLE evenement (
  id              BIGINT AUTO_INCREMENT PRIMARY KEY,
  session_id      INT NOT NULL,
  titre           VARCHAR(100) NOT NULL,     -- libellé libre (BUG1, BUG2, ... dans le POC)
  id_utilisateur  VARCHAR(30) NOT NULL,      -- pseudonyme
  description     VARCHAR(500),
  payload         JSON,
  timestamp       DATETIME(3) NOT NULL,
  type_bug        VARCHAR(30) NOT NULL,      -- MAP, AUTRE_JOUEUR, ...
  FOREIGN KEY (session_id) REFERENCES session(id),
  FOREIGN KEY (id_utilisateur) REFERENCES appariement(pseudonyme)
);
```

Le script `02-seed.sql` crée les testeurs, leurs pseudonymes et les sessions : il n'y a pas de route de création de session. La route d'insertion de bugs est donc utilisable dès le démarrage.

## Dashboard

Une seule page, sur http://localhost:8081, qui appelle `GET /api/bugs`.

- **Tableau des bugs** : titre, type, pseudonyme, description, timestamp.
- **Filtres** : listes déroulantes pour le type de bug et le titre, champ pour le pseudonyme.
- **Tri** : clic sur un en-tête de colonne, qui passe les paramètres `tri` et `ordre`.
- **Pagination** : boutons précédent / suivant.

## Points ouverts

Aucun point ouvert à ce jour.
