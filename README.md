# Certification Training Lab

Aplicación local para practicar y preparar certificaciones, construida con FastAPI,
HTML, CSS y JavaScript vanilla. Las soluciones permanecen en el backend y no
se envían al navegador hasta corregir un intento.

## Estado actual

| Curso | Tests | Preguntas |
| --- | ---: | ---: |
| CCNA 200-301 v1.1 | 5 | 105 |
| ISC2 Certified in Cybersecurity | 6 | 125 |
| LPIC-1 101-500 y 102-500 | 7 | 180 |
| **Total** | **18** | **410** |

## Características

- Catálogo organizado primero por certificación y después por test.
- Diagnósticos iniciales, prácticas por niveles y simulacros mixtos.
- Preguntas de selección múltiple con corrección automática y ejercicios de
  respuesta manual con orientación para revisarlos.
- Progreso independiente por test, guardado localmente en el navegador.
- Resultados globales y desglose de aciertos por examen y por tema.
- Revisión explicada de cada pregunta al finalizar un intento.
- API que mantiene las soluciones fuera del navegador hasta la corrección.

## Estructura

```text
api-test/
├── app.py
├── data/
│   ├── ccna-diagnostico/
│   ├── ccna-nivel-1/
│   ├── ccna-nivel-2/
│   ├── ccna-nivel-3/
│   ├── ccna-simulacro-1/
│   ├── isc2-cc-diagnostico/
│   ├── isc2-cc-nivel-1/
│   ├── isc2-cc-nivel-2/
│   ├── isc2-cc-nivel-3/
│   ├── isc2-cc-simulacro-1/
│   ├── isc2-cc-simulacro-2/
│   ├── lpic-1/
│   ├── lpic-1-nivel-1/
│   ├── lpic-1-nivel-2/
│   ├── lpic-1-nivel-3/
│   ├── lpic-1-nivel-4/
│   ├── lpic-1-simulacro-101/
│   └── lpic-1-simulacro-102/
│       ├── preguntas.json
│       └── soluciones.json
├── respuestas/
│   └── <test_id>/
├── static/
├── templates/
└── requirements.txt
```

Cada test vive en su propio directorio dentro de `data/`. El nombre del
directorio debe coincidir con `test_id` en `preguntas.json`. El campo `curso`
agrupa sus tests en la portada, por ejemplo `"curso": "CCNA"`. Al incluir
ambos JSON válidos, el curso y el test aparecen automáticamente en el catálogo.

## Arranque

Desde la raíz de `api-test`:

```powershell
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
uvicorn app:app --reload
```

Abre `http://127.0.0.1:8000`. La documentación interactiva está disponible en
`http://127.0.0.1:8000/docs`.

## Añadir un test

1. Crea `data/<test_id>/preguntas.json` y `soluciones.json`.
2. Usa IDs únicos y una solución por pregunta.
3. Utiliza `multiple_choice` para autocorrección y `text` con solución `manual`
   para revisión humana.
4. Recarga la portada: el catálogo se genera automáticamente.

## API

- `GET /api/health`: estado de la aplicación.
- `GET /api/tests`: catálogo público de tests y sus metadatos.
- `GET /api/questions?test_id=<id>`: preguntas públicas, nunca soluciones.
- `POST /api/submit`: corrige y guarda el intento en
  `respuestas/<test_id>/`.

Las respuestas en curso se almacenan en `localStorage` bajo una clave distinta
para cada `test_id`. Los intentos corregidos se guardan en `respuestas/`, pero
sus archivos JSON están excluidos de Git para no publicar resultados personales.

## Recorrido CCNA

- `ccna-diagnostico`: evaluación inicial ponderada por los seis dominios de
  CCNA 200-301 v1.1.
- `ccna-nivel-1`: modelos, direccionamiento, switching, VLAN, STP y wireless.
- `ccna-nivel-2`: routing, OSPF, FHRP, NAT, DHCP y servicios IP.
- `ccna-nivel-3`: seguridad de acceso y capa 2, APIs, automatización e IA/ML.
- `ccna-simulacro-1`: simulacro mixto ponderado por los seis dominios oficiales.

## Recorrido LPIC-1

- `lpic-1`: diagnóstico conjunto de 101-500 y 102-500.
- `lpic-1-nivel-1`: arquitectura, arranque, instalación y gestión de paquetes.
- `lpic-1-nivel-2`: comandos GNU/Unix, dispositivos, sistemas de archivos y FHS.
- `lpic-1-nivel-3`: shell, scripting, tareas administrativas y servicios esenciales.
- `lpic-1-nivel-4`: fundamentos de redes y seguridad.
- `lpic-1-simulacro-101`: simulación corta y específica del examen 101-500.
- `lpic-1-simulacro-102`: simulación corta y específica del examen 102-500.

## Recorrido ISC2 CC

- `isc2-cc-diagnostico`: evaluación inicial ponderada según el esquema oficial
  vigente desde el 1 de septiembre de 2026.
- `isc2-cc-nivel-1`: principios de seguridad, riesgo, gobierno, continuidad y
  gobierno de IA.
- `isc2-cc-nivel-2`: ciclo de identidades, modelos de acceso, redes, Zero Trust
  y responsabilidad compartida en cloud.
- `isc2-cc-nivel-3`: protección de datos, SIEM, triage, inteligencia de
  amenazas, respuesta a incidentes, testing e IA en operaciones.
- `isc2-cc-simulacro-1`: 25 preguntas mixtas, cinco por cada dominio.
- `isc2-cc-simulacro-2`: 25 escenarios mixtos de dificultad superior, cinco
  por cada dominio e integración transversal de seguridad de IA.

## Fuentes de preparación

El contenido de la aplicación es original y se construye a partir de objetivos
públicos. No se incorporan exam dumps ni preguntas confidenciales.

- [Objetivos oficiales LPIC-1](https://www.lpi.org/our-certifications/exam-101-102-objectives/)
- [Temario oficial CCNA](https://learningnetwork.cisco.com/s/ccna-exam-topics)
- [Cisco Press Official Cert Guide y practice tests](https://www.ciscopress.com/store/ccna-200-301-official-cert-guide-library-premium-edition-0138221448)
- [Esquema oficial ISC2 CC](https://www.isc2.org/certifications/cc/cc-certification-exam-outline)
