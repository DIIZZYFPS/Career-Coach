# Career Coach

![Career Coach Logo](https://img.shields.io/badge/Career-Coach-blue?style=for-the-badge)
![Version](https://img.shields.io/badge/version-1.0.0-green?style=for-the-badge)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS-lightgrey?style=for-the-badge)

An AI-powered career coaching application that analyzes resumes against job descriptions, identifies skill gaps, and provides personalized career guidance. Built with a fine-tuned language model and modern desktop technologies.

## Important Note

As of right now due to the lack of macOS support with Unsloth the Mac version currently does not work, I am aware of this and am working on a workaround.


## ✨ Features

- **Resume Analysis**: Upload PDF or DOCX resumes for detailed analysis
- **Job Description Matching**: Compare your skills against specific job requirements
- **Skill Gap Identification**: Discover areas for professional development
- **Learning Recommendations**: Get personalized resource suggestions
- **Interview Preparation**: Receive tailored interview questions
- **Real-time AI Chat**: Interactive conversation with your career coach
- **Offline Capability**: Works without internet after initial setup

## 🚀 Quick Start

### Download & Installation

#### For End Users (Recommended)

1. **Download the latest release:**
   - Visit the [Releases page](https://github.com/DIIZZYFPS/Career-Coach/releases)
   - Download the appropriate version for your operating system:
     - **Windows**: `Career-Coach-Setup-1.0.0.exe`
     - **macOS**: `Career-Coach-1.0.0.dmg`

2. **Install the application:**
   - **Windows**: Run the `.exe` file and follow the installation wizard
   - **macOS**: Open the `.dmg` file and drag the app to your Applications folder

3. **First Launch:**
   - Launch Career Coach from your applications
   - The app will automatically set up the AI model (requires internet connection)
   - Wait for the "AI backend ready" message before using

#### System Requirements

- **Windows**: Windows 10 or later, 8GB RAM, 10GB free disk space
- **macOS**: macOS 10.15 or later, 8GB RAM, 10GB free disk space
- **Internet**: Required for initial model download (~3GB)

## 📖 How to Use

### Getting Started

1. **Launch the Application**
   - Open Career Coach from your desktop or applications folder
   - Wait for the loading screen to complete

2. **Start a Conversation**
   - Click "New Chat" or use the main text input
   - Type your career-related question or request

### Core Features

#### Resume Analysis
```
Upload your resume and ask questions like:
"Analyze my resume against this job description: [paste job description]"
"What skills am I missing for a Senior Product Manager role?"
"How can I improve my resume for tech positions?"
```

#### Skill Gap Analysis
The AI will identify:
- Missing technical skills
- Experience gaps
- Industry knowledge updates needed
- Soft skills to develop

#### Learning Recommendations
Get personalized suggestions for:
- Online courses and certifications
- Books and articles to read
- Projects to build
- Communities to join

#### Interview Preparation
Receive tailored questions based on:
- Your background and experience
- Target job requirements
- Industry-specific scenarios
- Behavioral interview topics

### File Upload Support

- **PDF Resumes**: Drag and drop or click to upload
- **Word Documents**: .docx format supported
- **File Size**: Up to 10MB per file

## 🛠️ For Developers

### Prerequisites

- Node.js 18+ and npm
- Python 3.11+
- CUDA-compatible GPU (recommended)
- Git

### Development Setup

1. **Clone the repository:**
```bash
git clone https://github.com/DIIZZYFPS/Career-Coach.git
cd Career-Coach
```

2. **Set up the Frontend:**
```bash
cd Frontend/ui
npm install
```

3. **Set up the Backend:**
```bash
cd ../../career-app
python -m venv venv
# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

pip install -r requirements.txt
```

4. **Run in Development:**
```bash
# Terminal 1: Start the backend
cd career-app
python main.py

# Terminal 2: Start the frontend
cd Frontend/ui
npm run electron:dev
```

### Building for Production

```bash
cd Frontend/ui
npm run electron:build
```

## 🤖 Technical Details

### Architecture Overview

The Career Coach application consists of three main components:

1. **Frontend**: Electron-based desktop application built with React and TypeScript
2. **Backend**: FastAPI server with AI model integration
3. **AI Model**: Fine-tuned language model optimized for career coaching

### AI Model Details

#### Base Model
- **Architecture**: Gemma-3-4b-it (Google's Gemma 3 Instruct model)
- **Size**: 4 billion parameters
- **Quantization**: 4-bit quantized for efficient inference
- **Context Length**: 2048 tokens

#### Fine-tuning Process

The model was fine-tuned using **LoRA (Low-Rank Adaptation)** technique for efficient training:

**Training Configuration:**
```python
# LoRA Parameters
r = 16                    # LoRA rank
lora_alpha = 16          # LoRA scaling parameter
lora_dropout = 0         # No dropout for stability
target_modules = ["all-linear"]  # Apply to all linear layers

# Training Parameters
batch_size = 2           # Per device batch size
gradient_accumulation = 4 # Effective batch size: 8
learning_rate = 2e-4     # Conservative learning rate
max_steps = 1000         # Training steps
warmup_steps = 5         # Learning rate warmup
optimizer = "adamw_8bit" # Memory-efficient optimizer
```

**Dataset Preparation:**
- **Format**: JSONL with instruction-following format
- **Size**: ~2000 career coaching examples
- **Structure**: Each example contains:
  - `instruction`: Task description
  - `input`: Resume and job description
  - `output`: Analysis with skill gaps, learning suggestions, and interview questions

**Training Data Format:**
```json
{
  "instruction": "Analyze the provided resume against the job description.",
  "input": "Resume: '...' Job Description: '...'",
  "output": {
    "analysis": "...",
    "skill_gaps": ["...", "..."],
    "learning_suggestions": [{"skill": "...", "resource": "..."}],
    "interview_questions": ["...", "..."]
  }
}
```

**Optimization Techniques:**
- **4-bit Quantization**: Reduces memory usage by 75%
- **Gradient Checkpointing**: Trades compute for memory
- **Mixed Precision**: FP16/BF16 for faster training
- **PEFT (Parameter-Efficient Fine-Tuning)**: Only trains ~1% of parameters

#### Model Performance

- **Training Time**: ~2 hours on RTX 4090
- **Memory Usage**: ~8GB VRAM during inference
- **Response Quality**: Specialized for career coaching tasks
- **Inference Speed**: ~50 tokens/second on modern GPUs

#### Deployment Strategy

1. **Model Storage**: Hosted on Hugging Face Hub (`DIIZZY/career-coach-v2`)
2. **Local Caching**: Downloaded to user's machine on first run
3. **Fallback Support**: Graceful degradation if model unavailable
4. **Progressive Loading**: Stream responses for better UX

### Framework Stack

**Frontend Technologies:**
- **Electron**: Cross-platform desktop framework
- **React 19**: Modern UI framework
- **TypeScript**: Type-safe JavaScript
- **Tailwind CSS**: Utility-first styling
- **Vite**: Fast build tool

**Backend Technologies:**
- **FastAPI**: High-performance Python web framework
- **Unsloth**: Optimized transformer library
- **PyTorch**: Deep learning framework
- **Uvicorn**: ASGI server

**Development Tools:**
- **ESLint**: Code linting and formatting
- **Electron Builder**: Application packaging
- **GitHub Actions**: CI/CD pipeline
- **Hugging Face**: Model hosting and distribution

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines and submit pull requests for any improvements.

## 📞 Support

For support, please:
1. Check the [Issues](https://github.com/DIIZZYFPS/Career-Coach/issues) page
2. Create a new issue with detailed information
3. Include system specifications and error messages

## 🙏 Acknowledgments

- **Unsloth**: For efficient fine-tuning capabilities
- **Google**: For the Gemma model architecture
- **Hugging Face**: For model hosting and transformers library
- **Electron Team**: For the cross-platform framework

