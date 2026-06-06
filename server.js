const express = require("express");
require("dotenv").config();
const cors = require("cors");
const mysql = require("mysql2"); // Usar mysql2
const path = require("path");
const helmet = require("helmet");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const app = express();
const port = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error("ERROR CRÍTICO: JWT_SECRET no está definido. Crea un archivo .env en la raíz y añade JWT_SECRET=tu_clave_secreta_aqui");
  process.exit(1);
}

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      // Permitimos que el navegador cargue scripts de nuestro servidor y del CDN de Chart.js
      "script-src": ["'self'", "https://cdn.jsdelivr.net", "https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"],
    },
  },
}));
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim()) : "*",
  methods: ["GET", "POST", "PUT", "DELETE"]
}));
app.use(express.json());

// Servir archivos estáticos desde la carpeta 'src'
app.use(express.static(path.join(__dirname, "src")));

// Rutas específicas antes de archivos estáticos
app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "src", "login.html"));
});

app.get("/dashboard", (req, res) => {
  res.sendFile(path.join(__dirname, "src", "index.html"));
});

// Conexión a la base de datos MySQL
const dbHost = (process.env.DB_HOST || process.env.MYSQLHOST || "localhost").trim();
const dbPort = Number(process.env.DB_PORT || process.env.MYSQLPORT || 3306);
const dbUser = (process.env.DB_USER || process.env.MYSQLUSER || "root").trim();
const dbPassword = process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || "";
const dbName = (process.env.DB_NAME || process.env.MYSQLDATABASE || "mibodeguita").trim();

// Inicializamos el pool directamente con la base de datos definida
let pool = mysql.createPool({
  host: dbHost,
  port: dbPort,
  user: dbUser,
  password: dbPassword,
  database: dbName,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000 // 10 segundos
});

// Manejador de errores global para el pool para evitar caídas por conexiones inactivas
pool.on('error', (err) => {
  console.error('Error inesperado en el pool de MySQL:', err);
  if (err.code === 'ECONNRESET') {
    console.warn('La conexión fue reiniciada por el servidor. El pool gestionará la reconexión.');
  }
});

