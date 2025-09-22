from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],   
)

@app.options("/upload")  
async def upload_options():
    return JSONResponse(content={}, status_code=200)

@app.post("/upload")
async def upload_video(file: UploadFile = File(...)):
    content = await file.read()
    # Here you can run your ML model
    return JSONResponse({"message": f"Received {file.filename}, size {len(content)} bytes"})
