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

console.log("--- INICIANDO DIAGNÓSTICO DE PERMISOS ---");

connection.query("SELECT UsuarioID, nombre, email, Rol FROM usuarios", (err, results) => {
  if (err) {
    console.error("Error al consultar usuarios:", err.message);
    process.exit(1);
  }

  console.log("\nUsuarios registrados en la base de datos:");
  console.table(results);

  const admins = results.filter(u => u.Rol.toLowerCase() === 'admin');
  
  if (admins.length === 0) {
    console.log("❌ ERROR CRÍTICO: No se encontró ningún usuario con rol 'Admin' o 'admin'.");
    console.log("Sin un administrador en la tabla, las acciones protegidas siempre darán 'Acceso denegado'.");
  } else {
    admins.forEach(admin => {
      if (admin.Rol !== 'Admin') {
        console.log(`⚠️ AVISO: El usuario ${admin.email} tiene el rol "${admin.Rol}" (en minúsculas o con espacios).`);
        console.log(`   Aunque el servidor ahora es tolerante, se recomienda cambiarlo a "Admin" exactamente.`);
      } else {
        console.log(`✅ OK: El usuario ${admin.email} tiene el rol correcto: "Admin".`);
      }
    });
  }
  
  console.log("\n--- FIN DEL DIAGNÓSTICO ---");
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

console.log("--- INICIANDO DIAGNÓSTICO DE PERMISOS ---");

connection.query("SELECT UsuarioID, nombre, email, Rol FROM usuarios", (err, results) => {
  if (err) {
    console.error("Error al consultar usuarios:", err.message);
    process.exit(1);
  }

  console.log("\nUsuarios registrados en la base de datos:");
  console.table(results);

  const admins = results.filter(u => u.Rol.toLowerCase() === 'admin');
  
  if (admins.length === 0) {
    console.log("❌ ERROR CRÍTICO: No se encontró ningún usuario con rol 'Admin' o 'admin'.");
    console.log("Sin un administrador en la tabla, las acciones protegidas siempre darán 'Acceso denegado'.");
  } else {
    admins.forEach(admin => {
      if (admin.Rol !== 'Admin') {
        console.log(`⚠️ AVISO: El usuario ${admin.email} tiene el rol "${admin.Rol}" (en minúsculas o con espacios).`);
        console.log(`   Aunque el servidor ahora es tolerante, se recomienda cambiarlo a "Admin" exactamente.`);
      } else {
        console.log(`✅ OK: El usuario ${admin.email} tiene el rol correcto: "Admin".`);
      }
    });
  }
  
  console.log("\n--- FIN DEL DIAGNÓSTICO ---");
  connection.end();
>>>>>>> 13e69faebb8a7ba55613f4029cae9fc038cf582b
});