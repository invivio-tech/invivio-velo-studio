import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";

export default function CustomersPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <h1 className="text-3xl font-headline font-bold tracking-tight">
        Gestão de Clientes
      </h1>
      <Card>
        <CardHeader className="flex flex-row items-center gap-4">
            <Users className="w-8 h-8 text-secondary"/>
            <CardTitle className="font-headline">Clientes</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Esta seção está em construção. Em breve, você poderá gerenciar informações de clientes, visualizar o histórico de agendamentos e registrar preferências aqui.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
