# KAPTURE FAIRPLAY Analytics — POC

Projet de l'équipe **Maki**. POC : insertion de bugs par API dans une base cloisonnée, puis consultation filtrée et triée. Détails dans [Specs.md](Specs.md).

| Brique | Techno | Dossier |
| --- | --- | --- |
| Backend | Java 21 / Spring Boot | `api/` |
| Base de données | MariaDB (+ Adminer) | `docker-compose.yml` |
| Front-office | HTML / CSS / JS + Nginx | `front/` (à venir) |

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

# 2. Base de données (+ Adminer)
docker compose pull
docker compose up -d

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

## Commandes utiles

| Commande | Effet |
| --- | --- |
| `docker compose ps` | État des conteneurs |
| `docker compose logs -f db` | Logs de la base |
| `docker compose down` | Arrête les conteneurs |
| `docker compose down -v` | Arrête **et supprime les données** de la base |
| `./mvnw test` | Lance les tests (depuis `api/`) |
| `./mvnw clean package` | Construit le jar dans `api/target/` |
