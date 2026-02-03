export enum ElementType {
    Text = 'text',
    Shape = 'shape',
    Image = 'image'
}

export interface TextItem {
    text: string;
    x: number;      // 0-100 (percentage of viewport width)
    y: number;      // 0-100 (percentage of viewport height)
    width: number;  // 0-100 (percentage)
    height: number; // 0-100 (percentage)
    fontName: string;
}

export interface SlideElement {
    type: ElementType;
    x: number;       // 0-100 (percentage)
    y: number;       // 0-100 (percentage)
    w: number;       // 0-100 (percentage)
    h: number;       // 0-100 (percentage)
    content?: string;
    color?: string;
    bgColor?: string;
    fontSize?: number;
    bold?: boolean;
    align?: 'left' | 'center' | 'right';
    shapeType?: 'rect' | 'ellipse' | 'line';
}

export interface SlideData {
    index: number;
    backgroundColor: string;
    elements: SlideElement[];
    originalImageBase64: string;
    textItems?: TextItem[];
}

export type ProcessingStep = 'upload' | 'processing' | 'ai-analysis' | 'preview' | 'pptx-gen' | 'done';

export interface AppState {
    file: File | null;
    currentStep: ProcessingStep;
    isProcessing: boolean;
    progress: number;
    slidesData: SlideData[];
    error: string | null;
    totalSlides: number;
    processedSlides: number;
}
