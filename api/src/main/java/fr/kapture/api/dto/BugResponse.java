package fr.kapture.api.dto;

import java.time.Instant;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonProperty;

import fr.kapture.api.entity.Evenement;
import tools.jackson.databind.JsonNode;

/**
 * Un bug tel que renvoyé par l'API (contrat v1 : clés JSON en français
 * snake_case, alignées sur les colonnes de la base). Ne contient que les
 * champs autorisés : jamais de données nominatives du testeur.
 */
public record BugResponse(

        @JsonProperty("id") Long id,

        @JsonProperty("session_id") Integer sessionId,

        @JsonProperty("titre") String titre,

        @JsonProperty("id_utilisateur") String idUtilisateur,

        /** Jamais null : le client affiche un tiret si vide. */
        @JsonProperty("description") String description,

        @JsonProperty("payload") JsonNode payload,

        /** ISO 8601 UTC, millisecondes toujours présentes : {@code 2026-10-19T14:32:05.120Z}. */
        @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", timezone = "UTC")
        @JsonProperty("timestamp") Instant timestamp,

        @JsonProperty("type_bug") String typeBug

) {

    /** Conversion depuis l'entité, par navigation dans les associations. */
    public static BugResponse depuis(Evenement evenement) {
        return new BugResponse(
                evenement.getId(),
                evenement.getSession().getId(),
                evenement.getTitre(),
                evenement.getUtilisateur().getPseudonyme(),
                evenement.getDescription() == null ? "" : evenement.getDescription(),
                evenement.getPayload(),
                evenement.getTimestamp(),
                evenement.getTypeBug());
    }
}
