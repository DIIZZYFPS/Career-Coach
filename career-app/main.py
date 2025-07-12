import torch
from unsloth import FastLanguageModel
from transformers import TextStreamer
import json

# Define the path where your model was saved
MODEL_PATH = "models/checkpoint-1000" # This should match the output_dir in model_train.py

def format_inference_example(instruction, input_text):
    """
    Formats the instruction and input text into the chat-like format
    expected by the fine-tuned model during inference.
    This should match the format_training_example function from convert_dataset.py,
    but without the assistant's output part.
    """
    formatted_text = f"""<|im_start|>system
You are a career coaching AI assistant. Analyze resumes against job descriptions and provide helpful career guidance.
<|im_im_end|>
<|im_start|>user
{instruction}

{input_text}
<|im_end|>
<|im_start|>assistant
"""
    return formatted_text

def main():
    """
    Loads the fine-tuned model and tokenizer, then provides an interactive
    interface to test the model with user inputs.
    """
    print(f"Loading model and tokenizer from {MODEL_PATH}...")
    try:
        # Load the fine-tuned model and tokenizer
        # Ensure load_in_4bit is set to True if you trained it that way
        model, tokenizer = FastLanguageModel.from_pretrained(
            model_name = MODEL_PATH, # Load from your saved directory
            max_seq_length = 2048,
            dtype = None, # Will infer from saved model or default
            load_in_4bit = True, # Must match your training setup
        )
        print("Model and tokenizer loaded successfully!")
    except Exception as e:
        print(f"Error loading model: {e}")
        print("Please ensure the model was saved correctly in the 'models' directory.")
        print("Also, verify that the 'unsloth' library and its dependencies are installed.")
        return

    # Set up a text streamer for real-time output
    # This makes the output appear character by character, like a chatbot
    text_streamer = TextStreamer(tokenizer, skip_prompt=True, skip_special_tokens=True)

    print("\n--- Career Coach AI Test ---")
    print("Enter your career coaching queries. Type 'exit' to quit.")
    print("----------------------------")

    while True:
        instruction = input("\nEnter the instruction (e.g., 'Analyze the resume'):\n> ")
        if instruction.lower() == 'exit':
            break

        input_text = input("Enter the input text (e.g., 'Resume: ... Job Description: ...'):\n> ")
        if input_text.lower() == 'exit':
            break

        # Format the prompt for the model
        prompt = format_inference_example(instruction, input_text)

        print("\nGenerating response...")
        # Encode the prompt and generate text
        inputs = tokenizer(
            prompt,
            return_tensors = "pt",
            max_length = 2048, # Ensure this matches max_sequence_length
            truncation = True,
        ).to("cuda" if torch.cuda.is_available() else "cpu")

        # Generate output using the model
        # You can adjust max_new_tokens for longer or shorter responses
        # num_beams can be set > 1 for more diverse outputs, but is slower
        _ = model.generate(
            **inputs,
            streamer = text_streamer,
            max_new_tokens = 2000, # Adjust as needed for response length
            use_cache = True,
            # For better quality, you might want to add:
            do_sample = True,
            top_k = 50,
            top_p = 0.95,
            temperature = 0.7,
        )
        print("\n----------------------------")

    print("Exiting Career Coach AI Test. Goodbye!")

if __name__ == "__main__":
    main()
