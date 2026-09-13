"use strict";

let preguntas = [];
let preguntaActual = 0;
let respuestasUsuario = {};
let resultadoActual = null;
let testId = null;
let tituloTest = "Test";
let storageKey = "";
let storagePreguntaKey = "";
let catalogoTests = [];
let cursoActual = null;

const elementos = {
    titulo: document.getElementById("titulo-test"),
    vistaCatalogo: document.getElementById("vista-catalogo"),
    vistaTest: document.getElementById("vista-test"),
    vistaResultados: document.getElementById("vista-resultados"),
    vistaRevision: document.getElementById("vista-revision"),
    progreso: document.getElementById("progreso"),
    barraProgreso: document.getElementById("barra-progreso-relleno"),
    metadatos: document.getElementById("metadatos-pregunta"),
    pregunta: document.getElementById("pregunta"),
    respuestas: document.getElementById("respuestas"),
    anterior: document.getElementById("anterior"),
    siguiente: document.getElementById("siguiente"),
    finalizar: document.getElementById("finalizar"),
    mensajeTest: document.getElementById("mensaje-test"),
    listaTests: document.getElementById("lista-tests"),
    mensajeCatalogo: document.getElementById("mensaje-catalogo"),
    volverCatalogo: document.getElementById("volver-catalogo"),
    introduccionCatalogo: document.getElementById("introduccion-catalogo"),
};

async function leerError(response) {
    try {
        const datos = await response.json();
        return datos.detail || `Error HTTP ${response.status}`;
    } catch {
        return `Error HTTP ${response.status}`;
    }
}

async function cargarCatalogo(actualizarHistorial = false, cursoDestino = null) {
    if (actualizarHistorial) history.pushState({}, "", window.location.pathname);
    testId = null;
    preguntas = [];
    resultadoActual = null;
    elementos.listaTests.replaceChildren();
    elementos.mensajeCatalogo.className = "mensaje";
    elementos.mensajeCatalogo.textContent = "Cargando tests disponibles...";
    cambiarVista(elementos.vistaCatalogo);

    try {
        const response = await fetch("/api/tests");
        if (!response.ok) throw new Error(await leerError(response));
        const datos = await response.json();
        catalogoTests = datos.tests || [];
        elementos.mensajeCatalogo.textContent = catalogoTests.length ? "" : "No hay tests disponibles.";
        if (cursoDestino && catalogoTests.some((test) => test.curso === cursoDestino)) {
            mostrarTestsCurso(cursoDestino);
        } else {
            mostrarCursos();
        }
    } catch (error) {
        elementos.mensajeCatalogo.textContent = error.message;
        elementos.mensajeCatalogo.className = "mensaje mensaje-error";
    }
}

function mostrarCursos() {
    testId = null;
    cursoActual = null;
    elementos.titulo.textContent = "Certification Training Lab";
    elementos.introduccionCatalogo.textContent = "Practica, mide tu progreso y prepárate para tus próximos exámenes.";
    elementos.listaTests.replaceChildren();
    elementos.volverCatalogo.classList.add("oculto");
    document.title = "Certification Training Lab";

    const cursos = new Map();
    catalogoTests.forEach((test) => {
        const nombre = test.curso || "Otros";
        const grupo = cursos.get(nombre) || {tests: 0, preguntas: 0, respondidas: 0};
        grupo.tests += 1;
        grupo.preguntas += test.total_preguntas;
        grupo.respondidas += obtenerProgreso(test).respondidas;
        cursos.set(nombre, grupo);
    });

    [...cursos.entries()]
        .sort(([cursoA], [cursoB]) => cursoA.localeCompare(cursoB, "es"))
        .forEach(([curso, datos]) =>
            elementos.listaTests.appendChild(crearTarjetaCurso(curso, datos)));
    cambiarVista(elementos.vistaCatalogo);
}

