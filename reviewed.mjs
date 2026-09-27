// Evidence-based review after comparing Jev and bank labels. Never presented as model confidence.
export function reviewedDecision(t){
 if(/\bvintrica\b/i.test(t.merchant))return {category:'transport',reviewed:true,reviewReason:'Vintrica sells motorway vignettes and toll services; a digital purchase is still a transport expense.',reviewSource:'https://help.vintrica.com/hc/en-150/articles/29324160310557-What-is-the-vintrica-Mobility-App'};
 if(/\bsiepomaga\.pl\b/i.test(t.merchant))return {category:'giving',reviewed:true,reviewReason:'Siepomaga is a charitable fundraising platform. The bank’s cinema/theatre label does not match the merchant.',reviewSource:'https://www.siepomaga.pl/'};
 if(/ZONA KRAWCA/i.test(t.merchant))return {category:'dining',reviewed:true,reviewReason:'Żona Krawca identifies itself as a café and patisserie, supporting Food & coffee rather than general shopping.',reviewSource:'https://zonakrawca.mom/'};
 return {};
}
