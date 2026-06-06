<<<<<<< HEAD
const mysql = require("mysql2");
require("dotenv").config();
const bcrypt = require("bcrypt");

const connection = mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "mibodeguita",
});

async function createTestUser() {
  const hashedPassword = await bcrypt.hash("admin123", 10);
  const email = "admin@bodega.com";

  console.log("Intentando crear/actualizar usuario de prueba en MySQL...");

  connection.query(
    `INSERT INTO usuarios (nombre, email, Rol, password) 
     VALUES (?, ?, ?, ?) 
     ON DUPLICATE KEY UPDATE password = VALUES(password), nombre = VALUES(nombre), Rol = VALUES(Rol)`,
    ["Administrador", email, "Admin", hashedPassword],
    (err, results) => {
      if (err) {
        console.error("Error creando usuario de prueba:", err.message);
      } else {
        console.log("Usuario de prueba procesado exitosamente:");
        console.log(`Email: ${email}`);
        console.log("Contraseña: admin123");
      }
      connection.end();
    }
  );
}

=======
const mysql = require("mysql2");
require("dotenv").config();
const bcrypt = require("bcrypt");

const connection = mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "mibodeguita",
});

async function createTestUser() {
  const hashedPassword = await bcrypt.hash("admin123", 10);
  const email = "admin@bodega.com";

  console.log("Intentando crear/actualizar usuario de prueba en MySQL...");

  connection.query(
    `INSERT INTO usuarios (nombre, email, Rol, password) 
     VALUES (?, ?, ?, ?) 
     ON DUPLICATE KEY UPDATE password = VALUES(password), nombre = VALUES(nombre), Rol = VALUES(Rol)`,
    ["Administrador", email, "Admin", hashedPassword],
    (err, results) => {
      if (err) {
        console.error("Error creando usuario de prueba:", err.message);
      } else {
        console.log("Usuario de prueba procesado exitosamente:");
        console.log(`Email: ${email}`);
        console.log("Contraseña: admin123");
      }
      connection.end();
    }
  );
}

>>>>>>> 13e69faebb8a7ba55613f4029cae9fc038cf582b
createTestUser();