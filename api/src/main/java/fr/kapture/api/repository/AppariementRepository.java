package fr.kapture.api.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import fr.kapture.api.entity.Appariement;

/**
 * Repository de la correspondance testeur ↔ pseudonyme (table
 * {@code appariement}). Sert à valider le {@code id_utilisateur} d'un bug et à
 * l'associer à l'événement.
 */
public interface AppariementRepository extends JpaRepository<Appariement, Integer> {

    /** Recherche par pseudonyme ; absente → « Pseudonyme inconnu. » (400). */
    Optional<Appariement> findByPseudonyme(String pseudonyme);
}
