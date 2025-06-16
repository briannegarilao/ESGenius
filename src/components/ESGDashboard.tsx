import { useState, useEffect } from "react";
import * as pdfjsLib from "pdfjs-dist";
import "pdfjs-dist/build/pdf.worker.mjs";
import { Plus, Grid3X3, List, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ESGCard } from "./ESGCard";
import { UploadModal } from "./UploadModal";
import { PDFViewer } from "./PDFViewer";
import { toast } from "sonner";

interface ESGReport {
  id: string;
  title: string;
  date: string;
  sources: number;
  icon: string;
  filePath?: string;
}

// Define a type for the API response
interface PDFMetadata {
  id: string;
  fileName: string;
  filePath: string;
  title: string;
  category: string;
  description: string;
  uploadDate: string;
  sources: number;
}

// Map category to icon
const getCategoryIcon = (category: string): string => {
  const iconMap: Record<string, string> = {
    "Uncategorized": "📊",
    "Sustainability": "🌱",
    "Carbon Footprint": "🌍",
    "Social Impact": "🤝",
    "Governance": "⚖️",
    "Environmental": "🏭",
    "Supply Chain": "🔗",
    "Renewable Energy": "⚡",
    "Diversity & Inclusion": "👥",
    "Water Conservation": "💧",
    "Waste Reduction": "♻️"
  };
  
  return iconMap[category] || "📄";
};

// Format date from ISO string
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });
};

export const ESGDashboard = () => {
  const [reports, setReports] = useState<ESGReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ESGReport | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedFilePath, setUploadedFilePath] = useState<string | null>(null);
  const [pdfTextContext, setPdfTextContext] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [currentView, setCurrentView] = useState<"dashboard" | "pdf">("dashboard");

  // Fetch PDFs from the server
  useEffect(() => {
    const fetchPDFs = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('http://localhost:4000/api/pdfs');
        
        if (!response.ok) {
          throw new Error('Failed to fetch PDFs');
        }
        
        const data: PDFMetadata[] = await response.json();
        
        // Convert API data to ESGReport format
        const fetchedReports: ESGReport[] = data.map(pdf => ({
          id: pdf.id,
          title: pdf.title,
          date: formatDate(pdf.uploadDate),
          sources: pdf.sources,
          icon: getCategoryIcon(pdf.category),
          filePath: pdf.filePath
        }));
        
        setReports(fetchedReports);
      } catch (error) {
        console.error('Error fetching PDFs:', error);
        toast.error('Failed to load reports');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchPDFs();
  }, []);

  const extractPdfText = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  
    let fullText = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map((item: any) => item.str).join(" ");
      fullText += `\n\nPage ${i}:\n${pageText}`;
    }
  
    return fullText;
  }

  const handleCardClick = (report: ESGReport) => {
    setSelectedReport(report);
    setCurrentView("pdf");
    
    // If this is a saved PDF with a filePath, we'll use that
    if (report.filePath) {
      setUploadedFilePath(report.filePath);
    }
    
    // For now, we don't have text context for PDFs loaded from the server
    setPdfTextContext(null);
  };

  const handleUploadSuccess = async (file: File, filePath: string) => {
    // We'll refetch the PDFs from the server to get the latest data
    try {
      const response = await fetch('http://localhost:4000/api/pdfs');
      
      if (!response.ok) {
        throw new Error('Failed to fetch PDFs');
      }
      
      const data: PDFMetadata[] = await response.json();
      
      // Convert API data to ESGReport format
      const fetchedReports: ESGReport[] = data.map(pdf => ({
        id: pdf.id,
        title: pdf.title,
        date: formatDate(pdf.uploadDate),
        sources: pdf.sources,
        icon: getCategoryIcon(pdf.category),
        filePath: pdf.filePath
      }));
      
      setReports(fetchedReports);
      
      // Find the newly uploaded PDF (should be the most recent one)
      const newReport = fetchedReports[0];
      
      if (newReport) {
        toast.success("ESG report uploaded successfully!");

        // Extract text and set all states together
        const text = await extractPdfText(file);
        setPdfTextContext(text);
        setUploadedFile(file);
        setUploadedFilePath(filePath);
        setSelectedReport(newReport);
        setIsUploadModalOpen(false);
        setCurrentView("pdf");
      }
    } catch (error) {
      console.error('Error fetching PDFs after upload:', error);
      toast.error('Failed to load updated reports');
    }
  };

  const handleBackToDashboard = () => {
    setCurrentView("dashboard");
    setSelectedReport(null);
    setUploadedFile(null);
    setUploadedFilePath(null);
    setPdfTextContext(null);
  };

  if (currentView === "pdf") {
    const fileUrl = uploadedFilePath 
      ? `http://localhost:4000${uploadedFilePath}`
      : `/path/to/default.pdf`; // Fallback for existing reports
    const fileName = uploadedFile?.name || selectedReport?.title || "ESG Report";
    return <PDFViewer fileName={fileName} fileUrl={fileUrl} onBack={handleBackToDashboard} pdfContext={pdfTextContext} />;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="border-b border-gray-800 px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-sm font-bold">E</span>
            </div>
            <h1 className="text-xl font-semibold">ESG ReportHub</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center bg-gray-800 rounded-lg p-1">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 rounded ${viewMode === "grid" ? "bg-gray-700" : ""}`}
              >
                <Grid3X3 size={16} />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 rounded ${viewMode === "list" ? "bg-gray-700" : ""}`}
              >
                <List size={16} />
              </button>
            </div>
            
            <div className="flex items-center gap-2 bg-gray-800 rounded-lg px-3 py-2">
              <span className="text-sm">Most recent</span>
              <ChevronDown size={16} />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold mb-2">Welcome to ESG ReportHub</h2>
            <p className="text-gray-400">Manage and analyze your ESG reports</p>
          </div>
          
          <Button
            onClick={() => setIsUploadModalOpen(true)}
            className="bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white gap-2"
          >
            <Plus size={16} />
            Create new
          </Button>
        </div>

        {/* Reports Grid */}
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-16 bg-gray-800/50 rounded-lg border border-gray-700">
            <h3 className="text-xl font-semibold mb-2">No reports yet</h3>
            <p className="text-gray-400 mb-6">Upload your first ESG report to get started</p>
            <Button
              onClick={() => setIsUploadModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus size={16} className="mr-2" />
              Upload Report
            </Button>
          </div>
        ) : (
          <div className={`grid gap-6 ${
            viewMode === "grid" 
              ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5" 
              : "grid-cols-1"
          }`}>
            {reports.map((report, index) => (
              <div
                key={report.id}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <ESGCard
                  title={report.title}
                  date={report.date}
                  sources={report.sources}
                  icon={report.icon}
                  onClick={() => handleCardClick(report)}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={handleUploadSuccess}
      />
    </div>
  );
};
