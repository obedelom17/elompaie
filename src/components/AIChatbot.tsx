import { useState, useRef, useEffect } from 'react'
import { MessageCircle, X, Send, Bot, User, Loader2, Minimize2, Maximize2, Trash2, Wrench } from 'lucide-react'
import { calculatePayroll, formatXOF } from '../lib/payroll'

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

const GROQ_KEY = import.meta.env.VITE_GROQ_API_KEY || ''
const MODEL = 'llama-3.3-70b-versatile'

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
        if (!res.ok) return JSON.stringify({ error: 'Accès refusé ou erreur serveur' })
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
      } catch { return JSON.stringify({ error: 'Impossible de récupérer les employés' }) }
    }

    case 'lister_periodes': {
      try {
        const res = await fetch('/api/payroll', { credentials: 'include' })
        if (!res.ok) return JSON.stringify({ error: 'Erreur serveur' })
        let periods: any[] = await res.json()
        const statut = args.statut || 'all'
        if (statut !== 'all') periods = periods.filter(p => p.status === statut)
        const limite = args.limite || 10
        return JSON.stringify(periods.slice(0, limite).map(p => ({
          mois: p.period_month,
          annee: p.period_year,
          statut: p.status === 'open' ? 'Ouverte' : 'Clôturée',
          client: p.client_name,
          id: p.id,
        })))
      } catch { return JSON.stringify({ error: 'Impossible de récupérer les périodes' }) }
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
      } catch { return JSON.stringify({ error: 'Impossible de récupérer les statistiques' }) }
    }

    default:
      return JSON.stringify({ error: `Outil inconnu: ${name}` })
  }
}

// ─── Prompt système ───────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `Tu es PaieBot, assistant IA expert en paie et droit du travail au Togo, intégré dans ElomPaie.

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
- Si tu utilises un outil, commente les résultats clairement`

// ─── Rendu du message tool call ───────────────────────────────────────────────
function ToolCallBadge({ call }: { call: ToolCall }) {
  const labels: Record<string, string> = {
    calculer_paie: 'Calcul de paie',
    chercher_employe: 'Recherche employé',
    lister_periodes: 'Périodes de paie',
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
export function AIChatbot() {
  const [open, setOpen] = useState(false)
  const [minimized, setMinimized] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Bonjour ! Je suis PaieBot, votre assistant paie Togo.\n\nJe peux vous aider avec :\n- Calculs de paie (IRPP, CNSS, AMU)\n- Questions CGI OTR 2025\n- Code du Travail 2021\n- Indemnités et primes\n- Consultation de vos données (employés, périodes)\n\nQue puis-je faire pour vous ?',
      ts: Date.now(),
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [unread, setUnread] = useState(0)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (open) { setUnread(0); setTimeout(() => inputRef.current?.focus(), 100) }
  }, [open])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    if (!open && messages[messages.length - 1]?.role === 'assistant') setUnread(n => n + 1)
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

    try {
      // Construire le contexte pour Groq
      const groqMessages = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...history.map(m => ({ role: m.role, content: m.content })),
      ]

      // 1ère requête
      let res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_KEY}` },
        body: JSON.stringify({ model: MODEL, messages: groqMessages, tools: TOOLS, tool_choice: 'auto', temperature: 0.5, max_tokens: 1500 }),
      })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error?.message || `Erreur ${res.status}`) }
      let data = await res.json()
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
        res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_KEY}` },
          body: JSON.stringify({ model: MODEL, messages: groqMessages, tools: TOOLS, tool_choice: 'auto', temperature: 0.5, max_tokens: 1500 }),
        })
        if (!res.ok) { const e = await res.json(); throw new Error(e.error?.message || `Erreur ${res.status}`) }
        data = await res.json()
        choice = data.choices?.[0]
      }

      // Réponse finale
      const reply = choice?.message?.content || 'Désolé, je ne peux pas répondre.'
      setMessages(prev => [...prev, { role: 'assistant', content: reply, ts: Date.now() }])

    } catch (e: any) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Erreur : ${e.message}\n\nVérifiez que VITE_GROQ_API_KEY est configuré dans Vercel.`,
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
    return content
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br/>')
  }

  // ─── Bouton flottant ──────────────────────────────────────────────────────
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-600 text-white shadow-modal hover:scale-110 active:scale-95 transition-all duration-300 flex items-center justify-center animate-glow"
      >
        <MessageCircle className="w-6 h-6" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center font-bold animate-bounce-soft">
            {unread}
          </span>
        )}
      </button>
    )
  }

  // ─── Fenêtre chat ─────────────────────────────────────────────────────────
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex flex-col bg-white rounded-3xl shadow-modal border border-slate-100 transition-all duration-300 ${minimized ? 'h-16 w-72' : 'h-[620px] w-[390px]'}`}>
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-primary-600 to-accent-600 rounded-t-3xl flex-shrink-0">
        <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
          <Bot className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <p className="text-white font-bold text-sm">PaieBot IA</p>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse-soft" />
            <p className="text-white/70 text-xs">Groq · Llama 3.3 70B + Outils</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={clear} className="p-1.5 rounded-lg hover:bg-white/20 text-white/70 hover:text-white transition-colors" title="Effacer">
            <Trash2 className="w-4 h-4" />
          </button>
          <button onClick={() => setMinimized(!minimized)} className="p-1.5 rounded-lg hover:bg-white/20 text-white/70 hover:text-white transition-colors">
            {minimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
          </button>
          <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-white/20 text-white/70 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!minimized && (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''} animate-fade-in`}>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  msg.role === 'user'
                    ? 'bg-primary-100'
                    : 'bg-gradient-to-br from-primary-500 to-accent-600'
                }`}>
                  {msg.role === 'user'
                    ? <User className="w-4 h-4 text-primary-600" />
                    : <Bot className="w-4 h-4 text-white" />
                  }
                </div>
                <div className="max-w-[80%] space-y-1">
                  {/* Tool call badges */}
                  {msg.toolCalls?.map(tc => <ToolCallBadge key={tc.id} call={tc} />)}
                  {/* Contenu texte */}
                  {msg.content && (
                    <div
                      className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-primary-600 text-white rounded-tr-sm'
                          : 'bg-slate-50 text-slate-800 rounded-tl-sm border border-slate-100'
                      }`}
                      dangerouslySetInnerHTML={{ __html: renderContent(msg.content) }}
                    />
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-2.5 animate-fade-in">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-500 to-accent-600 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="bg-slate-50 border border-slate-100 px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-primary-500" />
                  <span className="text-sm text-slate-400">Réflexion...</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Suggestions */}
          <div className="px-4 pb-2 flex gap-2 overflow-x-auto">
            {[
              'Calcul paie 500 000F marié 2 enfants',
              'Stats du cabinet',
              'SMIG Togo 2025',
              'Périodes ouvertes',
            ].map(s => (
              <button
                key={s}
                onClick={() => { setInput(s); inputRef.current?.focus() }}
                className="text-xs bg-slate-50 hover:bg-primary-50 hover:text-primary-700 border border-slate-200 hover:border-primary-200 text-slate-600 px-3 py-1.5 rounded-full whitespace-nowrap transition-all duration-200 flex-shrink-0"
              >
                {s}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="p-4 border-t border-slate-100 flex gap-2 items-end">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Posez votre question sur la paie..."
              rows={1}
              className="flex-1 resize-none input py-2.5 text-sm max-h-32"
              style={{ minHeight: '40px' }}
            />
            <button
              onClick={send}
              disabled={loading || !input.trim()}
              className="btn-primary p-2.5 rounded-xl disabled:opacity-40 flex-shrink-0"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