function crearTarjetaCurso(curso, datos) {
    const tarjeta = document.createElement("article");
    const etiqueta = document.createElement("span");
    const titulo = document.createElement("h2");
    const resumen = document.createElement("p");
    const progreso = document.createElement("p");
    const boton = document.createElement("button");
    tarjeta.className = "tarjeta-test tarjeta-curso";
    etiqueta.className = "icono-curso";
    etiqueta.textContent = curso.slice(0, 2).toUpperCase();
    titulo.textContent = curso;
    resumen.textContent = `${datos.tests} ${datos.tests === 1 ? "test" : "tests"} · ${datos.preguntas} preguntas`;
    progreso.className = "resumen-progreso";
    progreso.textContent = datos.respondidas
        ? `${datos.respondidas} respuestas guardadas`
        : "Aún no has empezado";
    boton.type = "button";
    boton.textContent = "Ver tests";
    boton.addEventListener("click", () => mostrarTestsCurso(curso));
    tarjeta.append(etiqueta, titulo, resumen, progreso, boton);
    return tarjeta;
}

function mostrarTestsCurso(curso) {
    testId = null;
    cursoActual = curso;
    const tests = catalogoTests.filter((test) => test.curso === curso);
    elementos.titulo.textContent = curso;
    elementos.introduccionCatalogo.textContent = `Selecciona uno de los tests disponibles para ${curso}.`;
    elementos.listaTests.replaceChildren();
    tests.forEach((test) => elementos.listaTests.appendChild(crearTarjetaTest(test)));
    elementos.volverCatalogo.textContent = "← Todos los cursos";
    elementos.volverCatalogo.classList.remove("oculto");
    document.title = `${curso} · Certification Training Lab`;
    cambiarVista(elementos.vistaCatalogo);
}

function crearTarjetaTest(test) {
    const tarjeta = document.createElement("article");
    const titulo = document.createElement("h2");
    const resumen = document.createElement("p");
    const descripcion = document.createElement("p");
    const examenes = document.createElement("p");
    const modalidad = document.createElement("span");
    const progresoTexto = document.createElement("p");
    const barra = document.createElement("div");
    const relleno = document.createElement("div");
    const boton = document.createElement("button");
    const progreso = obtenerProgreso(test);
    tarjeta.className = "tarjeta-test";
    titulo.textContent = test.titulo;
    resumen.textContent = `${test.total_preguntas} preguntas · ${test.temas} temas`;
    descripcion.className = "descripcion-test";
    descripcion.textContent = test.descripcion || "";
    modalidad.className = "modalidad-test";
    modalidad.textContent = [test.modalidad, test.duracion_minutos ? `${test.duracion_minutos} min` : null]
        .filter(Boolean).join(" · ");
    examenes.className = "examenes-test";
    examenes.textContent = (test.examenes || []).join(" · ") || "Test general";
    boton.type = "button";
    progresoTexto.className = "resumen-progreso";
    progresoTexto.textContent = progreso.respondidas
        ? `${progreso.respondidas}/${test.total_preguntas} respondidas`
        : "Sin empezar";
    barra.className = "progreso-tarjeta";
    relleno.style.width = `${progreso.porcentaje}%`;
    barra.appendChild(relleno);
    boton.textContent = progreso.respondidas ? "Continuar" : "Empezar";
    boton.addEventListener("click", () => {
        cursoActual = test.curso || cursoActual;
        seleccionarTest(test.test_id);
    });
    tarjeta.append(modalidad, titulo, resumen);
    if (test.descripcion) tarjeta.appendChild(descripcion);
    tarjeta.append(examenes, progresoTexto, barra, boton);
    return tarjeta;
}

function obtenerProgreso(test) {
    let guardadas = {};
    try {
        guardadas = JSON.parse(localStorage.getItem(`respuestas_${test.test_id}`)) || {};
    } catch {
        guardadas = {};
    }
    const respondidas = Object.values(guardadas).filter((valor) =>
        typeof valor === "string" && valor.trim()).length;
    return {
        respondidas,
        porcentaje: test.total_preguntas ? (respondidas / test.total_preguntas) * 100 : 0,
    };
}

