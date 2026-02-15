'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { callAIAgent } from '@/lib/aiAgent'
import parseLLMJson from '@/lib/jsonParser'
import { cn, generateUUID } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { FiUsers, FiCalendar, FiAlertCircle, FiClock, FiPlus, FiEdit2, FiTrash2, FiSend, FiMessageSquare, FiChevronLeft, FiChevronRight, FiSearch, FiFilter, FiCheck, FiX, FiHome, FiList, FiChevronDown, FiChevronUp, FiMail, FiPhone, FiActivity, FiBriefcase, FiMinimize2, FiMaximize2, FiZap, FiLoader } from 'react-icons/fi'
import { format, formatDistanceToNow, isBefore, startOfWeek, endOfWeek, isWithinInterval, parseISO, addDays } from 'date-fns'

// --- Types ---
interface Client {
  id: string
  name: string
  company: string
  email: string
  phone: string
  industry: string
  status: 'active' | 'inactive'
  notes: string
  createdAt: string
}

interface Deadline {
  id: string
  title: string
  description: string
  clientId: string
  dueDate: string
  priority: 'high' | 'medium' | 'low'
  status: 'todo' | 'in_progress' | 'complete'
  createdAt: string
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  parsedResponse?: {
    summary: string
    details: string
    action_items: string[]
    alerts: string[]
  }
  timestamp: string
}

// --- Constants ---
const AGENT_ID = '69920c27a36c3292aec62958'
const STORAGE_KEYS = {
  clients: 'consulttrack_clients',
  deadlines: 'consulttrack_deadlines',
  chat: 'consulttrack_chat',
  seeded: 'consulttrack_seeded',
}

// --- Seed Data ---
function getSeedClients(): Client[] {
  const now = new Date().toISOString()
  return [
    { id: generateUUID(), name: 'Margaret Whitfield', company: 'Whitfield & Associates', email: 'margaret@whitfield.com', phone: '(212) 555-0142', industry: 'Legal', status: 'active', notes: 'Long-standing client. Prefers email communication. Annual review scheduled for Q2.', createdAt: now },
    { id: generateUUID(), name: 'James Harrington', company: 'Harrington Capital Group', email: 'j.harrington@hcg.com', phone: '(415) 555-0198', industry: 'Finance', status: 'active', notes: 'New engagement started last month. Requires weekly status calls.', createdAt: now },
    { id: generateUUID(), name: 'Elena Vasquez', company: 'Meridian Health Systems', email: 'evasquez@meridianhs.org', phone: '(305) 555-0267', industry: 'Healthcare', status: 'active', notes: 'Compliance audit project in progress. Sensitive data handling required.', createdAt: now },
    { id: generateUUID(), name: 'Robert Chen', company: 'Pacific Rim Ventures', email: 'rchen@pacificrim.vc', phone: '(650) 555-0334', industry: 'Technology', status: 'active', notes: 'Series B due diligence support. Fast-paced timeline.', createdAt: now },
    { id: generateUUID(), name: 'Diana Thornton', company: 'Thornton Real Estate', email: 'diana@thorntonre.com', phone: '(312) 555-0411', industry: 'Real Estate', status: 'inactive', notes: 'Project completed last quarter. May re-engage for new development.', createdAt: now },
  ]
}

function getSeedDeadlines(clients: Client[]): Deadline[] {
  const today = new Date()
  const c = clients
  return [
    { id: generateUUID(), title: 'Q2 Financial Review Package', description: 'Prepare comprehensive financial review documentation for annual assessment.', clientId: c[0]?.id ?? '', dueDate: addDays(today, 3).toISOString().split('T')[0], priority: 'high', status: 'in_progress', createdAt: today.toISOString() },
    { id: generateUUID(), title: 'Contract Renewal Analysis', description: 'Review and analyze terms for upcoming contract renewal.', clientId: c[0]?.id ?? '', dueDate: addDays(today, 10).toISOString().split('T')[0], priority: 'medium', status: 'todo', createdAt: today.toISOString() },
    { id: generateUUID(), title: 'Investment Portfolio Assessment', description: 'Complete quarterly investment portfolio performance assessment.', clientId: c[1]?.id ?? '', dueDate: addDays(today, 1).toISOString().split('T')[0], priority: 'high', status: 'todo', createdAt: today.toISOString() },
    { id: generateUUID(), title: 'Risk Analysis Report', description: 'Deliver comprehensive risk analysis for new market entry strategy.', clientId: c[1]?.id ?? '', dueDate: addDays(today, 7).toISOString().split('T')[0], priority: 'high', status: 'in_progress', createdAt: today.toISOString() },
    { id: generateUUID(), title: 'Weekly Status Update', description: 'Prepare and send weekly status report to client.', clientId: c[1]?.id ?? '', dueDate: addDays(today, 2).toISOString().split('T')[0], priority: 'low', status: 'todo', createdAt: today.toISOString() },
    { id: generateUUID(), title: 'HIPAA Compliance Audit', description: 'Conduct thorough HIPAA compliance audit across all systems.', clientId: c[2]?.id ?? '', dueDate: addDays(today, -2).toISOString().split('T')[0], priority: 'high', status: 'in_progress', createdAt: today.toISOString() },
    { id: generateUUID(), title: 'Data Security Assessment', description: 'Evaluate current data security protocols and recommend improvements.', clientId: c[2]?.id ?? '', dueDate: addDays(today, 14).toISOString().split('T')[0], priority: 'medium', status: 'todo', createdAt: today.toISOString() },
    { id: generateUUID(), title: 'Staff Training Materials', description: 'Develop compliance training materials for healthcare staff.', clientId: c[2]?.id ?? '', dueDate: addDays(today, 21).toISOString().split('T')[0], priority: 'low', status: 'todo', createdAt: today.toISOString() },
    { id: generateUUID(), title: 'Due Diligence Report - Series B', description: 'Complete due diligence documentation for Series B funding round.', clientId: c[3]?.id ?? '', dueDate: addDays(today, 5).toISOString().split('T')[0], priority: 'high', status: 'in_progress', createdAt: today.toISOString() },
    { id: generateUUID(), title: 'Market Analysis Presentation', description: 'Prepare market analysis presentation for board meeting.', clientId: c[3]?.id ?? '', dueDate: addDays(today, 12).toISOString().split('T')[0], priority: 'medium', status: 'todo', createdAt: today.toISOString() },
    { id: generateUUID(), title: 'IP Valuation Summary', description: 'Summarize intellectual property valuation findings.', clientId: c[3]?.id ?? '', dueDate: addDays(today, -1).toISOString().split('T')[0], priority: 'medium', status: 'complete', createdAt: today.toISOString() },
    { id: generateUUID(), title: 'Property Development Feasibility', description: 'Complete feasibility study for proposed development project.', clientId: c[4]?.id ?? '', dueDate: addDays(today, 30).toISOString().split('T')[0], priority: 'low', status: 'todo', createdAt: today.toISOString() },
    { id: generateUUID(), title: 'Regulatory Filing Preparation', description: 'Prepare all necessary regulatory filings for upcoming submission.', clientId: c[0]?.id ?? '', dueDate: addDays(today, -3).toISOString().split('T')[0], priority: 'high', status: 'complete', createdAt: today.toISOString() },
    { id: generateUUID(), title: 'Client Onboarding Documentation', description: 'Finalize onboarding documentation and welcome package.', clientId: c[1]?.id ?? '', dueDate: addDays(today, 4).toISOString().split('T')[0], priority: 'medium', status: 'in_progress', createdAt: today.toISOString() },
  ]
}

// --- Markdown renderer ---
function formatInline(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g)
  if (parts.length === 1) return text
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="font-semibold">{part}</strong>
    ) : (
      part
    )
  )
}

