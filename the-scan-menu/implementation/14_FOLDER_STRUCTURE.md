# Folder Structure

The project is organized as an npm workspace monorepo.

```
/ (Root)
├── package.json          # Workspace definition and root scripts
├── AGENTS.md             # Persistent development rules and AI context
├── README.md             # Project overview
│
├── client/               # Vite + React Frontend Application
│   ├── package.json
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── src/
│       ├── App.tsx       # Root React component
│       ├── main.tsx      # Entry point
│       ├── index.css     # Global styles & Tailwind directives
│       ├── components/   # Reusable UI elements (Layouts, Buttons, Modals)
│       ├── hooks/        # Custom React hooks (useAuth, useSocket)
│       ├── lib/          # Third-party configurations (API client)
│       ├── pages/        # Route components (ManagerOrders, PublicTable, etc.)
│       ├── routes/       # Route definitions and Protections (ProtectedRoute)
│       ├── services/     # API call wrappers
│       ├── store/        # Zustand state stores (useCartStore)
│       └── types/        # TypeScript interfaces
│
├── server/               # Node.js + Express Backend Application
│   ├── package.json
│   ├── src/
│   │   ├── index.ts      # Express server initialization
│   │   ├── controllers/  # Request handlers (No business logic)
│   │   ├── integrations/ # External adapters (POS, Payments)
│   │   ├── middleware/   # Express middleware (Auth, Rate Limiting)
│   │   ├── models/       # Mongoose schemas (Order, Restaurant, User, etc.)
│   │   ├── repositories/ # Data access abstraction (if used)
│   │   ├── routes/       # API endpoint definitions
│   │   ├── services/     # Business logic orchestration
│   │   ├── sockets/      # WebSocket event handlers
│   │   ├── utils/        # Helpers (logger, response wrapper, seed scripts)
│   │   └── validators/   # Zod validation schemas
│
├── docs/                 # Initial Architectural Documentation
│   ├── API.md
│   ├── AUTH.md
│   ├── DATABASE.md
│   ├── DEPLOYMENT.md
│   ├── DESIGN_SYSTEM.md
│   ├── INTEGRATIONS.md
│   ├── WEBSOCKETS.md
│   └── WHITE_LABEL.md
│
└── implementation/       # Deep Architectural Audit & Roadmap (This folder)
```
