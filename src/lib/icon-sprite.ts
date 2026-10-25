// تتبّع الأيقونات المستخدمة في كل صفحة، حتى يرسم IconSprite كل أيقونة مرة واحدة فقط وما تحتاجه الصفحة فقط.
import { ICONS, type IconName, type IconWeight } from "./icons";

type Used = Map<string, string>;
const usedIn = (locals: object): Used => ((locals as { icons?: Used }).icons ??= new Map());

export function useIcon(locals: object, name: IconName, weight: IconWeight = "regular") {
  const id = weight === "regular" ? `i-${name}` : `i-${name}-${weight}`;
  usedIn(locals).set(id, ICONS[name][weight]!);
  return id;
}

export const usedIcons = (locals: object) => [...usedIn(locals)];
