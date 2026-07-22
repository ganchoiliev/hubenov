/* eslint-disable react-refresh/only-export-components -- router module exports the router + nav configs, not HMR-able components */
import { createBrowserRouter } from 'react-router-dom';
import { lazy, Suspense, type ReactNode } from 'react';
import {
  LayoutDashboard,
  PackagePlus,
  Package,
  Receipt,
  User,
  ScanLine,
  UserSearch,
  Users,
  Truck,
  Settings,
  Boxes,
  Inbox,
  History,
  HelpCircle,
} from 'lucide-react';

import { PublicLayout } from '@/components/layout/PublicLayout';
import { AppLayout, type NavItem } from '@/components/layout/AppLayout';
import { RequireAuth, RequireStaff } from '@/components/layout/guards';
import { Spinner } from '@/components/ui';

/**
 * Routes are code-split (React.lazy) so the public site never downloads the
 * operator/PDF/barcode bundles. Each page is a named export, so we map it to a
 * default for lazy(). Heavy libs (pdf-lib, bwip-js) live only in the operator
 * chunks that use them.
 */
const lazyPage = <K extends string>(factory: () => Promise<Record<K, React.ComponentType>>, key: K) =>
  lazy(() => factory().then((m) => ({ default: m[key] })));

// Public
// HomePage is eager (in the main bundle), not lazy: it's the landing page every
// visitor loads first, so code-splitting it saves nothing on first paint — and
// the lazy fallback→content swap was shifting the footer (desktop CLS 0.33).
import { HomePage } from '@/features/public/HomePage';
const ServicesPage = lazyPage(() => import('@/features/public/ServicesPage'), 'ServicesPage');
const QuotePage = lazyPage(() => import('@/features/public/QuotePage'), 'QuotePage');
const TrackPage = lazyPage(() => import('@/features/public/TrackPage'), 'TrackPage');
const CoveragePage = lazyPage(() => import('@/features/public/CoveragePage'), 'CoveragePage');
const UkOfficesPage = lazyPage(() => import('@/features/public/UkOfficesPage'), 'UkOfficesPage');
const BgOfficePage = lazyPage(() => import('@/features/public/BgOfficePage'), 'BgOfficePage');
const SendFromBulgariaPage = lazyPage(() => import('@/features/public/SendFromBulgariaPage'), 'SendFromBulgariaPage');
const AboutPage = lazyPage(() => import('@/features/public/AboutPage'), 'AboutPage');
const ContactPage = lazyPage(() => import('@/features/public/ContactPage'), 'ContactPage');
const FaqPage = lazyPage(() => import('@/features/public/FaqPage'), 'FaqPage');
const RulesPage = lazyPage(() => import('@/features/public/RulesPage'), 'RulesPage');
const NotFoundPage = lazyPage(() => import('@/features/public/NotFoundPage'), 'NotFoundPage');

// Auth
const LoginPage = lazyPage(() => import('@/features/auth/LoginPage'), 'LoginPage');
const ResetPasswordPage = lazyPage(() => import('@/features/auth/ResetPasswordPage'), 'ResetPasswordPage');

// Portal
const DashboardPage = lazyPage(() => import('@/features/portal/DashboardPage'), 'DashboardPage');
const NewShipmentPage = lazyPage(() => import('@/features/portal/NewShipmentPage'), 'NewShipmentPage');
const IncomingParcelPage = lazyPage(() => import('@/features/portal/IncomingParcelPage'), 'IncomingParcelPage');
const MyShipmentsPage = lazyPage(() => import('@/features/portal/MyShipmentsPage'), 'MyShipmentsPage');
const ShipmentDetailPage = lazyPage(() => import('@/features/portal/ShipmentDetailPage'), 'ShipmentDetailPage');
const InvoicesPage = lazyPage(() => import('@/features/portal/InvoicesPage'), 'InvoicesPage');
const MessagesPage = lazyPage(() => import('@/features/portal/MessagesPage'), 'MessagesPage');
const ProfilePage = lazyPage(() => import('@/features/portal/ProfilePage'), 'ProfilePage');

// Operator
const OperatorHomePage = lazyPage(() => import('@/features/operator/OperatorHomePage'), 'OperatorHomePage');
const OtLookupPage = lazyPage(() => import('@/features/operator/OtLookupPage'), 'OtLookupPage');
const ClientsPage = lazyPage(() => import('@/features/operator/ClientsPage'), 'ClientsPage');
const IntakePage = lazyPage(() => import('@/features/operator/IntakePage'), 'IntakePage');
const ScanStationPage = lazyPage(() => import('@/features/operator/ScanStationPage'), 'ScanStationPage');
const LoadsPage = lazyPage(() => import('@/features/operator/LoadsPage'), 'LoadsPage');
const LoadBuilderPage = lazyPage(() => import('@/features/operator/LoadBuilderPage'), 'LoadBuilderPage');
const RunSheetPage = lazyPage(() => import('@/features/operator/RunSheetPage'), 'RunSheetPage');
const OpShipmentsPage = lazyPage(() => import('@/features/operator/OpShipmentsPage'), 'OpShipmentsPage');
const OpInvoicesPage = lazyPage(() => import('@/features/operator/OpInvoicesPage'), 'OpInvoicesPage');
const OpMessagesPage = lazyPage(() => import('@/features/operator/OpMessagesPage'), 'OpMessagesPage');
const AuditLogPage = lazyPage(() => import('@/features/operator/AuditLogPage'), 'AuditLogPage');
const SettingsPage = lazyPage(() => import('@/features/operator/SettingsPage'), 'SettingsPage');
const HelpPage = lazyPage(() => import('@/features/operator/HelpPage'), 'HelpPage');