console.log("MySQL config:", {
  host: dbHost,
  port: dbPort,
  user: dbUser,
  database: dbName,
});
function initDatabase(callback) {
  // 1. Inicializar las tablas si no existen en MySQL
  pool.query(`CREATE TABLE IF NOT EXISTS usuarios (
    UsuarioID INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    Rol VARCHAR(50) NOT NULL,
    password VARCHAR(255) NOT NULL
  )`, (err) => {
    if (err) {
      console.error("Error creando tabla usuarios:", err);
      process.exit(1);
    }

    pool.query(`CREATE TABLE IF NOT EXISTS productos (
      ProductoID INT PRIMARY KEY AUTO_INCREMENT,
      nombre VARCHAR(255) NOT NULL,
      categoria VARCHAR(255),
      cantidad INT DEFAULT 0,
      ubicacion VARCHAR(255),
      ingreso DATE,
      vencimiento DATE
    )`, (err) => {
      if (err) {
        console.error("Error creando tabla productos:", err);
        process.exit(1);
      }

      pool.query(`CREATE TABLE IF NOT EXISTS movimientos (
        MovimientoID INT PRIMARY KEY AUTO_INCREMENT,
        ProductoID INT,
        Tipo VARCHAR(50) NOT NULL,
        Cantidad INT NOT NULL,
        Fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UsuarioID INT NULL,
        FOREIGN KEY (ProductoID) REFERENCES productos(ProductoID),
        FOREIGN KEY (UsuarioID) REFERENCES usuarios(UsuarioID)
      )`, (err) => {
        if (err) {
          console.error("Error creando tabla movimientos:", err);
          process.exit(1);
        }

        // Ejecutar migración para añadir la columna UsuarioID si ya existiera la tabla sin ella
        pool.query(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
                    WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'movimientos' AND COLUMN_NAME = 'UsuarioID'`, [dbName], (checkErr, checkRes) => {
          if (!checkErr && (!checkRes || checkRes.length === 0)) {
            console.log("Migrando tabla movimientos: añadiendo columna UsuarioID...");
            pool.query(`ALTER TABLE movimientos ADD COLUMN UsuarioID INT NULL, ADD CONSTRAINT fk_movimiento_usuario FOREIGN KEY (UsuarioID) REFERENCES usuarios(UsuarioID)`, (alterErr) => {
              if (alterErr) {
                console.error("Advertencia: No se pudo agregar la columna UsuarioID a movimientos:", alterErr.message);
              } else {
                console.log("Columna UsuarioID agregada con éxito a la tabla movimientos.");
              }
            });
          }
        });

        pool.query(`CREATE TABLE IF NOT EXISTS configuracion (
          ConfigID INT PRIMARY KEY AUTO_INCREMENT,
          NombreBodega VARCHAR(255) DEFAULT 'Mi Bodeguita',
          Tema VARCHAR(50) DEFAULT 'Claro',
          Direccion VARCHAR(255),
          Telefono VARCHAR(50),
          EmailContacto VARCHAR(255),
          StockCritico INT DEFAULT 10,
          DiasVencimiento INT DEFAULT 30
        )`, (err) => {
          if (err) {
            console.error("Error creando tabla configuracion:", err);
            process.exit(1);
          }

          // Insertar configuración inicial si la tabla está vacía
          pool.query("SELECT count(*) as count FROM configuracion", (countErr, results) => {
            if (!countErr && (!results || results[0].count === 0)) {
              console.log("Inicializando tabla de configuración...");
              pool.query("INSERT INTO configuracion (NombreBodega, Tema, Direccion, Telefono, EmailContacto, StockCritico, DiasVencimiento) VALUES (?, ?, ?, ?, ?, ?, ?)", 
              ["Mi Bodeguita", "Claro", "Calle Principal 123", "(123) 456-7890", "info@bodega.com", 10, 30]);
            }
          });

          // 2. Asegurar que exista un admin inicial para login
          pool.query("SELECT count(*) as count FROM usuarios WHERE email = 'admin@bodega.com'", (err, results) => {
            if (err) {
              console.error("Error checking users count:", err);
              if (callback) callback();
              return;
            }
            if (Number(results[0].count) === 0) {
              console.log("Creando usuario admin por defecto...");
              bcrypt.hash("admin123", 10, (hashErr, hashedPassword) => {
                if (hashErr) {
                  console.error("Error hashing admin password:", hashErr);
                  return;
                }
                pool.query(
                  "INSERT INTO usuarios (nombre, email, Rol, password) VALUES (?, ?, ?, ?)",
                  ["Administrador", "admin@bodega.com", "Admin", hashedPassword],
                  (insertErr) => {
                    if (insertErr) {
                      console.error("Error inserting admin user:", insertErr);
                    } else {
                      console.log("Usuario admin por defecto creado (admin@bodega.com/admin123)");
                    }
                    if (callback) callback();
                  }
                );
              });
            } else {
              if (callback) callback();
            }
          });
        });
      });
    });
  });
}

function startServer() {
  app.listen(port, "0.0.0.0", () => {
    console.log(`Server running at http://localhost:${port}`);
  });
}

function connectAndStart() {
  console.log(`Intentando conectar a MySQL en ${dbHost}:${dbPort}...`);
  pool.getConnection((err, connection) => {
    if (err) {
      // Si el error es que la DB no existe (común en entorno local), intentamos crearla
      if (err.code === 'ER_BAD_DB_ERROR') {
        console.log("La base de datos no existe. Intentando crearla (solo entorno local)...");
        const tempConn = mysql.createConnection({
          host: dbHost,
          port: dbPort,
          user: dbUser,
          password: dbPassword
        });

        tempConn.query(`CREATE DATABASE IF NOT EXISTS ${mysql.escapeId(dbName)}`, (createErr) => {
          tempConn.end();
          if (createErr) {
            console.error("Error fatal: No se pudo crear ni conectar a la DB:", createErr.message);
            process.exit(1);
          }
          console.log("Base de datos creada. Inicializando...");
          initDatabase(startServer);
        });
        return;
      }
      console.error("Error de conexión a MySQL:", err.message);
      if (dbHost.includes('.internal')) {
        console.warn("\n💡 TIP: Estás intentando usar un host '.internal'.");
        console.warn("Si estás ejecutando el servidor localmente, necesitas usar el Host Público y Puerto de Railway.\n");
      }
      process.exit(1);
    }
    connection.release();
    console.log("Conexión a MySQL establecida correctamente.");
    initDatabase(startServer);
  });
}

// ----------------------------------------------------------------------
// AUTENTICACIÓN
// ----------------------------------------------------------------------

// POST Login
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: "Email y contraseña son requeridos" });
  }

  pool.query(
    "SELECT UsuarioID, nombre, email, Rol, password FROM usuarios WHERE email = ?",
    [email],
    async (err, results) => {
      if (err) {
        console.error("Error querying user:", err);
        return res.status(500).json({ message: "Error interno del servidor" });
      }
      const user = results[0];
      if (!user) {
        console.log(`Intento de login fallido: usuario no encontrado (${email})`);
        return res.status(401).json({ message: "Usuario no registrado o credenciales incorrectas" });
      }

      // Detectar el rol de forma segura y normalizada
      const userRole = (user.Rol || user.rol || "").trim();
      
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        console.log(`Intento de login fallido: contraseña incorrecta para ${email}`);
        return res.status(401).json({ message: "Credenciales incorrectas" });
      }

      console.log(`Login exitoso para ${email}. Rol detectado: "${userRole}"`);

      const token = jwt.sign(
        { userId: user.UsuarioID, email: user.email, rol: userRole, role: userRole },
        JWT_SECRET,
        { expiresIn: "24h" }
      );
      res.json({ token, user: { id: user.UsuarioID, nombre: user.nombre, email: user.email, rol: userRole, role: userRole } });
    }
  );
});

