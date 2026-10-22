package fr.kapture.api.repository;

import java.time.Instant;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import fr.kapture.api.entity.Evenement;

/**
 * Repository des bugs (table {@code evenement}).
 *
 * <p>{@link #chercher} porte la liste filtrée, triée et paginée de
 * {@code GET /api/bugs}. Une seule requête, avec {@code join fetch} sur les
 * associations pour éviter le N+1 ; le tri sur {@code id_utilisateur} passe
 * par la propriété {@code utilisateur.pseudonyme}. Tous les filtres sont
 * optionnels (paramètre {@code null} = filtre ignoré). {@code total} vient de
 * la {@code countQuery}, comptée après filtres et avant pagination.</p>
 */
public interface EvenementRepository extends JpaRepository<Evenement, Long> {

    @Query(value = """
            select e from Evenement e
            join fetch e.session s
            join fetch e.utilisateur u
            where (:typeBug is null or e.typeBug = :typeBug)
              and (:titre is null or e.titre = :titre)
              and (:utilisateur is null or u.pseudonyme = :utilisateur)
              and (:sessionId is null or s.id = :sessionId)
              and (:depuis is null or e.timestamp >= :depuis)
              and (:jusquA is null or e.timestamp <= :jusquA)
            """,
            countQuery = """
            select count(e) from Evenement e
            join e.session s
            join e.utilisateur u
            where (:typeBug is null or e.typeBug = :typeBug)
              and (:titre is null or e.titre = :titre)
              and (:utilisateur is null or u.pseudonyme = :utilisateur)
              and (:sessionId is null or s.id = :sessionId)
              and (:depuis is null or e.timestamp >= :depuis)
              and (:jusquA is null or e.timestamp <= :jusquA)
            """)
    Page<Evenement> chercher(
            @Param("typeBug") String typeBug,
            @Param("titre") String titre,
            @Param("utilisateur") String utilisateur,
            @Param("sessionId") Integer sessionId,
            @Param("depuis") Instant depuis,
            @Param("jusquA") Instant jusquA,
            Pageable pageable);
}
