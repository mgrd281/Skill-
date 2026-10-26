import { searchIndex } from "../../lib/search-index";

export const GET = () => new Response(JSON.stringify(searchIndex("en")), { headers: { "Content-Type": "application/json; charset=utf-8" } });
