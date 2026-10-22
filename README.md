# KAPTURE FAIRPLAY Analytics — POC

Projet de l'équipe **Maki**. POC : insertion de bugs par API dans une base cloisonnée, puis consultation filtrée et triée. Détails dans [Specs.md](Specs.md), contrat de l'API dans [API.md](API.md).

| Brique | Techno | Dossier |
| --- | --- | --- |
| Backend | Java 21 / Spring Boot | `api/` |
| Base de données | MariaDB (+ Adminer) | `docker-compose.yml` |
| Front-office | HTML / CSS / JS + Nginx | `front/` |

## Prérequis

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (inclut Docker Compose)
- [JDK 21](https://adoptium.net/temurin/releases/?version=21), **uniquement en mode dev** (en prod, le jar est compilé dans Docker)
- Maven : **rien à installer**, le wrapper `./mvnw` est fourni dans `api/`

Extensions VS Code conseillées :

- Extension Pack for Java (`vscjava.vscode-java-pack`)
- Spring Boot Extension Pack (`vmware.vscode-boot-dev-pack`)
- Docker (`ms-azuretools.vscode-docker`)

## Démarrage rapide (prod)

```bash
cp .env.exemple .env                      # adapter les mots de passe
docker compose --profile api up -d --build
```

Tout tourne dans Docker : MariaDB, l'API, le front (Nginx) et Adminer.

| URL | Page |
| --- | --- |
| http://localhost:8081/ | Tableau de bord : liste des bugs, filtres, tri, pagination |
| http://localhost:8081/report/?session=42&user=Storm_X9 | Popup de signalement (ouverte par le jeu) |
| http://localhost:8081/demo/ | Jeu factice qui ouvre le popup : test d'intégration |
| http://localhost:8080/api/bugs | API (JSON) |
| http://localhost:8082/ | Adminer (exploration de la base) |

> Les sessions de test sont les **41 à 48** (`db/init/02-seed.sql`). Le champ Session de la page `/demo/` propose `1` par défaut : le remplacer par `42`.

## Mode dev vs mode prod

Un seul réglage : `API_UPSTREAM` dans `.env` indique à Nginx à qui relayer les appels `/api/*`.

| | **Prod** (tout Docker) | **Dev** (API en local) |
| --- | --- | --- |
| API | conteneur `api` | `./mvnw spring-boot:run` (JDK 21) |
| `API_UPSTREAM` | `api:8080` (défaut) | `host.docker.internal:8080` |
| Démarrage | `docker compose --profile api up -d --build` | `docker compose up -d` + `cd api && ./mvnw spring-boot:run` |
| Après un changement Java | rebuild de l'image (~1 min) | relancer Maven (~3 s) |

### Prod — tout Docker

```bash
docker compose --profile api up -d --build   # à relancer après un changement dans api/
```

Le build est en deux étapes (`api/Dockerfile`) : Maven compile le jar dans une image de build, l'image finale ne contient que le JRE. Les dépendances Maven forment une couche de cache : modifier une classe ne re-télécharge rien.

### Dev — API en local

```bash
# 1. le front vise l'API locale
Dans `.env` : `API_UPSTREAM=host.docker.internal:8080`
docker compose up -d --force-recreate front

# 2. l'API, à relancer à chaque changement (Ctrl-C puis relancer)
cd api && ./mvnw spring-boot:run             # Windows : mvnw.cmd spring-boot:run
```

L'API lit `../.env` pour se connecter à MariaDB (`localhost:3306`).

**Port 8080 partagé** : un seul des deux peut tourner à la fois — arrêter le conteneur (`docker compose stop api`) avant de lancer `./mvnw`, et inversement. Pour repasser en prod : `docker compose --profile api up -d` (le front reprend `api:8080` après un `docker compose up -d --force-recreate front` si `API_UPSTREAM` a changé).

## Front

| URL | Page | Fichiers |
| --- | --- | --- |
| http://localhost:8081/ | Tableau de bord : liste des bugs, filtres, tri, pagination | `index.html`, `js/dashboard.js` |
| http://localhost:8081/report/?session=42&user=Storm_X9 | Popup de signalement, ouverte par le jeu dans une iframe / webview | `report/index.html`, `js/report.js` |
| http://localhost:8081/demo/ | Jeu factice qui ouvre le popup : sert à tester l'intégration | `demo/index.html`, `js/demo.js` |

Les deux pages ne partagent que `js/shared.js` (valeurs de la spec, appels API, mock). Le contrat entre le jeu et le popup (`postMessage`) est décrit en tête de `js/report.js`.

**Mode démo (sans API).** `USE_MOCK = true` dans `js/shared.js` : les bugs sont stockés dans le `localStorage` du navigateur, et un bug envoyé depuis le popup apparaît dans le tableau de bord. L'API existante étant branchée, `USE_MOCK = false` par défaut : les appels `/api/*` sont relayés par Nginx vers `API_UPSTREAM`. Sans Docker du tout : `python -m http.server 8081 --directory front/public` suffit en mode démo.

## API

Deux routes, JSON uniquement. Contrat complet (champs, paramètres, messages d'erreur) : [API.md](API.md).

| Méthode | Route | Rôle |
| --- | --- | --- |
| `POST` | `/api/sessions/{id}/bugs` | insère un bug → `201` + `{"id": …}`, `404` session inconnue, `400` donnée invalide |
| `GET` | `/api/bugs` | liste filtrée, triée, paginée : `type_bug`, `titre`, `id_utilisateur`, `session_id`, `depuis`, `jusqu_a`, `tri`, `ordre`, `page`, `taille` |

Les erreurs ont un format unique `{"message": "…"}` en français. Cloisonnement : les bugs ne portent que le pseudonyme — les données nominatives de la table `testeur` ne sortent jamais par l'API.

## Commandes utiles

| Commande | Effet |
| --- | --- |
| `docker compose --profile api up -d --build` | Tout lancer, API comprise (en rebuildant) |
| `docker compose up -d` | Lancer db + front + adminer (mode dev, API lancée à part) |
| `docker compose stop api` / `start api` | Libérer / reprendre le port 8080 (bascule dev/prod) |
| `docker compose down` | Arrêter les conteneurs, **les données sont conservées** |
| `docker compose down -v` | Arrêter **et supprimer les données** (rejoue schéma + seed au démarrage) |