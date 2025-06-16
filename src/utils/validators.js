// src/utils/validators.js

/**
 * =================================================================
 * SECCIÓN 1: REGLAS DE VALIDACIÓN
 * -----------------------------------------------------------------
 * Cada función aquí responde a la pregunta: "¿Es este valor válido?"
 * Devuelve `true` si es válido, o un `string` con el mensaje de error si no lo es.
 * Esto los hace compatibles con el hook `useForm`.
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
// Útil para reglas que no deben aplicarse a campos vacíos opcionales.
export const optional = (validator) => (value) => {
    if (!value) {
        return true; // Si el valor está vacío, la validación pasa.
    }
    return validator(value); // Si hay valor, aplica el validador.
};

// --- Reglas de Formato y Contenido ---

export const isRutChileno = (rut) => {
  if (typeof rut !== 'string' || !rut.trim()) {
    return 'El RUT es obligatorio.';
  }
  
  const rutLimpio = rut.replace(/\./g, '').replace(/-/g, '').toUpperCase();
  if (!/^[0-9]+[0-9K]$/.test(rutLimpio)) {
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

export const isSecurePassword = (password) => {
  const
   regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;
  if (!regex.test(password)) {
    return 'La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula, un número y un símbolo (@$!%*#?&).';
  }
  return true;
};

export const isChileanPhone = (telefono) => {
  if (!/^(\+56)?9\d{8}$/.test(telefono)) {
    return 'El formato del teléfono debe ser +569xxxxxxxx.';
  }
  return true;
};

// --- Reglas de Longitud ---

export const minLength = (min) => (value) => {
  if (String(value).trim().length < min) {
    return `Debe tener al menos ${min} caracteres.`;
  }
  return true;
};

export const maxLength = (max) => (value) => {
  if (String(value).trim().length > max) {
    return `No puede tener más de ${max} caracteres.`;
  }
  return true;
};

/**
 * =================================================================
 * SECCIÓN 2: FUNCIONES DE SANITIZACIÓN Y FORMATEO
 * -----------------------------------------------------------------
 * Cada función aquí transforma un valor de entrada.
 * Se usan en el `onChange` de los inputs para mejorar la UX y limpiar los datos.
 * =================================================================
 */

// Formateador de RUT chileno (12.345.678-9)
export const formatRut = (value) => {
  if (!value) return '';
  const rutLimpio = value.replace(/[^0-9kK]/g, '');
  if (rutLimpio.length === 0) return '';

  let cuerpo = rutLimpio.slice(0, -1);
  let dv = rutLimpio.slice(-1);

  if (rutLimpio.length <= 1) {
    return rutLimpio;
  }

  cuerpo = new Intl.NumberFormat('es-CL').format(parseInt(cuerpo, 10));
  return `${cuerpo}-${dv}`;
};

// Limpia el texto para que solo contenga letras (incl. tildes/ñ) y espacios.
export const formatOnlyLetters = (value) => {
  if (!value) return '';
  return value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '');
};

// Limpia el texto para que solo contenga caracteres alfanuméricos.
export const formatAlphanumeric = (value) => {
  if (!value) return '';
  return value.replace(/[^a-zA-Z0-9\sñÑáéíóúÁÉÍÓÚüÜ]/g, '');
};

// Limpia el texto para que solo contenga números enteros.
export const formatOnlyInt = (value) => {
    if (!value) return '';
    return value.replace(/[^0-9]/g, '');
};

// Limpia el texto para que solo contenga lo que podría ser un número decimal.
export const formatDecimal = (value) => {
    if (!value) return '';
    let formattedValue = value.replace(/[^0-9.]/g, '');
    // Asegura que solo haya un punto decimal
    const parts = formattedValue.split('.');
    if (parts.length > 2) {
        formattedValue = parts[0] + '.' + parts.slice(1).join('');
    }
    return formattedValue;
};