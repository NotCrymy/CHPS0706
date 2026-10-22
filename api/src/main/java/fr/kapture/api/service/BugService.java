package fr.kapture.api.service;

import java.time.Instant;
import java.time.format.DateTimeParseException;
import java.util.Map;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import fr.kapture.api.dto.BugRequest;
import fr.kapture.api.dto.BugResponse;
import fr.kapture.api.dto.PageResponse;
import fr.kapture.api.dto.TypeBug;
import fr.kapture.api.entity.Appariement;
import fr.kapture.api.entity.Evenement;
import fr.kapture.api.entity.Session;
import fr.kapture.api.exception.RequeteInvalideException;
import fr.kapture.api.exception.RessourceIntrouvableException;
import fr.kapture.api.repository.AppariementRepository;
import fr.kapture.api.repository.EvenementRepository;
import fr.kapture.api.repository.SessionRepository;

/**
 * Règles métier des bugs : validation sémantique (les messages en français
 * suivent le contrat {@code API.md}), association aux tables liées, tri et
 * pagination.
 */
@Service
@Transactional
public class BugService {

    /** Valeurs acceptées pour {@code tri} → propriété JPA correspondante. */
    private static final Map<String, String> PROPRIETES_TRI = Map.of(
            "timestamp", "timestamp",
            "titre", "titre",
            "type_bug", "typeBug",
            "id_utilisateur", "utilisateur.pseudonyme");

    private static final String MESSAGE_PAGINATION = "Pagination invalide (taille max : 200).";

    private final EvenementRepository evenements;
    private final SessionRepository sessions;
    private final AppariementRepository appariements;

    public BugService(EvenementRepository evenements, SessionRepository sessions,
            AppariementRepository appariements) {
        this.evenements = evenements;
        this.sessions = sessions;
        this.appariements = appariements;
    }

    /** POST /api/sessions/{id}/bugs — crée le bug et renvoie son id. */
    public Long creerBug(Integer idSession, BugRequest requete) {
        Session session = sessions.findById(idSession)
                .orElseThrow(() -> new RessourceIntrouvableException("Session inconnue."));

        if (!TypeBug.estValide(requete.typeBug())) {
            throw new RequeteInvalideException("Catégorie inconnue.");
        }
        Appariement utilisateur = appariements.findByPseudonyme(requete.idUtilisateur())
                .orElseThrow(() -> new RequeteInvalideException("Pseudonyme inconnu."));
        Instant timestamp = parserDate(requete.timestamp(), "Timestamp invalide.");

        // payload : objet JSON uniquement (jamais un tableau ni un scalaire)
        if (requete.payload() == null || !requete.payload().isObject()) {
            throw new RequeteInvalideException("Le payload doit être un objet JSON.");
        }

        Evenement evenement = new Evenement();
        evenement.setSession(session);
        evenement.setUtilisateur(utilisateur);
        evenement.setTitre(requete.titre());
        evenement.setDescription(requete.description() == null ? "" : requete.description());
        evenement.setPayload(requete.payload());
        evenement.setTimestamp(timestamp);
        evenement.setTypeBug(requete.typeBug());
        return evenements.save(evenement).getId();
    }

    /** GET /api/bugs — liste filtrée, triée, paginée. */
    public PageResponse<BugResponse> listerBugs(String typeBug, String titre, String idUtilisateur,
            Integer sessionId, String depuis, String jusquA, String tri, String ordre,
            Integer page, Integer taille) {

        String critere = (tri == null) ? "timestamp" : tri;
        String proprieteTri = PROPRIETES_TRI.get(critere);
        if (proprieteTri == null) {
            throw new RequeteInvalideException("Paramètre de tri invalide : " + critere);
        }
        String sens = (ordre == null) ? "desc" : ordre;
        if (!"asc".equals(sens) && !"desc".equals(sens)) {
            throw new RequeteInvalideException("Ordre de tri invalide : " + sens);
        }
        int numeroPage = (page == null) ? 0 : page;
        int taillePage = (taille == null) ? 50 : taille;
        if (numeroPage < 0 || taillePage < 1 || taillePage > 200) {
            throw new RequeteInvalideException(MESSAGE_PAGINATION);
        }
        Instant depuisInstant = (depuis == null) ? null : parserDate(depuis, "La date de début est invalide.");
        Instant jusquAInstant = (jusquA == null) ? null : parserDate(jusquA, "La date de fin est invalide.");

        // tri sur la colonne demandée, puis par id en dédoublonneur (même sens)
        Sort.Direction direction = Sort.Direction.fromString(sens);
        Sort triFinal = Sort.by(direction, proprieteTri).and(Sort.by(direction, "id"));

        Page<Evenement> pageResultats = evenements.chercher(
                videVersNull(typeBug), videVersNull(titre), videVersNull(idUtilisateur),
                sessionId, depuisInstant, jusquAInstant,
                PageRequest.of(numeroPage, taillePage, triFinal));

        return new PageResponse<>(pageResultats.getTotalElements(), numeroPage, taillePage,
                pageResultats.getContent().stream().map(BugResponse::depuis).toList());
    }

    private static Instant parserDate(String valeur, String messageErreur) {
        try {
            return Instant.parse(valeur);
        } catch (DateTimeParseException e) {
            throw new RequeteInvalideException(messageErreur);
        }
    }

    /** Un filtre vide ou absent est ignoré. */
    private static String videVersNull(String valeur) {
        return (valeur == null || valeur.isBlank()) ? null : valeur.trim();
    }
}
