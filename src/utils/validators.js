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

/**
 * [NUEVO] Crea una función que valida si un número es menor o igual a un máximo.
 * @param {number} max - El valor máximo permitido.
 * @returns {function(string|number): (string|null)} - Una función de validación.
 */
export const maxValue = (max) => (value) => {
    if (value !== null && value !== undefined && Number(value) > max) {
        return `El valor no puede ser mayor que ${max}.`;
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
 * Valida un formato de email básico.
 * @param {string} value - El valor del campo.
 * @returns {string|null}
 */
export const isEmail = (value) => {
  if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return 'Debe ser un formato de email válido.';
  }
  return null;
};

/**
 * Valida un número de teléfono, permitiendo números, espacios, guiones y el signo +.
 * @param {string} value - El valor del campo.
 * @returns {string|null}
 */
export const isPhoneNumber = (value) => {
    if (value && !/^[+0-9\s-]+$/.test(value)) {
        return 'Formato de teléfono inválido. Solo números, espacios, guiones y "+".';
    }
    return null;
}

/**
 * Valida si la cadena es una URL válida.
 * @param {string} value
 * @returns {string|null}
 */
export const isURL = (value) => {
    try {
        new URL(value);
        return null;
    } catch (_) {
        return 'Debe ser una URL válida (ej: https://www.ejemplo.com).';
    }
}

/**
 * Valida la fortaleza de una contraseña.
 * Requiere al menos 8 caracteres, una mayúscula, una minúscula y un número.
 * @param {string} value - La contraseña a validar.
 * @returns {string|null} - Mensaje de error o null si es válida.
 */
export const isStrongPassword = (value) => {
  if (!value) return null; // No es obligatorio si se está editando y no se cambia
  if (value.length < 8) {
    return 'La contraseña debe tener al menos 8 caracteres.';
  }
  if (!/[A-Z]/.test(value)) {
    return 'Debe contener al menos una letra mayúscula.';
  }
  if (!/[a-z]/.test(value)) {
    return 'Debe contener al menos una letra minúscula.';
  }
  if (!/[0-9]/.test(value)) {
    return 'Debe contener al menos un número.';
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
 * [MÁS PERMISIVA] Valida texto libre permitiendo tildes, ñ, y signos de puntuación comunes.
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
 * [ULTRA-PERMISIVA] Valida texto descriptivo. Permite casi todos los caracteres,
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

/**
 * [NUEVA] Valida que el texto sea un "slug" (letras minúsculas, números y guiones).
 * Ideal para IDs de categoría o URLs amigables.
 * @param {string} value 
 * @returns {string|null}
 */
export const isSlug = (value) => {
    if (value && !/^[a-z0-9-]+$/.test(value)) {
        return 'Solo se permiten letras minúsculas, números y guiones (-).';
    }
    return null;
}

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
 * Valida que el texto sea un "slug" solo con letras minúsculas y guiones.
 * @param {string} value 
 * @returns {string|null}
 */
export const isSlugWithoutNumbers = (value) => {
    if (value && !/^[a-z-]+$/.test(value)) {
        return 'Solo se permiten letras minúsculas y guiones (-).';
    }
    return null;
}

/**
 * Valida un texto para un título, permitiendo signos de exclamación e interrogación.
 * @param {string} value 
 * @returns {string|null}
 */
export const isTitleText = (value) => {
    if (value && !/^[a-zA-Z0-9\s?!¡¿]+$/.test(value)) {
        return 'Solo se permiten letras, números, espacios y signos de interrogación/exclamación.';
    }
    return null;
}

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