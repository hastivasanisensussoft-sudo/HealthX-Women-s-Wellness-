/** Bottom sheet with a month calendar for picking one date (past or future, within limits). */
import { computeCycleState, startOfMonth, type ISODate } from '@healthx/shared';
import { useMemo, useState } from 'react';

import { Button } from './Button';
import { MonthCalendar } from './cycle/Calendar';
import { Sheet } from './Sheet';

const NO_CYCLE = computeCycleState([], { lastPeriodStart: null, typicalCycleLength: null, typicalPeriodLength: null, regularity: 'not_sure' }, '2000-01-01');

export function DateSheet({
  visible,
  onClose,
  title,
  subtitle,
  value,
  onChange,
  maxDate,
  eyebrow = 'Pick a date',
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  value: ISODate | null;
  onChange: (d: ISODate) => void;
  /** Latest selectable date (e.g. today for logs). Omit to allow future dates (appointments). */
  maxDate?: ISODate;
  eyebrow?: string;
}) {
  const [month, setMonth] = useState<ISODate>(startOfMonth(value ?? maxDate ?? new Date().toISOString().slice(0, 10)));
  const state = useMemo(() => NO_CYCLE, []);
  return (
    <Sheet visible={visible} onClose={onClose} eyebrow={eyebrow} title={title} subtitle={subtitle} footer={<Button label="Done" full onPress={onClose} />}>
      <MonthCalendar month={month} onMonthChange={setMonth} periods={[]} state={state} selected={value} onSelect={onChange} maxDate={maxDate} showEstimates={false} />
    </Sheet>
  );
}
