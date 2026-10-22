package fr.kapture.api.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import fr.kapture.api.entity.Session;

/**
 * Repository des sessions de jeu (table {@code session}). Sert à valider le
 * {@code id} de session d'un bug ({@code existsById} hérité → « Session
 * inconnue. » en 404).
 */
public interface SessionRepository extends JpaRepository<Session, Integer> {
}
