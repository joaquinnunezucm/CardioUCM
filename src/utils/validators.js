/**
 * ======================================================================
 *  Archivo de Validaciones Reutilizables (utils/validators.js)
 * ======================================================================
 *
 * Cada función de validación sigue un patrón estándar:
 * - Recibe el valor del campo como argumento.
 * - Devuelve un `string` con un mensaje de error si la validación falla.
 * - Devuelve `null` si la validación es exitosa.
 *
 * Las funciones "factory" (como maxLength y minLength) reciben un parámetro
 * y devuelven una nueva función de validación.
 */

// --- VALIDACIONES DE EXISTENCIA Y LONGITUD ---

/**
 * Valida que un campo no esté vacío o contenga solo espacios en blanco.
 * @param {string} value - El valor del campo a validar.
 * @returns {string|null} - Mensaje de error o null si es válido.
 */
export const isRequired = (value) => {
  if (!value || String(value).trim() === '') {
    return 'Este campo es obligatorio.';
  }
  return null;
};

/**
 * Crea una función de validación que comprueba si un valor excede una longitud máxima.
 * @param {number} max - La longitud máxima permitida.
 * @returns {function(string): (string|null)} - Una función de validación.
 */
export const maxLength = (max) => (value) => {
  if (value && String(value).length > max) {
    return `El campo no puede tener más de ${max} caracteres.`;
  }
  return null;
};

/**
 * Crea una función de validación que comprueba si un valor cumple con una longitud mínima.
 * @param {number} min - La longitud mínima requerida.
 * @returns {function(string): (string|null)} - Una función de validación.
 */
export const minLength = (min) => (value) => {
  if (value && String(value).length < min) {
    return `El campo debe tener al menos ${min} caracteres.`;
  }
  return null;
};

/**
 * Crea una función que valida si un número es mayor o igual a un mínimo.
 * @param {number} min - El valor mínimo permitido.
 * @returns {function(string|number): (string|null)} - Una función de validación.
 */
export const minValue = (min) => (value) => {
  if (value !== null && value !== undefined && Number(value) < min) {
    return `El valor no puede ser menor que ${min}.`;
  }
  return null;
};


// --- VALIDACIONES DE FORMATO Y CARACTERES ---

/**
 * Valida que el campo contenga únicamente dígitos (0-9).
 * Ideal para campos de número de teléfono (sin símbolos), ID, etc.
 * @param {string} value - El valor del campo.
 * @returns {string|null} - Mensaje de error o null si es válido.
 */
export const isInteger = (value) => {
  if (value && !/^\d+$/.test(value)) {
    return 'Este campo solo debe contener números (0-9).';
  }
  return null;
};

/**
 * Valida que el campo solo contenga letras del alfabeto inglés (sin tildes, sin ñ) y espacios.
 * @param {string} value - El valor del campo.
 * @returns {string|null} - Mensaje de error o null si es válido.
 */
export const isSimpleAlphaWithSpaces = (value) => {
  if (value && !/^[a-zA-Z\s]+$/.test(value)) {
    return 'Este campo solo permite letras (sin tildes ni ñ) y espacios.';
  }
  return null;
};

/**
 * Valida que el campo solo contenga letras del alfabeto inglés (sin tildes, sin ñ), números y espacios.
 * @param {string} value - El valor del campo.
 * @returns {string|null} - Mensaje de error o null si es válido.
 */
export const isSimpleAlphaNumericWithSpaces = (value) => {
  if (value && !/^[a-zA-Z0-9\s]+$/.test(value)) {
    return 'Este campo solo permite letras (sin tildes ni ñ), números y espacios.';
  }
  return null;
};

/**
 * Valida que un texto no contenga caracteres especiales no deseados.
 * Permite letras (sin tildes), números, espacios, y signos de puntuación comunes.
 * @param {string} value - El valor del campo.
 * @returns {string|null} - Mensaje de error o null si es válido.
 */
