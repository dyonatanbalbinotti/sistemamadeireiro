import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Smartphone, CheckCircle2, Share } from "lucide-react";
import { toast } from "sonner";

const Install = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Detecta se já está instalado
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Detecta iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // Captura o evento beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Detecta quando o app é instalado
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      toast.success("App instalado com sucesso!");
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      toast.error("Instalação não disponível no momento");
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      toast.success("Instalação iniciada!");
    }

    setDeferredPrompt(null);
  };

  if (isInstalled) {
    return (
      <div className="container mx-auto p-4 md:p-8 max-w-4xl">
        <Card className="border-primary/20">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <CheckCircle2 className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">App Já Instalado!</CardTitle>
            <CardDescription>
              O DwCorporation Sistema Madeireiro já está instalado no seu dispositivo
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-muted p-4 text-center">
              <p className="text-sm text-muted-foreground">
                Você pode acessar o app diretamente da tela inicial do seu dispositivo
              </p>
            </div>
            <Button 
              className="w-full" 
              onClick={() => window.location.href = '/'}
            >
              Ir para Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-4xl">
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Download className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl md:text-3xl">Instalar App</CardTitle>
          <CardDescription>
            Instale o DwCorporation Sistema Madeireiro no seu dispositivo para acesso rápido e funcionalidade offline
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Benefícios */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border p-4">
              <h3 className="mb-2 font-semibold flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-primary" />
                Acesso Rápido
              </h3>
              <p className="text-sm text-muted-foreground">
                Abra direto da tela inicial, sem precisar do navegador
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <h3 className="mb-2 font-semibold flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                Funciona Offline
              </h3>
              <p className="text-sm text-muted-foreground">
                Continue trabalhando mesmo sem conexão com internet
              </p>
            </div>
          </div>

          {/* Botão de instalação para Android/Desktop */}
          {!isIOS && (
            <div className="space-y-4">
              {deferredPrompt ? (
                <Button 
                  onClick={handleInstallClick}
                  className="w-full h-12 text-lg"
                  size="lg"
                >
                  <Download className="mr-2 h-5 w-5" />
                  Instalar Agora
                </Button>
              ) : (
                <div className="rounded-lg bg-muted p-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    Para instalar, abra o menu do navegador e selecione "Instalar aplicativo" ou "Adicionar à tela inicial"
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Instruções para iOS */}
          {isIOS && (
            <div className="space-y-4 rounded-lg border border-primary/20 bg-primary/5 p-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Share className="h-5 w-5" />
                Instruções para iPhone/iPad
              </h3>
              <ol className="list-decimal list-inside space-y-2 text-sm">
                <li>Toque no botão "Compartilhar" <Share className="inline h-4 w-4" /> na parte inferior do Safari</li>
                <li>Role para baixo e toque em "Adicionar à Tela Inicial"</li>
                <li>Toque em "Adicionar" no canto superior direito</li>
                <li>O app aparecerá na sua tela inicial!</li>
              </ol>
            </div>
          )}

          {/* Instruções gerais */}
          <div className="rounded-lg bg-muted p-4">
            <h4 className="mb-2 text-sm font-semibold">Outras opções de instalação:</h4>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>• <strong>Chrome/Edge:</strong> Menu (⋮) → "Instalar app"</li>
              <li>• <strong>Firefox:</strong> Menu → "Instalar"</li>
              <li>• <strong>Safari (Mac):</strong> Arquivo → "Adicionar à Dock"</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Install;
