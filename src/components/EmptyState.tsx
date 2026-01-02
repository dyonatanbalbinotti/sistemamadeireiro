import { FileText } from "lucide-react";

interface EmptyStateProps {
  message?: string;
  icon?: React.ReactNode;
}

export default function EmptyState({ message = "Sem registros no período selecionado", icon }: EmptyStateProps) {
  return (
    <div className="empty-state">
      {icon || <FileText className="empty-state-icon" />}
      <p className="empty-state-text">{message}</p>
    </div>
  );
}
