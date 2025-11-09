from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
#start of the app
app= FastAPI()


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # frontend (React) can access it easily
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def health_check():
    return {"status": "API is running"}
