export function amountView(transactions,{min='',max='',sort='expensive'}={}){
 const lower=min===''?0:Number(min),upper=max===''?Infinity:Number(max);
 const rows=transactions.filter(t=>Math.abs(t.amount)>=lower&&Math.abs(t.amount)<=upper);
 return rows.sort((a,b)=>{
  if(sort==='newest')return b.date.localeCompare(a.date)||Number(a.id)-Number(b.id);
  // Outgoing purchases come before incoming money. Compare positive magnitudes.
  const direction=Number(a.amount>=0)-Number(b.amount>=0);
  return direction||(sort==='cheapest'?Math.abs(a.amount)-Math.abs(b.amount):Math.abs(b.amount)-Math.abs(a.amount))||b.date.localeCompare(a.date)||Number(a.id)-Number(b.id);
 });
}
