# 📑 AI-Powered PDF to PPTX Converter

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![React](https://img.shields.io/badge/React-19-61dafb.svg)
![Gemini](https://img.shields.io/badge/AI-Gemini_2.0_Flash-8e44ad.svg)

A modern, AI-driven tool that converts PDF presentations into **fully editable PowerPoint (PPTX)** files. Unlike traditional converters that simply paste images onto slides, this tool uses a **Hybrid Parsing Architecture** to separate text, shapes, and images into distinct, editable layers.

## ✨ Key Features

- **Editable Text Reconstruction**: Uses extracted text layers (not OCR) for 100% spelling accuracy and editability.
- **Smart Layout Analysis**: Powered by **Google Gemini 2.0 Flash** to understand slide structure, groupings, and visual hierarchies.
- **Visual Asset Preservation**: Automatically crops and separates photos, diagrams, and icons from the background.
- **Modern UI/UX**: Features a glassmorphism-inspired dark mode interface with smooth micro-animations.
- **Privacy Focused**: Runs locally in your browser (processing logic is client-side + API).

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- A Google Cloud API Key with access to **Gemini 2.0 Flash**.

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/pjhwa/cup-pdf-to-pptx.git
   cd cup-pdf-to-pptx
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure API Key**
   Create a `.env` file in the root directory:
   ```env
   VITE_GEMINI_API_KEY=your_actual_api_key_here
   ```

4. **Run Development Server**
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.

## 🏗️ Architecture

This project uses a **Hybrid Parsing Approach**:

1.  **PDF.js**: Extracts raw text content (content, coordinates, font info) and renders the page as a high-res image.
2.  **Hybrid Context Payload**: The AI receives both the *Visual Image* and the *Structured Text Layer*.
3.  **Gemini 2.0 Flash**: Analyzing the image using the text layer as ground truth, it maps visual elements to text and identifies layout structures.
4.  **PptxGenJS**: Reconstructs the slide vector-by-vector, placing text boxes, shapes, and cropped images in their precise positions.

👉 [Read detailed Architecture Documentation](docs/ARCHITECTURE.md)

## 🛠️ Tech Stack

- **Frontend**: React 19, Vite, TypeScript
- **Styling**: Tailwind CSS (Custom Config), Pure CSS Animations
- **PDF Processing**: `pdfjs-dist` (Text Layer & Rendering)
- **AI Model**: Google GenAI SDK (`gemini-2.0-flash`)
- **Presentation Gen**: `pptxgenjs`

## 📂 Project Structure

```
├── components/        # React UI Components (Dropzone, Preview, etc.)
├── services/          # Core Logic
│   ├── pdfService.ts    # PDF text/image extraction
│   ├── geminiService.ts # AI Layout Analysis
│   └── pptxService.ts   # PPTX Synthesis
├── docs/              # Detailed Documentation
├── App.tsx            # Main Application Controller
└── constants.ts       # Configuration Constants
```

## 📜 License

This project is licensed under the MIT License.
