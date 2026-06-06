<<<<<<< HEAD
const mysql = require("mysql2");
require("dotenv").config();

const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "mibodeguita",
};

const connection = mysql.createConnection(dbConfig);

console.log("Consultando administradores en:", dbConfig.database);

connection.query(
  "SELECT UsuarioID, nombre, email, Rol FROM usuarios WHERE Rol = 'Admin'",
  (err, results) => {
    if (err) {
      console.error("Error al consultar:", err.message);
    } else {
      console.table(results);
    }
    connection.end();
  }
=======
const mysql = require("mysql2");
require("dotenv").config();

const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "mibodeguita",
};

const connection = mysql.createConnection(dbConfig);

console.log("Consultando administradores en:", dbConfig.database);

connection.query(
  "SELECT UsuarioID, nombre, email, Rol FROM usuarios WHERE Rol = 'Admin'",
  (err, results) => {
    if (err) {
      console.error("Error al consultar:", err.message);
    } else {
      console.table(results);
    }
    connection.end();
  }
>>>>>>> 13e69faebb8a7ba55613f4029cae9fc038cf582b
);