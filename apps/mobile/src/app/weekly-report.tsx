/** Wellness report (SRS §36, mockup M30) with the weekly / monthly / cycle scopes. */
import { useState } from 'react';

import { Segmented } from '@/components/Inputs';
import { Screen } from '@/components/Screen';
import { WeeklyReport, type ReportPeriod } from '@/components/WeeklyReport';
import { PageIntro } from '@/components/b-kit';

export default function WeeklyReportScreen() {
  const [period, setPeriod] = useState<ReportPeriod>('weekly');
  return (
    <Screen back>
      <PageIntro eyebrow="Rules-based summary" title="Weekly report" subtitle="What you logged, summarised — observed patterns, never a diagnosis." />
      <Segmented
        value={period}
        onChange={setPeriod}
        options={[
          { key: 'weekly', label: 'Weekly' },
          { key: 'monthly', label: 'Monthly' },
          { key: 'cycle', label: 'Cycle' },
        ]}
        style={{ marginBottom: 16 }}
      />
      <WeeklyReport period={period} />
    </Screen>
  );
}
