import { useState, useEffect, useRef } from 'react';

/**
 * Hook personalizado para aplicar "throttle" a un valor.
 * El valor solo se actualizará si ha pasado el tiempo límite desde la última actualización.
 * @param {any} value El valor al que se le aplicará el throttle.
 * @param {number} limit El intervalo de tiempo en milisegundos.
 * @returns {any} El valor con throttle aplicado.
 */
export function useThrottle(value, limit) {
  const [throttledValue, setThrottledValue] = useState(value);
  const lastRan = useRef(Date.now());

  useEffect(() => {
    const handler = setTimeout(() => {
      if (Date.now() - lastRan.current >= limit) {
        setThrottledValue(value);
        lastRan.current = Date.now();
      }
    }, limit - (Date.now() - lastRan.current));

    return () => {
      clearTimeout(handler);
    };
  }, [value, limit]);

  return throttledValue;
}