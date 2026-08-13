export const OPEN_CONTACT_CHAT_EVENT = "noratrim:open-contact-chat";

export function openContactChat(message: string) {
  window.dispatchEvent(new CustomEvent(OPEN_CONTACT_CHAT_EVENT, { detail: { message } }));
}
