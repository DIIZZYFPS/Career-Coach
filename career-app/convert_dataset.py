import json

def convert_dataset_for_training():
    """Convert the structured dataset to the format expected by SFTTrainer."""
    
    input_file = "dataset.jsonl"
    output_file = "dataset_formatted.jsonl"
    
    print("Loading original dataset...")
    
    # Load the original dataset - handle both JSON array and JSONL formats
    try:
        with open(input_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except json.JSONDecodeError as e:
        print(f"JSON parsing error: {e}")
        print("Attempting to fix formatting issues...")
        
        # Read the raw content and try to fix it
        with open(input_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Remove trailing commas and fix missing commas between objects
        import re
        content = re.sub(r',(\s*[}\]])', r'\1', content)
        content = re.sub(r'}(\s*){', r'},\1{', content)
        
        try:
            data = json.loads(content)
        except json.JSONDecodeError as e2:
            print(f"Still failed to parse: {e2}")
            return
    
    print(f"Found {len(data)} records")
    
    # Convert each record to the expected format
    formatted_data = []
    
    for record in data:
        # Create a formatted text field combining instruction, input, and output
        formatted_text = format_training_example(
            record["instruction"],
            record["input"], 
            record["output"]
        )
        
        formatted_data.append({"text": formatted_text})
    
    # Write the formatted data as JSONL (one JSON object per line)
    print(f"Writing formatted dataset to {output_file}...")
    with open(output_file, 'w', encoding='utf-8') as f:
        for record in formatted_data:
            f.write(json.dumps(record, ensure_ascii=False) + '\n')
    
    print(f"✅ Successfully converted {len(formatted_data)} records")
    print(f"📁 Output saved to: {output_file}")
    
    # Show a sample of the formatted data
    print("\n🔍 Sample formatted record:")
    print("-" * 80)
    print(formatted_data[0]["text"][:500] + "..." if len(formatted_data[0]["text"]) > 500 else formatted_data[0]["text"])

def format_training_example(instruction, input_text, output):
    """Format a single training example into the text format expected by the model."""
    
    # Convert output dict to a nicely formatted JSON string
    output_json = json.dumps(output, indent=2, ensure_ascii=False)
    
    # Create the formatted training text using a chat-like format
    formatted_text = f"""<|im_start|>system
You are a career coaching AI assistant. Analyze resumes against job descriptions and provide helpful career guidance.
<|im_end|>
<|im_start|>user
{instruction}

{input_text}
<|im_end|>
<|im_start|>assistant
{output_json}
<|im_end|>"""
    
    return formatted_text

if __name__ == "__main__":
    convert_dataset_for_training()
