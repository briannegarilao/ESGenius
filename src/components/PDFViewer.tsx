import { useState, useRef, useEffect } from "react";
import { ArrowLeft, Download, ZoomIn, ZoomOut, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AIChatbot } from "./AIChatbot";
import { GeminiESGPopup } from "./GeminiESGPopup";
import { analyzeESGReport } from "@/lib/gemini";
import { toast } from "sonner";

// Define custom interface for PDF.js viewer window
interface PDFJSWindow extends Window {
  PDFViewerApplication?: {
    findController: {
      executeCommand: (cmd: string, params: any) => void;
    };
    eventBus?: {
      on: (eventName: string, callback: (event: any) => void) => void;
      off: (eventName: string, callback: (event: any) => void) => void;
    };
    pdfViewer?: {
      scrollPageIntoView: (options: { pageNumber: number, destArray?: any[] }) => void;
    };
  };
  find?: (
    searchString: string,
    caseSensitive?: boolean,
    backwards?: boolean,
    wrapAround?: boolean,
    wholeWord?: boolean,
    searchInFrames?: boolean,
    showDialog?: boolean
  ) => boolean;
}

interface PDFViewerProps {
  fileName: string;
  fileUrl: string;
  onBack: () => void;
  pdfContext: string | null;
}

export const PDFViewer = ({ fileName, fileUrl, onBack, pdfContext }: PDFViewerProps) => {
  const [zoom, setZoom] = useState(100);
  const [geminiOutput, setGeminiOutput] = useState<any | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isPdfViewerReady, setIsPdfViewerReady] = useState(false);

  // Setup event listeners for PDF.js viewer
  useEffect(() => {
    const checkPdfViewerReady = () => {
      if (!iframeRef.current) return false;
      
      try {
        const iframeWindow = iframeRef.current.contentWindow as unknown as PDFJSWindow;
        return !!(iframeWindow && iframeWindow.PDFViewerApplication);
      } catch (error) {
        return false;
      }
    };

    const interval = setInterval(() => {
      if (checkPdfViewerReady()) {
        setIsPdfViewerReady(true);
        clearInterval(interval);
        
        // Setup event listeners for PDF.js viewer
        try {
          const iframeWindow = iframeRef.current!.contentWindow as unknown as PDFJSWindow;
          const PDFApp = iframeWindow.PDFViewerApplication;
          
          if (PDFApp && PDFApp.eventBus) {
            // Listen for when document is loaded
            PDFApp.eventBus.on('documentloaded', () => {
              console.log('PDF document fully loaded');
            });
          }
        } catch (error) {
          console.error('Error setting up PDF.js event listeners:', error);
        }
      }
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 25, 200));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 25, 50));
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAnalyzeClick = async () => {
    if (!pdfContext) {
      setAnalysisError("PDF content is not available for analysis.");
      return;
    }
    setIsAnalyzing(true);
    setAnalysisError(null);
    setGeminiOutput(null);
    try {
      const output = await analyzeESGReport(pdfContext);
      setGeminiOutput(output);
    } catch (error) {
      console.error(error);
      setAnalysisError(error instanceof Error ? error.message : "An unknown error occurred during analysis.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const searchAndScrollToText = (text: string) => {
    if (!iframeRef.current || !text) return;
    
    setIsSearching(true);
    
    // Get only first 5 words for better search accuracy
    const searchText = text.split(' ').slice(0, 5).join(' ').replace(/["']/g, '').trim();
    
    // Use a timeout to ensure the iframe is fully loaded
    setTimeout(() => {
      try {
        // Get the iframe window
        const iframe = iframeRef.current;
        if (!iframe || !iframe.contentWindow) {
          throw new Error("Cannot access iframe content");
        }
        
        // Try to access the iframe document directly
        const iframeWindow = iframe.contentWindow as unknown as PDFJSWindow;
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        
        if (!iframeDoc) {
          throw new Error("Cannot access iframe document");
        }
        
        // Method 1: Try using PDF.js viewer's built-in search if available
        if (iframeWindow.PDFViewerApplication && iframeWindow.PDFViewerApplication.findController) {
          console.log("Using PDF.js search");
          
          // Clear any previous search
          iframeWindow.PDFViewerApplication.findController.executeCommand('find', {
            query: '',
            phraseSearch: true,
            highlightAll: false,
            findPrevious: false,
          });
          
          // Perform the new search
          iframeWindow.PDFViewerApplication.findController.executeCommand('find', {
            query: searchText,
            phraseSearch: true,
            highlightAll: true,
            findPrevious: false,
          });
          
          toast.success(`Searching for: "${searchText}"`);
          return;
        }
        
        // Method 2: Try using the browser's built-in find functionality
        if (iframeWindow.find) {
          console.log("Using browser find");
          iframeWindow.find(searchText, false, false, true, false, true, false);
          toast.success(`Searched for: "${searchText}"`);
          return;
        }
        
        // Method 3: If all else fails, try to inject a script into the iframe
        const script = iframeDoc.createElement('script');
        script.textContent = `
          try {
            window.find('${searchText.replace(/'/g, "\\'")}', false, false, true, false, true, false);
          } catch(e) {
            console.error('Search failed:', e);
          }
        `;
        iframeDoc.body.appendChild(script);
        iframeDoc.body.removeChild(script);
        
        toast.success(`Attempted to search for: "${searchText}"`);
      } catch (error) {
        console.error("Error searching in PDF:", error);
        toast.error("Could not search in PDF. Try scrolling manually.");
      } finally {
        setIsSearching(false);
      }
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="border-b border-gray-800 px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={onBack}
              className="text-gray-400 hover:text-white p-2"
            >
              <ArrowLeft size={20} />
            </Button>
            <div>
              <h1 className="text-xl font-semibold">{fileName}</h1>
              <p className="text-sm text-gray-400">ESG Report</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-gray-800 rounded-lg">
              <Button
                variant="ghost"
                onClick={handleZoomOut}
                className="p-2 text-gray-400 hover:text-white"
                disabled={zoom <= 50}
              >
                <ZoomOut size={16} />
              </Button>
              <span className="px-3 py-2 text-sm text-gray-300 min-w-[60px] text-center">
                {zoom}%
              </span>
              <Button
                variant="ghost"
                onClick={handleZoomIn}
                className="p-2 text-gray-400 hover:text-white"
                disabled={zoom >= 200}
              >
                <ZoomIn size={16} />
              </Button>
            </div>
            
            <Button
              variant="outline"
              className="border-gray-600 text-gray-300 hover:bg-gray-800"
              onClick={handleDownload}
            >
              <Download size={16} className="mr-2" />
              Download
            </Button>

            <Button
              variant="outline"
              className="border-purple-600/50 text-purple-300 hover:bg-purple-800/20 bg-purple-900/20"
              onClick={handleAnalyzeClick}
              disabled={isAnalyzing || !pdfContext || isSearching}
            >
              {isAnalyzing ? (
                <Loader2 size={16} className="mr-2 animate-spin" />
              ) : (
                <Sparkles size={16} className="mr-2" />
              )}
              {isAnalyzing ? "Analyzing..." : "Analyze with Gemini"}
            </Button>
          </div>
        </div>
      </div>

      {/* PDF Content */}
      <div className="max-w-4xl mx-auto p-6">
        <div 
          className="bg-white rounded-lg shadow-2xl mx-auto transition-all duration-300 overflow-hidden"
          style={{ 
            width: '100%',
            height: 'calc(100vh - 200px)',
            transform: `scale(${zoom / 100})`,
            transformOrigin: 'top center'
          }}
        >
          <iframe
            ref={iframeRef}
            src={fileUrl}
            title={fileName}
            className="w-full h-full"
            style={{ border: 'none' }}
          />
        </div>
      </div>

      {/* Floating AI Chatbot */}
      <AIChatbot pdfContext={pdfContext} />

      {/* Gemini Analysis Popup */}
      {geminiOutput && (
        <GeminiESGPopup 
          data={geminiOutput} 
          onClose={() => setGeminiOutput(null)} 
          onStatementClick={searchAndScrollToText}
        />
      )}

      {analysisError && (
          <div className="fixed bottom-6 right-6 w-[500px] bg-red-900/80 backdrop-blur-sm border border-red-500 text-white p-4 rounded-lg z-50">
              <div className="flex justify-between items-center">
                  <h3 className="font-semibold">Analysis Error</h3>
                  <button onClick={() => setAnalysisError(null)} className="text-gray-200 hover:text-white">✕</button>
              </div>
              <p className="text-sm mt-2">{analysisError}</p>
              <pre className="text-xs mt-2 bg-red-950/50 p-2 rounded overflow-auto max-h-[200px]">
                {analysisError}
              </pre>
          </div>
      )}

      {/* Search indicator */}
      {isSearching && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center">
          <Loader2 size={16} className="animate-spin mr-2" />
          Searching in document...
        </div>
      )}
    </div>
  );
};