function renderMarkdown(text: string) {
  if (!text) return null
  return (
    <div className="space-y-2">
      {text.split('\n').map((line, i) => {
        if (line.startsWith('### ')) return <h4 key={i} className="font-semibold text-sm mt-3 mb-1">{line.slice(4)}</h4>
        if (line.startsWith('## ')) return <h3 key={i} className="font-semibold text-base mt-3 mb-1">{line.slice(3)}</h3>
        if (line.startsWith('# ')) return <h2 key={i} className="font-bold text-lg mt-4 mb-2">{line.slice(2)}</h2>
        if (line.startsWith('- ') || line.startsWith('* ')) return <li key={i} className="ml-4 list-disc text-sm">{formatInline(line.slice(2))}</li>
        if (/^\d+\.\s/.test(line)) return <li key={i} className="ml-4 list-decimal text-sm">{formatInline(line.replace(/^\d+\.\s/, ''))}</li>
        if (!line.trim()) return <div key={i} className="h-1" />
        return <p key={i} className="text-sm">{formatInline(line)}</p>
      })}
    </div>
  )
}

// --- Helper functions ---
function getPriorityColor(priority: string) {
  switch (priority) {
    case 'high': return 'bg-red-100 text-red-800 border-red-200'
    case 'medium': return 'bg-amber-100 text-amber-800 border-amber-200'
    case 'low': return 'bg-green-100 text-green-700 border-green-200'
    default: return 'bg-muted text-muted-foreground'
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case 'todo': return 'bg-secondary text-secondary-foreground'
    case 'in_progress': return 'bg-amber-100 text-amber-800 border-amber-200'
    case 'complete': return 'bg-primary text-primary-foreground'
    default: return 'bg-muted text-muted-foreground'
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case 'todo': return 'To Do'
    case 'in_progress': return 'In Progress'
    case 'complete': return 'Complete'
    default: return status
  }
}

function getNextStatus(current: string): 'todo' | 'in_progress' | 'complete' {
  switch (current) {
    case 'todo': return 'in_progress'
    case 'in_progress': return 'complete'
    case 'complete': return 'todo'
    default: return 'todo'
  }
}

