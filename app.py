import json
import re
from datetime import datetime
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field


BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
RESPUESTAS_DIR = BASE_DIR / "respuestas"
TEMPLATES_DIR = BASE_DIR / "templates"
STATIC_DIR = BASE_DIR / "static"
TEST_ID_PATTERN = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_-]*$")

app = FastAPI(title="Certification Training Lab API")
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


class EntregaTest(BaseModel):
    test_id: str = Field(min_length=1, max_length=100)
    respuestas: dict[str, Optional[str]]


def ruta_test(test_id: str) -> Path:
    if not TEST_ID_PATTERN.fullmatch(test_id):
        raise HTTPException(status_code=400, detail="El test_id no es válido.")

    test_dir = DATA_DIR / test_id
    if not test_dir.is_dir():
        raise HTTPException(status_code=404, detail=f"El test '{test_id}' no existe.")
    return test_dir


def cargar_json(ruta: Path, descripcion: str) -> dict:
    if not ruta.is_file():
        raise HTTPException(status_code=404, detail=f"No existe {descripcion}.")

    try:
        with ruta.open("r", encoding="utf-8") as fichero:
            datos = json.load(fichero)
    except json.JSONDecodeError as error:
        raise HTTPException(
            status_code=500,
            detail=f"{descripcion} contiene JSON inválido: línea {error.lineno}.",
        ) from None
    except OSError:
        raise HTTPException(
            status_code=500,
            detail=f"No se pudo leer {descripcion}.",
        ) from None

    if not isinstance(datos, dict):
        raise HTTPException(
            status_code=500,
            detail=f"{descripcion} debe contener un objeto JSON.",
        )
    return datos


def cargar_test(test_id: str) -> tuple[dict, dict]:
    test_dir = ruta_test(test_id)
    preguntas = cargar_json(test_dir / "preguntas.json", "preguntas.json")
    soluciones = cargar_json(test_dir / "soluciones.json", "soluciones.json")

    if preguntas.get("test_id") != test_id:
        raise HTTPException(
            status_code=500,
            detail="El test_id de preguntas.json no coincide con el directorio del test.",
        )
    if not isinstance(preguntas.get("preguntas"), list):
        raise HTTPException(
            status_code=500,
            detail="preguntas.json debe incluir una lista llamada 'preguntas'.",
        )
    return preguntas, soluciones


def calcular_porcentaje(correctas: int, total: int) -> float:
    return round((correctas / total) * 100, 2) if total else 0.0


def actualizar_agrupacion(agrupacion: dict, nombre: str, es_correcta: bool) -> None:
    clave = nombre or "Sin clasificar"
    datos = agrupacion.setdefault(clave, {"correctas": 0, "total": 0})
    datos["total"] += 1
    if es_correcta:
        datos["correctas"] += 1


def completar_porcentajes(agrupacion: dict) -> None:
    for datos in agrupacion.values():
        datos["porcentaje"] = calcular_porcentaje(
            datos["correctas"], datos["total"]
        )


def corregir_test(preguntas: list[dict], soluciones: dict, respuestas: dict) -> dict:
    ids_validos = {str(pregunta.get("id")) for pregunta in preguntas}
    ids_desconocidos = sorted(set(respuestas) - ids_validos)
    if ids_desconocidos:
        raise HTTPException(
            status_code=422,
            detail=(
                "Hay respuestas para preguntas inexistentes: "
                f"{', '.join(ids_desconocidos)}."
            ),
        )

    contadores = {
        "correctas": 0,
        "incorrectas": 0,
        "no_se": 0,
        "pendientes_revision": 0,
    }
    respondidas = 0
    por_examen: dict[str, dict] = {}
    por_tema: dict[str, dict] = {}
    detalle = []

    for pregunta in preguntas:
        pregunta_id = str(pregunta.get("id"))
        solucion = soluciones.get(pregunta_id)
        if not isinstance(solucion, dict):
            raise HTTPException(
                status_code=500,
                detail=f"Falta una solución válida para la pregunta {pregunta_id}.",
            )

        respuesta = respuestas.get(pregunta_id)
        if isinstance(respuesta, str):
            respuesta = respuesta.strip()
        if respuesta:
            respondidas += 1

        tipo_pregunta = pregunta.get("tipo")
        es_manual = solucion.get("tipo") == "manual" or tipo_pregunta == "text"
        respuesta_correcta = solucion.get("correcta")
        explicacion = solucion.get("explicacion", "")
        orientacion = solucion.get("orientacion", explicacion)

        if not respuesta or respuesta == "NS":
            estado = "no_se"
            es_correcta = False
        elif es_manual:
            estado = "pendiente_revision"
            es_correcta = None
        elif respuesta == respuesta_correcta:
            estado = "correcta"
            es_correcta = True
        else:
            estado = "incorrecta"
            es_correcta = False

        claves_contador = {
            "correcta": "correctas",
            "incorrecta": "incorrectas",
            "no_se": "no_se",
            "pendiente_revision": "pendientes_revision",
        }
        clave_contador = claves_contador[estado]
        contadores[clave_contador] += 1
        actualizar_agrupacion(
            por_examen, pregunta.get("examen", ""), es_correcta is True
        )
        actualizar_agrupacion(
            por_tema, pregunta.get("tema", ""), es_correcta is True
        )

        detalle.append(
            {
                "id": pregunta.get("id"),
                "examen": pregunta.get("examen"),
                "tema": pregunta.get("tema"),
                "pregunta": pregunta.get("pregunta"),
                "tipo": tipo_pregunta,
                "opciones": pregunta.get("opciones", {}),
                "respuesta_usuario": respuesta or None,
                "respuesta_correcta": respuesta_correcta,
                "correcta": es_correcta,
                "estado": estado,
                "explicacion": explicacion,
                "orientacion": orientacion if es_manual else None,
            }
        )

    completar_porcentajes(por_examen)
    completar_porcentajes(por_tema)
    total = len(preguntas)
    return {
        "total_preguntas": total,
        "respondidas": respondidas,
        **contadores,
        "porcentaje": calcular_porcentaje(contadores["correctas"], total),
        "por_examen": por_examen,
        "por_tema": por_tema,
        "detalle": detalle,
    }


