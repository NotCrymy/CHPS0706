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

/**
 * Table {@code session} : session de jeu d'un testeur identifié par son
 * pseudonyme (clé étrangère vers {@code appariement(pseudonyme)}).
 *
 * <p>Les sessions sont créées par {@code db/init/02-seed.sql} : l'API n'a pas
 * de route de création de session.</p>
 * 
 * <p> @TODO les sessions sont actuellement créées par le script de seed, mais il faudra
 * les créer par l'API (route POST /sessions) pour que les organisateurs d'une session puissent créer des sessions pour leurs testeurs. 
 * </p>
 */
@Entity
@Table(name = "session")
public class Session {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    /** Testeur de la session (table {@code appariement}, colonne {@code pseudonyme}). */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "pseudonyme", referencedColumnName = "pseudonyme", nullable = false)
    private Appariement utilisateur;

    @Column(name = "application", length = 50, nullable = false)
    private String application;

    /** Date et heure de début de la session (colonne {@code DATETIME(3)}). */
    @Column(name = "debut", nullable = false)
    private Instant debut;

    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public Appariement getUtilisateur() {
        return utilisateur;
    }

    public void setUtilisateur(Appariement utilisateur) {
        this.utilisateur = utilisateur;
    }

    public String getApplication() {
        return application;
    }

    public void setApplication(String application) {
        this.application = application;
    }

    public Instant getDebut() {
        return debut;
    }

    public void setDebut(Instant debut) {
        this.debut = debut;
    }
}
