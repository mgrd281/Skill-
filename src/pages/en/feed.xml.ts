import type { APIContext } from "astro";
import { feed } from "../../lib/feed";

export const GET = ({ site }: APIContext) => feed("en", site);