// GET Verificar Token
app.get("/api/verify", (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Token no proporcionado" });
  }
  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ valid: true, user: decoded });
  } catch (e) {
    res.status(401).json({ message: "Token inválido" });
  }
});

// Middleware para proteger rutas (opcional)
function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Acceso denegado" });
  }
  const token = authHeader.substring(7);
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    
    // Log para reconocer quién accede a qué dirección
    const currentRole = (req.user.rol || req.user.role || "Invitado").toUpperCase();
    console.log(`Acceso: [${currentRole}] ${req.user.email} -> ${req.method} ${req.originalUrl}`);
    
    next();
  } catch (err) {
    const message = err.name === 'TokenExpiredError' 
      ? "Sesión expirada. Por favor, inicia sesión de nuevo." 
      : "Token inválido o corrupto.";
    console.error(`Auth Error [${err.name}]:`, err.message);
    res.status(401).json({ message });
  }
}

// POST Cambiar Contraseña (Usuario propio)
app.post("/api/me/password", authenticateToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.userId;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: "La contraseña actual y la nueva son requeridas." });
  }

  // Validación de seguridad de contraseña nueva en backend
  if (newPassword.trim().length < 6) {
    return res.status(400).json({ error: "La nueva contraseña debe tener al menos 6 caracteres." });
  }

  pool.query("SELECT password FROM usuarios WHERE UsuarioID = ?", [userId], async (err, results) => {
    if (err || results.length === 0) {
      return res.status(500).json({ error: "Error al verificar el usuario." });
    }

    const user = results[0];
    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) {
      return res.status(401).json({ error: "La contraseña actual es incorrecta." });
    }

    try {
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);
      pool.query("UPDATE usuarios SET password = ? WHERE UsuarioID = ?", [hashedNewPassword, userId], (updateErr) => {
        if (updateErr) {
          return res.status(500).json({ error: "Error al actualizar la contraseña." });
        }
        res.json({ message: "Contraseña actualizada con éxito." });
      });
    } catch (hashError) {
      res.status(500).json({ error: "Error al procesar la nueva contraseña." });
    }
  });
});

