import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Loader2, Trash2, Wrench } from 'lucide-react'
import { calculatePayroll, formatXOF } from '../lib/payroll'
import { t, getLang } from '../lib/i18n'

interface Message {
  role: 'user' | 'assistant'
  content: string
  ts: number
  toolCalls?: ToolCall[]
  toolResults?: ToolResult[]
}

interface ToolCall {
  id: string
  name: string
  args: Record<string, any>
  result?: any
  loading?: boolean
}

interface ToolResult {
  tool_call_id: string
  content: string
}

// Groq appelé via backend /api/ai-chat (clé privée GROQ_API_KEY côté serveur)

// ─── Définitions des outils ───────────────────────────────────────────────────
const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'calculer_paie',
      description: 'Calcule le bulletin de paie complet (CNSS, AMU, IRPP, net à payer) selon le CGI OTR 2025. Utilise cet outil dès que l\'utilisateur donne un salaire ou demande un calcul de paie.',
      parameters: {
        type: 'object',
        properties: {
          salaire_base: { type: 'number', description: 'Salaire de base mensuel en FCFA' },
          sursalaire: { type: 'number', description: 'Sursalaire / heures supplémentaires (optionnel)' },
          indemnite_fonction: { type: 'number', description: 'Indemnité de fonction (optionnel)' },
          indemnite_logement: { type: 'number', description: 'Prime de logement (optionnel)' },
          indemnite_transport: { type: 'number', description: 'Indemnité de transport (optionnel)' },
          indemnite_repas: { type: 'number', description: 'Prime de repas (optionnel)' },
          indemnite_communication: { type: 'number', description: 'Indemnité de communication (optionnel)' },
          avance_salaire: { type: 'number', description: 'Avance sur salaire à déduire (optionnel)' },
          situation_matrimoniale: { type: 'string', enum: ['celibataire', 'marie', 'divorce', 'veuf'], description: 'Situation matrimoniale' },
          nombre_enfants: { type: 'number', description: 'Nombre d\'enfants à charge' },
        },
        required: ['salaire_base'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'chercher_employe',
      description: 'Recherche un ou plusieurs employés dans la base de données par nom, matricule ou client.',
      parameters: {
        type: 'object',
        properties: {
          nom: { type: 'string', description: 'Nom ou prénom de l\'employé' },
          matricule: { type: 'string', description: 'Matricule de l\'employé' },
          client_nom: { type: 'string', description: 'Nom de l\'entreprise cliente' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'lister_periodes',
      description: 'Liste les périodes de paie (mois), leur statut (ouvert/clôturé) et le client concerné.',
      parameters: {
        type: 'object',
        properties: {
          statut: { type: 'string', enum: ['open', 'closed', 'all'], description: 'Filtrer par statut' },
          limite: { type: 'number', description: 'Nombre maximum de résultats (défaut 10)' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'obtenir_stats',
      description: 'Obtient les statistiques globales : nombre de clients, employés actifs, périodes en cours.',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
]

// ─── Exécuteurs des outils ────────────────────────────────────────────────────
async function executeTool(name: string, args: Record<string, any>): Promise<string> {
  switch (name) {

    case 'calculer_paie': {
      const input = {
        base_salary:            args.salaire_base || 0,
        overtime_premium:       args.sursalaire || 0,
        function_allowance:     args.indemnite_fonction || 0,
        housing_premium:        args.indemnite_logement || 0,
        transport_allowance:    args.indemnite_transport || 0,
        meal_premium:           args.indemnite_repas || 0,
        communication_allowance:args.indemnite_communication || 0,
        salary_advance:         args.avance_salaire || 0,
        loan_payment:           0,
        flat_deduction:         0,
        marital_status:         args.situation_matrimoniale || 'celibataire',
        children_count:         args.nombre_enfants || 0,
      }
      const r = calculatePayroll(input)
      return JSON.stringify({
        salaire_brut:        r.gross_salary,
        cnss_salarie:        r.cnss_employee,
        amu_salarie:         r.amu_employee,
        irpp:                r.irpp_net,
        total_retenues:      r.total_deductions,
        net_a_payer:         r.net_payable,
        cnss_patronal:       r.cnss_employer,
        amu_patronal:        r.amu_employer,
        masse_salariale:     r.gross_salary + r.cnss_employer + r.amu_employer,
        base_imposable_annuelle: r.taxable_income_annual,
        formatted: {
          brut:       formatXOF(r.gross_salary),
          net:        formatXOF(r.net_payable),
          cnss:       formatXOF(r.cnss_employee),
          amu:        formatXOF(r.amu_employee),
          irpp:       formatXOF(r.irpp_net),
          patronal:   formatXOF(r.cnss_employer + r.amu_employer),
          masse:      formatXOF(r.gross_salary + r.cnss_employer + r.amu_employer),
        }
      })
    }

    case 'chercher_employe': {
      try {
        const params = new URLSearchParams()
        if (args.client_nom) params.set('search', args.client_nom)
        const res = await fetch(`/api/employees${params.toString() ? '?' + params : ''}`, { credentials: 'include' })
        if (!res.ok) return JSON.stringify({ error: t("Accès refusé ou erreur serveur") })
        const all: any[] = await res.json()
        const q = (args.nom || args.matricule || '').toLowerCase()
        const filtered = q
          ? all.filter(e =>
              `${e.first_name} ${e.last_name} ${e.matricule || ''}`.toLowerCase().includes(q) ||
              (e.client_name || '').toLowerCase().includes(q)
            )
          : all
        return JSON.stringify(filtered.slice(0, 8).map(e => ({
          nom: `${e.last_name} ${e.first_name}`,
          matricule: e.matricule,
          poste: e.position,
          categorie: e.category,
          client: e.client_name,
          statut: e.status,
          embauche: e.hire_date,
        })))
      } catch { return JSON.stringify({ error: t("Impossible de récupérer les employés") }) }
    }

    case 'lister_periodes': {
      try {
        const res = await fetch('/api/payroll', { credentials: 'include' })
        if (!res.ok) return JSON.stringify({ error: t("Erreur serveur") })
        let periods: any[] = await res.json()
        const statut = args.statut || 'all'
        if (statut !== 'all') periods = periods.filter(p => p.status === statut)
        const limite = args.limite || 10
        return JSON.stringify(periods.slice(0, limite).map(p => ({
          mois: p.period_month,
          annee: p.period_year,
          statut: p.status === 'open' ? 'Ouverte' : t("Clôturée"),
          client: p.client_name,
          id: p.id,
        })))
      } catch { return JSON.stringify({ error: t("Impossible de récupérer les périodes") }) }
    }

    case 'obtenir_stats': {
      try {
        const [empRes, periodRes, clientRes] = await Promise.all([
          fetch('/api/employees', { credentials: 'include' }),
          fetch('/api/payroll', { credentials: 'include' }),
          fetch('/api/clients', { credentials: 'include' }),
        ])
        const [emps, periods, clients] = await Promise.all([
          empRes.ok ? empRes.json() : [],
          periodRes.ok ? periodRes.json() : [],
          clientRes.ok ? clientRes.json() : [],
        ])
        const actifs = emps.filter((e: any) => e.status === 'actif' || e.active).length
        const ouvertes = periods.filter((p: any) => p.status === 'open').length
        const cloturees = periods.filter((p: any) => p.status === 'closed').length
        return JSON.stringify({
          clients_total: clients.length,
          employes_actifs: actifs,
          employes_total: emps.length,
          periodes_ouvertes: ouvertes,
          periodes_cloturees: cloturees,
          periodes_total: periods.length,
        })
      } catch { return JSON.stringify({ error: t("Impossible de récupérer les statistiques") }) }
    }

    default:
      return JSON.stringify({ error: `Outil inconnu: ${name}` })
  }
}

// ─── Prompt système ───────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `Tu es ElomPaie AI, assistant IA expert en paie et droit du travail au Togo, intégré dans ElomPaie.

Tu as accès à des outils pour interagir avec la base de données de l'utilisateur :
- calculer_paie : calcule immédiatement tout bulletin de paie
- chercher_employe : recherche dans la base d'employés
- lister_periodes : consulte les périodes de paie
- obtenir_stats : statistiques globales du cabinet

Expertise métier :
- CGI OTR 2025 : IRPP (barème progressif, abattement 28% plafonné 10M, charges famille 10 000F/pers/mois)
- Code du Travail Togo 2021 : licenciement, préavis, SMIG 60 000F, heures supp (+15%/+50%/+100%)
- CNSS : 4% salarié + 17,5% patronal
- AMU : 5% salarié + 5% patronal

Instructions :
- TOUJOURS utiliser l'outil calculer_paie quand un salaire est mentionné
- TOUJOURS utiliser chercher_employe quand on parle d'un employé spécifique
- Réponds en français, sois concis et pratique
- Formate les montants en FCFA avec séparateurs de milliers
- Si tu utilises un outil, commente les résultats clairement
- TOUJOURS présenter les résultats de calcul de paie sous forme de tableau Markdown avec colonnes | Poste | Montant |
- Les tableaux doivent avoir une ligne de séparation --- et les montants alignés à droite`

// ─── Rendu du message tool call ───────────────────────────────────────────────
function ToolCallBadge({ call }: { call: ToolCall }) {
  const labels: Record<string, string> = {
    calculer_paie: t("Calcul de paie"),
    chercher_employe: t("Recherche employé"),
    lister_periodes: t("Périodes de paie"),
    obtenir_stats: 'Statistiques',
  }
  return (
    <div className="flex items-center gap-1.5 text-xs text-primary-600 bg-primary-50 border border-primary-100 rounded-lg px-2.5 py-1.5 w-fit mb-1">
      <Wrench className="w-3 h-3" />
      <span className="font-medium">{labels[call.name] || call.name}</span>
      {call.loading && <Loader2 className="w-3 h-3 animate-spin ml-1" />}
    </div>
  )
}

// ─── Composant principal ──────────────────────────────────────────────────────
// L'historique est conservé quand on change de page.
let savedMessages: Message[] | null = null

export function AIChatbot() {
  const [messages, setMessages] = useState<Message[]>(savedMessages ?? [
    {
      role: 'assistant',
      content: t("Bonjour ! Je suis ElomPaie AI, votre assistant paie Togo.\n\nJe peux vous aider avec :\n- Calculs de paie (IRPP, CNSS, AMU)\n- Questions CGI OTR 2025\n- Code du Travail 2021\n- Indemnités et primes\n- Consultation de vos données (employés, périodes)\n\nQue puis-je faire pour vous ?"),
      ts: Date.now(),
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  useEffect(() => {
    savedMessages = messages
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ─── Envoi avec tool calling ─────────────────────────────────────────────
  const send = async () => {
    const text = input.trim()
    if (!text || loading) return

    const userMsg: Message = { role: 'user', content: text, ts: Date.now() }
    const history = [...messages, userMsg]
    setMessages(history)
    setInput('')
    setLoading(true)

    // Helper: appel via backend (clé privée GROQ_API_KEY côté serveur)
    const groqFetch = async (payload: object): Promise<any> => {
      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const e = await res.json()
        throw new Error(e.error || `Erreur ${res.status}`)
      }
      return res.json()
    }

    try {
      // Construire le contexte pour Groq
      const groqMessages = [
        { role: 'system', content: SYSTEM_PROMPT + (getLang() === 'en' ? '\n\nIMPORTANT: the user interface is in English. Reply in English.' : '') },
        ...history.map(m => ({ role: m.role, content: m.content })),
      ]

      const basePayload = { messages: groqMessages, tools: TOOLS, tool_choice: 'auto', temperature: 0.5, max_tokens: 1500 }

      // 1ère requête
      let data = await groqFetch(basePayload)
      let choice = data.choices?.[0]

      // ─── Boucle tool calling ──────────────────────────────────────────────
      while (choice?.finish_reason === 'tool_calls' && choice.message?.tool_calls?.length) {
        const toolCallsRaw = choice.message.tool_calls
        const toolCalls: ToolCall[] = toolCallsRaw.map((tc: any) => ({
          id: tc.id,
          name: tc.function.name,
          args: JSON.parse(tc.function.arguments || '{}'),
          loading: true,
        }))

        // Ajouter message assistant avec tool calls (affiché)
        const assistantMsg: Message = {
          role: 'assistant',
          content: choice.message.content || '',
          ts: Date.now(),
          toolCalls,
        }
        setMessages(prev => [...prev, assistantMsg])

        // Exécuter les outils
        const toolResults: ToolResult[] = []
        const resolvedCalls: ToolCall[] = []
        for (const tc of toolCalls) {
          const result = await executeTool(tc.name, tc.args)
          toolResults.push({ tool_call_id: tc.id, content: result })
          resolvedCalls.push({ ...tc, result: JSON.parse(result), loading: false })
        }

        // Mettre à jour le message avec les résultats
        setMessages(prev => prev.map(m =>
          m.ts === assistantMsg.ts ? { ...m, toolCalls: resolvedCalls, toolResults } : m
        ))

        // Ajouter au contexte Groq
        groqMessages.push({ role: 'assistant', content: choice.message.content || '', tool_calls: toolCallsRaw } as any)
        for (const tr of toolResults) {
          groqMessages.push({ role: 'tool', tool_call_id: tr.tool_call_id, content: tr.content } as any)
        }

        // 2ème requête avec résultats
        data = await groqFetch({ ...basePayload, messages: groqMessages })
        choice = data.choices?.[0]
      }

      // Réponse finale
      const reply = choice?.message?.content || t("Désolé, je ne peux pas répondre.")
      setMessages(prev => [...prev, { role: 'assistant', content: reply, ts: Date.now() }])

    } catch (e: any) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Erreur : ${e.message}\n\nVérifiez que GROQ_API_KEY est configuré dans Vercel (Settings → Environment Variables).`,
        ts: Date.now(),
      }])
    } finally {
      setLoading(false)
    }
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  const clear = () => setMessages([{
    role: 'assistant',
    content: 'Nouvelle conversation. Comment puis-je vous aider ?',
    ts: Date.now(),
  }])

  function renderContent(content: string) {
    const lines = content.split('\n')
    const html: string[] = []
    let i = 0
    while (i < lines.length) {
      const line = lines[i]
      // Détection tableau Markdown : ligne avec | et ligne suivante avec ---
      if (line.trim().startsWith('|') && lines[i + 1]?.trim().startsWith('|') && lines[i + 1]?.includes('---')) {
        html.push('<table class="w-full border-collapse text-sm my-2">')
        // En-tête
        const headers = line.split('|').filter((_, idx, arr) => idx > 0 && idx < arr.length - 1)
        html.push('<thead><tr>' + headers.map(h => `<th class="border border-slate-200 bg-slate-50 px-3 py-1.5 text-left font-semibold">${h.trim()}</th>`).join('') + '</tr></thead>')
        i += 2 // skip header + separator
        html.push('<tbody>')
        while (i < lines.length && lines[i].trim().startsWith('|')) {
          const cells = lines[i].split('|').filter((_, idx, arr) => idx > 0 && idx < arr.length - 1)
          html.push('<tr>' + cells.map(c => `<td class="border border-slate-200 px-3 py-1.5">${c.trim().replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')}</td>`).join('') + '</tr>')
          i++
        }
        html.push('</tbody></table>')
      } else {
        html.push(line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') + '<br/>')
        i++
      }
    }
    return html.join('')
  }

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)] lg:h-[calc(100vh-8rem)] max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">{t("ElomPaie AI")}</h1>
        <button onClick={clear} className="btn-secondary" title={t("Effacer")}>
          <Trash2 className="w-4 h-4" />
          {t("Effacer")}
        </button>
      </div>

      <div className="card flex-1 flex flex-col min-h-0">
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-slate-100' : 'bg-primary-600'}`}>
                {msg.role === 'user' ? <User className="w-4 h-4 text-slate-600" /> : <Bot className="w-4 h-4 text-white" />}
              </div>
              <div className="max-w-[80%] space-y-1">
                {msg.toolCalls?.map(tc => <ToolCallBadge key={tc.id} call={tc} />)}
                {msg.content && (
                  <div
                    className={`px-4 py-3 rounded-lg text-sm leading-relaxed ${
                      msg.role === 'user' ? 'bg-primary-600 text-white' : 'bg-slate-50 text-slate-800 border border-slate-200'
                    }`}
                    dangerouslySetInnerHTML={{ __html: renderContent(msg.content) }}
                  />
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-md bg-primary-600 flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-slate-50 border border-slate-200 px-4 py-3 rounded-lg flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-primary-600" />
                <span className="text-sm text-slate-500">{t("Réflexion...")}</span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="px-5 pb-2 flex gap-2 overflow-x-auto">
          {[
            t("Calcul paie 500 000F marié 2 enfants"),
            t("Stats du cabinet"),
            t("Périodes ouvertes"),
          ].map(s => (
            <button key={s} onClick={() => { setInput(s); inputRef.current?.focus() }}
              className="text-xs bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 px-3 py-1.5 rounded-md whitespace-nowrap transition-colors flex-shrink-0">
              {s}
            </button>
          ))}
        </div>

        <div className="p-4 border-t border-slate-200 flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder={t("Posez votre question sur la paie...")}
            rows={1}
            className="flex-1 resize-none input py-2.5 text-sm max-h-32"
            style={{ minHeight: '40px' }}
          />
          <button onClick={send} disabled={loading || !input.trim()} className="btn-primary p-2.5 flex-shrink-0">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  )
}
