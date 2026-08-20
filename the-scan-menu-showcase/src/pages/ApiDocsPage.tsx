import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Copy,
  Check,
  Code,
  Terminal,
  Key,
  Lock,
  Shield,
  QrCode,
  UtensilsCrossed,
  Receipt,
  Flame,
  Building2,
  ScanLine,
  LayoutGrid,
  Percent,
  Users,
  BellRing,
  CreditCard,
  Cpu,
  BarChart3,
  Code2,
  Globe,
  Sparkles,
  ShieldAlert,
  Webhook,
  Activity,
  Radio,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  FileJson,
  Layers,
  Zap,
  Download,
  Filter,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Server,
  Play,
  RotateCcw,
  Sliders,
  Eye,
  ListFilter,
  Columns,
  Table as TableIcon,
  HelpCircle,
  Hash,
  ChevronUp,
} from 'lucide-react';
import { SEO } from '../components/common/SEO';
import {
  API_CATEGORIES,
  API_ENDPOINTS,
  SOCKET_EVENTS,
  ApiEndpoint,
  ApiCategory,
  SocketEventDoc,
} from '../data/apiDocsData';

// Audience Grouping for fast filtering
const AUDIENCE_GROUPS = [
  { id: 'all', label: 'All Endpoints', icon: Layers, count: API_ENDPOINTS.length },
  { id: 'guest', label: 'Guest & NFC/QR', icon: QrCode, categoryIds: ['public-guest'] },
  { id: 'kitchen-staff', label: 'Kitchen & Floor', icon: Flame, categoryIds: ['orders', 'kds', 'waiter-calls'] },
  { id: 'manager', label: 'Manager Operations', icon: Building2, categoryIds: ['menu', 'tables-qr', 'zones', 'taxes', 'staff', 'payments', 'pos-integration', 'analytics', 'restaurant-profile'] },
  { id: 'developer', label: 'Developer & OpenAPI', icon: Code2, categoryIds: ['developer', 'openapi', 'inbound-webhooks'] },
  { id: 'admin', label: 'Super Admin & SaaS', icon: ShieldAlert, categoryIds: ['admin', 'subscription', 'health'] },
  { id: 'sockets', label: 'WebSockets Bus', icon: Radio, isSocket: true },
];

const CategoryIcon: React.FC<{ name: string; size?: number; className?: string }> = ({
  name,
  size = 16,
  className = '',
}) => {
  switch (name) {
    case 'Key': return <Key size={size} className={className} />;
    case 'QrCode': return <QrCode size={size} className={className} />;
    case 'UtensilsCrossed': return <UtensilsCrossed size={size} className={className} />;
    case 'Receipt': return <Receipt size={size} className={className} />;
    case 'Flame': return <Flame size={size} className={className} />;
    case 'Building2': return <Building2 size={size} className={className} />;
    case 'ScanLine': return <ScanLine size={size} className={className} />;
    case 'LayoutGrid': return <LayoutGrid size={size} className={className} />;
    case 'Percent': return <Percent size={size} className={className} />;
    case 'Users': return <Users size={size} className={className} />;
    case 'BellRing': return <BellRing size={size} className={className} />;
    case 'CreditCard': return <CreditCard size={size} className={className} />;
    case 'Cpu': return <Cpu size={size} className={className} />;
    case 'BarChart3': return <BarChart3 size={size} className={className} />;
    case 'Code2': return <Code2 size={size} className={className} />;
    case 'Globe': return <Globe size={size} className={className} />;
    case 'Sparkles': return <Sparkles size={size} className={className} />;
    case 'ShieldAlert': return <ShieldAlert size={size} className={className} />;
    case 'Webhook': return <Webhook size={size} className={className} />;
    case 'Activity': return <Activity size={size} className={className} />;
    case 'Radio': return <Radio size={size} className={className} />;
    default: return <Code size={size} className={className} />;
  }
};

const MethodBadge: React.FC<{ method: string; size?: 'sm' | 'md' }> = ({ method, size = 'sm' }) => {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs';
  switch (method) {
    case 'GET':
      return (
        <span className={`${sizeClasses} rounded-md font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm shadow-emerald-500/10`}>
          GET
        </span>
      );
    case 'POST':
      return (
        <span className={`${sizeClasses} rounded-md font-mono font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30 shadow-sm shadow-blue-500/10`}>
          POST
        </span>
      );
    case 'PATCH':
      return (
        <span className={`${sizeClasses} rounded-md font-mono font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-sm shadow-amber-500/10`}>
          PATCH
        </span>
      );
    case 'DELETE':
      return (
        <span className={`${sizeClasses} rounded-md font-mono font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30 shadow-sm shadow-rose-500/10`}>
          DELETE
        </span>
      );
    case 'WS':
      return (
        <span className={`${sizeClasses} rounded-md font-mono font-bold bg-purple-500/15 text-purple-400 border border-purple-500/30 animate-pulse`}>
          WS
        </span>
      );
    default:
      return (
        <span className={`${sizeClasses} rounded-md font-mono font-bold bg-zinc-800 text-zinc-300 border border-zinc-700`}>
          {method}
        </span>
      );
  }
};