function seleccionarTest(id, actualizarHistorial = true) {
    if (actualizarHistorial) {
        const url = new URL(window.location.href);
        url.searchParams.set("test_id", id);
        history.pushState({testId: id}, "", url);
    }
    cargarPreguntas(id);
}

async function cargarPreguntas(id) {
    try {
        testId = id;
        const response = await fetch(`/api/questions?test_id=${encodeURIComponent(testId)}`);
        if (!response.ok) {
            throw new Error(await leerError(response));
        }

        const datos = await response.json();
        preguntas = datos.preguntas || [];
        testId = datos.test_id || testId;
        cursoActual = datos.curso || cursoActual;
        tituloTest = datos.titulo || "Test";
        storageKey = `respuestas_${testId}`;
        storagePreguntaKey = `pregunta_actual_${testId}`;

        elementos.titulo.textContent = tituloTest;
        elementos.volverCatalogo.textContent = cursoActual
            ? `← Tests de ${cursoActual}`
            : "← Todos los cursos";
        elementos.volverCatalogo.classList.remove("oculto");
        document.title = tituloTest;
        recuperarEstado();
        elementos.finalizar.disabled = false;
        mostrarPregunta();
        mostrarMensaje("");
        cambiarVista(elementos.vistaTest);
    } catch (error) {
        elementos.titulo.textContent = "Test no disponible";
        elementos.pregunta.textContent = "No se pudieron cargar las preguntas.";
        elementos.volverCatalogo.textContent = "← Todos los cursos";
        elementos.volverCatalogo.classList.remove("oculto");
        mostrarMensaje(error.message, true);
        cambiarVista(elementos.vistaTest);
        console.error("Error cargando preguntas:", error);
    }
}

function recuperarEstado() {
    try {
        respuestasUsuario = JSON.parse(localStorage.getItem(storageKey)) || {};
    } catch {
        respuestasUsuario = {};
    }

    const indiceGuardado = Number(localStorage.getItem(storagePreguntaKey));
    preguntaActual = Number.isInteger(indiceGuardado) ? indiceGuardado : 0;
    if (preguntaActual < 0 || preguntaActual >= preguntas.length) {
        preguntaActual = 0;
    }
}

function crearBadge(texto, secundario = false) {
    const badge = document.createElement("span");
    badge.className = secundario ? "badge badge-secundario" : "badge";
    badge.textContent = texto;
    return badge;
}

function mostrarPregunta() {
    if (preguntas.length === 0) {
        elementos.pregunta.textContent = "No hay preguntas disponibles.";
        elementos.finalizar.disabled = true;
        return;
    }

    const pregunta = preguntas[preguntaActual];
    const avance = ((preguntaActual + 1) / preguntas.length) * 100;
    elementos.progreso.textContent = `Pregunta ${preguntaActual + 1} de ${preguntas.length}`;
    elementos.barraProgreso.style.width = `${avance}%`;
    elementos.metadatos.replaceChildren();
    elementos.pregunta.textContent = pregunta.pregunta;
    elementos.respuestas.replaceChildren();

    if (pregunta.examen) {
        elementos.metadatos.appendChild(crearBadge(pregunta.examen));
    }
    if (pregunta.tema) {
        elementos.metadatos.appendChild(crearBadge(pregunta.tema, true));
    }

    if (pregunta.tipo === "multiple_choice") {
        mostrarOpciones(pregunta);
    } else if (pregunta.tipo === "text") {
        mostrarRespuestaAbierta(pregunta);
    }

    elementos.anterior.disabled = preguntaActual === 0;
    elementos.siguiente.disabled = preguntaActual === preguntas.length - 1;
    localStorage.setItem(storagePreguntaKey, String(preguntaActual));
}

