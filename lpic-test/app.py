import json

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles


app = FastAPI()

app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/")
def home():
    return FileResponse("templates/index.html")


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "message": "LPIC Test API funcionando"
    }


@app.get("/api/questions")
def get_questions():

    with open("preguntas.json", "r", encoding="utf-8") as fichero:
        preguntas = json.load(fichero)

    return preguntas