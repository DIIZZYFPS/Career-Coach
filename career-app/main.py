from typing import Optional
from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from fastapi.responses import StreamingResponse
import asyncio

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class QueryRequest(BaseModel):
    instruction: str
    input_text: str
class UploadRequest(BaseModel):
    file: UploadFile
    instruction: str

@app.get("/")
async def root():
    return {"message": "Career Coach AI is running!"}

@app.post("/query")
async def query_career_coach(
    instruction: str = Form(...),
    input_text: str = Form(...),
    file: Optional[UploadFile] = File(None)
):
    if file:
        file_info = f" and file: {file.filename}"
    else:
        file_info = ""
    response_text = f"Received instruction: {instruction} with input: {input_text}{file_info}"

    async def token_stream():
        for word in response_text.split():
            yield word + " "
            await asyncio.sleep(0.05)  # Simulate delay per token

    return StreamingResponse(token_stream(), media_type="text/plain")
