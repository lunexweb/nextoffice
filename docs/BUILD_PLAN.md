# NextOffice Build Plan - Dashboard Clone

**Goal:** Clone all functionality from the demo (client-harmony-hub-main) into NextOffice, building everything step-by-step with mock data first, then integrating Supabase at the end.

---

## ✅ Phase 1: Foundation (COMPLETED)

### Step 1.1: Project Setup ✅
- [x] Create package.json with all dependencies
- [x] Set up Vite, TypeScript, Tailwind CSS
- [x] Configure path aliases (@/)
- [x] Create .env.example for Supabase credentials

### Step 1.2: Core Infrastructure ✅
- [x] Supabase client initialization
- [x] ThemeContext (light/dark mode)
- [x] AppContext (authentication state)
- [x] Utility functions (cn helper)

### Step 1.3: UI Components ✅
- [x] Button, Input, Card components
- [x] Toast notifications system
- [x] Shared components (Logo, ThemeToggle, NOCard)

### Step 1.4: Public Pages ✅
- [x] Landing Page (hero, features, pricing, form)
- [x] Sign In Page
- [x] Forgot Password Page
- [x] App.tsx with routing

---

## 🚧 Phase 2: Core Dashboard Structure

### Step 2.1: AppLayout Component
**File:** `src/components/nextoffice/AppLayout.tsx`

**Features to clone:**
- Sidebar navigation with menu items
- Top header with user profile and notifications
- Mobile responsive drawer
- Outlet for nested routes
- Active route highlighting

**Dependencies:**
- Navigation icons from lucide-react
- User menu dropdown
- Notification bell with badge

### Step 2.2: Dashboard Overview Page
**File:** `src/pages/DashboardPage.tsx`

**Features to clone:**
- Stats cards (Total Clients, Outstanding Invoices, etc.)
- Overdue alerts section
- Engagement indicators
- Recent activity feed
- Quick action buttons

---

## 📋 Phase 3: Client Management

### Step 3.1: Clients List Page
**File:** `src/pages/ClientsPage.tsx`

**Features to clone:**
- Client table with sorting
- Search and filter functionality
- Reliability score badges
- Quick actions (view, edit, delete)
- Add new client button

### Step 3.2: Client Profile Page
**File:** `src/pages/ClientProfilePage.tsx`

**Features to clone:**
- Client header with details
- Reliability score display
- Invoice history table
- Payment history
- Notes section
- Edit client modal

---

## 📋 Phase 4: Invoice Management

### Step 4.1: Invoices List Page
**File:** `src/pages/InvoicesPage.tsx`

**Features to clone:**
- Invoice table with status badges
- Filter by status (paid, pending, overdue)
- Search functionality
- Create new invoice button
- Bulk actions

### Step 4.2: Invoice View Page
**File:** `src/pages/InvoiceViewPage.tsx`

**Features to clone:**
- Invoice header with details
- Line items table
- Payment status
- Client information
- Send reminder button
- Download/Print options

### Step 4.3: Invoice Responses Page
**File:** `src/pages/InvoiceResponsesPage.tsx`

**Features to clone:**
- Client response timeline
- Commitment details
- Payment plan information
- Extension requests
- Response history

---

## 📋 Phase 5: Commitments & Payments

### Step 5.1: Commitment Dashboard
**File:** `src/pages/CommitmentDashboardPage.tsx`

**Features to clone:**
- Commitment overview stats
- Upcoming commitments calendar
- Commitment status tracking
- Client commitment history
- Filters and search

---

## 📋 Phase 6: Settings & Configuration

### Step 6.1: Settings Hub Page
**File:** `src/pages/SettingsPage.tsx`

**Features to clone:**
- Settings navigation menu
- Quick settings cards
- Profile preview
- Payment settings preview
- Reminder settings preview

### Step 6.2: User Profile Settings
**File:** `src/pages/UserProfilePage.tsx`

**Features to clone:**
- Personal information form
- Business details form
- Logo upload
- Contact information
- Save/Cancel buttons

### Step 6.3: Payment Settings
**File:** `src/pages/PaymentSettingsPage.tsx`

**Features to clone:**
- Banking details form
- Payment terms configuration
- Invoice numbering settings
- Tax/VAT settings
- Currency settings

### Step 6.4: Reminder Settings
**File:** `src/pages/ReminderSettingsPage.tsx`

**Features to clone:**
- Reminder schedule configuration
- Email templates
- Automation rules
- Reminder frequency settings
- Enable/disable toggles

---

## 📋 Phase 7: Communications & Reliability