// Middleware para verificar múltiples roles autorizados
function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "No autenticado. Por favor, inicia sesión." });
    }

    const role = (req.user.rol || req.user.role || "").toString().trim().toLowerCase();
    const isAllowed = allowedRoles.some(allowed => allowed.toLowerCase() === role);

    if (!isAllowed) {
      console.warn(`[BLOQUEO] Acceso denegado por rol. Usuario: ${req.user.email} | Rol: "${role}" | Roles permitidos: ${allowedRoles.join(", ")}`);
      return res.status(403).json({ 
        error: `Acceso denegado. Tu rol "${role.toUpperCase()}" no tiene permisos suficientes para usar este recurso.` 
      });
    }
    next();
  };
}

// Middleware para verificar rol de administrador (compatible hacia atrás)
function requireAdmin(req, res, next) {
  requireRole(["Admin"])(req, res, next);
}

// ----------------------------------------------------------------------
// API rutas para configuración
// ----------------------------------------------------------------------

// GET Configuración (Protegida)
app.get("/api/configuracion", authenticateToken, (req, res) => {
  pool.query("SELECT * FROM configuracion LIMIT 1", (err, results) => {
    if (err) return res.status(500).json({ error: "Error al obtener la configuración" });
    res.json(results[0] || {});
  });
});

// PUT Actualizar Configuración (Solo Admin)
app.put("/api/configuracion", authenticateToken, requireAdmin, (req, res) => {
  const data = req.body;
  // Mitigación de Inyección SQL: Whitelist de campos permitidos
  const allowedFields = ["NombreBodega", "Tema", "Direccion", "Telefono", "EmailContacto", "StockCritico", "DiasVencimiento"];
  const keys = Object.keys(data).filter(key => allowedFields.includes(key));
  
  if (keys.length === 0) return res.status(400).json({ error: "No hay datos para actualizar" });

  const setClauses = keys.map(k => `${k} = ?`).join(", ");
  const values = keys.map(k => data[k]);

  pool.query(`UPDATE configuracion SET ${setClauses} ORDER BY ConfigID ASC LIMIT 1`, values, (err, result) => {
    if (err) {
      console.error("Error en update config:", err.message);
      return res.status(500).json({ error: "Error al actualizar la configuración en la base de datos" });
    }
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "No se encontró ninguna configuración para actualizar." });
    }

    res.json({ message: "Configuración actualizada correctamente" });
  });
});

// ----------------------------------------------------------------------
// API routes for usuarios
// ----------------------------------------------------------------------

// GET todos los Usuarios
app.get("/api/usuarios", authenticateToken, requireAdmin, (req, res) => {
  pool.query(
    "SELECT UsuarioID, nombre, email, Rol FROM usuarios",
    (err, results) => {
      if (err) {
        console.error("Error querying usuarios:", err);
        return res.status(500).json({ error: "Error al obtener los usuarios" });
      }
      res.json(results);
    }
  );
});

// POST Nuevo Usuario
app.post("/api/usuarios", authenticateToken, requireAdmin, async (req, res) => {
  let { nombre, email, Rol, rol, password } = req.body;

  // Soporte para ambos nombres de campo 'Rol' y 'rol' desde el frontend
  let roleToSave = Rol || rol;

  if (!nombre || !email || !roleToSave || !password) {
    return res.status(400).json({ error: "Todos los campos son obligatorios" });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: "La contraseña debe tener al menos 6 caracteres" });
  }

  // Normalizar Rol para asegurar consistencia (Admin, Bodeguero, Visor)
  roleToSave = roleToSave.toString().trim();
  roleToSave = roleToSave.charAt(0).toUpperCase() + roleToSave.slice(1).toLowerCase();

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const sql =
      "INSERT INTO usuarios (nombre, email, Rol, password) VALUES (?, ?, ?, ?)";
    const params = [nombre, email, roleToSave, hashedPassword];

    pool.query(sql, params, (err, result) => {
      if (err) {
        console.error("Error inserting usuario:", err);
        // Error 500 podría indicar una violación de UNIQUE (email)
        return res
          .status(400)
          .json({ error: "Error al crear el usuario. El correo podría estar ya registrado." });
      }
      res.json({
        message: "Usuario creado correctamente",
        id: result.insertId,
      });
    });
  } catch (error) {
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// GET Usuario
app.get("/api/usuarios/:id", authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  pool.query(
    "SELECT UsuarioID, nombre, email, Rol FROM usuarios WHERE UsuarioID = ?",
    [id],
    (err, results) => {
      if (err) {
        console.error("Error querying usuario:", err);
        return res.status(500).json({ error: "Error al obtener el usuario" });
      }
      const result = results[0];
      if (!result) {
        return res.status(404).json({ error: "Usuario no encontrado" });
      }
      res.json(result);
    }
  );
});

