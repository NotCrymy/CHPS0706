package fr.kapture.api.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import fr.kapture.api.entity.Testeur;

/**
 * Repository des testeurs (table {@code testeur}).
 *
 * <p>Aucun usage aujourd'hui : le cloisonnement interdit de renvoyer les
 * données nominatives, et les bugs ne portent que le pseudonyme. Conservé
 * pour les évolutions prévues ({@code POST /api/testeurs}, accès sécurisé pour
 * la rémunération — {@code @TODO} dans {@link Testeur}).</p>
 */
public interface TesteurRepository extends JpaRepository<Testeur, Integer> {
}