function Suspended({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <Spinner className="h-8 w-8" />
        </div>
      }
    >
      {children}
    </Suspense>
  );
}

export const PORTAL_NAV: NavItem[] = [
  { to: '/portal', labelKey: 'portal.dashboard', icon: LayoutDashboard, end: true },
  { to: '/portal/new', labelKey: 'portal.new_shipment', icon: PackagePlus },
  { to: '/portal/incoming', labelKey: 'portal.incoming', icon: Inbox },
  { to: '/portal/shipments', labelKey: 'portal.my_shipments', icon: Package },
  { to: '/portal/invoices', labelKey: 'portal.invoices', icon: Receipt },
  { to: '/portal/profile', labelKey: 'portal.profile', icon: User },
];

export const OPERATOR_NAV: NavItem[] = [
  { to: '/op', labelKey: 'operator.console', icon: LayoutDashboard, end: true },
  { to: '/op/scan', labelKey: 'operator.scan_title', icon: ScanLine },
  { to: '/op/lookup', labelKey: 'operator.lookup_title', icon: UserSearch },
  { to: '/op/clients', labelKey: 'operator.customers', icon: Users },
  { to: '/op/intake', labelKey: 'operator.intake_title', icon: PackagePlus },
  { to: '/op/loads', labelKey: 'operator.loads', icon: Truck },
  { to: '/op/shipments', labelKey: 'operator.shipments', icon: Boxes },
  { to: '/op/invoices', labelKey: 'operator.invoices', icon: Receipt },
  { to: '/op/audit', labelKey: 'operator.audit', icon: History },
  { to: '/op/settings', labelKey: 'operator.settings', icon: Settings },
  { to: '/op/help', labelKey: 'operator.help', icon: HelpCircle },
];

export const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/services', element: <ServicesPage /> },
      { path: '/quote', element: <QuotePage /> },
      { path: '/track', element: <TrackPage /> },
      { path: '/coverage', element: <CoveragePage /> },
      { path: '/uk-offices', element: <UkOfficesPage /> },
      { path: '/bg-office', element: <BgOfficePage /> },
      { path: '/bg-to-uk', element: <SendFromBulgariaPage /> },
      { path: '/about', element: <AboutPage /> },
      { path: '/contact', element: <ContactPage /> },
      { path: '/faq', element: <FaqPage /> },
      { path: '/rules', element: <RulesPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  { path: '/login', element: <Suspended><LoginPage /></Suspended> },
  { path: '/reset-password', element: <Suspended><ResetPasswordPage /></Suspended> },
  {
    path: '/portal',
    element: (
      <RequireAuth>
        <AppLayout items={PORTAL_NAV} scope="portal" />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'new', element: <NewShipmentPage /> },
      { path: 'incoming', element: <IncomingParcelPage /> },
      { path: 'shipments', element: <MyShipmentsPage /> },
      { path: 'shipments/:id', element: <ShipmentDetailPage /> },
      { path: 'invoices', element: <InvoicesPage /> },
      { path: 'messages', element: <MessagesPage /> },
      { path: 'profile', element: <ProfilePage /> },
    ],
  },
  {
    path: '/op',
    element: (
      <RequireStaff>
        <AppLayout items={OPERATOR_NAV} scope="operator" />
      </RequireStaff>
    ),
    children: [
      { index: true, element: <OperatorHomePage /> },
      { path: 'scan', element: <ScanStationPage /> },
      { path: 'lookup', element: <OtLookupPage /> },
      { path: 'clients', element: <ClientsPage /> },
      { path: 'intake', element: <IntakePage /> },
      { path: 'loads', element: <LoadsPage /> },
      { path: 'loads/:id', element: <LoadBuilderPage /> },
      { path: 'loads/:id/run', element: <RunSheetPage /> },
      { path: 'shipments', element: <OpShipmentsPage /> },
      { path: 'shipments/:id', element: <ShipmentDetailPage /> },
      { path: 'invoices', element: <OpInvoicesPage /> },
      { path: 'messages', element: <OpMessagesPage /> },
      { path: 'audit', element: <AuditLogPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'help', element: <HelpPage /> },
    ],
  },
]);