// PUT Actualizar Usuario
app.put("/api/usuarios/:id", authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  let userData = req.body;

  // Mapear 'rol' a 'Rol' si es necesario para consistencia con la DB
  const inputRol = userData.Rol || userData.rol;
  if (inputRol) {
    userData.Rol = inputRol;
    if (userData.rol) delete userData.rol;
  }

  // Si se proporciona una nueva contraseña, se hashea
  if (userData.password) {
    if (userData.password.length < 6) {
      return res.status(400).json({ error: "La nueva contraseña debe tener al menos 6 caracteres" });
    }
    try {
      userData.password = await bcrypt.hash(userData.password, 10);
    } catch (error) {
      return res
        .status(500)
        .json({ error: "Error al encriptar la contraseña" });
    }
  }

  // Normalizar Rol si se proporciona para mantener la consistencia visual y de permisos
  if (userData.Rol) {
    userData.Rol = userData.Rol.toString().trim();
    userData.Rol = userData.Rol.charAt(0).toUpperCase() + userData.Rol.slice(1).toLowerCase();
  }

  // Mitigación de Inyección SQL: Whitelist de campos permitidos
  const allowedFields = ["nombre", "email", "Rol", "password"];
  const keys = Object.keys(userData).filter(key => allowedFields.includes(key));
  
  const setClauses = keys.map((key) => `${key} = ?`).join(", ");
  const params = keys.map((key) => userData[key]);
  params.push(id); // Añadir el ID al final para la cláusula WHERE

  if (keys.length === 0) {
    return res.status(400).json({ error: "No hay datos para actualizar" });
  }

  const sql = `UPDATE usuarios SET ${setClauses} WHERE UsuarioID = ?`;

  pool.query(sql, params, (err, result) => {
    if (err) {
      console.error("Error updating usuario:", err);
      return res.status(500).json({ error: "Error al actualizar el usuario" });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }
    res.json({ message: "Usuario actualizado correctamente" });
  });
});

// DELETE Usuario
app.delete("/api/usuarios/:id", authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  pool.query("DELETE FROM usuarios WHERE UsuarioID = ?", [id], (err, result) => {
    if (err) {
      console.error("Error deleting usuario:", err);
      return res.status(500).json({ error: "Error al eliminar el usuario" });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }
    res.json({ message: "Usuario eliminado correctamente" });
  });
});

// ----------------------------------------------------------------------
// API/Rutas
// ----------------------------------------------------------------------

// Obtener Productos (Protegida)
app.get("/api/productos", authenticateToken, (req, res) => {
  pool.query("SELECT * FROM productos", (err, results) => {
    if (err) {
      console.error("Error querying productos:", err);
      return res.status(500).json({ error: "Error al obtener los productos" });
    }
    res.json(results);
  });
});

// GET Productos Vencimiento Próximo (Protegida)
// IMPORTANTE: debe definirse antes de la ruta parametrizada `/api/productos/:id`
// para evitar que Express trate `vencimiento` como un `:id` y se produzcan colisiones.
app.get("/api/productos/vencimiento", authenticateToken, (req, res) => {
  const DIAS_PARA_VENCER_UMBRAL = 30;
  const query = `
    SELECT ProductoID, nombre, categoria, cantidad, vencimiento
    FROM productos
    WHERE vencimiento BETWEEN CURRENT_DATE() AND DATE_ADD(CURRENT_DATE(), INTERVAL ${DIAS_PARA_VENCER_UMBRAL} DAY)
    AND cantidad > 0
    ORDER BY vencimiento ASC
  `;

  pool.query(query, (err, results) => {
    if (err) {
      console.error("Error querying productos por vencer:", err);
      return res
        .status(500)
        .json({ error: "Error al obtener los productos por vencer" });
    }
    res.json(results);
  });
});

