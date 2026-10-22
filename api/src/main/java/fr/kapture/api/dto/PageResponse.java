package fr.kapture.api.dto;

import java.util.List;

/**
 * Réponse paginée de {@code GET /api/bugs} :
 * {@code { total, page, taille, resultats }} (contrat v1).
 *
 * <p>{@code total} compte les lignes après filtres, avant pagination ;
 * {@code page} et {@code taille} sont renvoyés échoés.</p>
 *
 * @param <T> type des éléments de la page (ici {@link BugResponse})
 */
public record PageResponse<T>(

        long total,

        int page,

        int taille,

        List<T> resultats

) {
}
