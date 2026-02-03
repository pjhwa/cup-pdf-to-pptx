import React, { useState } from 'react';
import { FileText, Download, Wand2, RefreshCw, AlertCircle } from 'lucide-react';
import Dropzone from './components/Dropzone';
import ProcessingStatus from './components/ProcessingStatus';
import SlidePreview from './components/SlidePreview';
import { processPdfDocument } from './services/pdfService';
import { analyzeSlideWithGemini } from './services/geminiService';
import { generatePptxFile } from './services/pptxService';
import { AppState, SlideData } from './types';

const INITIAL_STATE: AppState = {
  file: null,
  isProcessing: false,
  currentStep: 'upload',
  progress: 0,
  totalSlides: 0,
  processedSlides: 0,
  error: null,
  generatedFileName: null,
  slidesData: [],
};

function App() {
  const [state, setState] = useState<AppState>(INITIAL_STATE);

  const handleFileSelect = (file: File) => {
    setState({ ...INITIAL_STATE, file, currentStep: 'upload' });
  };

  const startConversion = async () => {
    if (!state.file) return;

    try {
      setState(prev => ({ ...prev, isProcessing: true, error: null, currentStep: 'pdf-convert', progress: 5, slidesData: [] }));

      // 1. Convert PDF to Images AND Extract Text
      // RENAMED: convertPdfToImages -> processPdfDocument
      const processedPages = await processPdfDocument(state.file);
      const totalSlides = processedPages.length;

      setState(prev => ({
        ...prev,
        currentStep: 'ai-analysis',
        totalSlides,
        progress: 10
      }));

      // 2. AI Analysis Loop
      const newSlidesData: SlideData[] = [];

      for (let i = 0; i < totalSlides; i++) {
        const pageData = processedPages[i];
        // Pass both image and text items to Gemini
        const slideData = await analyzeSlideWithGemini(pageData.image, pageData.textItems, i);
        newSlidesData.push(slideData);

        const progressPercent = 10 + ((i + 1) / totalSlides) * 80; // 10% to 90%
        setState(prev => ({
          ...prev,
          processedSlides: i + 1,
          progress: progressPercent
        }));
      }

      // 3. STOP - Go to Preview Mode instead of generating immediately
      setState(prev => ({
        ...prev,
        slidesData: newSlidesData,
        currentStep: 'preview',
        isProcessing: false,
        progress: 90
      }));

    } catch (err: any) {
      console.error(err);
      setState(prev => ({
        ...prev,
        isProcessing: false,
        error: err.message || "An unexpected error occurred.",
        progress: 0
      }));
    }
  };

  const handleUpdateSlides = (updatedSlides: SlideData[]) => {
    setState(prev => ({ ...prev, slidesData: updatedSlides }));
  };

  const handleGeneratePptx = async () => {
    try {
      setState(prev => ({ ...prev, isProcessing: true, currentStep: 'pptx-gen', progress: 95 }));
      await generatePptxFile(state.slidesData);

      setState(prev => ({
        ...prev,
        currentStep: 'done',
        isProcessing: false,
        progress: 100
      }));
    } catch (err: any) {
      console.error(err);
      setState(prev => ({
        ...prev,
        isProcessing: false,
        error: err.message || "Failed to generate PPTX file.",
      }));
    }
  };

  const reset = () => {
    setState(INITIAL_STATE);
  };

  return (
    <div className="min-h-screen p-6 md:p-12 font-sans">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="text-center mb-16 animate-fade-in">
          <div className="flex justify-center mb-6 float-animation">
            <div className="pulse-icon bg-gradient-to-br from-purple-500 to-indigo-600 p-4 rounded-3xl shadow-2xl">
              <Wand2 className="w-10 h-10 text-white" />
            </div>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-4">
            <span className="gradient-text">PDF to Editable PowerPoint</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto">
            Convert your PDF slides back into editable PPTX format.
            <br />
            <span className="text-purple-400">AI-powered separation</span> of text and shapes.
          </p>
        </div>

        {/* Main Content Area */}
        <div className="space-y-8">

          {/* Upload Section */}
          {state.currentStep === 'upload' && !state.isProcessing && (
            <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
              <Dropzone onFileSelect={handleFileSelect} />

              {state.file && (
                <div className="glass-card p-6 flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="bg-gradient-to-br from-red-500 to-pink-600 p-3 rounded-2xl">
                      <FileText className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-100">{state.file.name}</p>
                      <p className="text-sm text-gray-400">{(state.file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  </div>
                  <button
                    onClick={startConversion}
                    className="gradient-btn"
                  >
                    Convert to PPTX
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Processing Section */}
          {(state.isProcessing && state.currentStep !== 'pptx-gen') && (
            <div className="animate-fade-in max-w-lg mx-auto">
              <ProcessingStatus
                currentStep={state.currentStep}
                progress={state.progress}
                totalSlides={state.totalSlides}
                processedSlides={state.processedSlides}
              />
            </div>
          )}

          {/* Preview Section */}
          {state.currentStep === 'preview' && (
            <div className="animate-fade-in">
              <SlidePreview
                slides={state.slidesData}
                onUpdateSlides={handleUpdateSlides}
                onGenerate={handleGeneratePptx}
                isGenerating={state.isProcessing}
              />
            </div>
          )}

          {/* Generating Loading State (Specific for PPTX gen to show context) */}
          {state.currentStep === 'pptx-gen' && (
            <div className="animate-fade-in max-w-lg mx-auto text-center p-8">
              <ProcessingStatus
                currentStep={state.currentStep}
                progress={state.progress}
                totalSlides={state.totalSlides}
                processedSlides={state.processedSlides}
              />
            </div>
          )}

          {/* Success Section */}
          {state.currentStep === 'done' && (
            <div className="glass-card p-10 text-center animate-fade-in max-w-2xl mx-auto">
              <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-6 pulse-icon">
                <Download className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-3xl font-bold mb-2">
                <span className="gradient-text">Conversion Complete!</span>
              </h2>
              <p className="text-gray-300 mb-8">
                Your file <span className="text-purple-400">"Converted_Presentation.pptx"</span> has been downloaded.
              </p>

              <button
                onClick={reset}
                className="inline-flex items-center justify-center space-x-2 text-gray-300 hover:text-purple-400 font-semibold transition-all hover:scale-105"
              >
                <RefreshCw className="w-5 h-5" />
                <span>Convert another file</span>
              </button>
            </div>
          )}

          {/* Error Section */}
          {state.error && (
            <div className="glass-card p-8 text-center animate-fade-in max-w-2xl mx-auto border-2 border-red-500/30">
              <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-red-400 mb-3">Conversion Failed</h3>
              <p className="text-gray-300 mb-8">{state.error}</p>
              <button
                onClick={reset}
                className="gradient-btn"
              >
                Try Again
              </button>
            </div>
          )}

        </div>

        {/* Footer info */}
        <div className="mt-16 text-center text-sm text-gray-500">
          <p className="flex items-center justify-center gap-2">
            <span>Powered by</span>
            <span className="text-purple-400 font-semibold">Gemini 2.0</span>
            <span>&</span>
            <span className="text-blue-400 font-semibold">PPTXGenJS</span>
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;