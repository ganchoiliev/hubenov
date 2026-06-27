/**
 * In-app operator + owner guide (§onboarding). A new staff member should be able
 * to run the counter from this page alone. Bilingual (BG/EN), self-contained.
 *
 * "Animations" are built from the live design system with Framer Motion (a looping
 * highlight across each workflow's steps) rather than recorded GIFs — they stay on
 * brand and never go stale when the UI changes.
 */
import { Fragment, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { m as motion } from 'framer-motion';
import {
  LayoutDashboard,
  PackagePlus,
  ScanLine,
  UserSearch,
  Users,
  Truck,
  Boxes,
  Receipt,
  MessageSquare,
  History,
  Settings,
  ArrowRight,
  Search,
  CheckCircle2,
  Printer,
  Banknote,
  Lightbulb,
  AlertTriangle,
  Plus,
  Tag,
  type LucideIcon,
} from 'lucide-react';
import { Card, CardBody } from '@/components/ui';
import { PageHeading } from '@/components/shared/common';

type DemoStep = { icon: LucideIcon; label: string };

/**
 * A calm process strip. Steps reveal once with a gentle stagger when the card
 * mounts, then sit still — purposeful motion, not a looping "traffic light".
 * Hovering a step lifts it, so the only ongoing motion is user-driven.
 */
function FlowDemo({ steps }: { steps: DemoStep[] }) {
  return (
    <motion.div
      className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-muted/40 p-3"
      initial="hidden"
      animate="show"
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07 } } }}
    >
      {steps.map((s, i) => {
        const Icon = s.icon;
        return (
          <Fragment key={i}>
            {i > 0 && <ArrowRight className="h-4 w-4 shrink-0 text-muted-fg/40" />}
            <motion.div
              variants={{ hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0 } }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              whileHover={{ y: -2 }}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-semibold text-foreground shadow-sm transition-colors hover:border-brand hover:text-brand"
            >
              <Icon className="h-3.5 w-3.5 shrink-0 text-brand" />
              {s.label}
            </motion.div>
          </Fragment>
        );
      })}
    </motion.div>
  );
}

function Callout({ icon: Icon, tone, children }: { icon: LucideIcon; tone: 'tip' | 'warn'; children: ReactNode }) {
  const cls = tone === 'tip' ? 'border-success/30 bg-success/5' : 'border-danger/30 bg-danger/5';
  const ic = tone === 'tip' ? 'text-success' : 'text-danger';
  return (
    <div className={`flex gap-2 rounded-lg border px-3 py-2 text-xs ${cls}`}>
      <Icon className={`h-4 w-4 shrink-0 ${ic}`} />
      <span className="text-foreground/80">{children}</span>
    </div>
  );
}

interface Section {
  id: string;
  icon: LucideIcon;
  title: string;
  intro: string;
  steps: string[];
  demo?: DemoStep[];
  tip?: string;
  warn?: string;
}

