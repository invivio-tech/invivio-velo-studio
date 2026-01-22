import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";

export default function InvoicesPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <h1 className="text-3xl font-headline font-bold tracking-tight">
        Invoicing
      </h1>
      <Card>
        <CardHeader className="flex flex-row items-center gap-4">
            <FileText className="w-8 h-8 text-secondary"/>
            <CardTitle className="font-headline">Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            This section is under construction. Soon, you will be able to generate, send, and manage invoices for all services rendered.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
