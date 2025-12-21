import jsPDF from 'jspdf';
import { EmpresaData } from '@/hooks/useEmpresaData';

interface PDFHeaderFooterOptions {
  empresa: EmpresaData | null;
  doc: jsPDF;
}

// Converte imagem URL para base64
async function imageUrlToBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

// Adiciona cabeçalho com logo e nome da empresa
export async function addPDFHeader(options: PDFHeaderFooterOptions): Promise<number> {
  const { empresa, doc } = options;
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPos = 10;

  if (empresa) {
    // Tentar adicionar logo
    if (empresa.logo_url) {
      try {
        const logoBase64 = await imageUrlToBase64(empresa.logo_url);
        if (logoBase64) {
          doc.addImage(logoBase64, 'PNG', 14, yPos, 25, 25);
          // Textos ao lado do logo
          doc.setFontSize(14);
          doc.setFont("helvetica", "bold");
          doc.text(empresa.nome_empresa, 45, yPos + 10);
          
          doc.setFontSize(9);
          doc.setFont("helvetica", "normal");
          if (empresa.cnpj) {
            doc.text(`CNPJ: ${empresa.cnpj}`, 45, yPos + 17);
          }
          yPos += 30;
        } else {
          // Sem logo, apenas texto
          doc.setFontSize(14);
          doc.setFont("helvetica", "bold");
          doc.text(empresa.nome_empresa, 14, yPos + 8);
          yPos += 15;
        }
      } catch {
        // Fallback sem logo
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text(empresa.nome_empresa, 14, yPos + 8);
        yPos += 15;
      }
    } else {
      // Sem logo configurado
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(empresa.nome_empresa, 14, yPos + 8);
      yPos += 15;
    }

    // Linha separadora
    doc.setDrawColor(200, 200, 200);
    doc.line(14, yPos, pageWidth - 14, yPos);
    yPos += 5;
  }

  return yPos;
}

// Adiciona rodapé com informações da empresa
export async function addPDFFooter(options: PDFHeaderFooterOptions): Promise<void> {
  const { empresa, doc } = options;
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();
  const totalPages = doc.getNumberOfPages();

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    
    const footerY = pageHeight - 20;
    
    // Linha separadora do rodapé
    doc.setDrawColor(200, 200, 200);
    doc.line(14, footerY, pageWidth - 14, footerY);

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);

    if (empresa) {
      // Primeira linha: nome e telefone
      let footerText = empresa.nome_empresa;
      if (empresa.telefone) {
        footerText += ` | Tel: ${empresa.telefone}`;
      }
      doc.text(footerText, 14, footerY + 6);

      // Segunda linha: endereço
      if (empresa.endereco) {
        doc.text(empresa.endereco, 14, footerY + 11);
      }
    }

    // Número da página (alinhado à direita)
    doc.text(`Página ${i} de ${totalPages}`, pageWidth - 14, footerY + 6, { align: 'right' });
    
    // Data de geração
    const dataGeracao = new Date().toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    doc.text(`Gerado em: ${dataGeracao}`, pageWidth - 14, footerY + 11, { align: 'right' });

    // Restaurar cor do texto
    doc.setTextColor(0, 0, 0);
  }
}

// Função auxiliar para configurar documento com cabeçalho e rodapé
export async function createPDFWithHeaderFooter(
  empresa: EmpresaData | null,
  callback: (doc: jsPDF, startY: number) => void | Promise<void>,
  filename: string
): Promise<void> {
  const doc = new jsPDF();
  
  // Adicionar cabeçalho
  const startY = await addPDFHeader({ empresa, doc });
  
  // Executar callback para adicionar conteúdo
  await callback(doc, startY);
  
  // Adicionar rodapé
  await addPDFFooter({ empresa, doc });
  
  // Salvar documento
  doc.save(filename);
}