// Obtener un Producto (Protegida)
app.get("/api/productos/:id", authenticateToken, (req, res) => {
  const { id } = req.params;
  pool.query(
    "SELECT * FROM productos WHERE ProductoID = ?",
    [id],
    (err, results) => {
      if (err) {
        console.error("Error querying producto:", err);
        return res.status(500).json({ error: "Error al obtener el producto" });
      }
      const result = (results && results.length > 0) ? results[0] : null;
      if (!result) {
        return res.status(404).json({ error: "Producto no encontrado" });
      }
      res.json(result);
    }
  );
});

// POST Nuevo Producto
app.post("/api/productos", authenticateToken, requireAdmin, (req, res) => {
  const nuevoProducto = req.body;

  // Convertir strings vacíos a null para evitar valores por defecto en MySQL
  if (nuevoProducto.vencimiento === "") nuevoProducto.vencimiento = null;
  if (nuevoProducto.ingreso === "") nuevoProducto.ingreso = null;

  const allowedFields = ["nombre", "categoria", "cantidad", "ubicacion", "ingreso", "vencimiento"];
  const keys = Object.keys(nuevoProducto).filter(key => allowedFields.includes(key));
  
  const placeholders = keys.map(() => "?").join(", ");
  const sql = `INSERT INTO productos (${keys.join(", ")}) VALUES (${placeholders})`;
  const params = keys.map((key) => nuevoProducto[key]);

  pool.query(sql, params, (err, result) => {
    if (err) {
      console.error("Error inserting producto:", err);
      return res.status(500).json({ error: "Error al agregar el producto" });
    }
    res.json({
      message: "Producto agregado correctamente",
      id: result.insertId,
    });
  });
});

// PUT Actualizar Producto
app.put("/api/productos/:id", authenticateToken, requireAdmin, (req, res) => {

  const { id } = req.params;
  const updatedProducto = req.body;

  // Asegurar que las fechas vacías se guarden como NULL
  if (updatedProducto.vencimiento === "") updatedProducto.vencimiento = null;
  if (updatedProducto.ingreso === "") updatedProducto.ingreso = null;

  const allowedFields = ["nombre", "categoria", "cantidad", "ubicacion", "ingreso", "vencimiento"];
  const keys = Object.keys(updatedProducto).filter(key => allowedFields.includes(key));
  
  const setClauses = keys.map((key) => `${key} = ?`).join(", ");
  const params = keys.map((key) => updatedProducto[key]);
  params.push(id);

  if (keys.length === 0) {
    return res.status(400).json({ error: "No hay datos para actualizar" });
  }

  const sql = `UPDATE productos SET ${setClauses} WHERE ProductoID = ?`;

  pool.query(sql, params, (err, result) => {
    if (err) {
      console.error("Error updating producto:", err);
      return res.status(500).json({ error: "Error al actualizar el producto" });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }
    res.json({ message: "Producto actualizado correctamente" });
  });
});

// Borrar Producto
app.delete("/api/productos/:id", authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  pool.query("DELETE FROM productos WHERE ProductoID = ?", [id], (err, result) => {
    if (err) {
      console.error("Error deleting producto:", err);
      return res.status(500).json({ error: "Error al eliminar el producto" });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }
    res.json({ message: "Producto eliminado correctamente" });
  });
});

// ----------------------------------------------------------------------
// API rutas para movimientos (Entradas/Salidas)
// ----------------------------------------------------------------------

