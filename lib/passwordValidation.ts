/**
 * Liste des caractères spéciaux autorisés pour les mots de passe
 * Limités pour éviter les problèmes de sécurité et de compatibilité
 */
const ALLOWED_SPECIAL_CHARS = "!@#$%^&*()_+-=[]{}|;:,.<>?";

/**
 * Valide un mot de passe selon les règles suivantes :
 * - 8 caractères minimum
 * - Au moins une minuscule
 * - Au moins une majuscule
 * - Au moins un chiffre
 * - Au moins un caractère spécial (liste limitée)
 * - Uniquement des caractères autorisés (lettres, chiffres, caractères spéciaux autorisés)
 */
export function validatePassword(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push("Le mot de passe doit contenir au moins 8 caractères");
  }

  if (!/[a-z]/.test(password)) {
    errors.push("Le mot de passe doit contenir au moins une minuscule");
  }

  if (!/[A-Z]/.test(password)) {
    errors.push("Le mot de passe doit contenir au moins une majuscule");
  }

  if (!/[0-9]/.test(password)) {
    errors.push("Le mot de passe doit contenir au moins un chiffre");
  }

  // Vérifier qu'il y a au moins un caractère spécial autorisé
  const specialCharRegex = new RegExp(`[${ALLOWED_SPECIAL_CHARS.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}]`);
  if (!specialCharRegex.test(password)) {
    errors.push(`Le mot de passe doit contenir au moins un caractère spécial parmi : ${ALLOWED_SPECIAL_CHARS.split('').join(' ')}`);
  }

  // Vérifier que tous les caractères sont autorisés (lettres, chiffres, caractères spéciaux autorisés)
  const allowedCharsRegex = new RegExp(`^[a-zA-Z0-9${ALLOWED_SPECIAL_CHARS.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}]+$`);
  if (!allowedCharsRegex.test(password)) {
    errors.push(`Le mot de passe contient des caractères non autorisés. Caractères spéciaux acceptés : ${ALLOWED_SPECIAL_CHARS.split('').join(' ')}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Retourne la liste des caractères spéciaux autorisés
 */
export function getAllowedSpecialChars(): string {
  return ALLOWED_SPECIAL_CHARS;
}

