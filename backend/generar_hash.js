// generar_hash.js
const bcrypt = require('bcrypt');
const readline = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout,
});

const saltRounds = 10;

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

generarHash();