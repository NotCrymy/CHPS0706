package fr.kapture.api.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;

/**
 * Table {@code appariement} : correspondance testeur ↔ pseudonyme.
 *
 * <p>La clé primaire {@code id_testeur} est aussi la clé étrangère vers
 * {@code testeur(id)} : c'est un lien 1-1 à clé partagée. Le testeur (données
 * nominatives) n'est accessible que par navigation explicite et n'est jamais
 * exposé par l'API : les bugs ne portent que le pseudonyme.</p>
 */
@Entity
@Table(name = "appariement")
public class Appariement {

    @Id
    @Column(name = "id_testeur")
    private Integer idTesteur;

    /** Testeur derrière le pseudonyme (même colonne que la clé primaire). */
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_testeur", insertable = false, updatable = false)
    private Testeur testeur;

    @Column(name = "pseudonyme", length = 30, nullable = false, unique = true)
    private String pseudonyme;

    public Integer getIdTesteur() {
        return idTesteur;
    }

    public void setIdTesteur(Integer idTesteur) {
        this.idTesteur = idTesteur;
    }

    public Testeur getTesteur() {
        return testeur;
    }

    public void setTesteur(Testeur testeur) {
        this.testeur = testeur;
    }

    public String getPseudonyme() {
        return pseudonyme;
    }

    public void setPseudonyme(String pseudonyme) {
        this.pseudonyme = pseudonyme;
    }
}
