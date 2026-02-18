'use client';

import { useUser } from '@/firebase';
import ScheduleSettingsForm from './ScheduleSettingsForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock } from 'lucide-react';

export default function ProfessionalScheduleSettings() {
    const { user } = useUser();

    if (!user) {
        return null;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline flex items-center gap-2">
                    <Clock className="w-5 h-5" /> Horário de Atendimento
                </CardTitle>
                <CardDescription>
                    Defina seus dias e horários de trabalho. Estes horários terão prioridade sobre o horário geral do estabelecimento.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {/* Save to users/{userId}/scheduleSettings/main */}
                <ScheduleSettingsForm settingsPath={`users/${user.uid}/scheduleSettings/main`} />
            </CardContent>
        </Card>
    );
}
