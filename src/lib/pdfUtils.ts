import jsPDF from 'jspdf';
import { EmpresaData } from '@/hooks/useEmpresaData';

interface PDFHeaderFooterOptions {
  empresa: EmpresaData | null;
  doc: jsPDF;
}

// Converte cor hex para RGB
function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result 
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : [30, 64, 175]; // Cor padrão azul
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
    // Obter cor primária personalizada
    const corPrimaria = empresa.cor_primaria || '#1e40af';
    const [r, g, b] = hexToRgb(corPrimaria);
    
    // Adicionar barra colorida no topo
    doc.setFillColor(r, g, b);
    doc.rect(0, 0, pageWidth, 5, 'F');
    yPos = 12;

    // Tentar adicionar logo
    if (empresa.logo_url) {
      try {
        const logoBase64 = await imageUrlToBase64(empresa.logo_url);
        if (logoBase64) {
          doc.addImage(logoBase64, 'PNG', 14, yPos, 25, 25);
          
          // Textos ao lado do logo
          let textX = 45;
          let textY = yPos + 5;
          
          // Nome da empresa com cor primária
          doc.setFontSize(14);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(r, g, b);
          doc.text(empresa.nome_empresa, textX, textY);
          textY += 6;
          
          // Demais informações em preto
          doc.setFontSize(9);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(60, 60, 60);
          
          if (empresa.cnpj) {
            doc.text(`CNPJ: ${empresa.cnpj}`, textX, textY);
            textY += 5;
          }
          
          if (empresa.telefone) {
            doc.text(`Tel: ${empresa.telefone}`, textX, textY);
            textY += 5;
          }
          
          if (empresa.endereco) {
            const enderecoTruncado = empresa.endereco.length > 60 
              ? empresa.endereco.substring(0, 57) + '...' 
              : empresa.endereco;
            doc.text(enderecoTruncado, textX, textY);
          }
          
          yPos += 30;
        } else {
          yPos = addHeaderTextOnly(doc, empresa, yPos, [r, g, b]);
        }
      } catch {
        yPos = addHeaderTextOnly(doc, empresa, yPos, [r, g, b]);
      }
    } else {
      yPos = addHeaderTextOnly(doc, empresa, yPos, [r, g, b]);
    }

    // Linha separadora com cor primária
    doc.setDrawColor(r, g, b);
    doc.setLineWidth(0.5);
    doc.line(14, yPos, pageWidth - 14, yPos);
    doc.setLineWidth(0.2);
    yPos += 5;
    
    // Restaurar cor do texto
    doc.setTextColor(0, 0, 0);
  }

  return yPos;
}

// Função auxiliar para adicionar cabeçalho apenas com texto
function addHeaderTextOnly(doc: jsPDF, empresa: EmpresaData, startY: number, rgb: [number, number, number]): number {
  let yPos = startY;
  const [r, g, b] = rgb;
  
  // Nome da empresa com cor primária
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(r, g, b);
  doc.text(empresa.nome_empresa, 14, yPos + 5);
  yPos += 10;
  
  // Demais informações em cinza escuro
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60, 60, 60);
  
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

  // Obter cor secundária personalizada
  const corSecundaria = empresa?.cor_secundaria || '#64748b';
  const [r, g, b] = hexToRgb(corSecundaria);

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    
    const footerY = pageHeight - 22;
    
    // Linha separadora do rodapé com cor secundária
    doc.setDrawColor(r, g, b);
    doc.setLineWidth(0.5);
    doc.line(14, footerY, pageWidth - 14, footerY);
    doc.setLineWidth(0.2);

    // Texto do rodapé com cor secundária
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(r, g, b);

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

    // Barra colorida no rodapé
    doc.setFillColor(r, g, b);
    doc.rect(0, pageHeight - 5, pageWidth, 5, 'F');

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
