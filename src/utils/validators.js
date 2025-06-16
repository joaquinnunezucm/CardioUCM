/**
 * ======================================================================
 *  Archivo de Validaciones Reutilizables
 * ======================================================================
 *
 * Cada función de validación:
 * - Recibe el valor del campo como argumento.
 * - Devuelve un `string` con el mensaje de error si la validación falla.
 * - Devuelve `null` si la validación es exitosa.
 *
 * Funciones "factory" (como maxLength) reciben un parámetro y DEVUELVEN
 * una función de validación.
 */

// --- VALIDACIONES BÁSICAS ---

export const isRequired = (value) => {
  if (!value || value.trim() === '') {
    return 'Este campo es obligatorio.';
  }
  return null;
};

export const maxLength = (max) => (value) => {
  if (value && value.length > max) {
    return `El campo no puede tener más de ${max} caracteres.`;
  }
  return null;
};

export const minLength = (min) => (value) => {
  if (value && value.length < min) {
    return `El campo debe tener al menos ${min} caracteres.`;
  }
  return null;
};

// --- VALIDACIONES DE FORMATO Y CARACTERES ---

/**
 * Valida que el campo contenga únicamente números enteros.
 * @param {string} value - El valor del campo.
 * @returns {string|null}
 */
export const isNumeric = (value) => {
  if (value && !/^\d+$/.test(value)) {
    return 'Este campo solo debe contener números enteros.';
  }
  return null;
};

/**
 * Valida que el campo solo contenga letras (CON tildes/ñ) y espacios.
 * @param {string} value - El valor del campo.
 * @returns {string|null}
 */
export const isAlphaWithSpaces = (value) => {
    // \u00C0-\u017F permite caracteres latinos acentuados.
    if (value && !/^[a-zA-Z\u00C0-\u017F\s]+$/.test(value)) {
        return 'Este campo solo permite letras y espacios.';
    }
    return null;
};

/**
 * Valida que el campo solo contenga letras (CON tildes/ñ), números y espacios.
 * @param {string} value - El valor del campo.
 * @returns {string|null}
 */
export const isAlphaNumericWithSpaces = (value) => {
    // \u00C0-\u017F permite caracteres latinos acentuados.
    if (value && !/^[a-zA-Z\u00C0-\u017F0-9\s]+$/.test(value)) {
        return 'Este campo solo permite letras, números y espacios.';
    }
    return null;
};

/**
 * [NUEVA OPCIÓN] Valida que el campo solo contenga letras (SIN tildes/ñ), números y espacios.
 * Útil para campos que no deben tener caracteres especiales.
 * @param {string} value - El valor del campo.
 * @returns {string|null}
 */
export const isSimpleAlphaNumericWithSpaces = (value) => {
    // SIN el rango Unicode para acentos.
    if (value && !/^[a-zA-Z0-9\s]+$/.test(value)) {
        return 'Este campo solo permite letras (sin tildes), números y espacios.';
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
 * Valida el formato y el dígito verificador de un RUT chileno.
 * @param {string} rut - RUT en formato XXXXXXXX-X
 * @returns {string|null}
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
 * Valida que el texto sea un slug (letras minúsculas, números y guiones).
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
 * Valida coordenadas geográficas (latitud o longitud).
 * @param {string} value 
 * @returns {string|null}
 */
export const isCoordinate = (value) => {
    if (value && !/^-?\d{1,3}(\.\d+)?$/.test(value)) {
        return 'Debe ser un número decimal válido (ej. -35.12345).';
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
        return 'Debe ser una URL válida (ej. https://www.ejemplo.com).';
    }
}


// --- FUNCIÓN DE UTILIDAD ---

export const validateField = (value, rules) => {
  for (const rule of rules) {
    const errorMessage = rule(value);
    if (errorMessage) {
      return errorMessage;
    }
  }
  return null;
};