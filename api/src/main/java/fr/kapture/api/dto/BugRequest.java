package fr.kapture.api.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import tools.jackson.databind.JsonNode;

/**
 * Corps de {@code POST /api/sessions/{id}/bugs} : un bug à insérer.
 *
 * <p>Contrat v1 (voir {@code API.md}) : clés JSON en français snake_case,
 * alignées sur les colonnes de la base. Les règles de format sont déclarées
 * ici (Jakarta Bean Validation) et déclenchées par {@code @Valid} dans le
 * contrôleur ; les messages, en français, sont affichés tels quels au
 * joueur.</p>
 *
 * <p>Les vérifications sémantiques (catégorie connue, existence du
 * pseudonyme, parsage du {@code timestamp}, forme du {@code payload}) sont
 * faites par le service.</p>
 */
public record BugRequest(

        /** Libellé du bug rencontré, texte libre (les titres {@code BUG1} … {@code BUG5} ne sont qu'une convention d'analyse du POC). */
        @NotBlank(message = "Le titre est obligatoire.")
        @Size(max = 100, message = "Le titre ne doit pas dépasser 100 caractères.")
        @JsonProperty("titre") String titre,

        /** Pseudonyme du testeur, jamais le nominatif. */
        @NotBlank(message = "Le pseudonyme est obligatoire.")
        @Size(max = 30, message = "Le pseudonyme ne doit pas dépasser 30 caractères.")
        @JsonProperty("id_utilisateur") String idUtilisateur,

        /** Précision éventuelle. */
        @Size(max = 500, message = "La description ne doit pas dépasser 500 caractères.")
        @JsonProperty("description") String description,

        /** État du jeu au moment du bug : objet JSON, stocké tel quel. */
        @NotNull(message = "Le payload est obligatoire.")
        @JsonProperty("payload") JsonNode payload,

        /** Instant de l'événement, ISO 8601 avec millisecondes (fourni par le client). */
        @NotBlank(message = "Le timestamp est obligatoire.")
        @JsonProperty("timestamp") String timestamp,

        /** Catégorie : {@link TypeBug}. */
        @NotBlank(message = "La catégorie est obligatoire.")
        @JsonProperty("type_bug") String typeBug

) {
}