### Step 7.1: Communications Page
**File:** `src/pages/CommunicationsPage.tsx`

**Features to clone:**
- Email template editor
- SMS template editor
- Template variables
- Preview functionality
- Save templates

### Step 7.2: Reliability Scoring Page
**File:** `src/pages/ReliabilityPage.tsx`

**Features to clone:**
- Reliability score explanation
- Client reliability levels
- Score calculation rules
- Historical trends
- Client categorization

---

## 📋 Phase 8: Client Portal Pages

### Step 8.1: Client Invoice Preview
**File:** `src/pages/ClientPreviewPage.tsx`

**Features to clone:**
- Clean invoice display
- Reliability score badge
- Payment options
- Commitment button
- Mobile-optimized design

### Step 8.2: Client Commitment Page
**File:** `src/pages/ClientCommitmentPage.tsx`

**Features to clone:**
- Pay Now button (prominent)
- Choose Date option
- Payment Plan option
- Extension Request option
- Already Paid option
- Calming design with blue palette

### Step 8.3: Thank You & Status Pages
**Files:** 
- `src/pages/CommitmentThankYouPage.tsx`
- `src/pages/PaymentStatusPage.tsx`

**Features to clone:**
- Success confirmation
- Next steps information
- Contact details
- Return to invoice link

---

## 📋 Phase 9: Data & State Management

### Step 9.1: Mock Data Setup
**File:** `src/data/mockData.ts`

**Create mock data for:**
- Clients (with reliability scores)
- Invoices (various statuses)
- Commitments
- Payments
- Communications
- User profile
- Business settings

### Step 9.2: Enhanced AppContext
**File:** `src/contexts/AppContext.tsx`

**Add state management for:**
- Clients CRUD operations
- Invoices CRUD operations
- Commitments tracking
- Notifications
- Business profile
- Settings

### Step 9.3: Custom Hooks
**Files:** `src/hooks/`

**Create hooks for:**
- `useClients.ts` - Client data management
- `useInvoices.ts` - Invoice data management
- `useCommitments.ts` - Commitment tracking
- `useNotifications.ts` - Notification system

---

## 📋 Phase 10: Additional UI Components

### Step 10.1: Data Display Components
**Files:** `src/components/ui/`

**Create:**
- `table.tsx` - Data table component
- `badge.tsx` - Status badges
- `dialog.tsx` - Modal dialogs
- `dropdown-menu.tsx` - Dropdown menus
- `select.tsx` - Select inputs
- `textarea.tsx` - Text area inputs
- `label.tsx` - Form labels
- `skeleton.tsx` - Loading skeletons

### Step 10.2: Dashboard Components
**Files:** `src/components/nextoffice/`

**Create:**
- `StatCard.tsx` - Dashboard stat cards
- `AlertCard.tsx` - Alert notifications
- `ClientTable.tsx` - Client list table
- `InvoiceTable.tsx` - Invoice list table
- `ReliabilityBadge.tsx` - Reliability score badge

---

## 📋 Phase 11: Routing & Navigation

### Step 11.1: Update App.tsx
**File:** `src/App.tsx`

**Add all routes:**
- Dashboard routes (protected)
- Client routes (protected)
- Invoice routes (protected)
- Settings routes (protected)
- Client portal routes (public)
- Protected route wrapper

### Step 11.2: Navigation Configuration
**File:** `src/config/navigation.ts`

**Define:**
- Main menu items
- Settings submenu
- Route paths
- Icons for each route

---

## 📋 Phase 12: Final Integration

### Step 12.1: Supabase Database Schema
**Create tables:**
- users
- clients
- invoices
- invoice_items
- commitments
- payments
- communications
- settings

### Step 12.2: Supabase Integration
**Update:**
- AppContext to use Supabase queries
- All CRUD operations to use Supabase
- Real-time subscriptions
- File uploads (logos, attachments)

### Step 12.3: Authentication Flow
**Implement:**
- Real Supabase sign-in
- Session management
- Protected routes with real auth
- User profile from database

---

## 🎯 Current Status

**Completed:** Phase 1 (Foundation)
**Next Step:** Phase 2.1 - Create AppLayout Component

---

## 📝 Notes

- Build everything with mock data first
- Test each page thoroughly before moving to next
- Keep design 100% identical to demo
- Add Supabase only at the very end
- Focus on one page at a time
- Ensure mobile responsiveness for all pages

---

## 🚀 Ready to Start

**Next Action:** Create AppLayout component with sidebar navigation and header
**Command to run:** Ready when you are!
