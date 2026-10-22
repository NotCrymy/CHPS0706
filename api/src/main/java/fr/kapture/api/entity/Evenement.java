package fr.kapture.api.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.time.Instant;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import tools.jackson.databind.JsonNode;

/**
 * Table {@code evenement} : un bug signalé.
 *
 * <p>Les liens inter-tables sont de vraies associations JPA :</p>
 * <ul>
 *   <li>{@code session_id} → {@link Session} ({@code @ManyToOne}),</li>
 *   <li>{@code id_utilisateur} → {@link Appariement} ({@code @ManyToOne} sur
 *       la colonne unique {@code pseudonyme}).</li>
 * </ul>
 *
 * <p>Le DTO renvoyé par {@code GET /api/bugs} se déduit par navigation :
 * {@code bug.getSession().getId()} → {@code session_id},
 * {@code bug.getUtilisateur().getPseudonyme()} → {@code id_utilisateur}.</p>
 */
@Entity
@Table(name = "evenement")
public class Evenement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Session de jeu concernée par le bug. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "session_id", nullable = false)
    private Session session;

    /** Pseudonyme du testeur qui a signalé le bug, jamais le nominatif. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_utilisateur", referencedColumnName = "pseudonyme", nullable = false)
    private Appariement utilisateur;

    /** Libellé du bug rencontré, texte libre (100 caractères max). */
    @Column(name = "titre", length = 100, nullable = false)
    private String titre;

    @Column(name = "description", length = 500)
    private String description;

    /**
     * État du jeu au moment du bug, stocké tel quel (colonne {@code JSON}).
     * Le popup y ajoute une clé {@code comportement} (métriques de saisie) :
     * aucun schéma interne n'est imposé.
     */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "payload")
    private JsonNode payload;

    /** Instant de l'événement, fourni par le client (colonne {@code DATETIME(3)}). */
    @Column(name = "timestamp", nullable = false)
    private Instant timestamp;

    /** Catégorie : {@code MAP}, {@code AUTRE_JOUEUR}, {@code GRAPHIQUE}, {@code SON}, {@code INTERFACE}, {@code PERFORMANCE}, {@code AUTRE}. */
    @Column(name = "type_bug", length = 30, nullable = false)
    private String typeBug;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Session getSession() {
        return session;
    }

    public void setSession(Session session) {
        this.session = session;
    }

    public Appariement getUtilisateur() {
        return utilisateur;
    }

    public void setUtilisateur(Appariement utilisateur) {
        this.utilisateur = utilisateur;
    }

    public String getTitre() {
        return titre;
    }

    public void setTitre(String titre) {
        this.titre = titre;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public JsonNode getPayload() {
        return payload;
    }

    public void setPayload(JsonNode payload) {
        this.payload = payload;
    }

    public Instant getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(Instant timestamp) {
        this.timestamp = timestamp;
    }

    public String getTypeBug() {
        return typeBug;
    }

    public void setTypeBug(String typeBug) {
        this.typeBug = typeBug;
    }
}
