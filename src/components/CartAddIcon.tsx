import { Check, Plus, ShoppingBag } from "lucide-react";

export function CartAddIcon({ added = false }: { added?: boolean }) {
  if (added) return <Check aria-hidden="true" />;

  return <span className="card-add-glyph" aria-hidden="true">
    <ShoppingBag />
    <Plus />
  </span>;
}
