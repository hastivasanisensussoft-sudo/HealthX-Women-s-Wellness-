/** Wellness report (SRS §36, mockup M30) with the weekly / monthly / cycle scopes. */
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';

import { Segmented } from '@/components/Inputs';
import { Screen } from '@/components/Screen';
import { WeeklyReport, type ReportPeriod } from '@/components/WeeklyReport';
import { PageIntro } from '@/components/b-kit';
import { track } from '@/lib/track';

const DOC = require('../../assets/images/report/doc.png');

export default function WeeklyReportScreen() {
  const { width: winW } = useWindowDimensions();
  const artW = Math.round(Math.min(230, Math.max(140, winW * 0.38)));
  const [period, setPeriod] = useState<ReportPeriod>('weekly');
  useEffect(() => track('weekly_report_viewed'), []);
  return (
    <Screen back>
      {/* header with the report illustration on the right */}
      <View>
        <Image source={DOC} style={[styles.art, { width: artW, height: artW * 0.96 }]} contentFit="contain" accessible={false} />
        <PageIntro eyebrow="Rules-based summary" title="Weekly report" subtitle="What you logged, summarised — observed patterns, never a diagnosis." style={{ paddingRight: artW * 0.74, minHeight: artW * 0.86 }} />
      </View>
      <Segmented
        value={period}
        onChange={setPeriod}
        options={[
          { key: 'weekly', label: 'Weekly' },
          { key: 'monthly', label: 'Monthly' },
          { key: 'cycle', label: 'Cycle' },
        ]}
        solid
        style={{ marginBottom: 16 }}
      />
      <WeeklyReport period={period} illustrated />
    </Screen>
  );
}

const styles = StyleSheet.create({
  art: { position: 'absolute', right: -14, top: 4 },
});