// --- Main Page ---
export default function Page() {
  // Navigation
  const [currentView, setCurrentView] = useState<'dashboard' | 'clients' | 'deadlines'>('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(true)

  // Data
  const [clients, setClients] = useState<Client[]>([])
  const [deadlines, setDeadlines] = useState<Deadline[]>([])
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [mounted, setMounted] = useState(false)

  // UI state
  const [chatOpen, setChatOpen] = useState(false)
  const [chatExpanded, setChatExpanded] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusMessage, setStatusMessage] = useState('')

  // Dialog states
  const [addClientOpen, setAddClientOpen] = useState(false)
  const [addDeadlineOpen, setAddDeadlineOpen] = useState(false)
  const [editClientOpen, setEditClientOpen] = useState(false)
  const [editDeadlineOpen, setEditDeadlineOpen] = useState(false)

  // Client view
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const [clientSearchQuery, setClientSearchQuery] = useState('')
  const [clientDetailTab, setClientDetailTab] = useState('overview')

  // Deadline view
  const [deadlineFilterClient, setDeadlineFilterClient] = useState<string>('all')
  const [deadlineFilterPriority, setDeadlineFilterPriority] = useState<string>('all')
  const [deadlineFilterStatus, setDeadlineFilterStatus] = useState<string>('all')
  const [deadlineSortField, setDeadlineSortField] = useState<'dueDate' | 'priority' | 'title'>('dueDate')
  const [deadlineSortAsc, setDeadlineSortAsc] = useState(true)
  const [selectedDeadlineIds, setSelectedDeadlineIds] = useState<Set<string>>(new Set())

  // Form states
  const [clientForm, setClientForm] = useState<Partial<Client>>({})
  const [deadlineForm, setDeadlineForm] = useState<Partial<Deadline>>({})
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [editingDeadline, setEditingDeadline] = useState<Deadline | null>(null)

  // AI Summary
  const [aiSummary, setAiSummary] = useState<{ summary: string; details: string; action_items: string[]; alerts: string[] } | null>(null)
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false)

  // Deadline scoped to client
  const [deadlineForClientId, setDeadlineForClientId] = useState<string | null>(null)

  const chatEndRef = useRef<HTMLDivElement>(null)

  // --- LocalStorage persistence ---
  useEffect(() => {
    setMounted(true)
    const seeded = localStorage.getItem(STORAGE_KEYS.seeded)
    if (!seeded) {
      const seedClients = getSeedClients()
      const seedDeadlines = getSeedDeadlines(seedClients)
      setClients(seedClients)
      setDeadlines(seedDeadlines)
      localStorage.setItem(STORAGE_KEYS.clients, JSON.stringify(seedClients))
      localStorage.setItem(STORAGE_KEYS.deadlines, JSON.stringify(seedDeadlines))
      localStorage.setItem(STORAGE_KEYS.seeded, 'true')
    } else {
      try {
        const storedClients = JSON.parse(localStorage.getItem(STORAGE_KEYS.clients) || '[]')
        const storedDeadlines = JSON.parse(localStorage.getItem(STORAGE_KEYS.deadlines) || '[]')
        const storedChat = JSON.parse(localStorage.getItem(STORAGE_KEYS.chat) || '[]')
        setClients(Array.isArray(storedClients) ? storedClients : [])
        setDeadlines(Array.isArray(storedDeadlines) ? storedDeadlines : [])
        setChatMessages(Array.isArray(storedChat) ? storedChat : [])
      } catch {
        setClients([])
        setDeadlines([])
        setChatMessages([])
      }
    }
  }, [])

  useEffect(() => {
    if (mounted) {
      localStorage.setItem(STORAGE_KEYS.clients, JSON.stringify(clients))
    }
  }, [clients, mounted])

  useEffect(() => {
    if (mounted) {
      localStorage.setItem(STORAGE_KEYS.deadlines, JSON.stringify(deadlines))
    }
  }, [deadlines, mounted])

  useEffect(() => {
    if (mounted) {
      localStorage.setItem(STORAGE_KEYS.chat, JSON.stringify(chatMessages))
    }
  }, [chatMessages, mounted])

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [chatMessages])

  // --- Computed values ---
  const today = useMemo(() => new Date(), [])

  const activeClients = useMemo(() => clients.filter(c => c.status === 'active'), [clients])

  const overdueDeadlines = useMemo(() =>
    deadlines.filter(d => d.status !== 'complete' && isBefore(parseISO(d.dueDate), today)),
    [deadlines, today]
  )

  const upcomingDeadlines = useMemo(() =>
    deadlines
      .filter(d => d.status !== 'complete' && !isBefore(parseISO(d.dueDate), today))
      .sort((a, b) => parseISO(a.dueDate).getTime() - parseISO(b.dueDate).getTime()),
    [deadlines, today]
  )

  const thisWeekDeadlines = useMemo(() => {
    const weekStart = startOfWeek(today, { weekStartsOn: 1 })
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 })
    return deadlines.filter(d =>
      d.status !== 'complete' &&
      isWithinInterval(parseISO(d.dueDate), { start: weekStart, end: weekEnd })
    )
  }, [deadlines, today])

  const selectedClient = useMemo(() =>
    clients.find(c => c.id === selectedClientId) ?? null,
    [clients, selectedClientId]
  )

  const clientDeadlines = useMemo(() =>
    selectedClientId ? deadlines.filter(d => d.clientId === selectedClientId) : [],
    [deadlines, selectedClientId]
  )

  const filteredClients = useMemo(() => {
    if (!clientSearchQuery) return clients
    const q = clientSearchQuery.toLowerCase()
    return clients.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.company.toLowerCase().includes(q) ||
      c.industry.toLowerCase().includes(q)
    )
  }, [clients, clientSearchQuery])

  const filteredDeadlines = useMemo(() => {
    let result = [...deadlines]
    if (deadlineFilterClient !== 'all') result = result.filter(d => d.clientId === deadlineFilterClient)
    if (deadlineFilterPriority !== 'all') result = result.filter(d => d.priority === deadlineFilterPriority)
    if (deadlineFilterStatus !== 'all') result = result.filter(d => d.status === deadlineFilterStatus)
    result.sort((a, b) => {
      let cmp = 0
      if (deadlineSortField === 'dueDate') cmp = parseISO(a.dueDate).getTime() - parseISO(b.dueDate).getTime()
      else if (deadlineSortField === 'priority') {
        const ord: Record<string, number> = { high: 0, medium: 1, low: 2 }
        cmp = (ord[a.priority] ?? 1) - (ord[b.priority] ?? 1)
      } else cmp = a.title.localeCompare(b.title)
      return deadlineSortAsc ? cmp : -cmp
    })
    return result
  }, [deadlines, deadlineFilterClient, deadlineFilterPriority, deadlineFilterStatus, deadlineSortField, deadlineSortAsc])

  const getClientName = useCallback((clientId: string) => {
    const client = clients.find(c => c.id === clientId)
    return client?.name ?? 'Unknown'
  }, [clients])

  // --- CRUD Operations ---
  const addClient = useCallback(() => {
    const newClient: Client = {
      id: generateUUID(),
      name: clientForm.name || 'New Client',
      company: clientForm.company || '',
      email: clientForm.email || '',
      phone: clientForm.phone || '',
      industry: clientForm.industry || '',
      status: (clientForm.status as 'active' | 'inactive') || 'active',
      notes: clientForm.notes || '',
      createdAt: new Date().toISOString(),
    }
    setClients(prev => [...prev, newClient])
    setClientForm({})
    setAddClientOpen(false)
    setStatusMessage('Client added successfully')
    setTimeout(() => setStatusMessage(''), 3000)
  }, [clientForm])

  const updateClient = useCallback(() => {
    if (!editingClient) return
    setClients(prev => prev.map(c =>
      c.id === editingClient.id ? { ...editingClient } : c
    ))
    setEditingClient(null)
    setEditClientOpen(false)
    setStatusMessage('Client updated successfully')
    setTimeout(() => setStatusMessage(''), 3000)
  }, [editingClient])

  const deleteClient = useCallback((id: string) => {
    setClients(prev => prev.filter(c => c.id !== id))
    setDeadlines(prev => prev.filter(d => d.clientId !== id))
    if (selectedClientId === id) setSelectedClientId(null)
    setStatusMessage('Client removed')
    setTimeout(() => setStatusMessage(''), 3000)
  }, [selectedClientId])

  const addDeadline = useCallback(() => {
    const newDeadline: Deadline = {
      id: generateUUID(),
      title: deadlineForm.title || 'New Deadline',
      description: deadlineForm.description || '',
      clientId: deadlineForClientId || deadlineForm.clientId || (clients[0]?.id ?? ''),
      dueDate: deadlineForm.dueDate || new Date().toISOString().split('T')[0],
      priority: (deadlineForm.priority as 'high' | 'medium' | 'low') || 'medium',
      status: (deadlineForm.status as 'todo' | 'in_progress' | 'complete') || 'todo',
      createdAt: new Date().toISOString(),
    }
    setDeadlines(prev => [...prev, newDeadline])
    setDeadlineForm({})
    setDeadlineForClientId(null)
    setAddDeadlineOpen(false)
    setStatusMessage('Deadline added successfully')
    setTimeout(() => setStatusMessage(''), 3000)
  }, [deadlineForm, deadlineForClientId, clients])

  const updateDeadline = useCallback(() => {
    if (!editingDeadline) return
    setDeadlines(prev => prev.map(d =>
      d.id === editingDeadline.id ? { ...editingDeadline } : d
    ))
    setEditingDeadline(null)
    setEditDeadlineOpen(false)
    setStatusMessage('Deadline updated successfully')
    setTimeout(() => setStatusMessage(''), 3000)
  }, [editingDeadline])

  const deleteDeadline = useCallback((id: string) => {
    setDeadlines(prev => prev.filter(d => d.id !== id))
    setStatusMessage('Deadline removed')
    setTimeout(() => setStatusMessage(''), 3000)
  }, [])

  const toggleDeadlineStatus = useCallback((id: string) => {
    setDeadlines(prev => prev.map(d =>
      d.id === id ? { ...d, status: getNextStatus(d.status) } : d
    ))
  }, [])

  const bulkMarkComplete = useCallback(() => {
    setDeadlines(prev => prev.map(d =>
      selectedDeadlineIds.has(d.id) ? { ...d, status: 'complete' as const } : d
    ))
    setSelectedDeadlineIds(new Set())
    setStatusMessage('Selected deadlines marked complete')
    setTimeout(() => setStatusMessage(''), 3000)
  }, [selectedDeadlineIds])

  // --- Chat / AI ---
  const buildContext = useCallback(() => {
    const clientData = clients.map(c => ({
      name: c.name, company: c.company, status: c.status, industry: c.industry,
      deadlines: deadlines.filter(d => d.clientId === c.id).map(d => ({
        title: d.title, dueDate: d.dueDate, priority: d.priority, status: d.status
      }))
    }))
    return `Current date: ${new Date().toISOString().split('T')[0]}\n\nClient & Deadline Data:\n${JSON.stringify(clientData, null, 2)}`
  }, [clients, deadlines])

  const sendChatMessage = useCallback(async (userMessage: string) => {
    if (!userMessage.trim()) return
    const userMsg: ChatMessage = {
      id: generateUUID(),
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString(),
    }
    setChatMessages(prev => [...prev, userMsg])
    setChatInput('')
    setChatLoading(true)
    setActiveAgentId(AGENT_ID)

    try {
      const context = buildContext()
      const fullMessage = `${userMessage}\n\n--- Context ---\n${context}`
      const result = await callAIAgent(fullMessage, AGENT_ID)

      if (result.success) {
        let parsed = result?.response?.result
        if (typeof parsed === 'string') {
          parsed = parseLLMJson(parsed)
        }
        const summary = parsed?.summary ?? ''
        const details = parsed?.details ?? ''
        const actionItems = Array.isArray(parsed?.action_items) ? parsed.action_items : []
        const alerts = Array.isArray(parsed?.alerts) ? parsed.alerts : []

        const assistantMsg: ChatMessage = {
          id: generateUUID(),
          role: 'assistant',
          content: summary || details || 'Response received.',
          parsedResponse: { summary, details, action_items: actionItems, alerts },
          timestamp: new Date().toISOString(),
        }
        setChatMessages(prev => [...prev, assistantMsg])
      } else {
        const errorMsg: ChatMessage = {
          id: generateUUID(),
          role: 'assistant',
          content: `I could not process your request. ${result?.error ?? 'Please try again.'}`,
          timestamp: new Date().toISOString(),
        }
        setChatMessages(prev => [...prev, errorMsg])
      }
    } catch {
      const errorMsg: ChatMessage = {
        id: generateUUID(),
        role: 'assistant',
        content: 'A network error occurred. Please try again.',
        timestamp: new Date().toISOString(),
      }
      setChatMessages(prev => [...prev, errorMsg])
    } finally {
      setChatLoading(false)
      setActiveAgentId(null)
    }
  }, [buildContext])

  const generateAISummary = useCallback(async () => {
    setAiSummaryLoading(true)
    setActiveAgentId(AGENT_ID)
    try {
      const context = buildContext()
      const message = `Provide a weekly workload summary. Include key priorities, overdue items, and recommendations for the week ahead.\n\n--- Context ---\n${context}`
      const result = await callAIAgent(message, AGENT_ID)
      if (result.success) {
        let parsed = result?.response?.result
        if (typeof parsed === 'string') {
          parsed = parseLLMJson(parsed)
        }
        setAiSummary({
          summary: parsed?.summary ?? '',
          details: parsed?.details ?? '',
          action_items: Array.isArray(parsed?.action_items) ? parsed.action_items : [],
          alerts: Array.isArray(parsed?.alerts) ? parsed.alerts : [],
        })
      }
    } catch {
      // silent fail
    } finally {
      setAiSummaryLoading(false)
      setActiveAgentId(null)
    }
  }, [buildContext])

  const quickQueries = [
    "What's due this week?",
    'Overdue items',
    'Client summary',
    'Weekly workload',
  ]

  // --- Don't render until mounted (avoid hydration issues) ---
  if (!mounted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground font-serif text-lg">Loading ConsultTrack...</div>
      </div>
    )
  }

  // ===========================================================================
  //  RENDER
  // ===========================================================================
  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background flex">
        {/* ====== SIDEBAR ====== */}
        <aside className={cn("flex flex-col border-r border-border/40 bg-card transition-all duration-300 shrink-0", sidebarOpen ? 'w-56' : 'w-14')}>
          <div className="flex items-center gap-2 p-4 border-b border-border/40">
            {sidebarOpen && <span className="font-serif text-lg font-bold text-primary tracking-wide">CT</span>}
            <Button variant="ghost" size="sm" className="ml-auto h-8 w-8 p-0" onClick={() => setSidebarOpen(prev => !prev)}>
              {sidebarOpen ? <FiChevronLeft className="h-4 w-4" /> : <FiChevronRight className="h-4 w-4" />}
            </Button>
          </div>
          <nav className="flex-1 p-2 space-y-1">
            {[
              { id: 'dashboard' as const, label: 'Dashboard', icon: FiHome },
              { id: 'clients' as const, label: 'Clients', icon: FiUsers },
              { id: 'deadlines' as const, label: 'Deadlines', icon: FiCalendar },
            ].map(item => (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                className={cn("flex items-center gap-3 w-full px-3 py-2.5 rounded-md text-sm font-sans transition-colors", currentView === item.id ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-secondary')}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {sidebarOpen && <span>{item.label}</span>}
              </button>
            ))}
          </nav>
          <div className="p-2 border-t border-border/40">
            <button
              onClick={() => { setChatOpen(true); setChatExpanded(true) }}
              className={cn("flex items-center gap-3 w-full px-3 py-2.5 rounded-md text-sm font-sans transition-colors text-foreground hover:bg-secondary")}
            >
              <FiMessageSquare className="h-4 w-4 shrink-0" />
              {sidebarOpen && <span>Ask ConsultTrack</span>}
            </button>
          </div>
          {/* Agent status */}
          {sidebarOpen && (
            <div className="p-3 border-t border-border/40">
              <p className="text-[10px] font-sans uppercase tracking-wider text-muted-foreground mb-1">Agent</p>
              <div className="flex items-center gap-2">
                <div className={cn("h-2 w-2 rounded-full", activeAgentId ? 'bg-green-500 animate-pulse' : 'bg-muted-foreground/30')} />
                <span className="text-xs font-sans text-muted-foreground truncate">Consultant Assistant</span>
              </div>
            </div>
          )}
        </aside>

        {/* ====== MAIN CONTENT ====== */}
        <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
          {/* --- Header --- */}
          <header className="flex items-center gap-4 px-6 py-4 border-b border-border/40 bg-card shrink-0">
            <h1 className="font-serif text-xl font-bold text-foreground tracking-wide">ConsultTrack</h1>
            <div className="flex-1 max-w-md ml-4">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search clients, deadlines..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 bg-background font-sans text-sm" />
              </div>
            </div>
            <div className="flex items-center gap-2 ml-auto">
              {statusMessage && (
                <span className="text-xs font-sans text-primary bg-primary/10 px-3 py-1 rounded-full">{statusMessage}</span>
              )}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" onClick={() => { setAddClientOpen(true); setClientForm({}) }}>
                    <FiPlus className="h-4 w-4 mr-1" />
                    <span className="font-sans text-xs">Client</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Add new client</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" onClick={() => { setAddDeadlineOpen(true); setDeadlineForm({}); setDeadlineForClientId(null) }}>
                    <FiPlus className="h-4 w-4 mr-1" />
                    <span className="font-sans text-xs">Deadline</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Add new deadline</TooltipContent>
              </Tooltip>
            </div>
          </header>

          {/* --- View Content --- */}
          <main className="flex-1 overflow-y-auto p-6">
            {/* ======================== DASHBOARD ======================== */}
            {currentView === 'dashboard' && (
              <div className="space-y-6">
                {/* Stat Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className="shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-sans text-muted-foreground uppercase tracking-wider">Active Clients</p>
                          <p className="text-3xl font-serif font-bold text-foreground mt-1">{activeClients.length}</p>
                        </div>
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <FiUsers className="h-5 w-5 text-primary" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-sans text-muted-foreground uppercase tracking-wider">Upcoming Deadlines</p>
                          <p className="text-3xl font-serif font-bold text-foreground mt-1">{upcomingDeadlines.length}</p>
                        </div>
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <FiCalendar className="h-5 w-5 text-primary" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-sans text-muted-foreground uppercase tracking-wider">Overdue Items</p>
                          <p className={cn("text-3xl font-serif font-bold mt-1", overdueDeadlines.length > 0 ? 'text-red-600' : 'text-foreground')}>{overdueDeadlines.length}</p>
                        </div>
                        <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center", overdueDeadlines.length > 0 ? 'bg-red-100' : 'bg-primary/10')}>
                          <FiAlertCircle className={cn("h-5 w-5", overdueDeadlines.length > 0 ? 'text-red-600' : 'text-primary')} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-sans text-muted-foreground uppercase tracking-wider">This Week</p>
                          <p className="text-3xl font-serif font-bold text-foreground mt-1">{thisWeekDeadlines.length}</p>
                        </div>
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <FiClock className="h-5 w-5 text-primary" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Two column layout */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Client Grid */}
                  <Card className="shadow-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="font-serif text-base">Clients</CardTitle>
                      <CardDescription className="font-sans text-xs">Active engagements and next deadlines</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[340px]">
                        <div className="space-y-3 pr-3">
                          {clients.map(client => {
                            const cDeadlines = deadlines.filter(d => d.clientId === client.id && d.status !== 'complete')
                            const nextDeadline = cDeadlines.sort((a, b) => parseISO(a.dueDate).getTime() - parseISO(b.dueDate).getTime())[0]
                            return (
                              <div
                                key={client.id}
                                className="p-3 rounded-lg border border-border/40 bg-background hover:shadow-sm transition-shadow cursor-pointer"
                                onClick={() => { setSelectedClientId(client.id); setCurrentView('clients') }}
                              >
                                <div className="flex items-start justify-between">
                                  <div>
                                    <p className="font-serif font-semibold text-sm text-foreground">{client.name}</p>
                                    <p className="text-xs font-sans text-muted-foreground">{client.company}</p>
                                  </div>
                                  <Badge variant={client.status === 'active' ? 'default' : 'secondary'} className="text-[10px] font-sans">{client.status}</Badge>
                                </div>
                                <div className="flex items-center gap-3 mt-2 text-xs font-sans text-muted-foreground">
                                  <span className="flex items-center gap-1"><FiList className="h-3 w-3" /> {cDeadlines.length} active</span>
                                  {nextDeadline && (
                                    <span className="flex items-center gap-1">
                                      <FiClock className="h-3 w-3" />
                                      {format(parseISO(nextDeadline.dueDate), 'MMM d')}
                                    </span>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>

                  {/* Upcoming Deadline Timeline */}
                  <Card className="shadow-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="font-serif text-base">Upcoming Deadlines</CardTitle>
                      <CardDescription className="font-sans text-xs">Sorted by due date with priority coding</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[340px]">
                        <div className="space-y-2 pr-3">
                          {[...overdueDeadlines.sort((a, b) => parseISO(a.dueDate).getTime() - parseISO(b.dueDate).getTime()), ...upcomingDeadlines].map(deadline => {
                            const isOverdue = isBefore(parseISO(deadline.dueDate), today) && deadline.status !== 'complete'
                            return (
                              <div key={deadline.id} className={cn("flex items-start gap-3 p-3 rounded-lg border bg-background", isOverdue ? 'border-red-300 bg-red-50/50' : 'border-border/40')}>
                                <Checkbox
                                  checked={deadline.status === 'complete'}
                                  onCheckedChange={() => toggleDeadlineStatus(deadline.id)}
                                  className="mt-0.5"
                                />
                                <div className="flex-1 min-w-0">
                                  <p className={cn("font-sans text-sm font-medium", deadline.status === 'complete' && 'line-through text-muted-foreground')}>{deadline.title}</p>
                                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                                    <Badge variant="outline" className={cn("text-[10px] font-sans border", getPriorityColor(deadline.priority))}>{deadline.priority}</Badge>
                                    <span className="text-[11px] font-sans text-muted-foreground">{getClientName(deadline.clientId)}</span>
                                  </div>
                                </div>
                                <div className="text-right shrink-0">
                                  <p className={cn("text-xs font-sans font-medium", isOverdue ? 'text-red-600' : 'text-muted-foreground')}>{format(parseISO(deadline.dueDate), 'MMM d')}</p>
                                  <p className="text-[10px] font-sans text-muted-foreground">{formatDistanceToNow(parseISO(deadline.dueDate), { addSuffix: true })}</p>
                                </div>
                              </div>
                            )
                          })}
                          {overdueDeadlines.length === 0 && upcomingDeadlines.length === 0 && (
                            <p className="text-sm font-sans text-muted-foreground text-center py-8">No pending deadlines</p>
                          )}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </div>

                {/* AI Weekly Summary */}
                <Card className="shadow-sm">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="font-serif text-base flex items-center gap-2">
                          <FiZap className="h-4 w-4 text-primary" /> Weekly AI Summary
                        </CardTitle>
                        <CardDescription className="font-sans text-xs">AI-generated workload snapshot powered by ConsultTrack</CardDescription>
                      </div>
                      <Button variant="outline" size="sm" onClick={generateAISummary} disabled={aiSummaryLoading}>
                        {aiSummaryLoading ? <FiLoader className="h-4 w-4 animate-spin mr-1" /> : <FiZap className="h-4 w-4 mr-1" />}
                        <span className="font-sans text-xs">{aiSummaryLoading ? 'Generating...' : 'Generate Summary'}</span>
                      </Button>
                    </div>
                  </CardHeader>
                  {aiSummary && (
                    <CardContent>
                      <div className="space-y-4">
                        {aiSummary.summary && (
                          <div>
                            <p className="text-xs font-sans uppercase tracking-wider text-muted-foreground mb-1">Summary</p>
                            <div className="font-sans text-sm">{renderMarkdown(aiSummary.summary)}</div>
                          </div>
                        )}
                        {aiSummary.details && (
                          <div>
                            <p className="text-xs font-sans uppercase tracking-wider text-muted-foreground mb-1">Details</p>
                            <div className="font-sans text-sm">{renderMarkdown(aiSummary.details)}</div>
                          </div>
                        )}
                        {aiSummary.action_items.length > 0 && (
                          <div>
                            <p className="text-xs font-sans uppercase tracking-wider text-muted-foreground mb-1">Action Items</p>
                            <ul className="space-y-1">
                              {aiSummary.action_items.map((item, idx) => (
                                <li key={idx} className="flex items-start gap-2 font-sans text-sm">
                                  <FiCheck className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {aiSummary.alerts.length > 0 && (
                          <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                            <p className="text-xs font-sans uppercase tracking-wider text-red-700 mb-1">Alerts</p>
                            <ul className="space-y-1">
                              {aiSummary.alerts.map((alert, idx) => (
                                <li key={idx} className="flex items-start gap-2 font-sans text-sm text-red-800">
                                  <FiAlertCircle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                                  <span>{alert}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  )}
                </Card>
              </div>
            )}

            {/* ======================== CLIENTS ======================== */}
            {currentView === 'clients' && (
              <div className="flex gap-6 h-[calc(100vh-100px)]">
                {/* Client list panel */}
                <div className="w-72 shrink-0 flex flex-col">
                  <div className="mb-3">
                    <div className="relative">
                      <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="Filter clients..." value={clientSearchQuery} onChange={e => setClientSearchQuery(e.target.value)} className="pl-9 font-sans text-sm" />
                    </div>
                  </div>
                  <ScrollArea className="flex-1">
                    <div className="space-y-2 pr-2">
                      {filteredClients.map(client => (
                        <div
                          key={client.id}
                          onClick={() => { setSelectedClientId(client.id); setClientDetailTab('overview') }}
                          className={cn("p-3 rounded-lg border cursor-pointer transition-all", selectedClientId === client.id ? 'border-primary bg-primary/5 shadow-sm' : 'border-border/40 bg-card hover:bg-secondary/50')}
                        >
                          <p className="font-serif font-semibold text-sm">{client.name}</p>
                          <p className="text-xs font-sans text-muted-foreground">{client.company}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant={client.status === 'active' ? 'default' : 'secondary'} className="text-[10px] font-sans">{client.status}</Badge>
                            <span className="text-[10px] font-sans text-muted-foreground">{client.industry}</span>
                          </div>
                        </div>
                      ))}
                      {filteredClients.length === 0 && (
                        <p className="text-sm font-sans text-muted-foreground text-center py-8">No clients found</p>
                      )}
                    </div>
                  </ScrollArea>
                </div>

                {/* Client detail panel */}
                <div className="flex-1 min-w-0">
                  {selectedClient ? (
                    <Card className="h-full flex flex-col shadow-sm">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="font-serif text-xl">{selectedClient.name}</CardTitle>
                            <CardDescription className="font-sans">{selectedClient.company}</CardDescription>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => { setEditingClient({ ...selectedClient }); setEditClientOpen(true) }}>
                              <FiEdit2 className="h-3.5 w-3.5 mr-1" />
                              <span className="font-sans text-xs">Edit</span>
                            </Button>
                            <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => deleteClient(selectedClient.id)}>
                              <FiTrash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="flex-1 overflow-hidden">
                        <Tabs value={clientDetailTab} onValueChange={setClientDetailTab}>
                          <TabsList className="font-sans">
                            <TabsTrigger value="overview" className="font-sans text-xs">Overview</TabsTrigger>
                            <TabsTrigger value="deadlines" className="font-sans text-xs">Deadlines</TabsTrigger>
                            <TabsTrigger value="notes" className="font-sans text-xs">Notes</TabsTrigger>
                          </TabsList>
                          <TabsContent value="overview" className="mt-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-3">
                                <div className="flex items-center gap-2 text-sm font-sans">
                                  <FiMail className="h-4 w-4 text-muted-foreground" />
                                  <span>{selectedClient.email || 'No email'}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm font-sans">
                                  <FiPhone className="h-4 w-4 text-muted-foreground" />
                                  <span>{selectedClient.phone || 'No phone'}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm font-sans">
                                  <FiBriefcase className="h-4 w-4 text-muted-foreground" />
                                  <span>{selectedClient.industry || 'No industry'}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm font-sans">
                                  <FiActivity className="h-4 w-4 text-muted-foreground" />
                                  <Badge variant={selectedClient.status === 'active' ? 'default' : 'secondary'} className="font-sans text-xs">{selectedClient.status}</Badge>
                                </div>
                              </div>
                              <div>
                                <p className="text-xs font-sans uppercase tracking-wider text-muted-foreground mb-2">Quick Stats</p>
                                <div className="space-y-2">
                                  <div className="flex justify-between items-center text-sm font-sans">
                                    <span className="text-muted-foreground">Total Deadlines</span>
                                    <span className="font-semibold">{clientDeadlines.length}</span>
                                  </div>
                                  <div className="flex justify-between items-center text-sm font-sans">
                                    <span className="text-muted-foreground">Active</span>
                                    <span className="font-semibold">{clientDeadlines.filter(d => d.status !== 'complete').length}</span>
                                  </div>
                                  <div className="flex justify-between items-center text-sm font-sans">
                                    <span className="text-muted-foreground">Completed</span>
                                    <span className="font-semibold">{clientDeadlines.filter(d => d.status === 'complete').length}</span>
                                  </div>
                                  <div className="flex justify-between items-center text-sm font-sans">
                                    <span className="text-muted-foreground">Overdue</span>
                                    <span className={cn("font-semibold", clientDeadlines.filter(d => d.status !== 'complete' && isBefore(parseISO(d.dueDate), today)).length > 0 ? 'text-red-600' : '')}>
                                      {clientDeadlines.filter(d => d.status !== 'complete' && isBefore(parseISO(d.dueDate), today)).length}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </TabsContent>
                          <TabsContent value="deadlines" className="mt-4">
                            <div className="flex justify-end mb-3">
                              <Button variant="outline" size="sm" onClick={() => { setDeadlineForClientId(selectedClient.id); setDeadlineForm({}); setAddDeadlineOpen(true) }}>
                                <FiPlus className="h-3.5 w-3.5 mr-1" />
                                <span className="font-sans text-xs">Add Deadline</span>
                              </Button>
                            </div>
                            <ScrollArea className="h-[300px]">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead className="font-sans text-xs">Title</TableHead>
                                    <TableHead className="font-sans text-xs">Due Date</TableHead>
                                    <TableHead className="font-sans text-xs">Priority</TableHead>
                                    <TableHead className="font-sans text-xs">Status</TableHead>
                                    <TableHead className="font-sans text-xs w-20">Actions</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {clientDeadlines.map(dl => (
                                    <TableRow key={dl.id}>
                                      <TableCell className="font-sans text-sm">{dl.title}</TableCell>
                                      <TableCell className="font-sans text-sm">{format(parseISO(dl.dueDate), 'MMM d, yyyy')}</TableCell>
                                      <TableCell>
                                        <Badge variant="outline" className={cn("text-[10px] font-sans border", getPriorityColor(dl.priority))}>{dl.priority}</Badge>
                                      </TableCell>
                                      <TableCell>
                                        <button onClick={() => toggleDeadlineStatus(dl.id)} className="cursor-pointer">
                                          <Badge variant="outline" className={cn("text-[10px] font-sans", getStatusColor(dl.status))}>{getStatusLabel(dl.status)}</Badge>
                                        </button>
                                      </TableCell>
                                      <TableCell>
                                        <div className="flex gap-1">
                                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setEditingDeadline({ ...dl }); setEditDeadlineOpen(true) }}>
                                            <FiEdit2 className="h-3 w-3" />
                                          </Button>
                                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-600 hover:text-red-700" onClick={() => deleteDeadline(dl.id)}>
                                            <FiTrash2 className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                  {clientDeadlines.length === 0 && (
                                    <TableRow>
                                      <TableCell colSpan={5} className="text-center font-sans text-sm text-muted-foreground py-8">No deadlines for this client</TableCell>
                                    </TableRow>
                                  )}
                                </TableBody>
                              </Table>
                            </ScrollArea>
                          </TabsContent>
                          <TabsContent value="notes" className="mt-4">
                            <Textarea
                              value={selectedClient.notes}
                              onChange={e => {
                                const newNotes = e.target.value
                                setClients(prev => prev.map(c =>
                                  c.id === selectedClient.id ? { ...c, notes: newNotes } : c
                                ))
                              }}
                              placeholder="Add notes about this client..."
                              className="min-h-[200px] font-sans text-sm"
                            />
                          </TabsContent>
                        </Tabs>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card className="h-full flex items-center justify-center shadow-sm">
                      <div className="text-center p-8">
                        <FiUsers className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                        <p className="font-serif text-lg text-muted-foreground">Select a client</p>
                        <p className="font-sans text-sm text-muted-foreground/70 mt-1">Choose a client from the list to view their details</p>
                      </div>
                    </Card>
                  )}
                </div>
              </div>
            )}

            {/* ======================== DEADLINES ======================== */}
            {currentView === 'deadlines' && (
              <div className="space-y-4">
                {/* Filter bar */}
                <Card className="shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="flex items-center gap-2">
                        <FiFilter className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs font-sans text-muted-foreground uppercase tracking-wider">Filters</span>
                      </div>
                      <Select value={deadlineFilterClient} onValueChange={setDeadlineFilterClient}>
                        <SelectTrigger className="w-44 font-sans text-sm h-9">
                          <SelectValue placeholder="All Clients" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all" className="font-sans text-sm">All Clients</SelectItem>
                          {clients.map(c => (
                            <SelectItem key={c.id} value={c.id} className="font-sans text-sm">{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={deadlineFilterPriority} onValueChange={setDeadlineFilterPriority}>
                        <SelectTrigger className="w-36 font-sans text-sm h-9">
                          <SelectValue placeholder="All Priorities" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all" className="font-sans text-sm">All Priorities</SelectItem>
                          <SelectItem value="high" className="font-sans text-sm">High</SelectItem>
                          <SelectItem value="medium" className="font-sans text-sm">Medium</SelectItem>
                          <SelectItem value="low" className="font-sans text-sm">Low</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={deadlineFilterStatus} onValueChange={setDeadlineFilterStatus}>
                        <SelectTrigger className="w-36 font-sans text-sm h-9">
                          <SelectValue placeholder="All Statuses" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all" className="font-sans text-sm">All Statuses</SelectItem>
                          <SelectItem value="todo" className="font-sans text-sm">To Do</SelectItem>
                          <SelectItem value="in_progress" className="font-sans text-sm">In Progress</SelectItem>
                          <SelectItem value="complete" className="font-sans text-sm">Complete</SelectItem>
                        </SelectContent>
                      </Select>
                      {selectedDeadlineIds.size > 0 && (
                        <Button variant="outline" size="sm" onClick={bulkMarkComplete} className="ml-auto">
                          <FiCheck className="h-3.5 w-3.5 mr-1" />
                          <span className="font-sans text-xs">Mark {selectedDeadlineIds.size} Complete</span>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Deadline table */}
                <Card className="shadow-sm">
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10 pl-4">
                            <Checkbox
                              checked={filteredDeadlines.length > 0 && selectedDeadlineIds.size === filteredDeadlines.length}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedDeadlineIds(new Set(filteredDeadlines.map(d => d.id)))
                                } else {
                                  setSelectedDeadlineIds(new Set())
                                }
                              }}
                            />
                          </TableHead>
                          <TableHead className="font-sans text-xs cursor-pointer" onClick={() => { setDeadlineSortField('title'); setDeadlineSortAsc(deadlineSortField === 'title' ? !deadlineSortAsc : true) }}>
                            <div className="flex items-center gap-1">
                              Title
                              {deadlineSortField === 'title' && (deadlineSortAsc ? <FiChevronUp className="h-3 w-3" /> : <FiChevronDown className="h-3 w-3" />)}
                            </div>
                          </TableHead>
                          <TableHead className="font-sans text-xs">Client</TableHead>
                          <TableHead className="font-sans text-xs cursor-pointer" onClick={() => { setDeadlineSortField('dueDate'); setDeadlineSortAsc(deadlineSortField === 'dueDate' ? !deadlineSortAsc : true) }}>
                            <div className="flex items-center gap-1">
                              Due Date
                              {deadlineSortField === 'dueDate' && (deadlineSortAsc ? <FiChevronUp className="h-3 w-3" /> : <FiChevronDown className="h-3 w-3" />)}
                            </div>
                          </TableHead>
                          <TableHead className="font-sans text-xs cursor-pointer" onClick={() => { setDeadlineSortField('priority'); setDeadlineSortAsc(deadlineSortField === 'priority' ? !deadlineSortAsc : true) }}>
                            <div className="flex items-center gap-1">
                              Priority
                              {deadlineSortField === 'priority' && (deadlineSortAsc ? <FiChevronUp className="h-3 w-3" /> : <FiChevronDown className="h-3 w-3" />)}
                            </div>
                          </TableHead>
                          <TableHead className="font-sans text-xs">Status</TableHead>
                          <TableHead className="font-sans text-xs w-20">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredDeadlines.map(dl => {
                          const isOverdue = isBefore(parseISO(dl.dueDate), today) && dl.status !== 'complete'
                          return (
                            <TableRow key={dl.id} className={cn(isOverdue && 'bg-red-50/30')}>
                              <TableCell className="pl-4">
                                <Checkbox
                                  checked={selectedDeadlineIds.has(dl.id)}
                                  onCheckedChange={(checked) => {
                                    const newSet = new Set(selectedDeadlineIds)
                                    if (checked) newSet.add(dl.id)
                                    else newSet.delete(dl.id)
                                    setSelectedDeadlineIds(newSet)
                                  }}
                                />
                              </TableCell>
                              <TableCell>
                                <p className={cn("font-sans text-sm font-medium", dl.status === 'complete' && 'line-through text-muted-foreground')}>{dl.title}</p>
                                {dl.description && <p className="font-sans text-xs text-muted-foreground mt-0.5 line-clamp-1">{dl.description}</p>}
                              </TableCell>
                              <TableCell className="font-sans text-sm">{getClientName(dl.clientId)}</TableCell>
                              <TableCell>
                                <span className={cn("font-sans text-sm", isOverdue ? 'text-red-600 font-medium' : '')}>
                                  {format(parseISO(dl.dueDate), 'MMM d, yyyy')}
                                </span>
                                {isOverdue && <p className="text-[10px] font-sans text-red-500">Overdue</p>}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className={cn("text-[10px] font-sans border", getPriorityColor(dl.priority))}>{dl.priority}</Badge>
                              </TableCell>
                              <TableCell>
                                <button onClick={() => toggleDeadlineStatus(dl.id)} className="cursor-pointer">
                                  <Badge variant="outline" className={cn("text-[10px] font-sans", getStatusColor(dl.status))}>{getStatusLabel(dl.status)}</Badge>
                                </button>
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-1">
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setEditingDeadline({ ...dl }); setEditDeadlineOpen(true) }}>
                                    <FiEdit2 className="h-3 w-3" />
                                  </Button>
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-600 hover:text-red-700" onClick={() => deleteDeadline(dl.id)}>
                                    <FiTrash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                        {filteredDeadlines.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center font-sans text-sm text-muted-foreground py-12">No deadlines match your filters</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            )}
          </main>
        </div>

        {/* ====== CHAT PANEL ====== */}
        {chatOpen && (
          <div className={cn("fixed bottom-4 right-4 z-50 flex flex-col bg-card border border-border rounded-xl shadow-xl overflow-hidden transition-all duration-300", chatExpanded ? 'w-[420px] h-[560px]' : 'w-80 h-96')}>
            {/* Chat header */}
            <div className="flex items-center justify-between px-4 py-3 bg-primary text-primary-foreground">
              <div className="flex items-center gap-2">
                <FiMessageSquare className="h-4 w-4" />
                <span className="font-serif font-semibold text-sm">Ask ConsultTrack</span>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-primary-foreground hover:bg-primary/80" onClick={() => setChatExpanded(prev => !prev)}>
                  {chatExpanded ? <FiMinimize2 className="h-3.5 w-3.5" /> : <FiMaximize2 className="h-3.5 w-3.5" />}
                </Button>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-primary-foreground hover:bg-primary/80" onClick={() => setChatOpen(false)}>
                  <FiX className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Chat messages */}
            <ScrollArea className="flex-1 p-3">
              <div className="space-y-3">
                {chatMessages.length === 0 && (
                  <div className="text-center py-8">
                    <FiMessageSquare className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="font-sans text-sm text-muted-foreground">Ask about your clients, deadlines, or workload.</p>
                  </div>
                )}
                {chatMessages.map(msg => (
                  <div key={msg.id} className={cn("flex", msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                    <div className={cn("max-w-[85%] rounded-xl px-3 py-2", msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground')}>
                      {msg.role === 'user' ? (
                        <p className="font-sans text-sm">{msg.content}</p>
                      ) : msg.parsedResponse ? (
                        <div className="space-y-2">
                          {msg.parsedResponse.summary && (
                            <p className="font-sans text-sm font-semibold">{msg.parsedResponse.summary}</p>
                          )}
                          {msg.parsedResponse.details && (
                            <div className="font-sans text-sm">{renderMarkdown(msg.parsedResponse.details)}</div>
                          )}
                          {msg.parsedResponse.action_items.length > 0 && (
                            <div className="mt-2">
                              <p className="font-sans text-xs font-semibold text-muted-foreground mb-1">Action Items:</p>
                              <ul className="space-y-0.5">
                                {msg.parsedResponse.action_items.map((item, idx) => (
                                  <li key={idx} className="flex items-start gap-1.5 font-sans text-xs">
                                    <FiCheck className="h-3 w-3 mt-0.5 shrink-0 text-primary" />
                                    <span>{item}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {msg.parsedResponse.alerts.length > 0 && (
                            <div className="mt-2 p-2 rounded-lg bg-red-100/80 border border-red-200">
                              <ul className="space-y-0.5">
                                {msg.parsedResponse.alerts.map((alert, idx) => (
                                  <li key={idx} className="flex items-start gap-1.5 font-sans text-xs text-red-800">
                                    <FiAlertCircle className="h-3 w-3 mt-0.5 shrink-0 text-red-600" />
                                    <span>{alert}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="font-sans text-sm">{renderMarkdown(msg.content)}</div>
                      )}
                      <p className="text-[9px] mt-1 opacity-60 font-sans">{format(parseISO(msg.timestamp), 'h:mm a')}</p>
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-secondary rounded-xl px-4 py-3">
                      <div className="flex items-center gap-2">
                        <FiLoader className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                        <span className="font-sans text-xs text-muted-foreground">Analyzing...</span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
            </ScrollArea>

            {/* Quick queries */}
            <div className="px-3 py-2 border-t border-border/40">
              <div className="flex gap-1.5 flex-wrap">
                {quickQueries.map(q => (
                  <button
                    key={q}
                    onClick={() => sendChatMessage(q)}
                    disabled={chatLoading}
                    className="px-2 py-1 text-[10px] font-sans rounded-full border border-border/60 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors disabled:opacity-50"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            {/* Chat input */}
            <div className="p-3 border-t border-border/40">
              <form
                onSubmit={e => { e.preventDefault(); sendChatMessage(chatInput) }}
                className="flex gap-2"
              >
                <Input
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  placeholder="Ask a question..."
                  className="flex-1 font-sans text-sm h-9"
                  disabled={chatLoading}
                />
                <Button type="submit" size="sm" disabled={chatLoading || !chatInput.trim()} className="h-9 px-3">
                  <FiSend className="h-3.5 w-3.5" />
                </Button>
              </form>
            </div>
          </div>
        )}

        {/* Chat FAB when closed */}
        {!chatOpen && (
          <button
            onClick={() => setChatOpen(true)}
            className="fixed bottom-4 right-4 z-50 h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-shadow flex items-center justify-center"
          >
            <FiMessageSquare className="h-5 w-5" />
          </button>
        )}

        {/* ====== DIALOGS ====== */}

        {/* Add Client Dialog */}
        <Dialog open={addClientOpen} onOpenChange={setAddClientOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-serif">Add New Client</DialogTitle>
              <DialogDescription className="font-sans text-sm">Enter client information below.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-sans text-muted-foreground">Name</label>
                <Input value={clientForm.name || ''} onChange={e => setClientForm(prev => ({ ...prev, name: e.target.value }))} placeholder="Client name" className="font-sans text-sm mt-1" />
              </div>
              <div>
                <label className="text-xs font-sans text-muted-foreground">Company</label>
                <Input value={clientForm.company || ''} onChange={e => setClientForm(prev => ({ ...prev, company: e.target.value }))} placeholder="Company name" className="font-sans text-sm mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-sans text-muted-foreground">Email</label>
                  <Input value={clientForm.email || ''} onChange={e => setClientForm(prev => ({ ...prev, email: e.target.value }))} placeholder="Email" className="font-sans text-sm mt-1" />
                </div>
                <div>
                  <label className="text-xs font-sans text-muted-foreground">Phone</label>
                  <Input value={clientForm.phone || ''} onChange={e => setClientForm(prev => ({ ...prev, phone: e.target.value }))} placeholder="Phone" className="font-sans text-sm mt-1" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-sans text-muted-foreground">Industry</label>
                  <Input value={clientForm.industry || ''} onChange={e => setClientForm(prev => ({ ...prev, industry: e.target.value }))} placeholder="Industry" className="font-sans text-sm mt-1" />
                </div>
                <div>
                  <label className="text-xs font-sans text-muted-foreground">Status</label>
                  <Select value={clientForm.status || 'active'} onValueChange={val => setClientForm(prev => ({ ...prev, status: val as 'active' | 'inactive' }))}>
                    <SelectTrigger className="font-sans text-sm mt-1 h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active" className="font-sans text-sm">Active</SelectItem>
                      <SelectItem value="inactive" className="font-sans text-sm">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label className="text-xs font-sans text-muted-foreground">Notes</label>
                <Textarea value={clientForm.notes || ''} onChange={e => setClientForm(prev => ({ ...prev, notes: e.target.value }))} placeholder="Notes..." className="font-sans text-sm mt-1 min-h-[60px]" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddClientOpen(false)} className="font-sans text-sm">Cancel</Button>
              <Button onClick={addClient} className="font-sans text-sm">Add Client</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Client Dialog */}
        <Dialog open={editClientOpen} onOpenChange={setEditClientOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-serif">Edit Client</DialogTitle>
              <DialogDescription className="font-sans text-sm">Update client information.</DialogDescription>
            </DialogHeader>
            {editingClient && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-sans text-muted-foreground">Name</label>
                  <Input value={editingClient.name} onChange={e => setEditingClient(prev => prev ? { ...prev, name: e.target.value } : prev)} className="font-sans text-sm mt-1" />
                </div>
                <div>
                  <label className="text-xs font-sans text-muted-foreground">Company</label>
                  <Input value={editingClient.company} onChange={e => setEditingClient(prev => prev ? { ...prev, company: e.target.value } : prev)} className="font-sans text-sm mt-1" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-sans text-muted-foreground">Email</label>
                    <Input value={editingClient.email} onChange={e => setEditingClient(prev => prev ? { ...prev, email: e.target.value } : prev)} className="font-sans text-sm mt-1" />
                  </div>
                  <div>
                    <label className="text-xs font-sans text-muted-foreground">Phone</label>
                    <Input value={editingClient.phone} onChange={e => setEditingClient(prev => prev ? { ...prev, phone: e.target.value } : prev)} className="font-sans text-sm mt-1" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-sans text-muted-foreground">Industry</label>
                    <Input value={editingClient.industry} onChange={e => setEditingClient(prev => prev ? { ...prev, industry: e.target.value } : prev)} className="font-sans text-sm mt-1" />
                  </div>
                  <div>
                    <label className="text-xs font-sans text-muted-foreground">Status</label>
                    <Select value={editingClient.status} onValueChange={val => setEditingClient(prev => prev ? { ...prev, status: val as 'active' | 'inactive' } : prev)}>
                      <SelectTrigger className="font-sans text-sm mt-1 h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active" className="font-sans text-sm">Active</SelectItem>
                        <SelectItem value="inactive" className="font-sans text-sm">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-sans text-muted-foreground">Notes</label>
                  <Textarea value={editingClient.notes} onChange={e => setEditingClient(prev => prev ? { ...prev, notes: e.target.value } : prev)} className="font-sans text-sm mt-1 min-h-[60px]" />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditClientOpen(false)} className="font-sans text-sm">Cancel</Button>
              <Button onClick={updateClient} className="font-sans text-sm">Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Deadline Dialog */}
        <Dialog open={addDeadlineOpen} onOpenChange={setAddDeadlineOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-serif">Add New Deadline</DialogTitle>
              <DialogDescription className="font-sans text-sm">Create a new deadline for a client.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-sans text-muted-foreground">Title</label>
                <Input value={deadlineForm.title || ''} onChange={e => setDeadlineForm(prev => ({ ...prev, title: e.target.value }))} placeholder="Deadline title" className="font-sans text-sm mt-1" />
              </div>
              <div>
                <label className="text-xs font-sans text-muted-foreground">Description</label>
                <Textarea value={deadlineForm.description || ''} onChange={e => setDeadlineForm(prev => ({ ...prev, description: e.target.value }))} placeholder="Description..." className="font-sans text-sm mt-1 min-h-[60px]" />
              </div>
              <div>
                <label className="text-xs font-sans text-muted-foreground">Client</label>
                <Select value={deadlineForClientId || deadlineForm.clientId || ''} onValueChange={val => { setDeadlineForm(prev => ({ ...prev, clientId: val })); setDeadlineForClientId(null) }}>
                  <SelectTrigger className="font-sans text-sm mt-1 h-9">
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map(c => (
                      <SelectItem key={c.id} value={c.id} className="font-sans text-sm">{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-sans text-muted-foreground">Due Date</label>
                  <Input type="date" value={deadlineForm.dueDate || ''} onChange={e => setDeadlineForm(prev => ({ ...prev, dueDate: e.target.value }))} className="font-sans text-sm mt-1" />
                </div>
                <div>
                  <label className="text-xs font-sans text-muted-foreground">Priority</label>
                  <Select value={deadlineForm.priority || 'medium'} onValueChange={val => setDeadlineForm(prev => ({ ...prev, priority: val as 'high' | 'medium' | 'low' }))}>
                    <SelectTrigger className="font-sans text-sm mt-1 h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high" className="font-sans text-sm">High</SelectItem>
                      <SelectItem value="medium" className="font-sans text-sm">Medium</SelectItem>
                      <SelectItem value="low" className="font-sans text-sm">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-sans text-muted-foreground">Status</label>
                  <Select value={deadlineForm.status || 'todo'} onValueChange={val => setDeadlineForm(prev => ({ ...prev, status: val as 'todo' | 'in_progress' | 'complete' }))}>
                    <SelectTrigger className="font-sans text-sm mt-1 h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todo" className="font-sans text-sm">To Do</SelectItem>
                      <SelectItem value="in_progress" className="font-sans text-sm">In Progress</SelectItem>
                      <SelectItem value="complete" className="font-sans text-sm">Complete</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddDeadlineOpen(false)} className="font-sans text-sm">Cancel</Button>
              <Button onClick={addDeadline} className="font-sans text-sm">Add Deadline</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Deadline Dialog */}
        <Dialog open={editDeadlineOpen} onOpenChange={setEditDeadlineOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-serif">Edit Deadline</DialogTitle>
              <DialogDescription className="font-sans text-sm">Update deadline information.</DialogDescription>
            </DialogHeader>
            {editingDeadline && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-sans text-muted-foreground">Title</label>
                  <Input value={editingDeadline.title} onChange={e => setEditingDeadline(prev => prev ? { ...prev, title: e.target.value } : prev)} className="font-sans text-sm mt-1" />
                </div>
                <div>
                  <label className="text-xs font-sans text-muted-foreground">Description</label>
                  <Textarea value={editingDeadline.description} onChange={e => setEditingDeadline(prev => prev ? { ...prev, description: e.target.value } : prev)} className="font-sans text-sm mt-1 min-h-[60px]" />
                </div>
                <div>
                  <label className="text-xs font-sans text-muted-foreground">Client</label>
                  <Select value={editingDeadline.clientId} onValueChange={val => setEditingDeadline(prev => prev ? { ...prev, clientId: val } : prev)}>
                    <SelectTrigger className="font-sans text-sm mt-1 h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map(c => (
                        <SelectItem key={c.id} value={c.id} className="font-sans text-sm">{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-sans text-muted-foreground">Due Date</label>
                    <Input type="date" value={editingDeadline.dueDate} onChange={e => setEditingDeadline(prev => prev ? { ...prev, dueDate: e.target.value } : prev)} className="font-sans text-sm mt-1" />
                  </div>
                  <div>
                    <label className="text-xs font-sans text-muted-foreground">Priority</label>
                    <Select value={editingDeadline.priority} onValueChange={val => setEditingDeadline(prev => prev ? { ...prev, priority: val as 'high' | 'medium' | 'low' } : prev)}>
                      <SelectTrigger className="font-sans text-sm mt-1 h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="high" className="font-sans text-sm">High</SelectItem>
                        <SelectItem value="medium" className="font-sans text-sm">Medium</SelectItem>
                        <SelectItem value="low" className="font-sans text-sm">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-sans text-muted-foreground">Status</label>
                    <Select value={editingDeadline.status} onValueChange={val => setEditingDeadline(prev => prev ? { ...prev, status: val as 'todo' | 'in_progress' | 'complete' } : prev)}>
                      <SelectTrigger className="font-sans text-sm mt-1 h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todo" className="font-sans text-sm">To Do</SelectItem>
                        <SelectItem value="in_progress" className="font-sans text-sm">In Progress</SelectItem>
                        <SelectItem value="complete" className="font-sans text-sm">Complete</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDeadlineOpen(false)} className="font-sans text-sm">Cancel</Button>
              <Button onClick={updateDeadline} className="font-sans text-sm">Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  )
}
