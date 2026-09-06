import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n";
import { languageAlternates, siteUrl } from "@/lib/site";

const titles = { en: "Privacy", de: "Datenschutz", uk: "Конфіденційність", ru: "Конфиденциальность" } as const;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return { title: titles[locale], alternates: { canonical: `${siteUrl}/${locale}/privacy`, languages: languageAlternates("/privacy") } };
}

const privacyContent = {
  "ru": {
    "title": "Конфиденциальность",
    "intro": "Как Nora TrimTex обрабатывает ваши данные при работе с каталогом, оформлении заказов и обращении к нашей команде.",
    "contact": "Вопросы о персональных данных",
    "sections": [
      [
        "Данные и цели обработки",
        "При регистрации, оформлении заказа или отправке сообщения вы предоставляете имя, контактные данные и, при необходимости, сведения о компании и доставке. Мы используем их для управления аккаунтом, ответа на обращения, подготовки предложений и выполнения заказов."
      ],
      [
        "Корзина и данные о посещениях",
        "Сайт сохраняет выбранные товары и случайный идентификатор посетителя, чтобы восстановить корзину при следующем посещении. Также обрабатываются посещённые страницы, источник перехода, время посещения, язык, сведения о браузере и приблизительный регион подключения. Эти данные помогают поддерживать работу сайта и обрабатывать обращения. В записях гостевых сессий IP-адрес хранится в виде хеша."
      ],
      [
        "Cookies и локальное хранилище",
        "Для входа в аккаунт используются cookies сессии. Корзина, идентификатор гостя и положение страницы могут сохраняться в хранилище браузера. Вы можете удалить эти данные в настройках браузера; после удаления потребуется повторный вход, а сохранённая корзина может быть недоступна."
      ],
      [
        "Доступ к данным и сервисы",
        "Доступ к данным получают сотрудники, которым они необходимы для обработки заказов и поддержки клиентов. Для размещения сайта, хранения данных, доставки контента и отправки служебных писем используются технические подрядчики. Обработка данных, необходимая для заказа и аккаунта, связана с выполнением вашего запроса; технические данные также используются для обеспечения надёжности и безопасности сервиса."
      ],
      [
        "Хранение и защита",
        "Мы используем защищённые соединения и разграничение доступа. Сведения о заказах и обращениях хранятся в течение времени, необходимого для их обработки и выполнения применимых требований к учёту. Срок хранения зависит от категории данных и цели обработки. Для уточнения срока или запроса на удаление свяжитесь с нами."
      ],
      [
        "Ваши права и обращения",
        "Вы можете запросить доступ к своим данным, их исправление или удаление, а также ограничение обработки, возразить против неё или запросить переносимость данных в предусмотренных законом случаях. Для обращения напишите на info@noratrim.com. Если вы считаете, что ваши права нарушены, вы также можете обратиться в компетентный орган по защите данных."
      ]
    ]
  },
  "uk": {
    "title": "Конфіденційність",
    "intro": "Як Nora TrimTex обробляє ваші дані під час перегляду каталогу, оформлення замовлень і звернень до нашої команди.",
    "contact": "Питання щодо персональних даних",
    "sections": [
      [
        "Дані та цілі обробки",
        "Під час реєстрації, оформлення замовлення або надсилання повідомлення ви надаєте ім’я, контактні дані та, за потреби, відомості про компанію й доставку. Ми використовуємо їх для роботи акаунта, відповідей на звернення, підготовки пропозицій і виконання замовлень."
      ],
      [
        "Кошик і дані про відвідування",
        "Сайт зберігає вибрані товари та випадковий ідентифікатор відвідувача для відновлення кошика. Також обробляються відвідані сторінки, джерело переходу, час, мова, відомості про браузер і приблизний регіон підключення. Ці дані допомагають підтримувати роботу сайту й обробляти звернення. У записах гостьових сесій IP-адреса зберігається у вигляді хешу."
      ],
      [
        "Cookies і локальне сховище",
        "Для входу в акаунт використовуються cookies сесії. Кошик, ідентифікатор гостя й положення сторінки можуть зберігатися у браузері. Ви можете видалити ці дані в налаштуваннях браузера; після цього може знадобитися повторний вхід, а збережений кошик може бути недоступним."
      ],
      [
        "Доступ до даних і сервіси",
        "Доступ отримують працівники, яким дані потрібні для обробки замовлень і підтримки клієнтів. Для розміщення сайту, зберігання даних, доставки контенту й надсилання службових листів залучаються технічні підрядники. Обробка даних замовлення та акаунта пов’язана з виконанням вашого запиту; технічні дані також використовуються для надійності й безпеки сервісу."
      ],
      [
        "Зберігання та захист",
        "Ми використовуємо захищені з’єднання та розмежування доступу. Дані замовлень і звернень зберігаються протягом часу, необхідного для їх обробки й виконання застосовних вимог до обліку. Строк залежить від категорії даних і мети обробки. Для уточнення строку або запиту на видалення зв’яжіться з нами."
      ],
      [
        "Ваші права та звернення",
        "Ви можете запросити доступ до даних, їх виправлення або видалення, обмеження обробки, заперечити проти неї або запросити перенесення даних у передбачених законом випадках. Напишіть на info@noratrim.com. Якщо ви вважаєте, що ваші права порушено, ви також можете звернутися до компетентного органу із захисту даних."
      ]
    ]
  },
  "en": {
    "title": "Privacy",
    "intro": "How Nora TrimTex handles your information when you explore our collection, place an order or contact our team.",
    "contact": "Questions about your personal data",
    "sections": [
      [
        "Information and purposes",
        "When you register, place an order or send a message, you provide your name, contact details and, where relevant, company and delivery information. We use this information to manage your account, respond to enquiries, prepare quotations and fulfil orders."
      ],
      [
        "Your basket and visits",
        "The website stores selected products and a random visitor identifier to restore your basket. We also process visited pages, referral source, visit times, language, browser information and approximate connection region. This information supports website operation and customer enquiries. Guest session records store the IP address as a hash."
      ],
      [
        "Cookies and browser storage",
        "Session cookies support account sign-in. Your basket, guest identifier and page position may be saved in browser storage. You can remove this information in your browser settings; this may sign you out and make your saved basket unavailable."
      ],
      [
        "Access and service providers",
        "Information is accessible to staff who need it to process orders and provide customer support. Technical providers support website hosting, data storage, content delivery and service emails. Processing for orders and accounts supports the fulfilment of your request; technical information also supports service reliability and security."
      ],
      [
        "Retention and protection",
        "We use encrypted connections and access controls. Order and enquiry information is retained for the time needed to handle it and meet applicable record-keeping requirements. Retention depends on the category and purpose of the information. Contact us for details or to request deletion."
      ],
      [
        "Your rights and enquiries",
        "You may request access, correction or deletion of your information, restriction of processing, object to processing or request data portability where applicable by law. Contact info@noratrim.com. If you believe your rights have been infringed, you may also contact the competent data protection authority."
      ]
    ]
  },
  "de": {
    "title": "Datenschutz",
    "intro": "Wie Nora TrimTex Ihre Daten verarbeitet, wenn Sie unseren Katalog nutzen, eine Bestellung aufgeben oder unser Team kontaktieren.",
    "contact": "Fragen zu Ihren personenbezogenen Daten",
    "sections": [
      [
        "Daten und Verarbeitungszwecke",
        "Bei der Registrierung, einer Bestellung oder einer Nachricht geben Sie Ihren Namen, Kontaktdaten und gegebenenfalls Unternehmens- und Lieferinformationen an. Wir verwenden diese Daten zur Kontoverwaltung, zur Beantwortung von Anfragen, zur Angebotserstellung und zur Abwicklung von Bestellungen."
      ],
      [
        "Warenkorb und Besuche",
        "Die Website speichert ausgewählte Artikel und eine zufällige Besucherkennung, um Ihren Warenkorb wiederherzustellen. Außerdem verarbeiten wir aufgerufene Seiten, Verweisquelle, Besuchszeit, Sprache, Browserinformationen und die ungefähre Verbindungsregion. Diese Daten unterstützen den Websitebetrieb und die Bearbeitung von Anfragen. In Gastsitzungen wird die IP-Adresse als Hash gespeichert."
      ],
      [
        "Cookies und Browserspeicher",
        "Sitzungscookies ermöglichen die Anmeldung. Warenkorb, Besucherkennung und Seitenposition können im Browser gespeichert werden. Sie können diese Daten in den Browsereinstellungen löschen. Danach kann eine erneute Anmeldung erforderlich sein und der gespeicherte Warenkorb möglicherweise nicht mehr zur Verfügung stehen."
      ],
      [
        "Zugriff und Dienstleister",
        "Mitarbeitende erhalten Zugriff, soweit dies für Bestellungen und Kundenbetreuung erforderlich ist. Technische Dienstleister unterstützen Hosting, Datenspeicherung, Inhaltsauslieferung und den Versand von Servicenachrichten. Die Verarbeitung von Bestell- und Kontodaten dient der Erfüllung Ihrer Anfrage; technische Daten dienen auch der Zuverlässigkeit und Sicherheit des Dienstes."
      ],
      [
        "Speicherung und Schutz",
        "Wir verwenden verschlüsselte Verbindungen und Zugriffsbeschränkungen. Bestell- und Anfragedaten werden so lange gespeichert, wie dies für ihre Bearbeitung und geltende Aufbewahrungspflichten erforderlich ist. Die Dauer richtet sich nach Datenkategorie und Verarbeitungszweck. Für nähere Angaben oder eine Löschanfrage kontaktieren Sie uns."
      ],
      [
        "Ihre Rechte und Anfragen",
        "Sie können im gesetzlich vorgesehenen Umfang Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung und Datenübertragbarkeit verlangen sowie Widerspruch einlegen. Schreiben Sie an info@noratrim.com. Wenn Sie Ihre Rechte verletzt sehen, können Sie sich außerdem an die zuständige Datenschutzaufsichtsbehörde wenden."
      ]
    ]
  }
};

export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const content = privacyContent[locale];
  return <article className="privacy-page">
    <p className="eyebrow">NORA TRIMTEX</p><h1>{content.title}</h1>
    <p className="privacy-intro">{content.intro}</p>
    <div className="privacy-layout">
      <nav className="privacy-nav" aria-label={content.title}>{content.sections.map(([title], index) => <a key={title} href={`#privacy-${index + 1}`}>{String(index + 1).padStart(2, "0")} · {title}</a>)}</nav>
      <div>{content.sections.map(([title, body], index) => <section key={title} id={`privacy-${index + 1}`}><h2>{title}</h2><p>{body}</p></section>)}
        <div className="privacy-contact"><p>{content.contact}</p><a href="mailto:info@noratrim.com">info@noratrim.com</a></div>
      </div>
    </div>
  </article>;
}
