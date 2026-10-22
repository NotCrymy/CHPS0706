# KAPTURE FAIRPLAY Analytics — POC

Projet de l'équipe **Maki**. POC : insertion de bugs par API dans une base cloisonnée, puis consultation filtrée et triée. Détails dans [Specs.md](Specs.md).

| Brique | Techno | Dossier |
| --- | --- | --- |
| Backend | Java 21 / Spring Boot | `api/` |
| Base de données | MariaDB (+ Adminer) | `docker-compose.yml` |
| Front-office | HTML / CSS / JS + Nginx | `front/` |

## Prérequis

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (inclut Docker Compose)
- [JDK 21](https://adoptium.net/temurin/releases/?version=21), pour lancer l'API en local
- Maven : **rien à installer**, le wrapper `./mvnw` est fourni dans `api/`

Extensions VS Code conseillées :

- Extension Pack for Java (`vscjava.vscode-java-pack`)
- Spring Boot Extension Pack (`vmware.vscode-boot-dev-pack`)
- Docker (`ms-azuretools.vscode-docker`)

## Démarrage

```bash
# 1. Variables d'environnement
cp .env.exemple .env        # puis adapter les mots de passe

# 2. Base de données (+ Adminer) et front
docker compose pull
docker compose up -d --build

# 3. API
cd api
./mvnw spring-boot:run      # Windows : mvnw.cmd spring-boot:run
```

L'API écoute sur http://localhost:8080 et lit `../.env` pour se connecter à MariaDB (`localhost:3306`).

### Option : API dans Docker (sans JDK)

Remplace l'étape 3. Le jar est compilé dans le conteneur :

```bash
docker compose --profile api up -d --build
```

Arrêter d'abord l'API locale si elle tourne (port 8080 partagé). Pour tout arrêter : `docker compose --profile api down`.

## Front

| URL | Page | Fichiers |
| --- | --- | --- |
| http://localhost:8081/ | Tableau de bord : liste des bugs, filtres, tri, pagination | `index.html`, `js/dashboard.js` |
| http://localhost:8081/report/?session=1&user=Storm_X9 | Popup de signalement, ouverte par le jeu dans une iframe / webview | `report/index.html`, `js/report.js` |
| http://localhost:8081/demo/ | Jeu factice qui ouvre le popup : sert à tester l'intégration | `demo/index.html`, `js/demo.js` |
| http://localhost:8082/ | Adminer (serveur `db`) | — |

Les deux pages ne partagent que `js/shared.js` (valeurs de la spec, appels API, mock). Le contrat entre le jeu et le popup (`postMessage`) est décrit en tête de `js/report.js`.

**Mode démo.** Tant que l'API n'expose pas les routes, `USE_MOCK = true` dans `js/shared.js` : les bugs sont stockés dans le `localStorage` du navigateur, et un bug envoyé depuis le popup apparaît dans le tableau de bord. Passer à `false` pour appeler `/api/*`, relayé par Nginx vers :

- `api:8080` par défaut (API lancée avec `--profile api`) ;
- `host.docker.internal:8080` si `API_UPSTREAM=host.docker.internal:8080` dans `.env` (API lancée avec `./mvnw`).

Sans Docker : `python -m http.server 8081 --directory front/public` suffit en mode démo.

## Commandes utiles

| Commande | Effet |
| --- | --- |
| `docker compose ps` | État des conteneurs |
| `docker compose logs -f db` | Logs de la base |
| `docker compose down` | Arrête les conteneurs |
| `docker compose down -v` | Arrête **et supprime les données** de la base |
| `./mvnw test` | Lance les tests (depuis `api/`) |
| `./mvnw clean package` | Construit le jar dans `api/target/` |
