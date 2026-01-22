import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";

export default function InvoicesPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <h1 className="text-3xl font-headline font-bold tracking-tight">
        Faturamento
      </h1>
      <Card>
        <CardHeader className="flex flex-row items-center gap-4">
            <FileText className="w-8 h-8 text-secondary"/>
            <CardTitle className="font-headline">Faturas</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Esta seção está em construção. Em breve, você poderá gerar, enviar e gerenciar faturas para todos os serviços prestados.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
