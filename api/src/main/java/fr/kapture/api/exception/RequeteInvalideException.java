package fr.kapture.api.exception;

/**
 * Règle métier violée par la requête → réponse {@code 400}.
 * Le message est celui affiché au client (contrat {@code API.md}).
 */
public class RequeteInvalideException extends RuntimeException {

    public RequeteInvalideException(String message) {
        super(message);
    }
}