function mostrarOpciones(pregunta) {
    for (const [letra, texto] of Object.entries(pregunta.opciones || {})) {
        elementos.respuestas.appendChild(crearOpcion(pregunta, letra, texto));
    }
    elementos.respuestas.appendChild(crearOpcion(pregunta, "NS", "No sé"));
}

function crearOpcion(pregunta, valor, texto) {
    const contenedor = document.createElement("div");
    const label = document.createElement("label");
    const input = document.createElement("input");
    const strong = document.createElement("strong");

    input.type = "radio";
    input.name = "respuesta";
    input.value = valor;
    input.checked = respuestasUsuario[pregunta.id] === valor;
    input.addEventListener("change", () => guardarRespuesta(pregunta.id, valor));
    strong.textContent = valor;

    label.append(input, strong, document.createTextNode(texto));
    contenedor.appendChild(label);
    return contenedor;
}

function mostrarRespuestaAbierta(pregunta) {
    const textarea = document.createElement("textarea");
    const botonNoSe = document.createElement("button");
    const mensajeNoSe = document.createElement("p");
    const respuestaGuardada = respuestasUsuario[pregunta.id];

    textarea.rows = 5;
    textarea.placeholder = "Escribe tu respuesta...";
    textarea.value = respuestaGuardada && respuestaGuardada !== "NS" ? respuestaGuardada : "";
    mensajeNoSe.textContent = respuestaGuardada === "NS" ? "Respuesta marcada como: No sé" : "";
    textarea.addEventListener("input", () => {
        guardarRespuesta(pregunta.id, textarea.value);
        mensajeNoSe.textContent = "";
    });

    botonNoSe.type = "button";
    botonNoSe.className = "boton-ns";
    botonNoSe.textContent = "No sé";
    botonNoSe.addEventListener("click", () => {
        textarea.value = "";
        guardarRespuesta(pregunta.id, "NS");
        mensajeNoSe.textContent = "Respuesta marcada como: No sé";
    });

    elementos.respuestas.append(textarea, botonNoSe, mensajeNoSe);
}

function guardarRespuesta(preguntaId, respuesta) {
    respuestasUsuario[preguntaId] = respuesta;
    localStorage.setItem(storageKey, JSON.stringify(respuestasUsuario));
}

function cambiarPregunta(desplazamiento) {
    const nuevoIndice = preguntaActual + desplazamiento;
    if (nuevoIndice >= 0 && nuevoIndice < preguntas.length) {
        preguntaActual = nuevoIndice;
        mostrarPregunta();
        window.scrollTo({top: 0, behavior: "smooth"});
    }
}

function mostrarMensaje(texto, esError = false) {
    elementos.mensajeTest.textContent = texto;
    elementos.mensajeTest.className = esError ? "mensaje mensaje-error" : "mensaje";
}

async function finalizarTest() {
    elementos.finalizar.disabled = true;
    mostrarMensaje("Corrigiendo y guardando el intento...");

    try {
        const response = await fetch("/api/submit", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({test_id: testId, respuestas: respuestasUsuario}),
        });
        if (!response.ok) {
            throw new Error(await leerError(response));
        }

        resultadoActual = await response.json();
        mostrarResultados(resultadoActual);
    } catch (error) {
        mostrarMensaje(error.message, true);
        elementos.finalizar.disabled = false;
    }
}

function cambiarVista(vistaVisible) {
    [elementos.vistaCatalogo, elementos.vistaTest, elementos.vistaResultados, elementos.vistaRevision]
        .forEach((vista) => vista.classList.toggle("oculto", vista !== vistaVisible));
    window.scrollTo({top: 0, behavior: "smooth"});
}

