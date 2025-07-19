# main.py
import torch
from unsloth import FastLanguageModel
from transformers import TextStreamer
from queue import Queue
import threading
from typing import List, Optional
import io
import json

from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from fastapi.responses import StreamingResponse

# --- 1. Correct the Model Path ---
# Load from the final output directory, not the intermediate checkpoint.
# This directory contains the all-important 'adapter_config.json'.
MODEL_PATH = "models/checkpoint-1000" 
model, tokenizer = None, None

try:
    print(f"Loading fine-tuned model from {MODEL_PATH}...")
    model, tokenizer = FastLanguageModel.from_pretrained(
        model_name=MODEL_PATH,
        max_seq_length=2048,
        dtype=None,
        load_in_4bit=True,
    )
    print("✅ Model and tokenizer loaded successfully!")
except Exception as e:
    print(f"🚨 Error loading model: {e}")

# --- 2. Custom Streamer (Unchanged) ---
class QueueTextStreamer(TextStreamer):
    def __init__(self, tokenizer, skip_prompt: bool = True, **kwargs):
        super().__init__(tokenizer, skip_prompt, **kwargs)
        self.text_queue = Queue()

    def on_finalized_text(self, text: str, stream_end: bool = False):
        self.text_queue.put(text)
        if stream_end:
            self.text_queue.put(None)

# --- 3. FastAPI Application Setup (Unchanged) ---
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 4. File Reading Functions (Unchanged) ---
def read_pdf(file_bytes: bytes) -> str:
    import fitz
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    text = ""
    for page in doc:
        text += page.get_text()
    return text

def read_docx(file_bytes: bytes) -> str:
    from docx import Document
    doc = Document(io.BytesIO(file_bytes))
    text = ""
    for para in doc.paragraphs:
        text += para.text + "\n"
    return text

# --- 5. Request Models & Prompt Formatting (Corrected) ---
class Message(BaseModel):
    role: str
    content: str

def format_prompt_from_history(conversation_history: List[Message]):
    system_prompt = """<|im_start|>system
You are a career coaching AI assistant. Analyze resumes against job descriptions and provide helpful career guidance. <|im_end|>
"""
    chat_history = ""
    for message in conversation_history:
        if message.role == 'user':
            chat_history += f"<|im_start|>user\n{message.content}<|im_end|>\n"
        elif message.role == 'assistant':
             chat_history += f"<|im_start|>assistant\n{message.content}<|im_end|>\n"
    return f"{system_prompt}{chat_history}<|im_start|>assistant\n"

# --- 6. Streaming Logic (Unchanged) ---
def response_generator(streamer: QueueTextStreamer, thread: threading.Thread):
    while thread.is_alive() or not streamer.text_queue.empty():
        token = streamer.text_queue.get()
        if token is None:
            break
        yield token

@app.post("/query")
async def query_career_coach(
    conversation_json: str = Form(...),
    file: Optional[UploadFile] = File(None)
):
    if not model or not tokenizer:
        return StreamingResponse(iter(["Error: Model is not loaded. Please check server logs."]), status_code=500)

    conversation = [Message(**msg) for msg in json.loads(conversation_json)]

    if file:
        file_text = ""
        if file.content_type == "application/pdf":
            file_text = read_pdf(file)
        elif file.content_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
            file_text = read_docx(file)
        
        if file_text and conversation:
            conversation[-1].content += f"\n\n--- Attached Document ---\n{file_text}"

    prompt = format_prompt_from_history(conversation)
    inputs = tokenizer([prompt], return_tensors="pt").to("cuda")
    
    streamer = QueueTextStreamer(tokenizer, skip_prompt=True, skip_special_tokens=True)

    generation_kwargs = dict(
        inputs,
        streamer=streamer,
        max_new_tokens=2048,
        do_sample=True,
        temperature=0.7,
        top_p=0.95,
        top_k=50
    )

    thread = threading.Thread(target=model.generate, kwargs=generation_kwargs)
    thread.start()

    return StreamingResponse(response_generator(streamer, thread), media_type="text/event-stream")