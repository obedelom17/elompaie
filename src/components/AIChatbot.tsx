import { useState, useRef, useEffect } from 'react'
import { MessageCircle, X, Send, Bot, User, Loader2, Minimize2, Maximize2, Trash2 } from 'lucide-react'

interface Message { role: 'user' | 'assistant'; content: string; ts: number }

const GROQ_KEY = import.meta.env.VITE_GROQ_API_KEY || ''
const MODEL = 'llama-3.3-70b-versatile'

const SYSTEM_PROMPT = `Tu es PaieBot, assistant IA expert en paie et droit du travail au Togo.
Tu maîtrises parfaitement :
- Code Général des Impôts OTR 2025 (ITS, Art. 26 abattement 28%, Art. 73 charges famille 10 000F/pers/mois, Art. 74 barème annuel)
- Code du Travail Togo 2021 (licenciement Art. 97 : 35%/40%/45%, préavis, SMIG, heures supp)
- CNSS : 4% salarié, 17,5% employeur
- INAM : 5% salarié, 5% employeur
- Calcul bulletins de paie, indemnités, grilles salariales
Réponds en français, sois concis et pratique. Fournis des exemples chiffrés quand utile.
Si on te demande un calcul de paie, calcule-le étape par étape.`

export function AIChatbot() {
  const [open, setOpen] = useState(false)
  const [minimized, setMinimized] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: '👋 Bonjour ! Je suis **PaieBot**, votre assistant paie Togo.\n\nJe peux vous aider avec :\n- 📊 Calculs de paie (ITS, CNSS, INAM)\n- 📋 Questions CGI OTR 2025\n- ⚖️ Code du Travail 2021\n- 💰 Indemnités et primes\n\nQue puis-je faire pour vous ?', ts: Date.now() }
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

  const send = async () => {
    const text = input.trim()
    if (!text || loading) return
    const userMsg: Message = { role: 'user', content: text, ts: Date.now() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const body = {
        model: MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...messages.map(m => ({ role: m.role, content: m.content })),
          { role: 'user', content: text }
        ],
        temperature: 0.7,
        max_tokens: 1024,
      }

      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_KEY}`,
        },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error?.message || `Erreur ${res.status}`)
      }

      const data = await res.json()
      const reply = data.choices?.[0]?.message?.content || 'Désolé, je ne peux pas répondre.'
      setMessages(prev => [...prev, { role: 'assistant', content: reply, ts: Date.now() }])
    } catch (e: any) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `⚠️ Erreur : ${e.message}\n\nVérifiez que la clé GROQ est configurée dans les variables d'environnement Vercel (\`VITE_GROQ_API_KEY\`).`,
        ts: Date.now()
      }])
    } finally {
      setLoading(false)
    }
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  const clear = () => setMessages([{ role: 'assistant', content: '🔄 Nouvelle conversation. Comment puis-je vous aider ?', ts: Date.now() }])

  function renderContent(content: string) {
    return content
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br/>')
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-600 text-white shadow-modal hover:scale-110 active:scale-95 transition-all duration-300 flex items-center justify-center animate-glow">
        <MessageCircle className="w-6 h-6" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center font-bold animate-bounce-soft">
            {unread}
          </span>
        )}
      </button>
    )
  }

  return (
    <div className={`fixed bottom-6 right-6 z-50 flex flex-col bg-white rounded-3xl shadow-modal border border-slate-100 transition-all duration-300 ${minimized ? 'h-16 w-72' : 'h-[600px] w-[380px]'}`}>
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-primary-600 to-accent-600 rounded-t-3xl flex-shrink-0">
        <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
          <Bot className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <p className="text-white font-bold text-sm">PaieBot IA</p>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse-soft"></span>
            <p className="text-white/70 text-xs">Groq · Llama 3.3 70B</p>
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
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-primary-100' : 'bg-gradient-to-br from-primary-500 to-accent-600'}`}>
                  {msg.role === 'user'
                    ? <User className="w-4 h-4 text-primary-600" />
                    : <Bot className="w-4 h-4 text-white" />
                  }
                </div>
                <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-primary-600 text-white rounded-tr-sm'
                    : 'bg-slate-50 text-slate-800 rounded-tl-sm border border-slate-100'
                }`}
                  dangerouslySetInnerHTML={{ __html: renderContent(msg.content) }}
                />
              </div>
            ))}
            {loading && (
              <div className="flex gap-2.5 animate-fade-in">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-500 to-accent-600 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="bg-slate-50 border border-slate-100 px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-primary-500" />
                  <span className="text-sm text-slate-400">Réponse en cours...</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Suggestions rapides */}
          <div className="px-4 pb-2 flex gap-2 overflow-x-auto">
            {['Calcul ITS', 'SMIG 2025', 'Indemnité licenciement', 'Heures supp'].map(s => (
              <button key={s} onClick={() => { setInput(s); inputRef.current?.focus() }}
                className="text-xs bg-slate-50 hover:bg-primary-50 hover:text-primary-700 border border-slate-200 hover:border-primary-200 text-slate-600 px-3 py-1.5 rounded-full whitespace-nowrap transition-all duration-200 flex-shrink-0">
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
            <button onClick={send} disabled={loading || !input.trim()}
              className="btn-primary p-2.5 rounded-xl disabled:opacity-40 flex-shrink-0">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
