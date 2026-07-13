import { useMemo } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts'
import { MONTH_NAMES, formatXOF } from '../lib/payroll'

interface PayrollVar {
  gross_salary: number
  net_payable: number
  irpp_net?: number
  its_net?: number
  // Support nested or flat period fields
  payroll_periods?: { period_year: number; period_month: number }
  period_year?: number
  period_month?: number
}

interface Props {
  variables: PayrollVar[]
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-lg text-xs">
      <p className="font-semibold text-slate-700 mb-2">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }} className="font-medium">
          {p.name} : {formatXOF(p.value)}
        </p>
      ))}
    </div>
  )
}

export function SalaryHistoryChart({ variables }: Props) {
  const data = useMemo(() => {
    return [...variables]
      .filter(v => v.payroll_periods || (v.period_year && v.period_month))
      .sort((a, b) => {
        const ya = (a.payroll_periods?.period_year ?? a.period_year ?? 0) * 100 + (a.payroll_periods?.period_month ?? a.period_month ?? 0)
        const yb = (b.payroll_periods?.period_year ?? b.period_year ?? 0) * 100 + (b.payroll_periods?.period_month ?? b.period_month ?? 0)
        return ya - yb
      })
      .slice(-12)
      .map(v => {
        const year = v.payroll_periods?.period_year ?? v.period_year ?? 0
        const month = v.payroll_periods?.period_month ?? v.period_month ?? 1
        return {
          mois: `${MONTH_NAMES[month - 1].slice(0, 3)} ${year}`,
          'Brut': v.gross_salary,
          'Net': v.net_payable,
          'IRPP': v.irpp_net || v.its_net || 0,
        }
      })
  }, [variables])

  if (data.length === 0) return (
    <p className="text-sm text-slate-400 italic text-center py-6">Pas encore de données.</p>
  )

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="gradBrut" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradNet" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="mois" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
        <YAxis tickFormatter={v => `${Math.round(v / 1000)}k`} tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
        <Area type="monotone" dataKey="Brut" stroke="#4f46e5" strokeWidth={2} fill="url(#gradBrut)" dot={false} />
        <Area type="monotone" dataKey="Net" stroke="#10b981" strokeWidth={2} fill="url(#gradNet)" dot={false} />
        <Area type="monotone" dataKey="IRPP" stroke="#f59e0b" strokeWidth={1.5} fill="none" dot={false} strokeDasharray="4 2" />
      </AreaChart>
    </ResponsiveContainer>
  )
}
