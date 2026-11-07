// Δέχεται 69xxxxxxxx, +3069..., 003069... και επιστρέφει 10 ψηφία ή null.
export function normalizePhone(input) {
  let s = String(input || '').replace(/[\s\-().]/g, '')
  if (s.startsWith('+30')) s = s.slice(3)
  else if (s.startsWith('0030')) s = s.slice(4)
  return /^69\d{8}$/.test(s) ? s : null
}
