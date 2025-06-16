// src/utils/validators.js

/**
 * =================================================================
 * SECCIÓN 1: REGLAS DE VALIDACIÓN
 * -----------------------------------------------------------------
 * Cada función devuelve `true` si es válido, o un `string` con el mensaje de error.
 * Los límites de longitud están sincronizados con la Base de Datos.
 * =================================================================
 */

// --- Reglas Básicas y de Composición ---

export const isRequired = (value) => {
  if (value === null || value === undefined || String(value).trim() === '') {
    return 'Este campo es obligatorio.';
  }
  return true;
};

// Validador de composición: permite usar validadores solo si el campo tiene un valor.
export const optional = (validator) => (value) => {
    if (!value || String(value).trim() === '') {
        return true; // Si el valor está vacío, la validación pasa.
    }
    return validator(value); // Si hay valor, aplica el validador.
};

// --- Reglas de Formato y Contenido Específicas ---

export const isRutChileno = (rut) => {
  if (typeof rut !== 'string' || !rut.trim()) {
    return 'El RUT es obligatorio.';
  }
  
  // La DB tiene VARCHAR(15), nuestro formateador (12.345.678-9) produce 12 caracteres. Es seguro.
  if (rut.length > 12) {
    return 'El RUT es demasiado largo.';
  }
  
  const rutLimpio = rut.replace(/\./g, '').replace(/-/g, '').toUpperCase();
  if (!/^[0-9]{7,8}[0-9K]$/.test(rutLimpio)) {
    return 'El formato del RUT no es válido.';
  }
  
  const cuerpo = rutLimpio.slice(0, -1);
  const dv = rutLimpio.slice(-1);
  let suma = 0, multiplo = 2;

  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += parseInt(cuerpo[i]) * multiplo;
    multiplo = multiplo < 7 ? multiplo + 1 : 2;
  }
  
  let dvEsperado = 11 - (suma % 11);
  dvEsperado = dvEsperado === 11 ? '0' : dvEsperado === 10 ? 'K' : dvEsperado.toString();
  
  if (dv !== dvEsperado) {
    return 'El RUT ingresado no es válido (dígito verificador incorrecto).';
  }
  return true;
};

export const isEmail = (email) => {
  // DB: usuarios.email es VARCHAR(255)
  if (String(email).length > 255) {
    return 'El email no puede exceder los 255 caracteres.';
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return 'El formato del email no es correcto.';
  }
  return true;
};

export const isNumber = (value) => {
    if (isNaN(parseFloat(value))) {
        return 'El valor debe ser un número.';
    }
    return true;
};

// Para coordenadas DECIMAL(17,15) o DECIMAL(16,14)
export const isCoordinate = (value) => {
    if (isNaN(parseFloat(value))) {
        return 'Debe ser un número válido.';
    }
    const parts = String(value).split('.');
    if (parts[1] && parts[1].length > 15) {
        return 'No puede tener más de 15 decimales.';
    }
    return true;
};

export const isSecurePassword = (password) => {
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;
  if (!regex.test(password)) {
    return 'La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula, un número y un símbolo.';
  }
  return true;
};


// --- Reglas de Longitud (Sincronizadas con la BD) ---

export const maxLength = (max) => (value) => {
  if (String(value).trim().length > max) {
    return `El texto no puede exceder los ${max} caracteres.`;
  }
  return true;
};

// Aquí creamos validadores específicos para los campos de la BD
export const maxLength_tramites_nombre = maxLength(58);
export const maxLength_tramites_solicitante = maxLength(79);
export const maxLength_tramites_calle = maxLength(45);
export const maxLength_usuarios_nombre = maxLength(100);
export const maxLength_educacion_titulo = maxLength(255);
export const maxLength_educacion_media_subtitulo = maxLength(255);


/**
 * =================================================================
 * SECCIÓN 2: FUNCIONES DE SANITIZACIÓN Y FORMATEO
 * =================================================================
 */

export const formatRut = (value) => {
  if (!value) return '';
  const rutLimpio = value.replace(/[^0-9kK]/g, '');
  if (rutLimpio.length === 0) return '';

  let cuerpo = rutLimpio.slice(0, -1);
  let dv = rutLimpio.slice(-1);

  if (rutLimpio.length <= 1) {
    return rutLimpio;
  }

  // Prevenimos el error "too many digits" de Intl.NumberFormat
  if (cuerpo.length > 15) cuerpo = cuerpo.substring(0, 15);

  cuerpo = new Intl.NumberFormat('es-CL').format(parseInt(cuerpo, 10));
  return `${cuerpo}-${dv}`;
};

export const formatAlphanumeric = (value) => {
  if (!value) return '';
  return value.replace(/[^a-zA-Z0-9\sñÑáéíóúÁÉÍÓÚüÜ]/g, '');
};

export const formatOnlyInt = (value) => {
    if (!value) return '';
    return value.replace(/[^0-9]/g, '');
};