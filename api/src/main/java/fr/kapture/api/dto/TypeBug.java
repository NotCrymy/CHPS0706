package fr.kapture.api.dto;

import java.util.Arrays;

/**
 * Catégorie du bug (liste fermée) — les libellés affichés au joueur sont
 * côté front ({@code front/public/js/shared.js}), l'API ne renvoie que la
 * valeur.
 */
public enum TypeBug {

    /** Décor, collision, zone inaccessible. */
    MAP,
    /** Bug impliquant un autre joueur. */
    AUTRE_JOUEUR,
    /** Affichage, textures, animations. */
    GRAPHIQUE,
    /** Son absent, décalé ou en boucle. */
    SON,
    /** Menus, HUD, boutons. */
    INTERFACE,
    /** Ralentissement, gel, plantage. */
    PERFORMANCE,
    /** Tout ce qui ne rentre pas ailleurs. */
    AUTRE;

    /** Vrai si la valeur fait partie de la liste fermée (sinon : « type_bug invalide »). */
    public static boolean estValide(String valeur) {
        return Arrays.stream(values()).anyMatch(t -> t.name().equals(valeur));
    }
}