// POST Entrada
app.post("/api/entradas", authenticateToken, requireRole(["Admin", "Bodeguero"]), (req, res) => {
  const { nombreProductoEntrada, cantidadProductoEntrada } = req.body;

  if (!nombreProductoEntrada || !cantidadProductoEntrada) {
    return res
      .status(400)
      .json({ error: "Se requiere el producto y la cantidad." });
  }

  const cantidad = parseInt(cantidadProductoEntrada, 10);
  if (isNaN(cantidad) || cantidad <= 0) {
    return res
      .status(400)
      .json({ error: "La cantidad debe ser un número positivo." });
  }

  pool.getConnection((err, connection) => {
    if (err) {
      console.error("Error obteniendo conexión MySQL:", err);
      return res.status(500).json({ error: "Error de conexión." });
    }

    connection.beginTransaction((err) => {
      if (err) {
        connection.release();
        console.error("Error iniciando transacción:", err);
        return res.status(500).json({ error: "Error iniciando transacción." });
      }

      connection.query(
        "SELECT cantidad FROM productos WHERE ProductoID = ?",
        [nombreProductoEntrada],
        (err, results) => {
          if (err) {
            return connection.rollback(() => {
              connection.release();
              console.error("Error verificando producto:", err);
              res.status(500).json({ error: "Error verificando stock." });
            });
          }

          const product = (results && results.length > 0) ? results[0] : null;
          if (!product) {
            return connection.rollback(() => {
              connection.release();
              res.status(404).json({ error: "Producto no encontrado." });
            });
          }

          connection.query(
            "UPDATE productos SET cantidad = cantidad + ? WHERE ProductoID = ?",
            [cantidad, nombreProductoEntrada],
            (err) => {
              if (err) {
                return connection.rollback(() => {
                  connection.release();
                  console.error("Error actualizando stock:", err);
                  res.status(500).json({ error: "Error al actualizar el stock." });
                });
              }

              connection.query(
                "INSERT INTO movimientos (ProductoID, Tipo, Cantidad, UsuarioID) VALUES (?, ?, ?, ?)",
                [nombreProductoEntrada, "Entrada", cantidad, req.user.userId],
                (err) => {
                  if (err) {
                    return connection.rollback(() => {
                      connection.release();
                      console.error("Error registrando movimiento:", err);
                      res.status(500).json({ error: "Error al registrar el movimiento." });
                    });
                  }

                  connection.commit((err) => {
                    if (err) {
                      return connection.rollback(() => {
                        connection.release();
                        console.error("Error confirming transaction:", err);
                        res.status(500).json({ error: "Error al confirmar la transacción." });
                      });
                    }

                    connection.release();
                    res.json({ message: "Entrada de stock registrada correctamente." });
                  });
                }
              );
            }
          );
        }
      );
    });
  });
});

// POST Salida
app.post("/api/salidas", authenticateToken, requireRole(["Admin", "Bodeguero"]), (req, res) => {
  const { nombreProductoSalida, cantidadProductoSalida } = req.body;

  if (!nombreProductoSalida || !cantidadProductoSalida) {
    return res
      .status(400)
      .json({ error: "Se requiere el producto y la cantidad." });
  }

  const cantidad = parseInt(cantidadProductoSalida, 10);
  if (isNaN(cantidad) || cantidad <= 0) {
    return res
      .status(400)
      .json({ error: "La cantidad debe ser un número positivo." });
  }

  pool.getConnection((err, connection) => {
    if (err) return res.status(500).json({ error: "Error de conexión." });

    connection.beginTransaction((err) => {
      if (err) { connection.release(); return res.status(500).json({ error: "Error iniciando transacción." }); }

      // 1. Verificar stock
      connection.query(
        "SELECT cantidad FROM productos WHERE ProductoID = ?",
        [nombreProductoSalida],
        (err, results) => {
          const result = (results && results.length > 0) ? results[0] : null;
          if (err || !result || result.cantidad < cantidad) {
            return connection.rollback(() => {
              connection.release();
              res.status(err ? 500 : (result ? 400 : 404)).json({ 
                error: err ? "Error verificando stock." : (result ? `Stock insuficiente. Solo quedan ${result.cantidad} unidades.` : "Producto no encontrado.") 
              });
            });
          }

          // 2. Actualizar stock
          connection.query(
            "UPDATE productos SET cantidad = cantidad - ? WHERE ProductoID = ?",
            [cantidad, nombreProductoSalida],
            (err) => {
              if (err) {
                return connection.rollback(() => {
                  connection.release();
                  res.status(500).json({ error: "Error actualizando stock." });
                });
              }

              // 3. Registrar movimiento
              connection.query(
                "INSERT INTO movimientos (ProductoID, Tipo, Cantidad, UsuarioID) VALUES (?, ?, ?, ?)",
                [nombreProductoSalida, "Salida", cantidad, req.user.userId],
                (err) => {
                  if (err) {
                    return connection.rollback(() => {
                      connection.release();
                      res.status(500).json({ error: "Error al registrar el movimiento." });
                    });
                  }

                  connection.commit((err) => {
                    if (err) {
                      return connection.rollback(() => {
                        connection.release();
                        res.status(500).json({ error: "Error al confirmar transacción." });
                      });
                    }
                    connection.release();
                    res.json({ message: "Salida de stock registrada correctamente." });
                  });
                }
              );
            }
          );
        }
      );
    });
  });
});