function mostrarResultados(resultado) {
    elementos.titulo.textContent = resultado.titulo;
    document.getElementById("resultado-fraccion").textContent =
        `${resultado.correctas} / ${resultado.total_preguntas} correctas`;
    document.getElementById("resultado-porcentaje").textContent =
        `${formatearPorcentaje(resultado.porcentaje)} %`;
    document.getElementById("barra-resultado-relleno").style.width =
        `${resultado.porcentaje}%`;

    const resumen = document.getElementById("resumen-estadisticas");
    resumen.replaceChildren(
        crearTarjetaEstadistica("Correctas", resultado.correctas, "correcta"),
        crearTarjetaEstadistica("Incorrectas", resultado.incorrectas, "incorrecta"),
        crearTarjetaEstadistica("No sé", resultado.no_se, "no-se"),
        crearTarjetaEstadistica(
            "Pendientes de revisión", resultado.pendientes_revision, "pendiente"
        ),
    );

    mostrarAgrupacion("resultados-examen", resultado.por_examen);
    mostrarAgrupacion("resultados-tema", resultado.por_tema);
    document.getElementById("intento-guardado").textContent =
        `Intento guardado en respuestas/${resultado.intento_guardado}`;
    cambiarVista(elementos.vistaResultados);
}

function crearTarjetaEstadistica(etiqueta, valor, clase) {
    const tarjeta = document.createElement("div");
    tarjeta.className = `tarjeta-estadistica ${clase}`;
    const numero = document.createElement("strong");
    const texto = document.createElement("span");
    numero.textContent = valor;
    texto.textContent = etiqueta;
    tarjeta.append(numero, texto);
    return tarjeta;
}

function mostrarAgrupacion(elementId, agrupacion) {
    const contenedor = document.getElementById(elementId);
    contenedor.replaceChildren();

    for (const [nombre, datos] of Object.entries(agrupacion)) {
        const fila = document.createElement("div");
        const cabecera = document.createElement("div");
        const etiqueta = document.createElement("span");
        const valor = document.createElement("strong");
        const barra = document.createElement("div");
        const relleno = document.createElement("div");

        fila.className = "fila-resultado";
        cabecera.className = "fila-resultado-cabecera";
        etiqueta.textContent = nombre;
        valor.textContent = `${formatearPorcentaje(datos.porcentaje)} % (${datos.correctas}/${datos.total})`;
        barra.className = "barra-progreso barra-pequena";
        relleno.style.width = `${datos.porcentaje}%`;
        barra.appendChild(relleno);
        cabecera.append(etiqueta, valor);
        fila.append(cabecera, barra);
        contenedor.appendChild(fila);
    }
}

function formatearPorcentaje(valor) {
    return Number(valor).toLocaleString("es-ES", {maximumFractionDigits: 1});
}

function mostrarRevision(soloErrores) {
    const detalles = soloErrores
        ? resultadoActual.detalle.filter((item) =>
            ["incorrecta", "no_se"].includes(item.estado))
        : resultadoActual.detalle;

    document.getElementById("titulo-revision").textContent = soloErrores
        ? "Preguntas incorrectas y no contestadas"
        : "Todas las respuestas";
    const lista = document.getElementById("lista-revision");
    lista.replaceChildren();

    if (detalles.length === 0) {
        const mensaje = document.createElement("p");
        mensaje.className = "mensaje-exito";
        mensaje.textContent = "No hay respuestas incorrectas ni marcadas como No sé.";
        lista.appendChild(mensaje);
    } else {
        detalles.forEach((detalle) => lista.appendChild(crearTarjetaRevision(detalle)));
    }
    cambiarVista(elementos.vistaRevision);
}

