import { EmpresaData } from "@/hooks/useEmpresaData";
import { Building2 } from "lucide-react";

interface PDFHeaderPreviewProps {
  empresa: Partial<EmpresaData> | null;
  logoUrl?: string;
  corPrimaria?: string;
  logoPosicao?: string;
}

export default function PDFHeaderPreview({
  empresa,
  logoUrl,
  corPrimaria = "#1e40af",
  logoPosicao = "direita",
}: PDFHeaderPreviewProps) {
  const nomeEmpresa = empresa?.nome_empresa || "Nome da Empresa";
  const cnpj = empresa?.cnpj || "";
  const telefone = empresa?.telefone || "";
  const endereco = empresa?.endereco || "";

  const renderLogo = () => (
    <div className="w-12 h-12 rounded overflow-hidden flex-shrink-0 bg-white/20 flex items-center justify-center">
      {logoUrl ? (
        <img
          src={logoUrl}
          alt="Logo"
          className="w-full h-full object-contain"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      ) : (
        <Building2 className="w-6 h-6 text-white/60" />
      )}
    </div>
  );

  const renderInfo = () => (
    <div className="flex-1 min-w-0">
      <p
        className="font-bold text-sm truncate"
        style={{ color: corPrimaria }}
      >
        {nomeEmpresa}
      </p>
      <p className="text-[10px] text-muted-foreground truncate">
        {[cnpj && `CNPJ: ${cnpj}`, telefone && `Tel: ${telefone}`]
          .filter(Boolean)
          .join("  |  ") || "CNPJ e Telefone"}
      </p>
      <p className="text-[10px] text-muted-foreground truncate">
        {endereco || "Endereço da empresa"}
      </p>
    </div>
  );

  return (
    <div className="border rounded-lg overflow-hidden bg-card">
      <div className="text-[10px] text-muted-foreground px-2 py-1 bg-muted/50 border-b">
        Preview do Cabeçalho PDF
      </div>
      
      {/* Simula página do PDF */}
      <div className="bg-white p-3 aspect-[210/80]">
        {/* Barra superior colorida */}
        <div
          className="h-1.5 -mx-3 -mt-3 mb-2"
          style={{ backgroundColor: corPrimaria }}
        />

        {/* Conteúdo do cabeçalho */}
        <div className="flex items-start gap-3">
          {logoPosicao === "esquerda" && renderLogo()}
          
          {logoPosicao === "centro" ? (
            <div className="flex flex-col items-center w-full gap-2">
              {renderLogo()}
              <div className="text-center">
                <p
                  className="font-bold text-sm"
                  style={{ color: corPrimaria }}
                >
                  {nomeEmpresa}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {[cnpj && `CNPJ: ${cnpj}`, telefone && `Tel: ${telefone}`]
                    .filter(Boolean)
                    .join("  |  ") || "CNPJ e Telefone"}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {endereco || "Endereço da empresa"}
                </p>
              </div>
            </div>
          ) : (
            <>
              {logoPosicao !== "esquerda" && renderInfo()}
              {logoPosicao === "direita" && renderLogo()}
              {logoPosicao === "esquerda" && renderInfo()}
            </>
          )}
        </div>

        {/* Linha separadora */}
        <div
          className="h-0.5 mt-2 -mx-3"
          style={{ backgroundColor: corPrimaria }}
        />
      </div>
    </div>
  );
}
