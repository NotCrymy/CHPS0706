package fr.kapture.api.controller;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import fr.kapture.api.dto.BugRequest;
import fr.kapture.api.dto.BugResponse;
import fr.kapture.api.dto.PageResponse;
import fr.kapture.api.service.BugService;
import jakarta.validation.Valid;

/**
 * Les deux routes du contrat {@code API.md}. Le contrôleur ne fait que le
 * mapping HTTP : {@code @Valid} déclenche la validation Jakarta du corps, et
 * tout le métier est dans {@link BugService}.
 */
@RestController
@RequestMapping("/api")
public class BugController {

    private final BugService bugService;

    public BugController(BugService bugService) {
        this.bugService = bugService;
    }

    /** POST /api/sessions/{id}/bugs → 201 + id du bug. */
    @PostMapping("/sessions/{id}/bugs")
    public ResponseEntity<Map<String, Long>> creerBug(
            @PathVariable("id") Integer id,
            @Valid @RequestBody BugRequest requete) {
        Long idBug = bugService.creerBug(id, requete);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("id", idBug));
    }

    /** GET /api/bugs → liste filtrée, triée, paginée. */
    @GetMapping("/bugs")
    public PageResponse<BugResponse> listerBugs(
            @RequestParam(name = "type_bug", required = false) String typeBug,
            @RequestParam(name = "titre", required = false) String titre,
            @RequestParam(name = "id_utilisateur", required = false) String idUtilisateur,
            @RequestParam(name = "session_id", required = false) Integer sessionId,
            @RequestParam(name = "depuis", required = false) String depuis,
            @RequestParam(name = "jusqu_a", required = false) String jusquA,
            @RequestParam(name = "tri", required = false) String tri,
            @RequestParam(name = "ordre", required = false) String ordre,
            @RequestParam(name = "page", required = false) Integer page,
            @RequestParam(name = "taille", required = false) Integer taille) {
        return bugService.listerBugs(typeBug, titre, idUtilisateur, sessionId,
                depuis, jusquA, tri, ordre, page, taille);
    }
}
