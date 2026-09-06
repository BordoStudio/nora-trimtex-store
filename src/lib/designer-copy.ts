import type { Locale } from "./i18n";
export const designerCopy: Record<Locale, { label: string; title: string; body: string; register: string }> = {
  ru: { label: "Цены для дизайнеров", title: "Дизайнерам и студиям", body: "Войдите в партнёрский аккаунт, чтобы увидеть цены для дизайнеров. Если вы ещё не с нами, зарегистрируйтесь — после подтверждения заявки партнёрские цены появятся в каталоге.", register: "Регистрация для дизайнеров" },
  uk: { label: "Ціни для дизайнерів", title: "Дизайнерам і студіям", body: "Увійдіть у партнерський акаунт, щоб побачити ціни для дизайнерів. Зареєструйтеся, якщо ви ще не з нами: після підтвердження заявки партнерські ціни з’являться в каталозі.", register: "Реєстрація для дизайнерів" },
  de: { label: "Preise für Designer", title: "Für Designer und Studios", body: "Melden Sie sich mit Ihrem Partnerkonto an, um Designerpreise zu sehen. Noch kein Partner? Registrieren Sie sich. Nach Freigabe Ihres Antrags erscheinen die Partnerpreise im Katalog.", register: "Als Designer registrieren" },
  en: { label: "Designer prices", title: "For designers and studios", body: "Sign in to your partner account to see designer prices. New to Nora TrimTex? Register below. Partner prices will appear in the catalogue once your application is approved.", register: "Register as a designer" },
};
