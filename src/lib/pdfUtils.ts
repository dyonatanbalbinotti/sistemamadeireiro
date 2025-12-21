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

// Adiciona cabeçalho com logo e dados da empresa
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
          let textX = 45;
          let textY = yPos + 5;
          
          // Nome da empresa
          doc.setFontSize(14);
          doc.setFont("helvetica", "bold");
          doc.text(empresa.nome_empresa, textX, textY);
          textY += 6;
          
          // CNPJ
          doc.setFontSize(9);
          doc.setFont("helvetica", "normal");
          if (empresa.cnpj) {
            doc.text(`CNPJ: ${empresa.cnpj}`, textX, textY);
            textY += 5;
          }
          
          // Telefone
          if (empresa.telefone) {
            doc.text(`Tel: ${empresa.telefone}`, textX, textY);
            textY += 5;
          }
          
          // Endereço (pode ser mais longo, então limitamos)
          if (empresa.endereco) {
            const enderecoTruncado = empresa.endereco.length > 60 
              ? empresa.endereco.substring(0, 57) + '...' 
              : empresa.endereco;
            doc.text(enderecoTruncado, textX, textY);
          }
          
          yPos += 30;
        } else {
          // Sem logo, apenas textos
          yPos = addHeaderTextOnly(doc, empresa, yPos);
        }
      } catch {
        // Fallback sem logo
        yPos = addHeaderTextOnly(doc, empresa, yPos);
      }
    } else {
      // Sem logo configurado
      yPos = addHeaderTextOnly(doc, empresa, yPos);
    }

    // Linha separadora
    doc.setDrawColor(200, 200, 200);
    doc.line(14, yPos, pageWidth - 14, yPos);
    yPos += 5;
  }

  return yPos;
}

// Função auxiliar para adicionar cabeçalho apenas com texto
function addHeaderTextOnly(doc: jsPDF, empresa: EmpresaData, startY: number): number {
  let yPos = startY;
  
  // Nome da empresa
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(empresa.nome_empresa, 14, yPos + 5);
  yPos += 10;
  
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  
  // Linha com CNPJ e Telefone
  let infoLine = '';
  if (empresa.cnpj) {
    infoLine += `CNPJ: ${empresa.cnpj}`;
  }
  if (empresa.telefone) {
    if (infoLine) infoLine += '  |  ';
    infoLine += `Tel: ${empresa.telefone}`;
  }
  if (infoLine) {
    doc.text(infoLine, 14, yPos + 3);
    yPos += 6;
  }
  
  // Endereço
  if (empresa.endereco) {
    doc.text(empresa.endereco, 14, yPos + 3);
    yPos += 6;
  }
  
  return yPos + 2;
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
      // Primeira linha: nome, CNPJ e telefone
      let footerText = empresa.nome_empresa;
      if (empresa.cnpj) {
        footerText += ` | CNPJ: ${empresa.cnpj}`;
      }
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
