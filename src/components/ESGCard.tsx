
import { FileText, MoreVertical } from "lucide-react";
import { Card } from "@/components/ui/card";

interface ESGCardProps {
  title: string;
  date: string;
  sources: number;
  icon: string;
  onClick: () => void;
}

export const ESGCard = ({ title, date, sources, icon, onClick }: ESGCardProps) => {
  return (
    <Card 
      className="bg-gray-800 border-gray-700 p-6 cursor-pointer hover:bg-gray-750 transition-all duration-200 hover:scale-105 group animate-fade-in"
      onClick={onClick}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="text-4xl">{icon}</div>
        <button className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-gray-400 hover:text-white">
          <MoreVertical size={20} />
        </button>
      </div>
      
      <h3 className="text-white font-medium text-lg mb-2 line-clamp-2">
        {title}
      </h3>
      
      <p className="text-gray-400 text-sm">
        {date} • {sources} source{sources !== 1 ? 's' : ''}
      </p>
    </Card>
  );
};