export const isSafeText = (value) => {
  // Permite letras (sin tildes), números, espacios, y .,;:()¿?¡!-"'
  if (value && !/^[a-zA-Z0-9\s.,;:()¿?¡!"'-]+$/.test(value)) {
    return 'El texto contiene caracteres no permitidos.';
  }
  return null;
};

/**
 * [NUEVA Y MÁS PERMISIVA] Valida texto libre permitiendo tildes, ñ, y signos de puntuación comunes.
 * Ideal para campos de descripción como 'instrucción' o 'subtítulo'.
 * @param {string} value - El valor del campo.
 * @returns {string|null} - Mensaje de error o null si es válido.
 */
export const isExtendedText = (value) => {
  // Permite letras (con tildes), números, espacios, y .,;:()¿?¡!-"'
  if (value && !/^[a-zA-Z0-9\s\u00C0-\u017F.,;:()¿?¡!"'-]+$/.test(value)) {
    return 'El texto contiene caracteres no permitidos.';
  }
  return null;
};

/**
 * Valida el formato y el dígito verificador de un RUT chileno.
 * Acepta el formato XXXXXXXX-X (sin puntos).
 * @param {string} rut - El RUT a validar.
 * @returns {string|null} - Mensaje de error o null si es válido.
 */
export const isRUT = (rut) => {
  if (!rut || !/^[0-9]+-[0-9kK]{1}$/.test(rut)) {
    return 'El formato del RUT debe ser XXXXXXXX-X, sin puntos.';
  }
  const [cuerpo, dv] = rut.split('-');
  let suma = 0;
  let multiplo = 2;
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += parseInt(cuerpo.charAt(i), 10) * multiplo;
    if (multiplo < 7) {
      multiplo += 1;
    } else {
      multiplo = 2;
    }
  }
  const dvEsperado = 11 - (suma % 11);
  const dvFinal = (dvEsperado === 11) ? '0' : (dvEsperado === 10) ? 'K' : dvEsperado.toString();

  if (dvFinal.toUpperCase() !== dv.toUpperCase()) {
    return 'El RUT ingresado no es válido (dígito verificador incorrecto).';
  }
  return null;
};

/**
 * Valida coordenadas geográficas (latitud o longitud).
 * Acepta un número, opcionalmente negativo al inicio, y con decimales usando un punto.
 * @param {string|number} value - La coordenada a validar.
 * @returns {string|null} - Mensaje de error o null si es válido.
 */
export const isCoordinate = (value) => {
    // La expresión regular valida un número opcionalmente negativo con hasta 3 dígitos enteros y decimales opcionales.
    if (value && !/^-?\d{1,3}(\.\d+)?$/.test(String(value))) {
        return 'Debe ser un número decimal válido (ej. -35.12345).';
    }
    return null;
}



/**
 * [NUEVO Y ULTRA-PERMISIVO] Valida texto descriptivo. Permite casi todos los caracteres,
 * incluyendo tildes y la mayoría de los símbolos, pero prohíbe los caracteres '<' y '>'
 * para prevenir ataques de inyección de HTML (XSS).
 * @param {string} value - El valor del campo.
 * @returns {string|null} - Mensaje de error o null si es válido.
 */
export const isDescriptiveText = (value) => {
  if (value && /[<>]/.test(value)) {
    return "El texto no puede contener los símbolos '<' o '>'.";
  }
  return null;
};

// --- VERSIONES CON SOPORTE PARA TILDES (Conservadas para compatibilidad o uso futuro) ---

/**
 * [CON TILDE] Valida que el campo solo contenga letras (incluyendo tildes/ñ) y espacios.
 * @param {string} value - El valor del campo.
 * @returns {string|null}
 */
export const isAlphaWithSpaces = (value) => {
  // \u00C0-\u017F es el rango Unicode que incluye la mayoría de los caracteres latinos acentuados.
  if (value && !/^[a-zA-Z\u00C0-\u017F\s]+$/.test(value)) {
      return 'Este campo solo permite letras y espacios.';
  }
  return null;
};

/**
 * [CON TILDE] Valida que el campo solo contenga letras (incluyendo tildes/ñ), números y espacios.
 * @param {string} value - El valor del campo.
 * @returns {string|null}
 */
export const isAlphaNumericWithSpaces = (value) => {
  if (value && !/^[a-zA-Z\u00C0-\u017F0-9\s]+$/.test(value)) {
      return 'Este campo solo permite letras, números y espacios.';
  }
  return null;
};