// GET Movimientos Recientes (Protegida con Trazabilidad)
app.get("/api/movimientos", authenticateToken, (req, res) => {
  const { tipo, inicio, fin } = req.query;
  let sql = `
    SELECT m.Tipo, m.Cantidad, m.Fecha, p.nombre AS ProductoNombre, u.nombre AS UsuarioNombre
    FROM movimientos m
    JOIN productos p ON m.ProductoID = p.ProductoID
    LEFT JOIN usuarios u ON m.UsuarioID = u.UsuarioID
  `;
  const params = [];
  const conditions = [];

  if (tipo) {
    conditions.push("m.Tipo = ?");
    params.push(tipo.charAt(0).toUpperCase() + tipo.slice(1).toLowerCase());
  }
  if (inicio) {
    conditions.push("m.Fecha >= ?");
    params.push(inicio + " 00:00:00");
  }
  if (fin) {
    conditions.push("m.Fecha <= ?");
    params.push(fin + " 23:59:59");
  }

  if (conditions.length > 0) {
    sql += " WHERE " + conditions.join(" AND ");
  }

  sql += " ORDER BY m.Fecha DESC";

  // Si no hay filtros (página principal), limitamos a 5
  if (!tipo && !inicio && !fin) {
    sql += " LIMIT 5";
  }

  pool.query(sql, params, (err, results) => {
    if (err) {
      console.error("Error querying movimientos:", err);
      return res
        .status(500)
        .json({ error: "Error al obtener los movimientos" });
    }
    res.json(results);
  });
});

// ----------------------------------------------------------------------
// HTML Rutas (No han cambiado)
// ----------------------------------------------------------------------

// Handle Chrome DevTools request
app.get("/.well-known/appspecific/com.chrome.devtools.json", (req, res) => {
  res.status(404).send();
});

// Serve the main HTML file

app.get("/", (req, res) => {
  res.redirect('/login');
});

// Routes for other HTML pages
app.get("/usuarios", (req, res) => {
  res.sendFile(path.join(__dirname, "src", "usuarios.html"));
});

app.get("/inventario", (req, res) => {
  res.sendFile(path.join(__dirname, "src", "inventario.html"));
});

app.get("/agregar-producto", (req, res) => {
  res.sendFile(path.join(__dirname, "src", "agregar-producto.html"));
});

app.get("/configuracion", (req, res) => {
  res.sendFile(path.join(__dirname, "src", "configuracion.html"));
});

app.get("/entrada", (req, res) => {
  res.sendFile(path.join(__dirname, "src", "entrada.html"));
});

app.get("/reportes", (req, res) => {
  res.sendFile(path.join(__dirname, "src", "reportes.html"));
});

app.get("/salida", (req, res) => {
  res.sendFile(path.join(__dirname, "src", "salida.html"));
});

// Iniciar Servidor solo después de validar conexión MySQL
if (require.main === module) {
  connectAndStart();
}

module.exports = app; // Exportar para pruebas
