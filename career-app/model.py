import torch
from unsloth import FastLanguageModel
from transformers import TextStreamer
from queue import Queue
import threading

#model definition

MODEL_PATH = "models/checkpoint-1000" 

def format_inference_example(instruction, input_text):
    formatted_text = f"""<|im_start|>system
You are a career coaching AI assistant. Analyze resumes against job descriptions and provide helpful career guidance.
<|im_end|>
<|im_start|>user
{instruction}
{input_text}
<|im_end|>
<|im_start|>assistant
"""
    return formatted_text
def generate_response(instruction, input_text):

    try:
        model, tokenizer = FastLanguageModel.from_pretrained(
            model_name = MODEL_PATH,
            max_seq_length = 2048,
            dtype = None,
            load_in_4bit = True,
        )
        print("Model and tokenizer loaded successfully!")
    except Exception as e:
        print(f"Error loading model: {e}")
        return "Error loading model. Please check the model path and ensure it exists."
    
    formatted_text = format_inference_example(instruction, input_text)
    inputs = tokenizer(formatted_text, return_tensors="pt").to(model.device)
    
    # Generate response
    output = model.generate(
        **inputs,
        max_new_tokens=512,
        do_sample=True,
        temperature=0.7,
        streamer=TextStreamer(tokenizer, skip_prompt=True, skip_special_tokens=True)
    )
    
    # Decode the generated tokens
    response = tokenizer.decode(output[0], skip_special_tokens=True)
    return response



#Custom TextStreamer to handle real-time output
class QueueTextStreamer(TextStreamer):
    def __init__(self, tokenizer, skip_prompt:True, **kwargs):
        super().__init__(tokenizer, skip_prompt, **kwargs)
        self.text_queue = Queue()

    def on_finalized_text(self, text, stream_end: bool = False):
        self.text_queue.put(text)
        if stream_end:
            self.text_queue.put(None)