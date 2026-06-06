<<<<<<< HEAD
const mysql = require("mysql2");
require("dotenv").config();

const connection = mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "mibodeguita",
});

console.log("--- NORMALIZANDO ROLES DE ADMINISTRADOR ---");

// Esta consulta busca cualquier variación de 'admin' (Admin, admin, ADMIN, etc.) 
// y lo cambia exactamente a 'Admin'
const sql = "UPDATE usuarios SET Rol = 'Admin' WHERE LOWER(TRIM(Rol)) = 'admin'";

connection.query(sql, (err, result) => {
  if (err) {
    console.error("❌ Error al ejecutar la actualización:", err.message);
  } else {
    console.log(`✅ Proceso completado.`);
    console.log(`📊 Usuarios actualizados: ${result.affectedRows}`);
    if (result.affectedRows > 0) {
      console.log("Ahora todos tus administradores tienen el rol 'Admin' correctamente.");
    }
  }
  connection.end();
=======
const mysql = require("mysql2");
require("dotenv").config();

const connection = mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "mibodeguita",
});

console.log("--- NORMALIZANDO ROLES DE ADMINISTRADOR ---");

// Esta consulta busca cualquier variación de 'admin' (Admin, admin, ADMIN, etc.) 
// y lo cambia exactamente a 'Admin'
const sql = "UPDATE usuarios SET Rol = 'Admin' WHERE LOWER(TRIM(Rol)) = 'admin'";

connection.query(sql, (err, result) => {
  if (err) {
    console.error("❌ Error al ejecutar la actualización:", err.message);
  } else {
    console.log(`✅ Proceso completado.`);
    console.log(`📊 Usuarios actualizados: ${result.affectedRows}`);
    if (result.affectedRows > 0) {
      console.log("Ahora todos tus administradores tienen el rol 'Admin' correctamente.");
    }
  }
  connection.end();
>>>>>>> 13e69faebb8a7ba55613f4029cae9fc038cf582b
});