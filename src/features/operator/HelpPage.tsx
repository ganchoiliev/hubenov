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
  ShoppingBag,
  HelpCircle,
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

  // Task-first quick answers — operators think "how do I…", not feature names.
  const quickTasks: { q: string; a: string }[] = [
    {
      q: tx('Клиент е на гише с кашон', 'A client is at the counter with a box'),
      a: tx(
        'Приемане на пратка → намери клиента или „Нов клиент" → попълни данни и цена → Създай → „Към сканиране" → печат на етикет.',
        'Parcel intake → find the client or "New client" → fill details and price → Create → "To scanning" → print the label.',
      ),
    },
    {
      q: tx('Пристигна онлайн пратка (Amazon/eBay)', 'An online parcel arrived (Amazon/eBay)'),
      a: tx(
        'Сканиране и печат → въведи ОТ кода (HB-XXXX) от адреса на кашона → свързва се с клиента, приема се и печата етикет. После отвори пратката, претегли и сложи цена → прави фактурата.',
        'Scan & print → type the OT code (HB-XXXX) from the box address → it links to the client, is received and prints a label. Then open the parcel, weigh it and set a price → it makes the invoice.',
      ),
    },
    {
      q: tx('Принтирай етикет повторно', 'Re-print a label'),
      a: tx(
        'Отвори пратката → бутон „Принтай етикет" горе вдясно.',
        'Open the parcel → "Print label" button at the top right.',
      ),
    },
    {
      q: tx('Натовари буса за България', 'Load the van for Bulgaria'),
      a: tx(
        'Курсове → „Нов курс" → добави готовите пратки → „Dispatch pack" за всички документи → „Тръгна".',
        'Loads → "New load" → add the ready parcels → "Dispatch pack" for all docs → "Departed".',
      ),
    },
    {
      q: tx('Клиент пита къде е пратката му', 'A client asks where their parcel is'),
      a: tx(
        'Търсене по ОТ номер (или ⌘K за бързо търсене) → виж статуса и историята.',
        'OT lookup (or ⌘K for quick search) → see the status and history.',
      ),
    },
    {
      q: tx('Вземи наложен платеж', 'Take cash on delivery'),
      a: tx(
        'Еконт събира сумата при доставка; следи „Наложен платеж за прибиране" в операторския пулт.',
        'Econt collects it on delivery; track "COD to collect" on the operator console.',
      ),
    },
    {
      q: tx('Принтерът не печата', 'The printer is not printing'),
      a: tx(
        'Провери „Настройки" → метод на печат и дали принтерът е по подразбиране. За тих печат отвори станцията през стартера за печат.',
        'Check "Settings" → print method and that the printer is the default. For silent printing, open the station via the print launcher.',
      ),
    },
  ];

  // Plain-language meaning of each status, so a new operator can read the board.
  const statusLegend: { label: string; meaning: string }[] = [
    { label: tx('Заявена', 'Booked'), meaning: tx('Заявена, още не е приета физически.', 'Booked, not physically received yet.') },
    { label: tx('Приета (UK)', 'Collected (UK)'), meaning: tx('Приехме я при нас в Англия.', 'We received it in the UK.') },
    { label: tx('В склад Манчестър', 'At UK hub'), meaning: tx('Чака следващия курс.', 'Waiting for the next load.') },
    { label: tx('Натоварена', 'On load'), meaning: tx('Качена на буса (през курс).', 'Loaded on the van (via a load).') },
    { label: tx('Тръгна', 'Departed UK'), meaning: tx('Бусът е тръгнал към България.', 'The van has left for Bulgaria.') },
    { label: tx('Пристигна в БГ', 'Arrived in BG'), meaning: tx('В българския хъб.', 'At the Bulgarian hub.') },
    { label: tx('Предадена на Еконт', 'Handed to Econt'), meaning: tx('Еконт я поема за доставка.', 'Econt takes it for delivery.') },
    { label: tx('За доставка', 'Out for delivery'), meaning: tx('На път към получателя.', 'On the way to the receiver.') },
    { label: tx('Доставена', 'Delivered'), meaning: tx('Готово.', 'Done.') },
    { label: tx('Изключение', 'Exception'), meaning: tx('Проблем — виж бележките по пратката.', 'A problem — check the parcel notes.') },
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
        tx('Сканирай нашия AWB баркод, или въведи ОТ кода (HB-XXXX) на ръка — пратката/клиентът изскача веднага.', 'Scan our AWB barcode, or type the OT code (HB-XXXX) by hand — the parcel/client pops up at once.'),
        tx('Печатай етикета. При входяща пратка етикетът се печата автоматично.', 'Print the label. For an inbound parcel the label prints automatically.'),
        tx('Смени статуса (напр. „В склад Манчестър") с един бутон.', 'Advance the status (e.g. "At UK hub") with one button.'),
        tx('При доставка вземи подпис на екрана.', 'On delivery, capture a signature on screen.'),
      ],
      warn: tx('Печатът иска настроен принтер — виж „Настройки" за метод на печат (PDF или QZ Tray).', 'Printing needs a configured printer — see "Settings" for print method (PDF or QZ Tray).'),
    },
    {
      id: 'online',
      icon: ShoppingBag,
      title: tx('Онлайн пратки', 'Online parcels'),
      intro: tx(
        'Когато клиент поръча от UK магазин (Amazon, eBay…) до нашия адрес в Манчестър и ние я препращаме до България. Разпознаваш ги по лилавия етикет с името на магазина.',
        'When a client orders from a UK shop (Amazon, eBay…) to our Manchester address and we forward it to Bulgaria. You spot them by the purple badge with the shop name.',
      ),
      demo: [
        { icon: ShoppingBag, label: tx('Поръчка', 'Order') },
        { icon: Boxes, label: tx('Пристига в склада', 'Arrives at hub') },
        { icon: ScanLine, label: tx('Сканирай', 'Scan') },
        { icon: Truck, label: tx('Препрати', 'Forward') },
      ],
      steps: [
        tx('Клиентът поръчва до нашия адрес с кода си в името: „Име HB-XXXX". Регистрирането на пратката от профила (с номер за проследяване) е по желание.', 'The client orders to our address with their code in the name: "Name HB-XXXX". Registering the parcel from their account (with a tracking number) is optional.'),
        tx('Когато кашонът пристигне, въведи ОТ кода в „Сканиране" — свързва се с клиента, приема се и печата етикет. Баркодът на Amazon обикновено не съвпада; кодът е сигурният ключ.', 'When the box arrives, type the OT code in "Scan" — it links to the client, is received and prints a label. The Amazon barcode usually does not match; the code is the reliable key.'),
        tx('Онлайн пратките идват без цена. Отвори пратката, претегли и сложи „Цена за доставка" (предлага се по теглото) → фактурата се създава.', 'Online parcels arrive without a price. Open the parcel, weigh it and set the "Delivery price" (suggested from the weight) → the invoice is created.'),
        tx('В списъка „Пратки" натисни „Онлайн пратки", за да видиш само тези поръчки.', 'In "Shipments" press "Online parcels" to see only these orders.'),
      ],
      tip: tx('Можеш да търсиш направо по номера от Amazon (напр. TBA…) в полето за търсене.', 'You can search directly by the Amazon number (e.g. TBA…) in the search box.'),
    },
    {
      id: 'loads',
      icon: Truck,
      title: tx('Курсове', 'Loads'),
      intro: tx(
        'Курсът е седмичният бус Манчестър → България. По желание е: можеш да движиш всички статуси и направо от „Пратки" без курс. Курсът е удобен за групиране — добавяш пратки, маркираш тръгване/пристигане и печаташ всички документи наведнъж.',
        'A load is the weekly Manchester → Bulgaria van. It is optional: you can move every status straight from "Shipments" without a load. A load is handy for grouping — add parcels, mark departure/arrival and bulk-print every doc at once.',
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
        tx('Зареждай бързо: въведи/сканирай нашите етикети в „Сканирай в курса" — всяка пратка влиза в курса и става „Натоварена".', 'Load fast: type/scan our labels into "Scan into load" — each parcel joins the load and becomes "On load".'),
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
        tx('Табове горе: Активни / Доставени / Всички. По подразбиране „Активни", за да не закачаш доставените при „Избери всички".', 'Tabs at the top: Active / Delivered / All. Default "Active", so "select all" never includes delivered parcels.'),
        tx('Филтрирай по статус или търси по номер/получател/ОТ код.', 'Filter by status or search by number/receiver/OT code.'),
        tx('Маркирай няколко и действай групово: придвижи статус (праща известие), добави в курс, печатай.', 'Select several and act in bulk: advance status (sends a notification), add to load, print.'),
        tx('Отвори пратка за детайли и редакция на тегло/цена (преоценява или създава фактурата).', 'Open a parcel for details and edit weight/price (re-quotes or creates the invoice).'),
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

      {/* Common tasks — the fastest answer to "how do I…" */}
      <Card>
        <CardBody className="space-y-3">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-brand" />
            <h2 className="font-display text-base font-bold text-foreground">{tx('Чести задачи', 'Common tasks')}</h2>
          </div>
          <ul className="divide-y divide-border">
            {quickTasks.map((qt, i) => (
              <li key={i} className="py-2.5 first:pt-0 last:pb-0">
                <p className="text-sm font-semibold text-foreground">{qt.q}</p>
                <p className="mt-0.5 text-sm leading-relaxed text-muted-fg">{qt.a}</p>
              </li>
            ))}
          </ul>
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

      {/* Status legend — what each status on the board actually means */}
      <Card>
        <CardBody className="space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-brand" />
            <h3 className="font-display text-base font-bold text-foreground">
              {tx('Какво значат статусите', 'What the statuses mean')}
            </h3>
          </div>
          <dl className="grid gap-x-6 gap-y-2.5 sm:grid-cols-2">
            {statusLegend.map((s, i) => (
              <div key={i}>
                <dt className="text-sm font-semibold text-foreground">{s.label}</dt>
                <dd className="text-xs leading-relaxed text-muted-fg">{s.meaning}</dd>
              </div>
            ))}
          </dl>
        </CardBody>
      </Card>

      <h2 className="pt-2 font-display text-sm font-bold uppercase tracking-wide text-muted-fg">
        {tx('За собственика', 'For the owner')}
      </h2>
      <div className="space-y-4">{ownerSections.map(renderSection)}</div>
    </div>
  );
}
