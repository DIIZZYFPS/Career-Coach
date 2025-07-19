import torch
from unsloth import FastLanguageModel
from datasets import load_dataset
from trl import SFTTrainer
from transformers import TrainingArguments

# --- Model Loading (Unchanged) ---
model, tokenizer = FastLanguageModel.from_pretrained(
    model_name = "unsloth/gemma-3-4b-it-unsloth-bnb-4bit",
    max_seq_length = 2048,
    dtype = None,
    load_in_4bit = True,
)

# --- PEFT Model Setup (Unchanged) ---
model = FastLanguageModel.get_peft_model(
    model,
    r = 16,
    lora_alpha = 16,
    lora_dropout = 0,
    bias = "none",
    use_gradient_checkpointing = True,
    random_state = 3407,
    use_rslora = False,
    loftq_config = None
)

# --- Dataset Loading (Unchanged) ---
dataset = load_dataset("json", data_files="dataset_formatted.jsonl", split="train")

# --- Trainer Setup (Unchanged) ---
trainer = SFTTrainer(
    model = model,
    tokenizer = tokenizer,
    train_dataset = dataset,
    dataset_text_field = "text",
    max_seq_length = 2048,
    dataset_num_proc = 2,
    packing = False,
    args = TrainingArguments(
        per_device_train_batch_size= 2,
        gradient_accumulation_steps = 4,
        warmup_steps = 5,
        max_steps = 1000,
        learning_rate = 2e-4,
        fp16 = not torch.cuda.is_bf16_supported(),
        bf16 = torch.cuda.is_bf16_supported(),
        logging_steps = 1,
        optim = "adamw_8bit",
        weight_decay= 0.01,
        lr_scheduler_type = "linear",
        seed= 3407,
        output_dir = "models",
    ),
)

# --- Training (Unchanged) ---
print("Starting model training...")
trainer.train()
print("✅ Training complete!")


# --- ADD THESE TWO LINES ---
# This explicitly saves the final adapter configuration and tokenizer files.
print("Saving final model and tokenizer...")
model.save_pretrained("models")
tokenizer.save_pretrained("models")
print("✅ Model and tokenizer saved successfully to 'models' directory!")