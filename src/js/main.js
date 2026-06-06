document.addEventListener("DOMContentLoaded", () => {
  // Configuración dinámica de la URL de la API
  const API_BASE_URL = window.location.origin + "/api";

  // --- AUTENTICACIÓN --- //
  const token = localStorage.getItem("authToken");
  const user = JSON.parse(localStorage.getItem("user") || "null");

  // Función para verificar autenticación
  async function checkAuth() {
    if (!token) {
      // No hay token, redirigir al login
      window.location.href = "/login";
      return false;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/verify`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        // Token inválido, limpiar y redirigir
        logout();
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error verificando autenticación:", error);
      logout();
      return false;
    }
  }

  // Función de logout
  function logout() {
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    window.location.href = "/login";
  }

  // Helper para realizar peticiones HTTP autenticadas
  function fetchAutenticado(url, options = {}) {
    const headers = { ...options.headers };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    return fetch(url, { ...options, headers });
  }

  // Nota: Se eliminó el logout forzado en recarga de página para mantener sesión activa.

  // Verificar autenticación antes de continuar
  checkAuth().then(isAuthenticated => {
    if (!isAuthenticated) return;

    // Continuar con la inicialización normal solo si está autenticado
    initializeApp();
  });

  // Función para aplicar cambios visuales globales (Nombre y Tema)
  function aplicarConfiguracionVisual(config) {
    if (!config) return;

    if (config.NombreBodega) {
      // Actualizar el título de la pestaña y cualquier logo/nombre en el sidebar
      document.title = config.NombreBodega + " - Gestión de Inventario";
      const logoText = document.querySelector(".logo span");
      if (logoText) logoText.textContent = config.NombreBodega;
    }
    
    // Aplicar tema y sincronizar con localStorage para evitar conflictos
    const esOscuro = config.Tema && config.Tema.toLowerCase() === "oscuro";
    if (esOscuro) document.body.classList.add("dark");
    else document.body.classList.remove("dark");
    
    localStorage.setItem("theme", esOscuro ? "dark" : "light");
  }

  function initializeApp() {
    // El resto del código de inicialización va aquí
    const modal = document.getElementById("modal");
    const modalTitle = document.getElementById("modalTitle");
    const modalBody = document.getElementById("modalBody");
    const modalClose = document.getElementById("modalClose");
    const modalContent = document.querySelector(".modal-content");
    const contentArea = document.getElementById("content-area");
    const themeToggle = document.getElementById("themeToggle");

    // Warn if important DOM nodes are missing to avoid runtime errors
    if (!modal || !modalTitle || !modalBody || !modalClose || !modalContent) {
      console.warn('Elementos del modal no encontrados en el DOM. Algunas funciones de UI pueden fallar.');
    }
    if (!contentArea) {
      console.warn('Elemento `content-area` no encontrado en el DOM. El contenido dinámico no cargará.');
    }

    // Cargar configuración global al iniciar
    obtenerConfiguracion().then(config => {
      aplicarConfiguracionVisual(config);
    });

    // Mostrar nombre del usuario en el header
    if (user) {
      const profileElement = document.querySelector(".profile");
      if (profileElement) {
        profileElement.innerHTML = `<i class="fas fa-user"></i> ${user.nombre} <i class="fas fa-caret-down"></i>`;
      }
    }

    // Asegurarse de que el botón de logout tenga el handler
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", logout);
    }

  // --- THEME --- //
  // Se eliminó la carga directa de localStorage aquí para priorizar 
  // obtenerConfiguracion() que ya llama a aplicarConfiguracionVisual()

  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      document.body.classList.toggle("dark");
      const isDark = document.body.classList.contains("dark");
      localStorage.setItem("theme", isDark ? "dark" : "light");
    });
  }

  // --- SIDEBAR TOGGLE --- //
  const sidebarToggle = document.getElementById("sidebarToggle");
  const sidebar = document.querySelector(".sidebar");
  const savedSidebarState = localStorage.getItem("sidebarCollapsed");
  if (savedSidebarState === "true") {
    sidebar.classList.add("collapsed");
  }
  if (sidebarToggle) {
    sidebarToggle.addEventListener("click", () => {
      sidebar.classList.toggle("collapsed");
      const isCollapsed = sidebar.classList.contains("collapsed");
      localStorage.setItem("sidebarCollapsed", isCollapsed);
    });
  }

  // --- MODAL --- //
  function showModal(title, bodyHtml) {
    modalTitle.textContent = title;
    modalBody.innerHTML = bodyHtml;
    modal.classList.remove("hidden");
    modalContent.classList.add("start-animation");
  }
  function hideModal() {
    modalContent.classList.remove("start-animation");
    modal.classList.add("hidden");
  }
  modalClose.addEventListener("click", hideModal);
  window.addEventListener("click", (e) => {
    if (e.target === modal) hideModal();
  });

  // --- GLOBAL HELPERS --- //
  function formatearFecha(fechaString, includeTime = false) {
    if (!fechaString || fechaString === "0000-00-00") return "";
    const fecha = new Date(fechaString);
    if (isNaN(fecha)) return "";

    const options = {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    };

    if (includeTime) {
      options.hour = "2-digit";
      options.minute = "2-digit";
    }

    return fecha.toLocaleString("es-ES", options);
  }

  async function obtenerCategoriasUnicas() {
    try {
      const response = await fetchAutenticado(`${API_BASE_URL}/productos`);
      if (!response.ok) throw new Error("No se pudo obtener la lista de productos.");
      const productos = await response.json();
      const categorias = new Set();

      productos.forEach((p) => {
        let categoria = (p.categoria || "").trim();
        if (categoria) {
          // Normalizar para evitar duplicados como "Alimentos" y "alimentos"
          categorias.add(categoria.charAt(0).toUpperCase() + categoria.slice(1).toLowerCase());
        }
      });

      const defaultCategorias = [
        "alimentos",
        "bebidas",
        "limpieza",
        "electrónica",
        "herramientas",
        "ropa",
        "juguetes",
        "hogar",
        "muebles",
        "deportes",
        "Salud",
        "Mascotas",
        "Calzado",
        "otros",
      ];

      defaultCategorias.forEach((cat) => {
        const normalized = cat.trim();
        categorias.add(normalized.charAt(0).toUpperCase() + normalized.slice(1).toLowerCase());
      });

      return Array.from(categorias).sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
    } catch (error) {
      console.error("Error cargando categorías:", error);
      return [
        "Alimentos",
        "Bebidas",
        "Limpieza",
        "Electrónica",
        "Herramientas",
        "Ropa",
        "Juguetes",
        "Hogar",
        "Muebles",
        "Deportes",
        "Salud",
        "Mascotas",
        "Calzado",
        "Otros",
      ];
    }
  }

  function poblarCategoriaSelect(select, categorias = [], selected = "") {
    if (!select) return;

    const placeholderValue = "";
    select.innerHTML = "";

    const placeholder = document.createElement("option");
    placeholder.value = placeholderValue;
    placeholder.textContent = "Seleccionar Categoría";
    select.appendChild(placeholder);

    categorias.forEach((categoria) => {
      const option = document.createElement("option");
      option.value = categoria;
      option.textContent = categoria.charAt(0).toUpperCase() + categoria.slice(1);
      select.appendChild(option);
    });

    if (selected) select.value = selected;
  }

  async function obtenerConfiguracion() {
    try {
      const response = await fetchAutenticado(`${API_BASE_URL}/configuracion`);
      if (!response.ok) throw new Error("No se pudo obtener la configuración.");
      return await response.json();
    } catch (error) {
      console.error("Error cargando configuración:", error);
      return { NombreBodega: "Mi Bodeguita", StockCritico: 10, DiasVencimiento: 30 };
    }
  }

  async function actualizarDashboard() {
    try {
      const [productosRes, movimientosRes, configRes] = await Promise.all([
        fetchAutenticado(`${API_BASE_URL}/productos`),
        fetchAutenticado(`${API_BASE_URL}/movimientos`),
        fetchAutenticado(`${API_BASE_URL}/configuracion`),
      ]);

      if (!productosRes.ok || !movimientosRes.ok || !configRes.ok) {
        throw new Error("Error al cargar datos del dashboard");
      }

      const productos = await productosRes.json();
      const movimientos = await movimientosRes.json();
      const config = await configRes.json();

      if (!Array.isArray(productos) || !Array.isArray(movimientos)) {
        console.error("Los datos recibidos no tienen el formato esperado.");
        return;
      }

      const elTotal = document.getElementById("totalProductos");
      const elStock = document.getElementById("stockCritico");
      const elVence = document.getElementById("proximosAVencer");
      const elMovsContenedor = document.getElementById("ultimosMovimientos");

      // Update dashboard cards
      const STOCK_CRITICO_UMBRAL = config.StockCritico || 10;
      const DIAS_PARA_VENCER_UMBRAL = config.DiasVencimiento || 30;
      const hoy = new Date();

      const stockCriticoArray = productos.filter(
        (p) => p.cantidad < STOCK_CRITICO_UMBRAL
      );
      const stockCritico = stockCriticoArray.length;
      const proximosAVencerArray = productos.filter((p) => {
        if (!p.vencimiento) return false;
        const fechaVencimiento = new Date(p.vencimiento);
        const diffTiempo = fechaVencimiento.getTime() - hoy.getTime();
        const diffDias = Math.ceil(diffTiempo / (1000 * 60 * 60 * 24));
        return diffDias > 0 && diffDias <= DIAS_PARA_VENCER_UMBRAL;
      });
      const proximosAVencer = proximosAVencerArray.length;

      if (elTotal) elTotal.textContent = productos.length;
      if (elStock) elStock.textContent = stockCritico;
      if (elVence) elVence.textContent = proximosAVencer;

      // Update movimientos
      if (!elMovsContenedor) return;

      if (movimientos.length === 0) {
        elMovsContenedor.innerHTML = "<p>No hay movimientos recientes.</p>";
        return;
      }

      const lista = document.createElement("ul");
      lista.className = "movimientos-lista";

      movimientos.forEach((mov) => {
        const item = document.createElement("li");
        const tipoClase = mov.Tipo === "Entrada" ? "entrada" : "salida";
        item.innerHTML = `
              <span class="movimiento-tipo ${tipoClase}">${mov.Tipo}</span>
              <span class="movimiento-cantidad">${mov.Cantidad} x</span>
              <span class="movimiento-nombre">${mov.ProductoNombre} <small style="color: var(--text-color); opacity: 0.7;">(${mov.UsuarioNombre || 'N/A'})</small></span>
              <span class="movimiento-fecha">${formatearFecha(
                mov.Fecha,
                true
              )}</span>
          `;
        lista.appendChild(item);
      });
      elMovsContenedor.innerHTML = "";
      elMovsContenedor.appendChild(lista);
    } catch (error) {
      console.error("Error actualizando dashboard:", error);
    }
  }

  // --- DYNAMIC CONTENT LOADING --- //
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  function loadContent(url, section) {
    fetch(url)
      .then((response) => response.text())
      .then((data) => {
        contentArea.innerHTML = data;
        document.getElementById("header-title").textContent =
          section.charAt(0).toUpperCase() + section.slice(1);

        switch (section) {
          case "inventario":
            activarInventario();
            break;
          case "usuarios":
            activarUsuarios();
            break;
          case "entrada":
            activarEntrada();
            break;
          case "salida":
            activarSalida();
            break;
          case "configuracion":
            activarConfiguracion();
            break;
          case "reportes":
            loadScript("https://cdn.jsdelivr.net/npm/chart.js")
              .then(() => {
                activarReportes();
              })
              .catch((error) => {
                console.error("Error loading Chart.js", error);
                contentArea.innerHTML =
                  "<p>Error al cargar la librería de gráficos.</p>";
              });
            break;
        }
      })
      .catch((error) => {
        console.error("Error al cargar la sección:", error);
        contentArea.innerHTML = "<p>Error al cargar la sección.</p>";
      });
  }

  // --- CONFIGURACION LOGIC --- //
  async function activarConfiguracion() {
    const nombreConfig = document.getElementById("nombreConfig");
    const emailConfig = document.getElementById("emailConfig");
    const rolConfig = document.getElementById("rolConfig");
    const btnChangePassword = document.getElementById("btnChangePassword");

    // Poblar datos del usuario desde el localStorage
    if (user) {
      if (nombreConfig) nombreConfig.textContent = user.nombre;
      if (emailConfig) emailConfig.textContent = user.email;
      if (rolConfig) rolConfig.textContent = user.rol || user.role;
    }

    // --- LOGICA AJUSTES GENERALES (BODEGA) ---
    const formAjustes = document.getElementById("formConfiguracion");
    if (formAjustes) {
      const config = await obtenerConfiguracion();
      
      // Poblar campos del formulario si existen en el HTML
      if (formAjustes.nombreBodega) formAjustes.nombreBodega.value = config.NombreBodega || "";
      if (formAjustes.direccionBodega) formAjustes.direccionBodega.value = config.Direccion || "";
      if (formAjustes.telefonoBodega) formAjustes.telefonoBodega.value = config.Telefono || "";
      if (formAjustes.emailBodega) formAjustes.emailBodega.value = config.EmailContacto || "";
      // No forzar a minúsculas si el select en el HTML usa valores capitalizados
      if (formAjustes.temaBodega) formAjustes.temaBodega.value = config.Tema || "Claro";
      if (formAjustes.stockCritico) formAjustes.stockCritico.value = config.StockCritico || 10;
      if (formAjustes.diasVencimiento) formAjustes.diasVencimiento.value = config.DiasVencimiento || 30;

      formAjustes.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const userRole = (user.rol || user.role || "").toLowerCase();
        if (userRole !== "admin") {
          return alert("Solo los administradores pueden cambiar la configuración general.");
        }

        const updatedConfig = {
          NombreBodega: formAjustes.nombreBodega.value.trim(),
          Direccion: formAjustes.direccionBodega.value.trim(),
          Telefono: formAjustes.telefonoBodega.value.trim(),
          EmailContacto: formAjustes.emailBodega.value.trim(),
          Tema: formAjustes.temaBodega.value,
          StockCritico: parseInt(formAjustes.stockCritico.value) || 0,
          DiasVencimiento: parseInt(formAjustes.diasVencimiento.value) || 30
        };

        try {
          const res = await fetch(`${API_BASE_URL}/configuracion`, {
            method: "PUT",
            headers: { 
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(updatedConfig)
          });
          const data = await res.json();
          if (res.ok) {
            alert(data.message);
            aplicarConfiguracionVisual(updatedConfig); // Actualizar UI inmediatamente
            actualizarDashboard(); // Refrescar dashboard con los nuevos umbrales
          } else {
            alert(data.error || "Error al actualizar configuración");
          }
        } catch (err) {
          console.error("Error saving config:", err);
          alert("Error de conexión al guardar cambios.");
        }
      });
    }

    if (btnChangePassword) {
      btnChangePassword.addEventListener("click", () => {
        const formHtml = `
          <form id="formChangePassword" class="form-standard">
            <div class="form-group">
              <label for="currentPassword">Contraseña Actual</label>
              <input type="password" id="currentPassword" required>
            </div>
            <div class="form-group">
              <label for="newPassword">Nueva Contraseña</label>
              <input type="password" id="newPassword" required minlength="6">
            </div>
            <div class="form-group">
              <label for="confirmPassword">Confirmar Nueva Contraseña</label>
              <input type="password" id="confirmPassword" required minlength="6">
            </div>
            <div class="modal-actions" style="margin-top: 1.5rem; display: flex; justify-content: flex-end;">
              <button type="submit" class="btn-primary">Actualizar Contraseña</button>
            </div>
          </form>
        `;
        showModal("Cambiar Contraseña", formHtml);

        document.getElementById("formChangePassword").addEventListener("submit", async (e) => {
          e.preventDefault();
          const currentPassword = document.getElementById("currentPassword").value;
          const newPassword = document.getElementById("newPassword").value;
          const confirmPassword = document.getElementById("confirmPassword").value;

          if (newPassword !== confirmPassword) {
            return alert("Las nuevas contraseñas no coinciden.");
          }

          try {
            const res = await fetch(`${API_BASE_URL}/me/password`, {
              method: "POST",
              headers: { 
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
              },
              body: JSON.stringify({ currentPassword, newPassword })
            });
            const data = await res.json();
            if (res.ok) {
              alert(data.message);
              hideModal();
            } else {
              alert(data.error || "Error al cambiar la contraseña");
            }
          } catch (err) {
            console.error("Error changing password:", err);
            alert("Error de conexión al intentar cambiar la contraseña.");
          }
        });
      });
    }
  }

  // --- REPORTES LOGIC --- //
  async function activarReportes() {
    const formReportes = document.getElementById("formReportes");
    const reporteContainer = document.getElementById("reporteContainer");
    const reporteHeader = document.getElementById("reporteHeader");
    const reporteTitulo = document.getElementById("reporteTitulo");

    // Cargar configuración para el encabezado del reporte
    const config = await obtenerConfiguracion();
    const elNombre = document.getElementById("reporteBodegaNombre");
    const elDireccion = document.getElementById("reporteBodegaDireccion");
    const elContacto = document.getElementById("reporteBodegaContacto");

    if (elNombre) elNombre.textContent = config.NombreBodega || "Mi Bodeguita";
    if (elDireccion) elDireccion.textContent = config.Direccion ? `Dirección: ${config.Direccion}` : "";
    if (elContacto) {
      const tel = config.Telefono || "(123) 456-7890";
      const email = config.EmailContacto || "info@mibodeguita.com";
      elContacto.textContent = `Teléfono: ${tel} | Email: ${email}`;
    }

    const btnImprimir = document.getElementById("btnImprimir");
    const reporteContenido = document.getElementById("reporteContenido");
    const fechaInicioInput = document.getElementById("fechaInicioReporte");
    const fechaFinInput = document.getElementById("fechaFinReporte");
    const tipoReporteSelect = document.getElementById("tipoReporte");

    // Show/hide date fields based on report type
    tipoReporteSelect.addEventListener("change", () => {
      const selected = tipoReporteSelect.value;
      if (selected === "entradas" || selected === "salidas") {
        fechaInicioInput.parentElement.style.display = "block";
        fechaFinInput.parentElement.style.display = "block";
      } else {
        fechaInicioInput.parentElement.style.display = "none";
        fechaFinInput.parentElement.style.display = "none";
      }
    });
    // Trigger change on load
    tipoReporteSelect.dispatchEvent(new Event("change"));

    btnImprimir.addEventListener("click", () => {
      // Remover temporalmente el modo oscuro para asegurar que el texto sea negro sobre papel blanco
      const wasDark = document.body.classList.contains("dark");
      if (wasDark) document.body.classList.remove("dark");

      window.print();

      // Restaurar el modo oscuro si estaba activo
      if (wasDark) document.body.classList.add("dark");
    });

    const btnGenerarPDF = document.getElementById('btnGenerarPDF');
    if (btnGenerarPDF) {
      btnGenerarPDF.addEventListener('click', async () => {
        if (window.electronAPI && window.electronAPI.printToPDF) {
          btnGenerarPDF.disabled = true;
          btnGenerarPDF.textContent = 'Generando PDF...';
          try {
            const res = await window.electronAPI.printToPDF();
            if (res && res.success) {
              alert('PDF generado: ' + res.path);
            } else {
              alert('Error al generar PDF: ' + (res && res.error));
            }
          } catch (err) {
            alert('Error al generar PDF: ' + err.message);
          } finally {
            btnGenerarPDF.disabled = false;
            btnGenerarPDF.textContent = 'Generar PDF';
          }
        } else {
          alert('Función de PDF no disponible (no está corriendo en Electron).');
        }
      });
    }

    formReportes.addEventListener("submit", async function (event) {
      event.preventDefault();
      const tipoReporte = tipoReporteSelect.value;
      const fechaInicio = fechaInicioInput.value;
      const fechaFin = fechaFinInput.value;

      reporteContenido.innerHTML = "<p>Generando reporte...</p>";
      reporteHeader.style.display = "none";

      try {
        let url;
        let data;

        switch (tipoReporte) {
          case "inventario":
            url = `${API_BASE_URL}/productos`;
            const response = await fetchAutenticado(url);
            if (!response.ok) throw new Error("Error al cargar el inventario.");
            data = await response.json();
            renderizarReporteInventario(data);
            break;
          case "entradas":
          case "salidas":
            url = `${API_BASE_URL}/movimientos?tipo=${tipoReporte.slice(
              0,
              -1
            )}&inicio=${fechaInicio}&fin=${fechaFin}`;
            const movResponse = await fetchAutenticado(url);
            if (!movResponse.ok)
              throw new Error(`Error al cargar ${tipoReporte}.`);
            data = await movResponse.json();
            renderizarReporteMovimientos(data, tipoReporte);
            break;
          case "vencimientos":
            url = `${API_BASE_URL}/productos/vencimiento`;
            const vencResponse = await fetchAutenticado(url);
            if (!vencResponse.ok)
              throw new Error("Error al cargar productos por vencer.");
            data = await vencResponse.json();
            renderizarReporteVencimientos(data);
            break;
        }
      } catch (error) {
        reporteContenido.innerHTML = `<p class="error">Error: ${error.message}</p>`;
        console.error("Error al generar reporte:", error);
      }
    });

    function generarGrafico(data, tipoReporte) {
      const ctx = document.getElementById("reporteGrafico").getContext("2d");
      let chartData = {};

      // Destroy previous chart instance if it exists
      if (window.myChart instanceof Chart) {
        window.myChart.destroy();
      }

      switch (tipoReporte) {
        case "inventario":
          const counts = data.reduce((acc, p) => {
            acc[p.categoria] = (acc[p.categoria] || 0) + p.cantidad;
            return acc;
          }, {});

          chartData = {
            labels: Object.keys(counts),
            datasets: [
              {
                data: Object.values(counts),
                backgroundColor: [
                  "#36A2EB", "#FF6384", "#FFCE56", "#4BC0C0", "#9966FF", "#FF9F40"
                ],
                borderWidth: 1,
              },
            ],
          };
          window.myChart = new Chart(ctx, {
            type: "pie",
            data: chartData,
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { position: 'bottom' },
                title: { display: true, text: 'Distribución por Categoría' }
              }
            },
          });
          return; // Saltamos el constructor de barras genérico
          break;
        case "entradas":
        case "salidas":
          const dataAgrupada = data.reduce((acc, m) => {
            const fecha = formatearFecha(m.Fecha);
            acc[fecha] = (acc[fecha] || 0) + m.Cantidad;
            return acc;
          }, {});

          chartData = {
            labels: Object.keys(dataAgrupada),
            datasets: [
              {
                label: `Cantidad de ${tipoReporte}`,
                data: Object.values(dataAgrupada),
                backgroundColor:
                  tipoReporte === "entradas"
                    ? "rgba(75, 192, 192, 0.6)"
                    : "rgba(255, 99, 132, 0.6)",
                borderColor:
                  tipoReporte === "entradas"
                    ? "rgba(75, 192, 192, 1)"
                    : "rgba(255, 99, 132, 1)",
                borderWidth: 1,
              },
            ],
          };
          break;
        case "vencimientos":
          chartData = {
            labels: data.map((p) => p.nombre),
            datasets: [
              {
                label: "Días para Vencer",
                data: data.map((p) => {
                  const hoy = new Date();
                  const fechaVencimiento = new Date(p.vencimiento);
                  const diffTiempo = fechaVencimiento.getTime() - hoy.getTime();
                  return Math.ceil(diffTiempo / (1000 * 60 * 60 * 24));
                }),
                backgroundColor: "rgba(255, 159, 64, 0.6)",
                borderColor: "rgba(255, 159, 64, 1)",
                borderWidth: 1,
              },
            ],
          };
          break;
      }

      window.myChart = new Chart(ctx, {
        type: "bar",
        data: chartData,
        options: {
          scales: {
            y: {
              beginAtZero: true,
            },
          },
          responsive: true,
          maintainAspectRatio: false,
        },
      });
    }

    function renderizarReporteInventario(productos) {
      reporteHeader.style.display = "flex";
      reporteTitulo.textContent = "Reporte de Inventario Actual";
      reporteContenido.innerHTML =
        '<div class="chart-container"><canvas id="reporteGrafico"></canvas></div><div id="tablaReporteContenedor"></div>';

      if (productos.length === 0) {
        reporteContenido.innerHTML =
          "<p>No hay productos en el inventario.</p>";
        return;
      }
      generarGrafico(productos, "inventario");
      const tabla = `
            <table class="tabla-reporte">
                <thead>
                    <tr>
                        <th>Nombre</th>
                        <th>Categoría</th>
                        <th>Cantidad</th>
                        <th>Ubicación</th>
                        <th>Fecha Ingreso</th>
                    </tr>
                </thead>
                <tbody>
                    ${productos
                      .map(
                        (p) => `
                        <tr>
                            <td>${p.nombre}</td>
                            <td>${p.categoria}</td>
                            <td>${p.cantidad}</td>
                            <td>${p.ubicacion || "N/A"}</td>
                            <td>${formatearFecha(p.ingreso)}</td>
                        </tr>
                    `
                      )
                      .join("")}
                </tbody>
            </table>`;
      document.getElementById("tablaReporteContenedor").innerHTML = tabla;
    }

    function renderizarReporteMovimientos(movimientos, tipo) {
      const titulo = `Reporte de ${
        tipo.charAt(0).toUpperCase() + tipo.slice(1)
      }`;
      reporteHeader.style.display = "flex";
      reporteTitulo.textContent = titulo;
      reporteContenido.innerHTML =
        '<div class="chart-container"><canvas id="reporteGrafico"></canvas></div><div id="tablaReporteContenedor"></div>';

      if (movimientos.length === 0) {
        reporteContenido.innerHTML = `<p>No hay ${tipo} en el rango de fechas seleccionado.</p>`;
        return;
      }
      generarGrafico(movimientos, tipo);
      const tabla = `
            <table class="tabla-reporte">
                <thead>
                    <tr>
                        <th>Producto</th>
                        <th>Cantidad</th>
                        <th>Fecha</th>
                        <th>Usuario</th>
                    </tr>
                </thead>
                <tbody>
                    ${movimientos
                      .map(
                        (m) => `
                        <tr>
                            <td>${m.ProductoNombre}</td>
                            <td>${m.Cantidad}</td>
                            <td>${formatearFecha(m.Fecha, true)}</td>
                            <td>${m.UsuarioNombre || "N/A"}</td>
                        </tr>
                    `
                      )
                      .join("")}
                </tbody>
            </table>`;
      document.getElementById("tablaReporteContenedor").innerHTML = tabla;
    }

    function renderizarReporteVencimientos(productos) {
      reporteHeader.style.display = "flex";
      reporteTitulo.textContent = "Reporte de Productos Próximos a Vencer";
      reporteContenido.innerHTML =
        '<div class="chart-container"><canvas id="reporteGrafico"></canvas></div><div id="tablaReporteContenedor"></div>';

      if (productos.length === 0) {
        reporteContenido.innerHTML =
          "<p>No hay productos próximos a vencer.</p>";
        return;
      }
      generarGrafico(productos, "vencimientos");
      const tabla = `
            <table class="tabla-reporte">
                <thead>
                    <tr>
                        <th>Nombre</th>
                        <th>Categoría</th>
                        <th>Cantidad</th>
                        <th>Fecha de Vencimiento</th>
                    </tr>
                </thead>
                <tbody>
                    ${productos
                      .map(
                        (p) => `
                        <tr>
                            <td>${p.nombre}</td>
                            <td>${p.categoria}</td>
                            <td>${p.cantidad}</td>
                            <td>${formatearFecha(p.vencimiento)}</td>
                        </tr>
                    `
                      )
                      .join("")}
                </tbody>
            </table>`;
      document.getElementById("tablaReporteContenedor").innerHTML = tabla;
    }
  }

  // --- ENTRADA LOGIC --- //
  function activarEntrada() {
    const formEntrada = document.getElementById("formEntrada");
    const selectProducto = document.getElementById("nombreProductoEntrada");
    const selectCategoriaEntrada = document.getElementById("categoriaProductoEntrada");

    obtenerCategoriasUnicas()
      .then((categorias) => {
        poblarCategoriaSelect(selectCategoriaEntrada, categorias);
      })
      .catch((error) => {
        console.error("Error poblando categorías de entrada:", error);
      });

    fetchAutenticado(`${API_BASE_URL}/productos`)
      .then((response) => response.json())
      .then((productos) => {
        productos.forEach((producto) => {
          const option = document.createElement("option");
          option.value = producto.ProductoID;
          option.textContent = producto.nombre;
          selectProducto.appendChild(option);
        });
      })
      .catch((error) => {
        console.error("Error al cargar productos:", error);
        alert("Error al cargar la lista de productos.");
      });

    formEntrada.addEventListener("submit", function (event) {
      event.preventDefault();
      const formData = new FormData(event.target);
      const data = Object.fromEntries(formData.entries());

      fetch(`${API_BASE_URL}/entradas`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(data),
      })
        .then((response) =>
          response.json().then((body) => ({ ok: response.ok, body }))
        )
        .then(({ ok, body }) => {
          if (!ok) {
            throw new Error(body.error || "Error en la respuesta del servidor");
          }
          alert(body.message);
          event.target.reset();
          actualizarDashboard();
        })
        .catch((error) => {
          console.error("Error:", error);
          alert(`Hubo un error al guardar la entrada: ${error.message}`);
        });
    });
  }

  // --- SALIDA LOGIC --- //
  function activarSalida() {
    const formSalida = document.getElementById("formSalida");
    const selectProducto = document.getElementById("nombreProductoSalida");

    fetchAutenticado(`${API_BASE_URL}/productos`)
      .then((response) => response.json())
      .then((productos) => {
        productos.forEach((producto) => {
          const option = document.createElement("option");
          option.value = producto.ProductoID;
          option.textContent = producto.nombre;
          selectProducto.appendChild(option);
        });
      })
      .catch((error) => {
        console.error("Error al cargar productos:", error);
        alert("Error al cargar la lista de productos.");
      });

    formSalida.addEventListener("submit", function (event) {
      event.preventDefault();
      const formData = new FormData(event.target);
      const data = Object.fromEntries(formData.entries());

      fetch(`${API_BASE_URL}/salidas`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(data),
      })
        .then((response) =>
          response.json().then((body) => ({ ok: response.ok, body }))
        )
        .then(({ ok, body }) => {
          if (!ok) {
            throw new Error(body.error || "Error en la respuesta del servidor");
          }
          alert(body.message);
          event.target.reset();
          actualizarDashboard();
        })
        .catch((error) => {
          console.error("Error:", error);
          alert(`Hubo un error al registrar la salida: ${error.message}`);
        });
    });
  }

  // --- USER LOGIC --- //
  function activarUsuarios() {
    const formUsuarios = document.getElementById("formUsuarios");
    const tablaUsuarios = document.getElementById("tablaUsuarios");

    async function cargarUsuarios() {
      try {
        const response = await fetch(`${API_BASE_URL}/usuarios`, {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
        if (!response.ok) throw new Error("Error al cargar usuarios");
        const usuarios = await response.json();
        renderizarUsuarios(usuarios);
      } catch (error) {
        console.error(error);
        tablaUsuarios.innerHTML = `<tr><td colspan="5">${error.message}</td></tr>`;
      }
    }

    function renderizarUsuarios(usuarios) {
      tablaUsuarios.innerHTML = "";
      if (usuarios.length === 0) {
        tablaUsuarios.innerHTML =
          '<tr><td colspan="5">No hay usuarios registrados.</td></tr>';
        return;
      }
      usuarios.forEach((usuario) => {
        const fila = document.createElement("tr");
        fila.dataset.id = usuario.UsuarioID;
        fila.innerHTML = `
                <td>${usuario.UsuarioID}</td>
                <td>${usuario.nombre}</td>
                <td>${usuario.email}</td>
                <td>${usuario.Rol}</td>
                <td>
                    <button class="btn-editar"><i class="fas fa-edit"></i> Editar</button>
                    <button class="btn-eliminar"><i class="fas fa-trash-alt"></i> Eliminar</button>
                </td>
            `;
        tablaUsuarios.appendChild(fila);
      });
    }

    async function handleUpdateUsuario(event, usuarioId) {
      event.preventDefault();
      const form = event.target;
      const updatedUsuario = {
        nombre: form.nombre.value,
        email: form.email.value,
        Rol: form.rol.value,
      };

      if (form.password.value) {
        updatedUsuario.password = form.password.value;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/usuarios/${usuarioId}`, {
          method: "PUT",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify(updatedUsuario),
        });
        const result = await response.json();
        if (!response.ok)
          throw new Error(result.error || "Error en el servidor");
        alert(result.message);
        hideModal();
        cargarUsuarios();
      } catch (error) {
        console.error("Error al actualizar el usuario:", error);
        alert(`Error al actualizar el usuario: ${error.message}`);
      }
    }

    async function handleEditarUsuario(usuarioId) {
      try {
        const [userResponse, formHtmlResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/usuarios/${usuarioId}`, {
            headers: {
              "Authorization": `Bearer ${token}`
            }
          }),
          fetch("usuarios.html"), // No necesita autenticación
        ]);

        if (!userResponse.ok)
          throw new Error("Error al cargar los datos del usuario.");
        if (!formHtmlResponse.ok)
          throw new Error("Error al cargar el formulario.");

        const usuario = await userResponse.json();
        const formHtmlText = await formHtmlResponse.text();

        const parser = new DOMParser();
        const doc = parser.parseFromString(formHtmlText, "text/html");
        const formNode = doc.querySelector("#formUsuarios");

        if (!formNode)
          throw new Error(
            "No se pudo encontrar el formulario en usuarios.html"
          );

        showModal("Editar Usuario", formNode.outerHTML);

        const form = modalBody.querySelector("form");
        form.querySelector("#nombre").value = usuario.nombre;
        form.querySelector("#email").value = usuario.email;
        form.querySelector("#rol").value = usuario.Rol;

        const passwordInput = form.querySelector("#password");
        passwordInput.placeholder = "Dejar en blanco para no cambiar";
        passwordInput.required = false;

        form.querySelector("button[type='submit']").textContent =
          "Actualizar Usuario";

        form.addEventListener("submit", (e) =>
          handleUpdateUsuario(e, usuarioId)
        );
      } catch (error) {
        console.error("Error en handleEditarUsuario:", error);
        alert(error.message);
      }
    }

    async function handleEliminarUsuario(usuarioId) {
      if (!confirm("¿Estás seguro de que quieres eliminar este usuario?"))
        return;

      try {
        const response = await fetch(`${API_BASE_URL}/usuarios/${usuarioId}`, {
          method: "DELETE",
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
        const result = await response.json();
        if (!response.ok)
          throw new Error(result.error || "Error en el servidor");
        alert(result.message);
        cargarUsuarios();
      } catch (error) {
        console.error("Error al eliminar el usuario:", error);
        alert(`Error al eliminar el usuario: ${error.message}`);
      }
    }

    tablaUsuarios.addEventListener("click", function (event) {
      const target = event.target.closest("button");
      if (!target) return;

      const usuarioId = target.closest("tr").dataset.id;

      if (target.classList.contains("btn-editar")) {
        handleEditarUsuario(usuarioId);
      }

      if (target.classList.contains("btn-eliminar")) {
        handleEliminarUsuario(usuarioId);
      }
    });

    formUsuarios.addEventListener("submit", async (e) => {
      e.preventDefault();
      const form = e.target;
      const nuevoUsuario = {
        nombre: form.nombre.value,
        email: form.email.value,
        password: form.password.value,
        Rol: form.rol.value,
      };

      try {
        const response = await fetch(`${API_BASE_URL}/usuarios`, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify(nuevoUsuario),
        });
        const result = await response.json();
        if (!response.ok)
          throw new Error(result.error || "Error al crear usuario");
        alert(result.message);
        form.reset();
        cargarUsuarios();
      } catch (error) {
        alert(error.message);
      }
    });

    cargarUsuarios();
  }

  // --- INVENTORY LOGIC --- //
  function activarInventario() {
    const tablaProductos = document.getElementById("tablaProductos");

    function formatearFechaParaInput(fechaString) {
      if (!fechaString) return "";
      const fecha = new Date(fechaString);
      if (isNaN(fecha)) return "";
      return fecha.toISOString().split("T")[0];
    }

    function renderizarProductos(productos) {
      tablaProductos.innerHTML = "";
      if (productos.length === 0) {
        tablaProductos.innerHTML =
          '<tr><td colspan="7">No hay productos en el inventario.</td></tr>';
        return;
      }
      // obtener rol del usuario actual para decisiones de UI
      const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
      const restricted = ["Bodeguero", "Visor"];
      productos.forEach((producto) => {
        const fila = document.createElement("tr");
        fila.dataset.id = producto.ProductoID;
        // construir botones condicionalmente
        let botones = `
            <button class="btn-eliminar" aria-label="Eliminar ${producto.nombre}"><i class="fas fa-trash-alt"></i> Eliminar</button>
        `;
        if (!restricted.includes(currentUser.rol)) {
          botones = `
            <button class="btn-editar" aria-label="Editar ${producto.nombre}"><i class="fas fa-edit"></i> Editar</button>
            ${botones}
          `;
        }
        fila.innerHTML = `
          <td>${producto.nombre}</td>
          <td>${producto.categoria}</td>
          <td>${producto.cantidad}</td>
          <td>${producto.ubicacion || "N/A"}</td>
          <td>${formatearFecha(producto.ingreso)}</td>
          <td>${formatearFecha(producto.vencimiento)}</td>
          <td>${botones}</td>
        `;
        tablaProductos.appendChild(fila);
      });
    }

    async function cargarProductos() {
      try {
        const response = await fetchAutenticado(`${API_BASE_URL}/productos`);
        if (!response.ok)
          throw new Error(`HTTP error! status: ${response.status}`);
        const productos = await response.json();
        renderizarProductos(productos);
      } catch (error) {
        console.error("Error al cargar los productos:", error);
        tablaProductos.innerHTML =
          '<tr><td colspan="7">Error al cargar los productos.</td></tr>';
      }
    }

    async function handleAgregarProducto(event) {
      event.preventDefault();
      const form = event.target;
      const formData = new FormData(form);
      const nuevoProducto = Object.fromEntries(formData.entries());

      try {
        const response = await fetch(`${API_BASE_URL}/productos`, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify(nuevoProducto),
        });
        const result = await response.json();
        if (!response.ok)
          throw new Error(result.error || "Error en el servidor");
        alert(result.message);
        hideModal();
        cargarProductos();
        actualizarDashboard();
      } catch (error) {
        console.error("Error al agregar el producto:", error);
        alert(`Error al agregar el producto: ${error.message}`);
      }
    }

    async function handleUpdateProducto(event, productoId) {
      event.preventDefault();
      const form = event.target;
      const formData = new FormData(form);
      const updatedProducto = Object.fromEntries(formData.entries());

      try {
        const response = await fetch(
          `${API_BASE_URL}/productos/${productoId}`,
          {
            method: "PUT",
            headers: { 
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(updatedProducto),
          }
        );
        const result = await response.json();
        if (!response.ok)
          throw new Error(result.error || "Error en el servidor");
        alert(result.message);
        hideModal();
        cargarProductos();
        actualizarDashboard();
      } catch (error) {
        console.error("Error al actualizar el producto:", error);
        alert(`Error al actualizar el producto: ${error.message}`);
      }
    }

    async function handleEditarProducto(productoId) {
      try {
        const [productResponse, formResponse] = await Promise.all([
          fetchAutenticado(`${API_BASE_URL}/productos/${productoId}`),
          fetch("agregar-producto.html"), // No necesita autenticación
        ]);

        if (!productResponse.ok)
          throw new Error("Error al cargar los datos del producto.");
        if (!formResponse.ok) throw new Error("Error al cargar el formulario.");

        const producto = await productResponse.json();
        const formHtml = await formResponse.text();

        showModal("Editar Producto", formHtml);

        const form = modalBody.querySelector("form");
        const selectCategoria = form.querySelector("#categoria");
        const categorias = await obtenerCategoriasUnicas();

        poblarCategoriaSelect(selectCategoria, categorias, producto.categoria);

        form.querySelector("#nombre").value = producto.nombre;
        form.querySelector("#cantidad").value = producto.cantidad;
        form.querySelector("#ubicacion").value = producto.ubicacion;
        form.querySelector("#ingreso").value = formatearFechaParaInput(
          producto.ingreso
        );
        form.querySelector("#vencimiento").value = formatearFechaParaInput(
          producto.vencimiento
        );
        form.querySelector("button[type='submit']").textContent =
          "Actualizar Producto";

        form.addEventListener("submit", (e) =>
          handleUpdateProducto(e, productoId)
        );
      } catch (error) {
        console.error("Error en handleEditarProducto:", error);
        alert(error.message);
      }
    }

    async function handleEliminarProducto(productoId) {
      if (!confirm("¿Estás seguro de que quieres eliminar este producto?"))
        return;

      try {
        const response = await fetch(
          `${API_BASE_URL}/productos/${productoId}`,
          {
            method: "DELETE",
            headers: {
              "Authorization": `Bearer ${token}`
            }
          }
        );
        const result = await response.json();
        if (!response.ok)
          throw new Error(result.error || "Error en el servidor");
        alert(result.message);
        cargarProductos();
        actualizarDashboard();
      } catch (error) {
        console.error("Error al eliminar el producto:", error);
        alert(`Error al eliminar el producto: ${error.message}`);
      }
    }

    document
      .getElementById("btnAgregar")
      .addEventListener("click", async () => {
        try {
          const response = await fetch("agregar-producto.html");
          const formHtml = await response.text();
          showModal("Agregar Producto", formHtml);

          const form = modalBody.querySelector("form");
          const selectCategoria = form.querySelector("#categoria");

          const categorias = await obtenerCategoriasUnicas();
          poblarCategoriaSelect(selectCategoria, categorias);

          form.addEventListener("submit", handleAgregarProducto);
        } catch (error) {
          console.error("Error al cargar el formulario:", error);
          alert("Error al cargar el formulario de agregar producto.");
        }
      });

    tablaProductos.addEventListener("click", function (event) {
      const target = event.target.closest("button");
      if (!target) return;

      const productoId = target.closest("tr").dataset.id;

      if (target.classList.contains("btn-editar")) {
        handleEditarProducto(productoId);
      }

      if (target.classList.contains("btn-eliminar")) {
        handleEliminarProducto(productoId);
      }
    });

    const searchInput = document.querySelector(".search-bar");
    searchInput.addEventListener("input", (e) => {
      const searchTerm = e.target.value.toLowerCase();
      const filas = tablaProductos.querySelectorAll("tr");
      filas.forEach((fila) => {
        const nombreProducto = fila
          .querySelector("td")
          .textContent.toLowerCase();
        if (nombreProducto.includes(searchTerm)) {
          fila.style.display = "";
        } else {
          fila.style.display = "none";
        }
      });
    });

    cargarProductos();
    actualizarDashboard();
  }

  // --- NAVIGATION --- //
  document
    .querySelector("aside.sidebar nav ul")
    .addEventListener("click", (e) => {
      const link = e.target.closest("a");
      if (link) {
        e.preventDefault();
        const section = link.dataset.section;

        document
          .querySelectorAll("aside.sidebar nav ul li")
          .forEach((li) => li.classList.remove("active"));
        link.parentElement.classList.add("active");

        const urls = {
          inventario: "inventario.html",
          entrada: "entrada.html",
          salida: "salida.html",
          reportes: "reportes.html",
          usuarios: "usuarios.html",
          configuracion: "configuracion.html",
        };
        const url = urls[section] || "inventario.html";
        loadContent(url, section);
      }
    });

    // --- INITIAL LOAD --- //
    loadContent("inventario.html", "inventario");
  } // Fin de initializeApp
});
