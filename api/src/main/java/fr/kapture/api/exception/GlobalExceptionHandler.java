package fr.kapture.api.exception;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

/**
 * Format unique des erreurs (contrat {@code API.md}) :
 * {@code {"message": "…"}} avec le status adapté. Couvre les exceptions
 * métier, les violations Jakarta, les corps JSON illisibles et les paramètres
 * de requête mal typés.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    /** Règle métier violée : 400. */
    @ExceptionHandler(RequeteInvalideException.class)
    public ResponseEntity<Map<String, String>> gererRequeteInvalide(RequeteInvalideException e) {
        return repondre(HttpStatus.BAD_REQUEST, e.getMessage());
    }

    /** Ressource inexistante : 404. */
    @ExceptionHandler(RessourceIntrouvableException.class)
    public ResponseEntity<Map<String, String>> gererRessourceIntrouvable(RessourceIntrouvableException e) {
        return repondre(HttpStatus.NOT_FOUND, e.getMessage());
    }

    /** Violation Jakarta sur le corps de la requête : 400 avec le premier message. */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, String>> gererValidation(MethodArgumentNotValidException e) {
        String message = e.getFieldErrors().stream()
                .findFirst()
                .map(erreur -> erreur.getDefaultMessage())
                .orElse("Requête invalide.");
        return repondre(HttpStatus.BAD_REQUEST, message);
    }

    /** Corps JSON illisible ou champ du mauvais type : 400. */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<Map<String, String>> gererJsonIllisible(HttpMessageNotReadableException e) {
        return repondre(HttpStatus.BAD_REQUEST, "Corps JSON invalide.");
    }

    /** Paramètre de requête mal typé (ex. {@code page=abc}) : 400. */
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<Map<String, String>> gererParametreInvalide(MethodArgumentTypeMismatchException e) {
        return repondre(HttpStatus.BAD_REQUEST, "Paramètre invalide : " + e.getName() + ".");
    }

    private static ResponseEntity<Map<String, String>> repondre(HttpStatus status, String message) {
        return ResponseEntity.status(status).body(Map.of("message", message));
    }
}
