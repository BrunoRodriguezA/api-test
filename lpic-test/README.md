# LPIC Test App

## Arranque

1. Activa tu entorno virtual.
2. Instala dependencias:

```bash
python -m pip install -r requirements.txt
```

3. Arranca la app:

```bash
uvicorn app:app --reload
```

4. Abre:

```text
http://127.0.0.1:8000
```

Swagger:

```text
http://127.0.0.1:8000/docs
```

## Funciones incluidas

- Carga preguntas desde `preguntas.json`
- Multiple choice
- Preguntas abiertas
- Opción "No sé"
- Navegación anterior/siguiente
- Barra de progreso
- Guardado automático en localStorage
- Recuperación tras recargar/cerrar navegador
- Exportación de respuestas a JSON
- Reinicio del test
- Soporte para distintos tests mediante `test_id`
