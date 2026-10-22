package fr.kapture.api.exception;

/**
 * Ressource visée inexistante → réponse {@code 404}.
 * Le message est celui affiché au client (contrat {@code API.md}).
 */
public class RessourceIntrouvableException extends RuntimeException {

    public RessourceIntrouvableException(String message) {
        super(message);
    }
}
