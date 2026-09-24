/**
 * Utilities for Date handling, formatting, and working-day calculations
 */

export function parseDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0);
}

export function formatDateISO(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getTodayISO(): string {
  return formatDateISO(new Date());
}

export function formatReadableDate(dateStr: string, includeDayOfWeek: boolean = true): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  
  const options: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: 'short',
    ...(includeDayOfWeek ? { weekday: 'short' } : {})
  };
  
  return d.toLocaleDateString('pt-BR', options);
}

export function formatFullDate(dateStr: string): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

export function getDayOfWeekName(dateStr: string): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  const days = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  return days[d.getDay()];
}

export function getShortDayName(dateStr: string): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  return days[d.getDay()];
}

export function getDiffInDays(fromStr: string, toStr: string): number {
  const d1 = parseDate(fromStr);
  const d2 = parseDate(toStr);
  const diffTime = d2.getTime() - d1.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

export function addDays(dateStr: string, days: number): string {
  const d = parseDate(dateStr);
  d.setDate(d.getDate() + days);
  return formatDateISO(d);
}

export function addWorkingDays(dateStr: string, days: number, workDays: number[] = [1, 2, 3, 4, 5]): string {
  let current = parseDate(dateStr);
  let remaining = days;
  const direction = days >= 0 ? 1 : -1;
  remaining = Math.abs(remaining);

  while (remaining > 0) {
    current.setDate(current.getDate() + direction);
    if (workDays.includes(current.getDay())) {
      remaining--;
    }
  }
  return formatDateISO(current);
}

export function subtractWorkingDays(dateStr: string, days: number, workDays: number[] = [1, 2, 3, 4, 5]): string {
  return addWorkingDays(dateStr, -days, workDays);
}

export function isWorkingDay(dateStr: string, workDays: number[] = [1, 2, 3, 4, 5]): boolean {
  const d = parseDate(dateStr);
  return workDays.includes(d.getDay());
}

export function getUrgencyBadge(deadlineDate: string, status: string): {
  label: string;
  variant: 'overdue' | 'today' | 'tomorrow' | 'soon' | 'future' | 'delivered';
} {
  if (status === 'delivered' || status === 'finalized') {
    return { label: 'Concluído', variant: 'delivered' };
  }

  const todayStr = getTodayISO();
  const diff = getDiffInDays(todayStr, deadlineDate);

  if (diff < 0) {
    const abs = Math.abs(diff);
    return { label: `Em atraso (${abs}d)`, variant: 'overdue' };
  }
  if (diff === 0) {
    return { label: 'Prazo hoje', variant: 'today' };
  }
  if (diff === 1) {
    return { label: 'Prazo amanhã', variant: 'tomorrow' };
  }
  if (diff <= 3) {
    return { label: `Prazo em ${diff} dias`, variant: 'soon' };
  }
  return { label: `Em ${diff} dias`, variant: 'future' };
}

export function formatHours(hours: number): string {
  if (hours < 1) {
    return `${Math.round(hours * 60)}min`;
  }
  const fullHours = Math.floor(hours);
  const minutes = Math.round((hours - fullHours) * 60);
  if (minutes === 0) return `${fullHours}h`;
  return `${fullHours}h ${minutes}min`;
}

export function formatTimeRange(startTime: string, endTime: string): string {
  return `${startTime} – ${endTime}`;
}

export function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = Math.floor(minutes % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
