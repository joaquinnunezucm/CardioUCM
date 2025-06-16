// src/hooks/useForm.js
import { useState, useCallback } from 'react';

/**
 * Hook personalizado para manejar formularios, estado, errores y validaciones.
 * @param {object} options - Opciones de configuración.
 * @param {object} options.initialValues - Valores iniciales del formulario.
 * @param {object} options.validations - Objeto con las reglas de validación por campo.
 * @param {function} options.onSubmit - Función a ejecutar cuando el formulario es válido y se envía.
 */
export const useForm = (options) => {
  const [data, setData] = useState(options?.initialValues || {});
  const [errors, setErrors] = useState({});

  const handleChange = useCallback((key, sanitizer) => (e) => {
    const value = e.target.value;
    const finalValue = sanitizer ? sanitizer(value) : value;
    
    setData((prevData) => ({
      ...prevData,
      [key]: finalValue,
    }));

    // Limpia el error del campo que se está editando
    if (errors[key]) {
      setErrors((prevErrors) => ({ ...prevErrors, [key]: null }));
    }
  }, [errors]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validations = options?.validations;
    if (validations) {
      let valid = true;
      const newErrors = {};
      for (const key in validations) {
        const value = data[key];
        const validationRules = validations[key];
        
        // Las reglas pueden ser un array de funciones
        for (const rule of validationRules) {
            const error = rule(value, data);
            if (error !== true) {
                newErrors[key] = error;
                valid = false;
                break; // Detenerse en el primer error para este campo
            }
        }
      }

      if (!valid) {
        setErrors(newErrors);
        Swal.fire('Formulario incompleto', 'Por favor, revise los campos marcados.', 'warning');
        return;
      }
    }
    
    setErrors({});
    if (options?.onSubmit) {
      options.onSubmit(data);
    }
  };
  
  // Función para resetear el formulario (útil al abrir/cerrar un modal)
  const resetForm = useCallback(() => {
    setData(options?.initialValues || {});
    setErrors({});
  }, [options?.initialValues]);

  return {
    data,
    setData,
    errors,
    handleChange,
    handleSubmit,
    resetForm,
  };
};