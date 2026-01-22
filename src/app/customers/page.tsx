import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";

export default function CustomersPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <h1 className="text-3xl font-headline font-bold tracking-tight">
        Customer Management
      </h1>
      <Card>
        <CardHeader className="flex flex-row items-center gap-4">
            <Users className="w-8 h-8 text-secondary"/>
            <CardTitle className="font-headline">Customers</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            This section is under construction. Soon, you will be able to manage customer information, view appointment history, and record preferences here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
