/**
 * Styles communs des boutons d'action des colonnes "Actions" des tableaux.
 * Chaque type d'action a sa propre couleur (au lieu du bleu unique
 * précédent) pour rester lisible d'un coup d'œil : modifier = or,
 * supprimer = rouge, voir/détail = bleu, télécharger = vert.
 */
const base = 'rounded-lg p-1.5 transition disabled:cursor-not-allowed disabled:opacity-30';

export const editIconClass = `${base} text-gold hover:bg-gold-soft hover:text-gold`;
export const deleteIconClass = `${base} text-danger hover:bg-danger-soft hover:text-danger`;
export const viewIconClass = `${base} text-primary hover:bg-primary-soft hover:text-primary-dark`;
export const downloadIconClass = `${base} text-success hover:bg-success-soft hover:text-success`;
