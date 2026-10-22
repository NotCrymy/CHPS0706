package fr.kapture.api.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDate;

/**
 * Table {@code testeur} : données nominatives des testeurs.
 *
 * <p>Cloisonnement : ces colonnes ne sont jamais renvoyées par l'API. Les bugs
 * ne portent que le pseudonyme (table {@code appariement}). L'entité existe
 * pour compléter le modèle de données, pas pour être exposée.</p>
 * 
 * <p> @TODO les testeurs sont actuellement créés par le script de seed, mais il faudra
 * les créer par l'API (route POST /testeurs) pour que les organisateurs d'une session puissent créer des testeurs pour leurs sessions. 
 * On pourra aussi prévoir une manière sécurisé et privé de récupérer les testeurs pour la rémunération
 * </p>
 */
@Entity
@Table(name = "testeur")
public class Testeur {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "nom", length = 100, nullable = false)
    private String nom;

    @Column(name = "email", length = 255, nullable = false)
    private String email;

    @Column(name = "iban", length = 34)
    private String iban;

    @Column(name = "date_naissance", nullable = false)
    private LocalDate dateNaissance;

    @Column(name = "region", length = 50, nullable = false)
    private String region;

    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public String getNom() {
        return nom;
    }

    public void setNom(String nom) {
        this.nom = nom;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getIban() {
        return iban;
    }

    public void setIban(String iban) {
        this.iban = iban;
    }

    public LocalDate getDateNaissance() {
        return dateNaissance;
    }

    public void setDateNaissance(LocalDate dateNaissance) {
        this.dateNaissance = dateNaissance;
    }

    public String getRegion() {
        return region;
    }

    public void setRegion(String region) {
        this.region = region;
    }
}