def guardar_intento(test_id: str, respuestas: dict, resultado: dict) -> str:
    fecha = datetime.now().astimezone()
    nombre_base = f"{test_id}_{fecha.strftime('%Y-%m-%d_%H-%M-%S')}"

    try:
        directorio_test = RESPUESTAS_DIR / test_id
        directorio_test.mkdir(parents=True, exist_ok=True)
        ruta = directorio_test / f"{nombre_base}.json"
        numero = 2
        while ruta.exists():
            ruta = directorio_test / f"{nombre_base}_{numero}.json"
            numero += 1

        intento = {
            "fecha": fecha.isoformat(timespec="seconds"),
            "test_id": test_id,
            "respuestas": respuestas,
            "resultado": resultado,
        }
        with ruta.open("x", encoding="utf-8") as fichero:
            json.dump(intento, fichero, ensure_ascii=False, indent=2)
    except OSError:
        raise HTTPException(
            status_code=500,
            detail="El test se corrigió, pero no se pudo guardar el intento en disco.",
        ) from None

    return f"{test_id}/{ruta.name}"


@app.get("/")
def home():
    return FileResponse(TEMPLATES_DIR / "index.html")


@app.get("/api/health")
def health():
    return {"status": "ok", "message": "Certification Training Lab funcionando"}


@app.get("/api/tests")
def get_tests():
    tests = []
    if not DATA_DIR.is_dir():
        return {"tests": tests}

    for test_dir in sorted(DATA_DIR.iterdir(), key=lambda ruta: ruta.name.lower()):
        if not test_dir.is_dir() or not TEST_ID_PATTERN.fullmatch(test_dir.name):
            continue
        if not (test_dir / "soluciones.json").is_file():
            continue

        try:
            datos = cargar_json(test_dir / "preguntas.json", "preguntas.json")
        except HTTPException:
            continue
        preguntas = datos.get("preguntas")
        if datos.get("test_id") != test_dir.name or not isinstance(preguntas, list):
            continue

        tests.append(
            {
                "test_id": test_dir.name,
                "curso": datos.get("curso", "Otros"),
                "titulo": datos.get("titulo", test_dir.name),
                "descripcion": datos.get("descripcion", ""),
                "modalidad": datos.get("modalidad", "Práctica"),
                "duracion_minutos": datos.get("duracion_minutos"),
                "total_preguntas": len(preguntas),
                "examenes": sorted(
                    {
                        pregunta.get("examen")
                        for pregunta in preguntas
                        if pregunta.get("examen")
                    }
                ),
                "temas": len(
                    {
                        pregunta.get("tema")
                        for pregunta in preguntas
                        if pregunta.get("tema")
                    }
                ),
            }
        )

    return {"tests": tests}


@app.get("/api/questions")
def get_questions(test_id: str = Query(..., min_length=1, max_length=100)):
    test_dir = ruta_test(test_id)
    return cargar_json(test_dir / "preguntas.json", "preguntas.json")


@app.post("/api/submit")
def submit_test(entrega: EntregaTest):
    datos_preguntas, soluciones = cargar_test(entrega.test_id)
    resultado = corregir_test(
        datos_preguntas["preguntas"], soluciones, entrega.respuestas
    )
    resultado["test_id"] = entrega.test_id
    resultado["titulo"] = datos_preguntas.get("titulo", "Test")
    resultado["intento_guardado"] = guardar_intento(
        entrega.test_id, entrega.respuestas, resultado
    )
    return resultado
