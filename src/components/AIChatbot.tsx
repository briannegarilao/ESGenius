import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { MessageCircle, X, Send, Loader } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AIChatbotProps {
  pdfContext: string | null;
}

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export const AIChatbot = ({ pdfContext }: AIChatbotProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (pdfContext) {
      const systemMessage: Message = {
        role: 'system',
        content: `You are an expert ESG analyst. You are helping a user analyze this ESG report:\n\n${pdfContext.slice(0, 12000)}`
      };
      setMessages([systemMessage]);
    } else {
        const defaultSystemMessage: Message = {
            role: 'system',
            content: `You are an expert ESG analyst. Please wait for the document to be loaded.`
        };
        setMessages([defaultSystemMessage]);
    }
  }, [pdfContext]);

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessageContent = inputMessage.trim();
    const currentMessages: Message[] = [...messages, { role: 'user', content: userMessageContent }];
    
    setMessages(currentMessages);
    setInputMessage("");
    setIsLoading(true);

    try {
      const deepSeekApiKey = "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";
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${deepSeekApiKey}`,
          "Content-Type": "application/json"
        },
        // We send the relevant messages, not the whole history if it gets too long
        body: JSON.stringify({
          "model": "deepseek/deepseek-r1-0528:free",
          "messages": currentMessages 
        })
      });

      if (!response.ok) {
        throw new Error("Failed to get a response from the AI.");
      }

      const data = await response.json();
      const assistantMessage = data.choices?.[0]?.message?.content || "Sorry, I couldn't process your request.";
      
      setMessages(prev => [...prev, { role: 'assistant', content: assistantMessage }]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      setMessages(prev => [...prev, { role: 'assistant', content: `Sorry, there was an error: ${errorMessage}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Floating Chat Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 hover:bg-blue-700 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 z-50"
      >
        {isOpen ? <X size={24} className="text-white" /> : <MessageCircle size={24} className="text-white" />}
      </button>

      {/* Chat Card */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-80 h-96 bg-gray-900 border border-gray-700 rounded-lg shadow-2xl z-40 flex flex-col animate-scale-in">
          {/* Header */}
          <div className="border-b border-gray-700 p-4">
            <h3 className="text-white font-semibold">AI Assistant</h3>
            <p className="text-gray-400 text-sm">Ask questions about your ESG report</p>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {!pdfContext && (
                <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                    <Loader size={16} className="animate-spin mr-2" />
                    Waiting for document...
                </div>
            )}
            {pdfContext && messages.filter(msg => msg.role !== 'system').length === 0 && (
              <div className="text-gray-400 text-sm text-center py-8">
                Document loaded. Start a conversation by asking a question!
              </div>
            )}
            {messages.filter(msg => msg.role !== 'system').map((message, index) => (
                <div
                  key={index}
                  className={`prose prose-sm prose-invert max-w-none p-3 rounded-lg text-sm ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white ml-8'
                      : 'bg-gray-800 text-gray-200 mr-8'
                  }`}
                >
                  <ReactMarkdown>{message.content}</ReactMarkdown>
                </div>
              ))}
            {isLoading && (
              <div className="bg-gray-800 text-gray-200 mr-8 p-3 rounded-lg text-sm flex items-center gap-2">
                <Loader size={16} className="animate-spin" />
                Thinking...
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-gray-700 p-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask about your ESG report..."
                disabled={isLoading || !pdfContext}
                className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-400 focus:outline-none focus:border-blue-500"
              />
              <Button
                onClick={sendMessage}
                disabled={!inputMessage.trim() || isLoading || !pdfContext}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                <Send size={16} />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
