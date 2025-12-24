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

// Converte imagem URL para base64 usando Image element (melhor compatibilidade)
async function imageUrlToBase64(url: string): Promise<{ base64: string; format: string } | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          console.error('Não foi possível criar contexto do canvas');
          resolve(null);
          return;
        }
        
        ctx.drawImage(img, 0, 0);
        
        // Tentar PNG primeiro, depois JPEG
        let base64 = canvas.toDataURL('image/png');
        let format = 'PNG';
        
        // Se a imagem for muito grande, usar JPEG com compressão
        if (base64.length > 500000) {
          base64 = canvas.toDataURL('image/jpeg', 0.85);
          format = 'JPEG';
        }
        
        resolve({ base64, format });
      } catch (error) {
        console.error('Erro ao converter imagem para base64:', error);
        resolve(null);
      }
    };
    
    img.onerror = (error) => {
      console.error('Erro ao carregar imagem:', error);
      resolve(null);
    };
    
    // Adicionar timestamp para evitar cache
    const separator = url.includes('?') ? '&' : '?';
    img.src = `${url}${separator}t=${Date.now()}`;
  });
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

    // Tentar adicionar logo na posição configurada
    let logoAdded = false;
    let logoX = 14; // Padrão: esquerda
    const logoWidth = 30;
    const logoHeight = 30;
    const posicaoLogo = empresa.logo_posicao_pdf || 'direita';

    if (empresa.logo_url) {
      try {
        const logoData = await imageUrlToBase64(empresa.logo_url);
        if (logoData) {
          // Calcular posição X baseado na configuração
          if (posicaoLogo === 'centro') {
            logoX = (pageWidth - logoWidth) / 2;
          } else if (posicaoLogo === 'direita') {
            logoX = pageWidth - 14 - logoWidth;
          }
          // esquerda: já é o padrão (14)
          
          doc.addImage(logoData.base64, logoData.format, logoX, yPos, logoWidth, logoHeight);
          logoAdded = true;
        }
      } catch (error) {
        console.error('Erro ao adicionar logo ao PDF:', error);
        // Continua sem logo
      }
    }

    // Textos - posição depende de onde está o logo
    let textX = 14;
    let textMaxWidth = pageWidth - 28;
    
    // Se logo está à esquerda, texto vai à direita do logo
    if (logoAdded && posicaoLogo === 'esquerda') {
      textX = 14 + logoWidth + 6;
      textMaxWidth = pageWidth - textX - 14;
    } else if (logoAdded && (posicaoLogo === 'direita' || posicaoLogo === 'centro')) {
      // Logo à direita ou centro, texto à esquerda
      textMaxWidth = posicaoLogo === 'direita' ? pageWidth - 60 : pageWidth - 28;
    }
    
    let textY = yPos + 5;
    
    // Nome da empresa com cor primária
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(r, g, b);
    doc.text(empresa.nome_empresa, textX, textY);
    textY += 6;
    
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
      doc.text(infoLine, textX, textY);
      textY += 5;
    }
    
    // Endereço
    if (empresa.endereco) {
      const enderecoTruncado = empresa.endereco.length > 80 
        ? empresa.endereco.substring(0, 77) + '...' 
        : empresa.endereco;
      doc.text(enderecoTruncado, textX, textY);
    }
    
    yPos += logoAdded ? 35 : 25;

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