const AuthBadge: React.FC<{ auth: string }> = ({ auth }) => {
  let color = 'bg-zinc-800/80 text-zinc-400 border-zinc-700';
  let icon = <Lock size={10} />;

  if (auth === 'Public') {
    color = 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40';
    icon = <Globe size={10} />;
  } else if (auth === 'Staff') {
    color = 'bg-cyan-950/40 text-cyan-300 border-cyan-800/40';
    icon = <Users size={10} />;
  } else if (auth === 'Manager') {
    color = 'bg-amber-950/40 text-amber-300 border-amber-800/40';
    icon = <Shield size={10} />;
  } else if (auth === 'Super Admin') {
    color = 'bg-purple-950/40 text-purple-300 border-purple-800/40';
    icon = <ShieldAlert size={10} />;
  } else if (auth === 'API Key') {
    color = 'bg-indigo-950/40 text-indigo-300 border-indigo-800/40';
    icon = <Key size={10} />;
  }

  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-mono flex items-center gap-1 border ${color}`}>
      {icon}
      <span>{auth}</span>
    </span>
  );
};

export const ApiDocsPage: React.FC = () => {
  // Navigation & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAudience, setSelectedAudience] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedMethod, setSelectedMethod] = useState<string>('ALL');
  const [selectedAuth, setSelectedAuth] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'split' | 'accordion' | 'table'>('split');
  const [activeBaseUrl, setActiveBaseUrl] = useState<'production' | 'local'>('production');

  // Interactive Endpoint Focus & Manipulation State
  const [selectedEndpointId, setSelectedEndpointId] = useState<string>(API_ENDPOINTS[0].id);
  const [expandedEndpoints, setExpandedEndpoints] = useState<Record<string, boolean>>({
    [API_ENDPOINTS[0].id]: true,
  });

  // Playground / Sandbox Interactive State for selected endpoint
  const [customParams, setCustomParams] = useState<Record<string, string>>({
    tableToken: 'tbl_a89f92d40',
    restaurantId: '65cb01f893e1a02b1f812999',
    orderId: '65cb040093e1a02b1f815001',
    sessionId: '65cb027a93e1a02b1f813500',
    tableId: '65cb024b93e1a02b1f813001',
    categoryId: '65cb031193e1a02b1f814001',
    itemId: '65cb061293e1a02b1f817001',
    staffId: '65cb085093e1a02b1f819500',
    callId: '65cb04ee93e1a02b1f815888',
    webhookId: 'whk_65cb095033',
    keyId: 'key_65cb090012',
    taxId: '65cb080093e1a02b1f819001',
    zoneId: '65cb024b93e1a02b1f813002',
    restaurantSlug: 'bistro-luxe',
    id: '65cb01f893e1a02b1f812999',
    itemIndex: '0',
  });

  const [customBodyText, setCustomBodyText] = useState<string>('');
  const [activeSnippetTab, setActiveSnippetTab] = useState<'curl' | 'js' | 'python'>('curl');
  const [activeResponseTab, setActiveResponseTab] = useState<number>(0);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulatedResponse, setSimulatedResponse] = useState<any>(null);
  const [simulatedTime, setSimulatedTime] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // WebSockets Playground state
  const [selectedSocketEvent, setSelectedSocketEvent] = useState<SocketEventDoc>(SOCKET_EVENTS[0]);
  const [customSocketPayload, setCustomSocketPayload] = useState<string>(
    JSON.stringify(SOCKET_EVENTS[0].payload, null, 2)
  );
  const [socketBroadcastLog, setSocketBroadcastLog] = useState<Array<{ timestamp: string; event: string; payload: any }>>([]);

  const baseUrls = {
    production: 'https://api.thescanmenu.com',
    local: 'http://localhost:5000',
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Selected Endpoint Object
  const currentEndpoint = useMemo(() => {
    return API_ENDPOINTS.find((ep) => ep.id === selectedEndpointId) || API_ENDPOINTS[0];
  }, [selectedEndpointId]);

  // Sync request body when selected endpoint changes
  useEffect(() => {
    if (currentEndpoint.requestBody) {
      setCustomBodyText(JSON.stringify(currentEndpoint.requestBody.sample, null, 2));
    } else {
      setCustomBodyText('');
    }
    setSimulatedResponse(null);
    setSimulatedTime(null);
    setActiveResponseTab(0);
  }, [currentEndpoint]);

  // Sync socket event payload
  useEffect(() => {
    setCustomSocketPayload(JSON.stringify(selectedSocketEvent.payload, null, 2));
  }, [selectedSocketEvent]);

  // Dynamic path resolution with custom parameters
  const resolvedPath = useMemo(() => {
    let p = currentEndpoint.path;
    Object.entries(customParams).forEach(([paramKey, paramVal]) => {
      p = p.replace(`:${paramKey}`, paramVal || `:${paramKey}`);
    });
    return p;
  }, [currentEndpoint.path, customParams]);

  // Dynamic Full URL
  const resolvedFullUrl = useMemo(() => {
    return `${baseUrls[activeBaseUrl]}${resolvedPath}`;
  }, [activeBaseUrl, resolvedPath]);

  // Filtered Endpoints
  const filteredEndpoints = useMemo(() => {
    return API_ENDPOINTS.filter((ep) => {
      // Audience grouping
      if (selectedAudience !== 'all') {
        const group = AUDIENCE_GROUPS.find((g) => g.id === selectedAudience);
        if (group && group.categoryIds && !group.categoryIds.includes(ep.category)) {
          return false;
        }
      }

      // Category filter
      if (selectedCategory !== 'all' && ep.category !== selectedCategory) {
        return false;
      }
      // Method filter
      if (selectedMethod !== 'ALL' && ep.method !== selectedMethod) {
        return false;
      }
      // Auth filter
      if (selectedAuth !== 'ALL' && ep.auth !== selectedAuth) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = ep.title.toLowerCase().includes(q);
        const matchesPath = ep.path.toLowerCase().includes(q);
        const matchesDesc = ep.description.toLowerCase().includes(q);
        const matchesTags = ep.tags.some((tag) => tag.toLowerCase().includes(q));
        const matchesMethod = ep.method.toLowerCase().includes(q);
        const matchesFeature = ep.featureFlag?.toLowerCase().includes(q);
        return matchesTitle || matchesPath || matchesDesc || matchesTags || matchesMethod || Boolean(matchesFeature);
      }
      return true;
    });
  }, [searchQuery, selectedAudience, selectedCategory, selectedMethod, selectedAuth]);

  // Generate dynamic customized snippet for currentEndpoint
  const dynamicSnippet = useMemo(() => {
    let bodyObj = null;
    try {
      if (customBodyText.trim()) {
        bodyObj = JSON.parse(customBodyText);
      }
    } catch (e) {
      // fallback
    }

    if (activeSnippetTab === 'curl') {
      let cmd = `curl -X ${currentEndpoint.method} "${resolvedFullUrl}"`;
      if (currentEndpoint.auth === 'Staff' || currentEndpoint.auth === 'Manager' || currentEndpoint.auth === 'Super Admin') {
        cmd += ` \\\n  -H "Authorization: Bearer <YOUR_ACCESS_TOKEN>"`;
      } else if (currentEndpoint.auth === 'API Key') {
        cmd += ` \\\n  -H "X-API-Key: <YOUR_API_KEY>"`;
      }
      if (bodyObj) {
        cmd += ` \\\n  -H "Content-Type: application/json" \\\n  -d '${JSON.stringify(bodyObj, null, 2)}'`;
      }
      return cmd;
    }

    if (activeSnippetTab === 'js') {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (currentEndpoint.auth === 'Staff' || currentEndpoint.auth === 'Manager' || currentEndpoint.auth === 'Super Admin') {
        headers['Authorization'] = 'Bearer <YOUR_ACCESS_TOKEN>';
      } else if (currentEndpoint.auth === 'API Key') {
        headers['X-API-Key'] = '<YOUR_API_KEY>';
      }

      return `const response = await fetch("${resolvedFullUrl}", {
  method: "${currentEndpoint.method}",
  headers: ${JSON.stringify(headers, null, 4)}${
        bodyObj ? `,\n  body: JSON.stringify(${JSON.stringify(bodyObj, null, 4)})` : ''
      }
});

const data = await response.json();
console.log(data);`;
    }

    if (activeSnippetTab === 'python') {
      return `import requests

url = "${resolvedFullUrl}"
headers = {
    "Content-Type": "application/json",${
      currentEndpoint.auth === 'Staff' || currentEndpoint.auth === 'Manager' || currentEndpoint.auth === 'Super Admin'
        ? '\n    "Authorization": "Bearer <YOUR_ACCESS_TOKEN>",'
        : currentEndpoint.auth === 'API Key'
        ? '\n    "X-API-Key": "<YOUR_API_KEY>",'
        : ''
    }
}
${
  bodyObj
    ? `payload = ${JSON.stringify(bodyObj, null, 4)}\n\nresponse = requests.${currentEndpoint.method.toLowerCase()}(url, json=payload, headers=headers)`
    : `response = requests.${currentEndpoint.method.toLowerCase()}(url, headers=headers)`
}

print("Status:", response.status_code)
print("Response:", response.json())`;
    }

    return '';
  }, [activeSnippetTab, currentEndpoint, resolvedFullUrl, customBodyText]);

  // Simulate API Call execution in Sandbox
  const handleExecuteSandbox = () => {
    setIsSimulating(true);
    setSimulatedResponse(null);

    setTimeout(() => {
      setIsSimulating(false);
      const chosenResponse = currentEndpoint.responses[activeResponseTab] || currentEndpoint.responses[0];
      setSimulatedResponse(chosenResponse);
      setSimulatedTime(Math.floor(Math.random() * 25) + 22); // realistic ~22-47ms
    }, 450);
  };

  // Simulate Socket Broadcast
  const handleSimulateSocket = () => {
    try {
      const payloadObj = JSON.parse(customSocketPayload);
      const entry = {
        timestamp: new Date().toLocaleTimeString(),
        event: selectedSocketEvent.name,
        payload: payloadObj,
      };
      setSocketBroadcastLog((prev) => [entry, ...prev.slice(0, 7)]);
    } catch (e) {
      alert('Invalid JSON payload for socket simulation.');
    }
  };

  // Download Spec
  const downloadApiSpec = () => {
    const spec = {
      info: {
        title: 'The Scan Menu API Specification',
        version: '1.0.0',
        description: 'Comprehensive REST and Real-Time WebSocket API reference for The Scan Menu contactless restaurant platform by Pixora Studios.',
        baseUrl: baseUrls.production,
      },
      categories: API_CATEGORIES,
      endpoints: API_ENDPOINTS,
      socketEvents: SOCKET_EVENTS,
    };
    const blob = new Blob([JSON.stringify(spec, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'the-scan-menu-api-spec.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-[#f4f4f5] pt-24 pb-20 px-3 md:px-6 selection:bg-amber-500/30 selection:text-amber-200">
      <SEO
        title="Interactive API Docs & Live Sandbox | The Scan Menu"
        description="Explore, test, and manipulate all REST endpoints, parameters, responses, and real-time Socket.IO channels for The Scan Menu."
        canonicalPath="/docs"
      />

      {/* Top Banner / Hero */}
      <div className="max-w-[1440px] mx-auto mb-6">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-6 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-amber-400/10 text-amber-300 border border-amber-400/20 flex items-center gap-1.5 shadow-sm">
                <Sparkles size={12} className="text-amber-400 animate-pulse" />
                <span>INTERACTIVE API CONSOLE v1.0.0</span>
              </span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span>0.38s Edge Latency</span>
              </span>
            </div>
            <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight text-white flex items-center gap-3">
              <span>The Scan Menu</span>
              <span className="amber-text-gradient">API Documentation</span>
            </h1>
            <p className="text-zinc-400 text-xs md:text-sm mt-1 max-w-3xl">
              Inspect parameters, manipulate payloads, generate dynamic client code, and simulate live server responses in real time.
            </p>
          </div>

          {/* Quick Header Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* View Mode Switcher */}
            <div className="bg-zinc-950 p-1 rounded-xl border border-white/10 flex items-center shadow-inner">
              <button
                onClick={() => setViewMode('split')}
                title="Split Playground View (Recommended)"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  viewMode === 'split'
                    ? 'bg-amber-400 text-black font-bold shadow-md shadow-amber-500/20'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Columns size={13} />
                <span className="hidden sm:inline">Playground Split</span>
              </button>
              <button
                onClick={() => setViewMode('accordion')}
                title="Accordion Card View"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  viewMode === 'accordion'
                    ? 'bg-amber-400 text-black font-bold shadow-md shadow-amber-500/20'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <ListFilter size={13} />
                <span className="hidden sm:inline">Card Stream</span>
              </button>
              <button
                onClick={() => setViewMode('table')}
                title="Quick Reference Table"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  viewMode === 'table'
                    ? 'bg-amber-400 text-black font-bold shadow-md shadow-amber-500/20'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <TableIcon size={13} />
                <span className="hidden sm:inline">Cheat Sheet</span>
              </button>
            </div>

            {/* Base URL Selector */}
            <div className="bg-zinc-950 p-1 rounded-xl border border-white/10 flex items-center">
              <button
                onClick={() => setActiveBaseUrl('production')}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-mono transition-all ${
                  activeBaseUrl === 'production'
                    ? 'bg-zinc-800 text-white font-bold border border-white/10'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Live Prod
              </button>
              <button
                onClick={() => setActiveBaseUrl('local')}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-mono transition-all ${
                  activeBaseUrl === 'local'
                    ? 'bg-zinc-800 text-white font-bold border border-white/10'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Local :5000
              </button>
            </div>

            {/* Spec Export Button */}
            <button
              onClick={downloadApiSpec}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-zinc-200 hover:text-white transition-all shadow-md"
            >
              <Download size={13} className="text-amber-400" />
              <span className="hidden sm:inline">Export Spec</span>
            </button>
          </div>
        </div>

        {/* Audience Group Navigation Chips */}
        <div className="flex items-center gap-2 overflow-x-auto py-2 scrollbar-none border-b border-white/5">
          {AUDIENCE_GROUPS.map((grp) => {
            const Icon = grp.icon;
            const isSelected = selectedAudience === grp.id;
            return (
              <button
                key={grp.id}
                onClick={() => {
                  setSelectedAudience(grp.id);
                  setSelectedCategory('all');
                }}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs whitespace-nowrap transition-all border ${
                  isSelected
                    ? 'bg-amber-400/15 text-amber-300 border-amber-400/40 font-bold shadow-sm shadow-amber-500/10'
                    : 'bg-zinc-950/60 text-zinc-400 hover:text-white hover:bg-zinc-900 border-white/5'
                }`}
              >
                <Icon size={14} className={isSelected ? 'text-amber-400' : 'text-zinc-500'} />
                <span>{grp.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-[1440px] mx-auto">
        {/* If WebSockets selected in Audience tabs */}
        {selectedAudience === 'sockets' ? (
          <div className="space-y-8 animate-in fade-in duration-200">
            {/* Socket Header */}
            <div className="glass-card rounded-2xl p-6 border border-purple-500/30 bg-purple-950/10 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center border border-purple-500/30">
                  <Radio size={20} className="animate-pulse" />
                </div>
                <div>
                  <h2 className="text-lg md:text-xl font-bold text-white">
                    Real-Time WebSockets Event Bus
                  </h2>
                  <p className="text-xs text-zinc-400">
                    Full bidirectional communication for table alerts, chef line tickets, and billing updates.
                  </p>
                </div>
              </div>
            </div>

            {/* Socket Interactive Playground */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Event Selector List (Left 4 cols) */}
              <div className="lg:col-span-4 space-y-2">
                <div className="text-xs font-mono font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                  Socket Channels ({SOCKET_EVENTS.length})
                </div>
                <div className="space-y-1.5 max-h-[600px] overflow-y-auto pr-1">
                  {SOCKET_EVENTS.map((evt) => {
                    const isSelected = selectedSocketEvent.name === evt.name;
                    return (
                      <button
                        key={evt.name}
                        onClick={() => setSelectedSocketEvent(evt)}
                        className={`w-full text-left p-3 rounded-xl border text-xs transition-all ${
                          isSelected
                            ? 'bg-purple-950/30 border-purple-500/40 text-white shadow-lg'
                            : 'bg-zinc-950/60 border-white/5 text-zinc-400 hover:text-white hover:bg-zinc-900'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-mono font-bold text-purple-300">{evt.name}</span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-mono ${
                              evt.direction === 'Server to Client'
                                ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                                : 'bg-blue-500/10 text-blue-300 border border-blue-500/20'
                            }`}
                          >
                            {evt.direction}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-400 line-clamp-2">{evt.description}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Event Manipulator & Live Simulator (Right 8 cols) */}
              <div className="lg:col-span-8 space-y-6">
                <div className="glass-card rounded-2xl p-5 border border-white/10 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/5">
                    <div>
                      <span className="text-xs font-mono font-bold text-purple-400 uppercase">
                        Active Event: {selectedSocketEvent.name}
                      </span>
                      <div className="text-xs text-zinc-400 mt-0.5">
                        Target Room: <strong className="font-mono text-amber-300">{selectedSocketEvent.room || 'Global'}</strong>
                      </div>
                    </div>
                    <button
                      onClick={handleSimulateSocket}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-purple-500 hover:bg-purple-400 text-white transition-all shadow-md shadow-purple-500/20"
                    >
                      <Play size={13} />
                      <span>Simulate Event Emit</span>
                    </button>
                  </div>

                  {/* Editable Payload */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-zinc-400 font-mono">
                      <span>Edit Event Payload JSON:</span>
                      <button
                        onClick={() =>
                          setCustomSocketPayload(JSON.stringify(selectedSocketEvent.payload, null, 2))
                        }
                        className="text-zinc-500 hover:text-zinc-300 flex items-center gap-1 text-[11px]"
                      >
                        <RotateCcw size={11} />
                        <span>Reset Default</span>
                      </button>
                    </div>
                    <textarea
                      value={customSocketPayload}
                      onChange={(e) => setCustomSocketPayload(e.target.value)}
                      rows={8}
                      className="w-full bg-zinc-950 border border-white/10 rounded-xl p-3 text-xs font-mono text-zinc-200 focus:outline-none focus:border-purple-400/50 focus:ring-1 focus:ring-purple-400/30"
                    />
                  </div>

                  {/* Broadcast Simulation Log */}
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center justify-between text-xs text-zinc-400 font-mono">
                      <span className="font-semibold text-zinc-300">Live Client Event Stream:</span>
                      {socketBroadcastLog.length > 0 && (
                        <button
                          onClick={() => setSocketBroadcastLog([])}
                          className="text-zinc-500 hover:text-zinc-300 text-[11px]"
                        >
                          Clear Stream
                        </button>
                      )}
                    </div>

                    {socketBroadcastLog.length === 0 ? (
                      <div className="p-4 rounded-xl bg-zinc-950/60 border border-dashed border-white/10 text-center text-xs text-zinc-500">
                        Click &quot;Simulate Event Emit&quot; above to watch real-time socket delivery.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {socketBroadcastLog.map((log, i) => (
                          <div
                            key={i}
                            className="p-3 rounded-xl bg-zinc-950 border border-purple-500/20 text-xs font-mono space-y-1.5 animate-in slide-in-from-top-2"
                          >
                            <div className="flex items-center justify-between text-[11px] text-zinc-400">
                              <span className="text-purple-300 font-bold">⚡ received: {log.event}</span>
                              <span>{log.timestamp}</span>
                            </div>
                            <pre className="text-[11px] text-zinc-300 overflow-x-auto">
                              {JSON.stringify(log.payload, null, 2)}
                            </pre>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* REST API Playground & Documentation */
          <div className="space-y-6">
            {/* Filter Toolbar */}
            <div className="bg-zinc-950/80 p-4 rounded-2xl border border-white/5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-inner">
              {/* Search input */}
              <div className="relative flex-grow max-w-lg">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search endpoint by path, name, parameter, tag (e.g. 'order', 'kds', ':tableToken')..."
                  className="w-full bg-zinc-900/90 border border-white/10 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400/50 focus:ring-1 focus:ring-amber-400/30 font-mono"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500 hover:text-white"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Method Filters */}
              <div className="flex items-center gap-1 overflow-x-auto">
                <span className="text-[11px] text-zinc-500 font-mono mr-1 hidden sm:inline">Method:</span>
                {['ALL', 'GET', 'POST', 'PATCH', 'DELETE'].map((m) => (
                  <button
                    key={m}
                    onClick={() => setSelectedMethod(m)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                      selectedMethod === m
                        ? 'bg-amber-400 text-black shadow-sm'
                        : 'bg-zinc-900 text-zinc-400 hover:text-white border border-white/5'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>

              {/* Auth Filters */}
              <div className="flex items-center gap-1 overflow-x-auto">
                <span className="text-[11px] text-zinc-500 font-mono mr-1 hidden sm:inline">Role:</span>
                {['ALL', 'Public', 'Staff', 'Manager', 'Super Admin'].map((r) => (
                  <button
                    key={r}
                    onClick={() => setSelectedAuth(r)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition-all ${
                      selectedAuth === r
                        ? 'bg-zinc-200 text-zinc-950 font-bold'
                        : 'bg-zinc-900 text-zinc-400 hover:text-white border border-white/5'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* View Mode 1: SPLIT PLAYGROUND VIEW (Recommended) */}
            {viewMode === 'split' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left Endpoints Selector (4 cols) */}
                <div className="lg:col-span-4 xl:col-span-4 space-y-2 lg:sticky lg:top-24 max-h-[calc(100vh-8rem)] overflow-y-auto pr-1">
                  <div className="flex items-center justify-between text-xs text-zinc-400 font-mono px-1">
                    <span>MATCHING ROUTES ({filteredEndpoints.length})</span>
                    {filteredEndpoints.length > 0 && (
                      <span className="text-[11px] text-amber-400">Click to Inspect &amp; Test</span>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    {filteredEndpoints.map((ep) => {
                      const isSelected = selectedEndpointId === ep.id;
                      return (
                        <button
                          key={ep.id}
                          onClick={() => setSelectedEndpointId(ep.id)}
                          className={`w-full text-left p-3 rounded-xl border text-xs transition-all flex flex-col gap-1.5 ${
                            isSelected
                              ? 'bg-amber-400/10 border-amber-400/40 text-white shadow-lg shadow-amber-500/5'
                              : 'bg-zinc-950/60 border-white/5 text-zinc-400 hover:text-white hover:bg-zinc-900/80'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 truncate">
                              <MethodBadge method={ep.method} />
                              <span className="font-mono text-xs font-bold text-white truncate">
                                {ep.path}
                              </span>
                            </div>
                            <AuthBadge auth={ep.auth} />
                          </div>
                          <span className="text-[11px] text-zinc-400 truncate">{ep.title}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Right Interactive Manipulator & Sandbox (8 cols) */}
                <div className="lg:col-span-8 xl:col-span-8 space-y-6">
                  {/* Active Endpoint Header Card */}
                  <div className="glass-card rounded-2xl p-6 border border-white/10 space-y-4 shadow-xl">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/5">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <MethodBadge method={currentEndpoint.method} size="md" />
                          <span className="font-mono text-base md:text-lg font-bold text-white">
                            {currentEndpoint.path}
                          </span>
                        </div>
                        <h2 className="text-sm font-semibold text-zinc-300">{currentEndpoint.title}</h2>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        <AuthBadge auth={currentEndpoint.auth} />
                        {currentEndpoint.featureFlag && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/10 text-amber-300 border border-amber-500/20">
                            flag: {currentEndpoint.featureFlag}
                          </span>
                        )}
                        {currentEndpoint.rateLimit && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-800 text-zinc-400 border border-white/5 flex items-center gap-1">
                            <Clock size={10} />
                            <span>{currentEndpoint.rateLimit}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-xs md:text-sm text-zinc-300 leading-relaxed">
                      {currentEndpoint.description}
                    </p>

                    {/* Live Resolved URL Display with 1-Click Copy */}
                    <div className="space-y-1.5">
                      <div className="text-[11px] font-mono text-zinc-400 font-semibold uppercase">
                        Dynamic Resolved Endpoint URL:
                      </div>
                      <div className="flex items-center justify-between bg-zinc-950 px-3 py-2.5 rounded-xl border border-white/10 font-mono text-xs text-amber-300 overflow-x-auto">
                        <span className="truncate mr-2">{resolvedFullUrl}</span>
                        <button
                          onClick={() => copyToClipboard(resolvedFullUrl, 'dyn-url')}
                          className="text-zinc-400 hover:text-amber-300 p-1 flex items-center gap-1 text-[11px] whitespace-nowrap"
                          title="Copy Full URL"
                        >
                          {copiedId === 'dyn-url' ? (
                            <>
                              <Check size={13} className="text-emerald-400" />
                              <span className="text-emerald-400">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy size={13} />
                              <span>Copy URL</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Parameters Customizer / Inputs */}
                    {(currentEndpoint.pathParams || currentEndpoint.queryParams) && (
                      <div className="space-y-3 pt-2">
                        <div className="text-xs font-mono font-semibold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                          <Sliders size={13} />
                          <span>Manipulate URL &amp; Query Parameters</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-zinc-950/60 p-3.5 rounded-xl border border-white/5">
                          {currentEndpoint.pathParams?.map((param) => (
                            <div key={param.name} className="space-y-1">
                              <label className="text-[11px] font-mono text-zinc-400 flex items-center justify-between">
                                <span className="text-amber-300 font-bold">:{param.name}</span>
                                <span className="text-[10px] text-zinc-500">path ({param.type})</span>
                              </label>
                              <input
                                type="text"
                                value={customParams[param.name] ?? ''}
                                onChange={(e) =>
                                  setCustomParams((prev) => ({
                                    ...prev,
                                    [param.name]: e.target.value,
                                  }))
                                }
                                placeholder={`Value for :${param.name}`}
                                className="w-full bg-zinc-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-amber-400/50"
                              />
                            </div>
                          ))}

                          {currentEndpoint.queryParams?.map((param) => (
                            <div key={param.name} className="space-y-1">
                              <label className="text-[11px] font-mono text-zinc-400 flex items-center justify-between">
                                <span className="text-blue-300 font-bold">?{param.name}</span>
                                <span className="text-[10px] text-zinc-500">
                                  {param.required ? 'required' : 'optional'}
                                </span>
                              </label>
                              <input
                                type="text"
                                placeholder={param.description}
                                className="w-full bg-zinc-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-amber-400/50"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Request Body & Code Generation */}
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 pt-2">
                      {/* JSON Request Body Editor */}
                      {currentEndpoint.requestBody && (
                        <div className="space-y-2 flex flex-col justify-between">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                              <FileJson size={13} />
                              <span>Request Body JSON (Editable)</span>
                            </span>
                            <button
                              onClick={() =>
                                setCustomBodyText(
                                  JSON.stringify(currentEndpoint.requestBody?.sample, null, 2)
                                )
                              }
                              className="text-[11px] text-zinc-500 hover:text-amber-300 flex items-center gap-1 font-mono"
                            >
                              <RotateCcw size={11} />
                              <span>Reset</span>
                            </button>
                          </div>
                          <textarea
                            value={customBodyText}
                            onChange={(e) => setCustomBodyText(e.target.value)}
                            rows={10}
                            className="w-full p-3 rounded-xl bg-zinc-950 border border-white/10 text-xs font-mono text-zinc-200 focus:outline-none focus:border-amber-400/50 focus:ring-1 focus:ring-amber-400/30"
                          />
                        </div>
                      )}

                      {/* Dynamic Code Snippets */}
                      <div
                        className={`space-y-2 flex flex-col justify-between ${
                          !currentEndpoint.requestBody ? 'xl:col-span-2' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <Terminal size={13} className="text-amber-400" />
                            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-amber-400">
                              Generated Client Code
                            </span>
                            <div className="flex items-center gap-1 ml-2">
                              {(['curl', 'js', 'python'] as const).map((lang) => (
                                <button
                                  key={lang}
                                  onClick={() => setActiveSnippetTab(lang)}
                                  className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase transition-colors ${
                                    activeSnippetTab === lang
                                      ? 'bg-amber-400 text-black font-bold'
                                      : 'bg-zinc-800 text-zinc-400 hover:text-white'
                                  }`}
                                >
                                  {lang === 'js' ? 'Fetch' : lang}
                                </button>
                              ))}
                            </div>
                          </div>

                          <button
                            onClick={() => copyToClipboard(dynamicSnippet, 'snippet')}
                            className="text-xs text-zinc-400 hover:text-amber-300 flex items-center gap-1 font-mono transition-colors"
                          >
                            {copiedId === 'snippet' ? (
                              <>
                                <Check size={12} className="text-emerald-400" />
                                <span className="text-emerald-400">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy size={12} />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        </div>

                        <pre className="p-3 rounded-xl bg-zinc-950 border border-white/10 text-[11px] font-mono text-zinc-300 overflow-x-auto max-h-72">
                          {dynamicSnippet}
                        </pre>
                      </div>
                    </div>

                    {/* Action Bar: Send Test Request */}
                    <div className="pt-3 border-t border-white/5 flex items-center justify-between flex-wrap gap-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleExecuteSandbox}
                          disabled={isSimulating}
                          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-400 hover:bg-amber-300 text-black transition-all shadow-lg shadow-amber-500/25 disabled:opacity-50 cursor-pointer"
                        >
                          {isSimulating ? (
                            <>
                              <span className="w-3.5 h-3.5 rounded-full border-2 border-black border-t-transparent animate-spin" />
                              <span>Executing Call...</span>
                            </>
                          ) : (
                            <>
                              <Play size={14} className="fill-current" />
                              <span>Send Sandbox Request</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Response status tabs */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-zinc-500 font-mono mr-1">Expected Response:</span>
                        {currentEndpoint.responses.map((resp, idx) => (
                          <button
                            key={resp.status}
                            onClick={() => setActiveResponseTab(idx)}
                            className={`px-2.5 py-1 rounded text-xs font-mono font-bold transition-all ${
                              activeResponseTab === idx
                                ? resp.status < 300
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                : 'bg-zinc-900 text-zinc-500 hover:text-zinc-300'
                            }`}
                          >
                            {resp.status} {resp.status < 300 ? 'OK' : 'Err'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Response Viewer Output */}
                    <div className="space-y-2 pt-2">
                      <div className="flex items-center justify-between text-xs text-zinc-400 border-b border-white/5 pb-2 font-mono">
                        <div className="flex items-center gap-2">
                          <span className="text-zinc-300 font-bold">
                            {simulatedResponse
                              ? `${simulatedResponse.status} ${simulatedResponse.description}`
                              : `${currentEndpoint.responses[activeResponseTab]?.status} ${currentEndpoint.responses[activeResponseTab]?.description}`}
                          </span>
                          {simulatedTime && (
                            <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded text-[10px]">
                              ⚡ {simulatedTime}ms
                            </span>
                          )}
                        </div>

                        <button
                          onClick={() =>
                            copyToClipboard(
                              JSON.stringify(
                                simulatedResponse?.body ||
                                  currentEndpoint.responses[activeResponseTab]?.body,
                                null,
                                2
                              ),
                              'resp-out'
                            )
                          }
                          className="text-zinc-400 hover:text-amber-300 flex items-center gap-1 font-mono transition-colors"
                        >
                          {copiedId === 'resp-out' ? (
                            <>
                              <Check size={12} className="text-emerald-400" />
                              <span className="text-emerald-400">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy size={12} />
                              <span>Copy Response</span>
                            </>
                          )}
                        </button>
                      </div>

                      <pre className="p-4 rounded-xl bg-zinc-950 border border-white/10 text-[11px] font-mono text-zinc-300 overflow-x-auto max-h-80">
                        {JSON.stringify(
                          simulatedResponse?.body ||
                            currentEndpoint.responses[activeResponseTab]?.body,
                          null,
                          2
                        )}
                      </pre>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* View Mode 2: ACCORDION CARD STREAM VIEW */}
            {viewMode === 'accordion' && (
              <div className="space-y-4">
                {filteredEndpoints.map((ep) => {
                  const isExpanded = expandedEndpoints[ep.id] ?? false;
                  return (
                    <div
                      key={ep.id}
                      className={`glass-card rounded-2xl border transition-all ${
                        isExpanded ? 'border-amber-400/30 bg-zinc-900/40' : 'border-white/5 hover:border-white/15'
                      }`}
                    >
                      <div
                        onClick={() =>
                          setExpandedEndpoints((prev) => ({ ...prev, [ep.id]: !prev[ep.id] }))
                        }
                        className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none"
                      >
                        <div className="flex items-center gap-3">
                          <MethodBadge method={ep.method} />
                          <div>
                            <div className="font-mono text-xs md:text-sm font-bold text-white">
                              {ep.path}
                            </div>
                            <div className="text-xs text-zinc-400">{ep.title}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-auto">
                          <AuthBadge auth={ep.auth} />
                          {ep.featureFlag && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/10 text-amber-300 border border-amber-500/20">
                              flag: {ep.featureFlag}
                            </span>
                          )}
                          <div className="text-zinc-500 p-1">
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </div>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="p-4 pt-1 border-t border-white/5 space-y-4 text-xs animate-in fade-in">
                          <p className="text-zinc-300">{ep.description}</p>
                          {ep.requestBody && (
                            <div className="space-y-1">
                              <span className="text-[10px] font-mono text-amber-400 uppercase font-bold">
                                Request Body Sample:
                              </span>
                              <pre className="p-3 rounded-xl bg-zinc-950 text-[11px] font-mono text-zinc-300 overflow-x-auto">
                                {JSON.stringify(ep.requestBody.sample, null, 2)}
                              </pre>
                            </div>
                          )}
                          <div className="space-y-1">
                            <span className="text-[10px] font-mono text-emerald-400 uppercase font-bold">
                              Response Sample ({ep.responses[0].status}):
                            </span>
                            <pre className="p-3 rounded-xl bg-zinc-950 text-[11px] font-mono text-zinc-300 overflow-x-auto">
                              {JSON.stringify(ep.responses[0].body, null, 2)}
                            </pre>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* View Mode 3: CHEAT SHEET TABLE VIEW */}
            {viewMode === 'table' && (
              <div className="glass-card rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/10 bg-zinc-950 text-zinc-400 font-mono text-[11px] uppercase">
                        <th className="py-3 px-4">Method</th>
                        <th className="py-3 px-4">Route Path</th>
                        <th className="py-3 px-4">Action Summary</th>
                        <th className="py-3 px-4">Auth Level</th>
                        <th className="py-3 px-4">Feature Flag</th>
                        <th className="py-3 px-4 text-right">Quick Test</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-mono text-zinc-300">
                      {filteredEndpoints.map((ep) => (
                        <tr
                          key={ep.id}
                          onClick={() => {
                            setSelectedEndpointId(ep.id);
                            setViewMode('split');
                          }}
                          className="hover:bg-white/[0.03] cursor-pointer transition-colors"
                        >
                          <td className="py-3 px-4">
                            <MethodBadge method={ep.method} />
                          </td>
                          <td className="py-3 px-4 font-bold text-amber-300">{ep.path}</td>
                          <td className="py-3 px-4 font-sans text-xs text-zinc-300">{ep.title}</td>
                          <td className="py-3 px-4">
                            <AuthBadge auth={ep.auth} />
                          </td>
                          <td className="py-3 px-4 text-[11px] text-zinc-400">
                            {ep.featureFlag ? `flag: ${ep.featureFlag}` : '-'}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button className="px-2.5 py-1 rounded bg-amber-400 text-black font-bold text-[10px] hover:bg-amber-300">
                              Inspect &rarr;
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ApiDocsPage;
