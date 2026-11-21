// Envoi par WhatsApp : on ouvre WhatsApp avec un message déjà écrit ; la personne n'a plus qu'à appuyer sur Envoyer.
// Rien ne part tout seul.

// Numéro au format international sans « + » (ex. 0707070707 → 2250707070707).
// Un numéro à 10 chiffres sans indicatif est considéré comme ivoirien (+225).
export function numeroInternational(tel?: string): string | null {
  if (!tel) return null
  let n = tel.replace(/[^\d+]/g, '')
  if (n.startsWith('+')) n = n.slice(1)
  else if (n.startsWith('00')) n = n.slice(2)
  else if (n.length === 10) n = '225' + n
  return n.length >= 8 ? n : null
}

// Lien qui ouvre WhatsApp. Sans numéro, WhatsApp demande à qui envoyer.
export function lienWhatsApp(texte: string, tel?: string): string {
  const n = numeroInternational(tel)
  return `https://wa.me/${n ?? ''}?text=${encodeURIComponent(texte)}`
}

export function ouvrirWhatsApp(texte: string, tel?: string) {
  window.open(lienWhatsApp(texte, tel), '_blank', 'noopener')
}