function crearTarjetaRevision(detalle) {
    const tarjeta = document.createElement("article");
    const metadatos = document.createElement("div");
    const estado = document.createElement("span");
    const pregunta = document.createElement("h3");

    tarjeta.className = `tarjeta-revision estado-${detalle.estado}`;
    metadatos.className = "metadatos-revision";
    if (detalle.examen) metadatos.appendChild(crearBadge(detalle.examen));
    if (detalle.tema) metadatos.appendChild(crearBadge(detalle.tema, true));
    estado.className = "estado-respuesta";
    estado.textContent = etiquetaEstado(detalle.estado);
    metadatos.appendChild(estado);
    pregunta.textContent = `${detalle.id}. ${detalle.pregunta}`;
    tarjeta.append(metadatos, pregunta);

    tarjeta.appendChild(crearCampoRevision(
        "Tu respuesta", formatearRespuesta(detalle.respuesta_usuario, detalle.opciones)
    ));

    if (detalle.estado === "pendiente_revision") {
        tarjeta.appendChild(crearCampoRevision(
            "Orientación esperada", detalle.orientacion || "No disponible"
        ));
    } else {
        tarjeta.appendChild(crearCampoRevision(
            "Respuesta correcta",
            formatearRespuesta(detalle.respuesta_correcta, detalle.opciones),
        ));
    }
    if (detalle.explicacion) {
        tarjeta.appendChild(crearCampoRevision("Explicación", detalle.explicacion));
    }
    return tarjeta;
}

function crearCampoRevision(etiqueta, contenido) {
    const bloque = document.createElement("div");
    const titulo = document.createElement("strong");
    const texto = document.createElement("p");
    bloque.className = "campo-revision";
    titulo.textContent = `${etiqueta}:`;
    texto.textContent = contenido;
    bloque.append(titulo, texto);
    return bloque;
}

function formatearRespuesta(respuesta, opciones = {}) {
    if (!respuesta || respuesta === "NS") return "No sé";
    return opciones[respuesta] ? `${respuesta} - ${opciones[respuesta]}` : respuesta;
}

function etiquetaEstado(estado) {
    const etiquetas = {
        correcta: "Correcta",
        incorrecta: "Incorrecta",
        no_se: "No sé",
        pendiente_revision: "Pendiente de revisión manual",
    };
    return etiquetas[estado] || estado;
}

function reiniciarTest() {
    if (!confirm("¿Seguro que quieres borrar todas las respuestas?")) return;
    respuestasUsuario = {};
    resultadoActual = null;
    preguntaActual = 0;
    localStorage.removeItem(storageKey);
    localStorage.removeItem(storagePreguntaKey);
    elementos.finalizar.disabled = false;
    elementos.titulo.textContent = tituloTest;
    mostrarMensaje("");
    mostrarPregunta();
    cambiarVista(elementos.vistaTest);
}

elementos.siguiente.addEventListener("click", () => cambiarPregunta(1));
elementos.anterior.addEventListener("click", () => cambiarPregunta(-1));
elementos.finalizar.addEventListener("click", finalizarTest);
document.querySelectorAll(".reiniciar").forEach((boton) =>
    boton.addEventListener("click", reiniciarTest));
document.getElementById("revisar-incorrectas").addEventListener(
    "click", () => mostrarRevision(true));
document.getElementById("ver-todas").addEventListener(
    "click", () => mostrarRevision(false));
document.getElementById("volver-resultados").addEventListener(
    "click", () => cambiarVista(elementos.vistaResultados));
elementos.volverCatalogo.addEventListener("click", () => {
    const catalogoVisible = !elementos.vistaCatalogo.classList.contains("oculto");
    history.pushState({}, "", window.location.pathname);
    if (catalogoVisible && cursoActual) {
        mostrarCursos();
    } else if (cursoActual && catalogoTests.length) {
        mostrarTestsCurso(cursoActual);
    } else {
        cargarCatalogo(false, cursoActual);
    }
});
window.addEventListener("popstate", () => {
    const id = new URLSearchParams(window.location.search).get("test_id");
    if (id) seleccionarTest(id, false);
    else cargarCatalogo(false);
});

const testInicial = new URLSearchParams(window.location.search).get("test_id");
if (testInicial) seleccionarTest(testInicial, false);
else cargarCatalogo(false);
