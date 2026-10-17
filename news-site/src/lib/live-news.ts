/** Industry home feeds should match alternatives, rather than requiring every
 * taxonomy keyword to occur in one article. Subsection/search feeds stay specific.
 */
export function liveIndustryQuery(id: string, query: string): string {
  const curated: Record<string, string> = {
    publishing: "(publishing OR publisher OR books)",
    "it-software": "(software OR SaaS OR cybersecurity OR \"IT services\")",
  };
  const terms = query.split(/\s+/).filter(word => !/^(industry|industries|sector|sectors|services|exports|market|markets|business|news)$/i.test(word));
  return curated[id] || (terms.length > 1 ? `(${terms.slice(0, 6).join(" OR ")})` : terms[0] || query);
}
export function recentQuery(query: string, days = 7): string {
  return `${query.replace(/\bwhen:\S+/g, "").trim()} when:${days}d`;
}
