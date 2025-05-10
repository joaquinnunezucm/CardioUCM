// generar_hash.js
const bcrypt = require('bcrypt');
const readline = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout,
});

const saltRounds = 10; // Número de rondas de sal. 10-12 es un buen balance.

function generarHash() {
  readline.question('Introduce el email del usuario: ', (email) => {
    readline.question('Introduce la contraseña en texto plano: ', async (plainPassword) => {
      if (!plainPassword) {
        console.error("La contraseña no puede estar vacía.");
        readline.close();
        return;
      }
      try {
        const hashedPassword = await bcrypt.hash(plainPassword, saltRounds);
        console.log('\n--- Resultado ---');
        console.log(`Email: ${email}`);
        console.log(`Contraseña en texto plano: ${plainPassword}`);
        console.log(`Contraseña Hasheada (bcrypt): ${hashedPassword}`);
        console.log('-----------------\n');
        console.log('Copia la contraseña hasheada y pégala en la columna "password" de tu base de datos para este usuario.');
      } catch (error) {
        console.error('Error al generar el hash:', error);
      } finally {
        readline.question('¿Generar otro hash? (s/n): ', (respuesta) => {
          if (respuesta.toLowerCase() === 's') {
            generarHash(); // Llamada recursiva para generar otro
          } else {
            readline.close();
          }
        });
      }
    });
  });
}

// Inicia el proceso
console.log("Generador de Hashes de Contraseña (bcrypt)");
generarHash();