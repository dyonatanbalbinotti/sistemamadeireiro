import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { EmpresaData } from "@/hooks/useEmpresaData";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Upload, Building2 } from "lucide-react";
import PDFHeaderPreview from "./PDFHeaderPreview";

interface EditEmpresaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  empresa: EmpresaData | null;
  onEmpresaUpdate: () => void;
}

export default function EditEmpresaDialog({
  open,
  onOpenChange,
  empresa,
  onEmpresaUpdate,
}: EditEmpresaDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [nomeEmpresa, setNomeEmpresa] = useState(empresa?.nome_empresa || "");
  const [telefone, setTelefone] = useState(empresa?.telefone || "");
  const [endereco, setEndereco] = useState(empresa?.endereco || "");
  const [cnpj, setCnpj] = useState(empresa?.cnpj || "");
  const [logoUrl, setLogoUrl] = useState(empresa?.logo_url || "");
  const [corPrimaria, setCorPrimaria] = useState(empresa?.cor_primaria || "#1e40af");
  const [corSecundaria, setCorSecundaria] = useState(empresa?.cor_secundaria || "#64748b");
  const [logoPosicaoPdf, setLogoPosicaoPdf] = useState(empresa?.logo_posicao_pdf || "direita");
  const [loading, setLoading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Atualizar estados quando empresa mudar
  useState(() => {
    if (empresa) {
      setNomeEmpresa(empresa.nome_empresa || "");
      setTelefone(empresa.telefone || "");
      setEndereco(empresa.endereco || "");
      setCnpj(empresa.cnpj || "");
      setLogoUrl(empresa.logo_url || "");
      setCorPrimaria(empresa.cor_primaria || "#1e40af");
      setCorSecundaria(empresa.cor_secundaria || "#64748b");
      setLogoPosicaoPdf(empresa.logo_posicao_pdf || "direita");
    }
  });

  const formatCNPJ = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    return numbers
      .replace(/^(\d{2})(\d)/, "$1.$2")
      .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1/$2")
      .replace(/(\d{4})(\d)/, "$1-$2")
      .slice(0, 18);
  };

  const formatTelefone = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 10) {
      return numbers
        .replace(/^(\d{2})(\d)/, "($1) $2")
        .replace(/(\d{4})(\d)/, "$1-$2")
        .slice(0, 14);
    }
    return numbers
      .replace(/^(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{5})(\d)/, "$1-$2")
      .slice(0, 15);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !empresa) return;

    // Validar tipo de arquivo
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Tipo de arquivo inválido",
        description: "Por favor, selecione uma imagem.",
        variant: "destructive",
      });
      return;
    }

    // Validar tamanho (max 20MB)
    if (file.size > 20 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: `O logo deve ter no máximo 20MB. Tamanho atual: ${(file.size / 1024 / 1024).toFixed(2)}MB`,
        variant: "destructive",
      });
      return;
    }

    setUploadingLogo(true);

    try {
      const fileExt = file.name.split(".").pop()?.toLowerCase() || 'png';
      const fileName = `empresa-${empresa.id}-${Date.now()}.${fileExt}`;
      const filePath = `logos/${fileName}`;

      // Upload para o bucket avatars (reutilizando o bucket existente)
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        console.error("Erro de upload:", uploadError);
        
        // Mensagens de erro específicas
        let errorMessage = "Não foi possível enviar o logo.";
        if (uploadError.message?.includes("Payload too large")) {
          errorMessage = "Arquivo muito grande para o servidor. Tente uma imagem menor.";
        } else if (uploadError.message?.includes("Invalid")) {
          errorMessage = "Tipo de arquivo não suportado. Use JPG, PNG ou WEBP.";
        } else if (uploadError.message?.includes("not found")) {
          errorMessage = "Bucket de armazenamento não encontrado. Contate o suporte.";
        } else if (uploadError.message) {
          errorMessage = uploadError.message;
        }
        
        toast({
          title: "Erro ao enviar logo",
          description: errorMessage,
          variant: "destructive",
        });
        return;
      }

      // Obter URL pública
      const { data: publicUrlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      setLogoUrl(publicUrlData.publicUrl);

      toast({
        title: "Logo enviado",
        description: "O logo foi carregado com sucesso.",
      });
    } catch (error: any) {
      console.error("Erro ao enviar logo:", error);
      toast({
        title: "Erro ao enviar logo",
        description: error?.message || "Erro desconhecido ao enviar o arquivo.",
        variant: "destructive",
      });
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSave = async () => {
    if (!user || !empresa) return;

    if (!nomeEmpresa.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "O nome da empresa é obrigatório.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from("empresas")
        .update({
          nome_empresa: nomeEmpresa.trim(),
          telefone: telefone.trim() || null,
          endereco: endereco.trim() || null,
          cnpj: cnpj.trim() || null,
          logo_url: logoUrl || null,
          cor_primaria: corPrimaria,
          cor_secundaria: corSecundaria,
          logo_posicao_pdf: logoPosicaoPdf,
        })
        .eq("id", empresa.id);

      if (error) throw error;

      toast({
        title: "Dados atualizados",
        description: "Os dados da empresa foram atualizados com sucesso.",
      });

      onEmpresaUpdate();
      onOpenChange(false);
    } catch (error) {
      console.error("Erro ao atualizar empresa:", error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível atualizar os dados da empresa.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Editar Dados da Empresa</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4 overflow-y-auto flex-1 pr-2">
          {/* Logo Upload */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <Avatar className="h-24 w-24 ring-4 ring-primary/20">
                <AvatarImage src={logoUrl} alt="Logo da empresa" />
                <AvatarFallback className="bg-primary/10 text-primary">
                  <Building2 className="h-10 w-10" />
                </AvatarFallback>
              </Avatar>
              <Button
                type="button"
                size="icon"
                variant="secondary"
                className="absolute bottom-0 right-0 h-8 w-8 rounded-full shadow-lg"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingLogo}
              >
                {uploadingLogo ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
              </Button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleLogoUpload}
            />
            <p className="text-xs text-muted-foreground">
              Clique para alterar o logo (máx. 20MB)
            </p>
          </div>

          {/* Nome da Empresa */}
          <div className="space-y-2">
            <Label htmlFor="nome_empresa">Nome da Empresa *</Label>
            <Input
              id="nome_empresa"
              value={nomeEmpresa}
              onChange={(e) => setNomeEmpresa(e.target.value)}
              placeholder="Nome da empresa"
              maxLength={100}
            />
          </div>

          {/* CNPJ */}
          <div className="space-y-2">
            <Label htmlFor="cnpj">CNPJ</Label>
            <Input
              id="cnpj"
              value={cnpj}
              onChange={(e) => setCnpj(formatCNPJ(e.target.value))}
              placeholder="00.000.000/0000-00"
              maxLength={18}
            />
          </div>

          {/* Telefone */}
          <div className="space-y-2">
            <Label htmlFor="telefone">Telefone</Label>
            <Input
              id="telefone"
              value={telefone}
              onChange={(e) => setTelefone(formatTelefone(e.target.value))}
              placeholder="(00) 00000-0000"
              maxLength={15}
            />
          </div>

          {/* Endereço */}
          <div className="space-y-2">
            <Label htmlFor="endereco">Endereço</Label>
            <Input
              id="endereco"
              value={endereco}
              onChange={(e) => setEndereco(e.target.value)}
              placeholder="Endereço completo"
              maxLength={200}
            />
          </div>

          {/* Cores do PDF */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Cores do PDF</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cor_primaria" className="text-xs text-muted-foreground">
                  Cor do Cabeçalho
                </Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    id="cor_primaria"
                    value={corPrimaria}
                    onChange={(e) => setCorPrimaria(e.target.value)}
                    className="h-10 w-14 rounded border border-input cursor-pointer"
                  />
                  <Input
                    value={corPrimaria}
                    onChange={(e) => setCorPrimaria(e.target.value)}
                    className="flex-1 font-mono text-xs"
                    maxLength={7}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cor_secundaria" className="text-xs text-muted-foreground">
                  Cor do Rodapé
                </Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    id="cor_secundaria"
                    value={corSecundaria}
                    onChange={(e) => setCorSecundaria(e.target.value)}
                    className="h-10 w-14 rounded border border-input cursor-pointer"
                  />
                  <Input
                    value={corSecundaria}
                    onChange={(e) => setCorSecundaria(e.target.value)}
                    className="flex-1 font-mono text-xs"
                    maxLength={7}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Posição do Logo no PDF */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Posição do Logo no PDF</Label>
            <div className="flex gap-2">
              {[
                { value: "esquerda", label: "Esquerda" },
                { value: "centro", label: "Centro" },
                { value: "direita", label: "Direita" },
              ].map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  variant={logoPosicaoPdf === option.value ? "default" : "outline"}
                  size="sm"
                  className="flex-1"
                  onClick={() => setLogoPosicaoPdf(option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Preview do Cabeçalho PDF */}
          <PDFHeaderPreview
            empresa={{
              nome_empresa: nomeEmpresa,
              cnpj,
              telefone,
              endereco,
            }}
            logoUrl={logoUrl}
            corPrimaria={corPrimaria}
            logoPosicao={logoPosicaoPdf}
          />

          {/* Botões */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              className="flex-1"
              onClick={handleSave}
              disabled={loading || uploadingLogo}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