export function HelpPage() {
  const { i18n } = useTranslation();
  const bg = (i18n.language ?? 'bg').toLowerCase().startsWith('bg');
  const tx = (b: string, e: string) => (bg ? b : e);

  const dailyFlow: DemoStep[] = [
    { icon: PackagePlus, label: tx('Приемане', 'Intake') },
    { icon: ScanLine, label: tx('Етикет', 'Label') },
    { icon: Truck, label: tx('Курс', 'Load') },
    { icon: Boxes, label: tx('В България', 'In BG') },
    { icon: CheckCircle2, label: tx('Доставена', 'Delivered') },
  ];

  const operatorSections: Section[] = [
    {
      id: 'console',
      icon: LayoutDashboard,
      title: tx('Операторски пулт', 'Operator console'),
      intro: tx(
        'Началният екран. Показва какво иска внимание днес, седмичен график и обобщение на парите. Смени периода горе (днес / 7 дни / 30 дни).',
        'The home screen. Shows what needs attention today, a weekly chart and a money summary. Switch the period at the top (today / 7 days / 30 days).',
      ),
      demo: [
        { icon: LayoutDashboard, label: tx('Внимание', 'Attention') },
        { icon: Boxes, label: tx('Действай', 'Act') },
        { icon: Banknote, label: tx('Пари', 'Money') },
      ],
      steps: [
        tx('„Изисква внимание" събира заседналите пратки и новите клиенти — започни оттам.', '"Needs attention" gathers stuck parcels and new clients — start there.'),
        tx('Графиката показва обема пратки по дни.', 'The chart shows parcel volume per day.'),
        tx('Картите с пари обобщават оборот, наложен платеж и неплатено.', 'The money cards summarise revenue, COD and unpaid.'),
      ],
    },
    {
      id: 'intake',
      icon: PackagePlus,
      title: tx('Приемане на пратка', 'Parcel intake'),
      intro: tx(
        'Създаваш нова пратка на гише. Първо намираш или създаваш клиент, после попълваш подател, получател и данни за колета. Цената прави фактурата автоматично.',
        'Create a new parcel at the counter. First find or create the client, then fill sender, receiver and parcel details. The price auto-creates the invoice.',
      ),
      demo: [
        { icon: Search, label: tx('Намери клиент', 'Find client') },
        { icon: Users, label: tx('Подател/Получател', 'Sender/Receiver') },
        { icon: Tag, label: tx('Цена', 'Price') },
        { icon: CheckCircle2, label: tx('Създадена', 'Created') },
      ],
      steps: [
        tx('Намери клиента в едно поле: име, телефон или ОТ номер. Ако го няма — „Нов клиент" му дава ОТ номер веднага.', 'Find the client in one field: name, phone or OT code. If missing — "New client" issues an OT code instantly.'),
        tx('Цъкни чип от „Запазени податели/получатели", за да попълниш адрес с един клик (от историята на клиента).', 'Click a "Saved senders/receivers" chip to fill an address in one click (from the client\'s history).'),
        tx('Попълни тегло и размери. Въведи „Цена за доставка" — тя създава фактурата.', 'Fill weight and dimensions. Enter "Delivery price" — it creates the invoice.'),
        tx('Натисни Създай. Зеленият банер дава номера; оттам „Към сканиране" за етикет.', 'Press Create. The green banner shows the number; from there "To scanning" for a label.'),
      ],
      tip: tx('Податела почти винаги е самият клиент — цъкни запазения чип вместо да пишеш.', 'The sender is almost always the client — click the saved chip instead of typing.'),
    },
    {
      id: 'scan',
      icon: ScanLine,
      title: tx('Сканиране и печат', 'Scan & print'),
      intro: tx(
        'Станцията движи пратката напред и печата етикети. Сканираш баркод, печаташ, сменяш статуса с един клик.',
        'The station moves a parcel forward and prints labels. Scan a barcode, print, advance status in one click.',
      ),
      demo: [
        { icon: ScanLine, label: tx('Сканирай', 'Scan') },
        { icon: Printer, label: tx('Етикет', 'Label') },
        { icon: CheckCircle2, label: tx('Нов статус', 'New status') },
      ],
      steps: [
        tx('Сканирай AWB баркода (или входящ QR) — пратката изскача веднага.', 'Scan the AWB barcode (or inbound QR) — the parcel pops up at once.'),
        tx('Печатай етикета. При входяща пратка етикетът се печата автоматично.', 'Print the label. For an inbound parcel the label prints automatically.'),
        tx('Смени статуса (напр. „В склад Манчестър") с един бутон.', 'Advance the status (e.g. "At UK hub") with one button.'),
        tx('При доставка вземи подпис на екрана.', 'On delivery, capture a signature on screen.'),
      ],
      warn: tx('Печатът иска настроен принтер — виж „Настройки" за метод на печат (PDF или QZ Tray).', 'Printing needs a configured printer — see "Settings" for print method (PDF or QZ Tray).'),
    },
    {
      id: 'loads',
      icon: Truck,
      title: tx('Курсове', 'Loads'),
      intro: tx(
        'Курсът е седмичният бус Манчестър → България. Групираш готовите пратки, маркираш тръгване/пристигане и печаташ всички етикети и митнически документи наведнъж.',
        'A load is the weekly Manchester → Bulgaria van. Group the ready parcels, mark departure/arrival and bulk-print every label and customs doc at once.',
      ),
      demo: [
        { icon: Plus, label: tx('Нов курс', 'New load') },
        { icon: Boxes, label: tx('Добави пратки', 'Add parcels') },
        { icon: Printer, label: tx('Dispatch pack', 'Dispatch pack') },
        { icon: Truck, label: tx('Тръгна', 'Departed') },
      ],
      steps: [
        tx('Създай нов курс с дата на тръгване.', 'Create a new load with a departure date.'),
        tx('Добави готовите пратки (в склад Манчестър) с цъкване от списъка.', 'Add ready parcels (at UK hub) by clicking them from the list.'),
        tx('„Dispatch pack" печата всички етикети + митническите фактури за курса наведнъж.', '"Dispatch pack" prints all labels + customs invoices for the load at once.'),
        tx('Маркирай „Тръгна" / „Пристигна" — статусите на всички пратки се движат заедно.', 'Mark "Departed" / "Arrived" — every parcel\'s status moves together.'),
        tx('„Списък за шофьора" е мобилен манифест за маркиране на доставени.', '"Driver run-sheet" is a mobile manifest to mark deliveries.'),
      ],
    },
    {
      id: 'shipments',
      icon: Boxes,
      title: tx('Пратки', 'Shipments'),
      intro: tx(
        'Всички пратки на едно място. Филтрирай по статус, действай групово, редактирай и преоцени.',
        'Every parcel in one place. Filter by status, act in bulk, edit and re-quote.',
      ),
      demo: [
        { icon: Boxes, label: tx('Избери', 'Select') },
        { icon: Truck, label: tx('В курс', 'To load') },
        { icon: Printer, label: tx('Печат', 'Print') },
      ],
      steps: [
        tx('Филтрирай по статус или търси по номер/получател.', 'Filter by status or search by number/receiver.'),
        tx('Маркирай няколко и действай групово: придвижи статус, добави в курс, печатай.', 'Select several and act in bulk: advance status, add to load, print.'),
        tx('Отвори пратка за детайли и редакция на тегло/цена (преоценява фактурата).', 'Open a parcel for details and edit weight/price (re-quotes the invoice).'),
      ],
    },
    {
      id: 'clients',
      icon: Users,
      title: tx('Клиенти', 'Clients'),
      intro: tx(
        'Указателят с клиенти. Всеки клиент има ОТ номер, история на пратки и фактури.',
        'The client directory. Each client has an OT code, parcel history and invoices.',
      ),
      steps: [
        tx('Търси по име, телефон, имейл или ОТ номер.', 'Search by name, phone, email or OT code.'),
        tx('Отвори клиент за профил, пратки и фактури.', 'Open a client for profile, parcels and invoices.'),
        tx('„Нова пратка" от картона праща директно към приемане със зареден клиент.', '"New shipment" from the record jumps to intake with the client loaded.'),
      ],
    },
    {
      id: 'lookup',
      icon: UserSearch,
      title: tx('Търсене по ОТ номер', 'OT lookup'),
      intro: tx(
        'Бързо отваряне на клиент по ОТ номера му — удобно когато клиентът каже номера на гишето или по телефона.',
        'Quickly open a client by their OT code — handy when a client gives the number at the counter or by phone.',
      ),
      steps: [
        tx('Въведи ОТ номера (HB-XXXX).', 'Enter the OT code (HB-XXXX).'),
        tx('Виждаш профила, всичките му пратки и фактури наведнъж.', 'You see the profile, all their parcels and invoices at once.'),
      ],
    },
    {
      id: 'messages',
      icon: MessageSquare,
      title: tx('Съобщения', 'Messages'),
      intro: tx(
        'Чат между офиса и клиента. Броячът в менюто показва непрочетени.', 'Chat between the office and the client. The menu badge shows unread.',
      ),
      steps: [
        tx('Отвори разговор от списъка.', 'Open a conversation from the list.'),
        tx('Отговори — клиентът получава имейл известие.', 'Reply — the client gets an email notification.'),
        tx('Непрочетените са маркирани, докато ги отвориш.', 'Unread ones are flagged until you open them.'),
      ],
    },
  ];

  const ownerSections: Section[] = [
    {
      id: 'money',
      icon: Banknote,
      title: tx('Пари и справки', 'Money & reports'),
      intro: tx(
        'Тук четеш парите. Оборотът е сумата по фактури за периода. „Наложен платеж за прибиране" са парите, които Еконт е събрал и дължи към теб. „Неплатено" са фактурите, които чакат плащане.',
        'Read the money here. Revenue is the invoiced amount for the period. "COD to collect" is cash Econt collected and owes you. "Unpaid" are invoices awaiting payment.',
      ),
      steps: [
        tx('Избери период горе, за да видиш оборота за деня/седмицата/месеца.', 'Pick a period at the top to see revenue for the day/week/month.'),
        tx('Следи „наложен платеж" — това са пари на път към теб.', 'Watch "COD" — that is money on its way to you.'),
        tx('„Неплатено" ти казва кои клиенти да подсетиш.', '"Unpaid" tells you which clients to chase.'),
      ],
      tip: tx('Парите се обновяват сами щом издадеш фактура или маркираш плащане — няма ръчно броене.', 'Money updates itself when you issue an invoice or mark a payment — no manual tallying.'),
    },
    {
      id: 'invoices',
      icon: Receipt,
      title: tx('Фактури', 'Invoices'),
      intro: tx(
        'Фактурите се създават автоматично от цената при приемане. Тук ги редактираш, пращаш по имейл, сваляш PDF или анулираш.',
        'Invoices are auto-created from the intake price. Here you edit, email, download PDF or void them.',
      ),
      demo: [
        { icon: Tag, label: tx('Цена', 'Price') },
        { icon: Receipt, label: tx('Фактура', 'Invoice') },
        { icon: CheckCircle2, label: tx('Изпратена', 'Sent') },
      ],
      steps: [
        tx('Приемането вече прави фактурата — рядко създаваш ръчно.', 'Intake already makes the invoice — you rarely create one by hand.'),
        tx('Изпрати по имейл с един бутон (прикача се PDF на кирилица).', 'Email with one button (a Cyrillic PDF is attached).'),
        tx('Анулирай сгрешена фактура — тя отпада от оборота.', 'Void a wrong invoice — it drops out of revenue.'),
      ],
      warn: tx('Анулирана фактура не се трие (за одит) — само се маркира и спира да брои в парите.', 'A voided invoice is not deleted (for audit) — it is just marked and stops counting in the money.'),
    },
    {
      id: 'audit',
      icon: History,
      title: tx('Дневник', 'Activity log'),
      intro: tx(
        'Дневникът записва кой какво е направил — изтривания, промени, плащания. За проследимост и спокойствие.',
        'The log records who did what — deletions, changes, payments. For traceability and peace of mind.',
      ),
      steps: [
        tx('Виж хронологичен списък на действията.', 'See a chronological list of actions.'),
        tx('Всеки ред показва кой потребител, кога и какво.', 'Each row shows which user, when and what.'),
      ],
    },
    {
      id: 'settings',
      icon: Settings,
      title: tx('Настройки', 'Settings'),
      intro: tx(
        'Тук се настройва бизнесът: фирмени данни, EORI за митница, размер на етикета, метод на печат, тарифи и известия.',
        'Configure the business: company details, customs EORI, label size, print method, pricing rates and notifications.',
      ),
      steps: [
        tx('Фирмени данни и EORI — излизат на етикети и митнически фактури.', 'Company details and EORI — appear on labels and customs invoices.'),
        tx('Метод на печат: PDF (отвори и принтирай) или QZ Tray (директно към принтера).', 'Print method: PDF (open and print) or QZ Tray (straight to the printer).'),
        tx('Тарифи: цената на килограм по посока.', 'Pricing rates: price per kg by direction.'),
        tx('Известия: общ ключ + по клиент — спира/пуска имейлите.', 'Notifications: a master switch + per client — turns emails on/off.'),
      ],
      warn: tx('Смяна на тарифите важи за нови оферти, не за вече издадени фактури.', 'Changing rates affects new quotes, not invoices already issued.'),
    },
  ];

  const renderSection = (s: Section) => (
    <section key={s.id} id={s.id} className="scroll-mt-24">
      <Card>
        <CardBody className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
              <s.icon className="h-5 w-5" />
            </span>
            <h3 className="font-display text-lg font-bold text-foreground">{s.title}</h3>
          </div>
          <p className="text-sm leading-relaxed text-muted-fg">{s.intro}</p>
          {s.demo && <FlowDemo steps={s.demo} />}
          <ol className="space-y-2.5">
            {s.steps.map((st, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand text-[11px] font-bold text-white">
                  {i + 1}
                </span>
                <span className="leading-relaxed text-foreground">{st}</span>
              </li>
            ))}
          </ol>
          {s.tip && (
            <Callout icon={Lightbulb} tone="tip">
              {s.tip}
            </Callout>
          )}
          {s.warn && (
            <Callout icon={AlertTriangle} tone="warn">
              {s.warn}
            </Callout>
          )}
        </CardBody>
      </Card>
    </section>
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-12">
      <PageHeading
        title={tx('Помощ и ръководство', 'Help & guide')}
        subtitle={tx('Как работи системата — секция по секция', 'How the system works — section by section')}
      />

      {/* Hero — the daily flow at a glance */}
      <Card>
        <CardBody className="space-y-4">
          <p className="text-sm leading-relaxed text-muted-fg">
            {tx(
              'Кратко ръководство за всекидневната работа. Всяка секция обяснява за какво е, как се ползва и показва потока. Долу са нещата за собственика — пари, фактури, дневник и настройки.',
              'A short guide to daily work. Each section explains what it is for, how to use it and shows the flow. Below are the owner items — money, invoices, log and settings.',
            )}
          </p>
          <FlowDemo steps={dailyFlow} />
        </CardBody>
      </Card>

      {/* Jump links */}
      <div className="flex flex-wrap gap-2">
        {[...operatorSections, ...ownerSections].map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className="rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-fg transition-colors hover:border-brand hover:text-brand"
          >
            {s.title}
          </a>
        ))}
      </div>

      <h2 className="font-display text-sm font-bold uppercase tracking-wide text-muted-fg">
        {tx('Ежедневие на оператора', 'Operator daily work')}
      </h2>
      <div className="space-y-4">{operatorSections.map(renderSection)}</div>

      <h2 className="pt-2 font-display text-sm font-bold uppercase tracking-wide text-muted-fg">
        {tx('За собственика', 'For the owner')}
      </h2>
      <div className="space-y-4">{ownerSections.map(renderSection)}</div>
    </div>
  );
}
