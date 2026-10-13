/** Decimal arithmetic at the currency boundary; shared by browser and Edge. */
export function currencyDecimals(currency: string): number {
  if (currency === "CLP") return 0;
  if (["USD", "BRL", "BOB", "PEN"].includes(currency)) return 2;
  throw new RangeError("unsupported_currency");
}

export function toMinorUnits(value: number, decimals = 0): number {
  if (!Number.isFinite(value) || !Number.isInteger(decimals) || decimals < 0 || decimals > 2) {
    throw new RangeError("invalid_money");
  }
  const [mantissa, exponent = "0"] = Math.abs(value).toString().toLowerCase().split("e");
  const [whole, fraction = ""] = mantissa.split(".");
  const digits = BigInt(whole + fraction);
  const scale = decimals + Number(exponent) - fraction.length;
  const divisor = scale < 0 ? 10n ** BigInt(-scale) : 1n;
  const scaled = scale >= 0 ? digits * 10n ** BigInt(scale) : (digits + divisor / 2n) / divisor;
  const result = Number(scaled) * (value < 0 ? -1 : 1);
  if (!Number.isSafeInteger(result)) throw new RangeError("money_out_of_range");
  return result;
}

export function fromMinorUnits(value: number, decimals = 0): number {
  if (!Number.isSafeInteger(value) || !Number.isInteger(decimals) || decimals<0 || decimals>2) throw new RangeError("invalid_minor_units");
  return value / 10 ** decimals;
}

export const roundMoney = (value: number, decimals = 0): number =>
  fromMinorUnits(toMinorUnits(value, decimals), decimals);

export function sumMoney(values: readonly number[], decimals = 0): number {
  const units=values.reduce((sum,value)=>sum+BigInt(toMinorUnits(value,decimals)),0n);
  return fromMinorUnits(Number(units),decimals);
}
export function multiplyMoney(value:number, quantity:number, decimals=0):number {
  if(!Number.isSafeInteger(quantity)||quantity<0)throw new RangeError('invalid_quantity');
  return fromMinorUnits(Number(BigInt(toMinorUnits(value,decimals))*BigInt(quantity)),decimals);
}

function decimalRatio(value:number):[bigint,bigint]{
  if(!Number.isFinite(value)||value<0)throw new RangeError("invalid_money");
  const [mantissa,exponent="0"]=value.toString().toLowerCase().split("e"),[whole,fraction=""]=mantissa.split(".");
  const scale=Number(exponent)-fraction.length,digits=BigInt(whole+fraction);
  return scale>=0?[digits*10n**BigInt(scale),1n]:[digits,10n**BigInt(-scale)];
}
function roundedRatio(numerator:bigint,denominator:bigint):number{
  const units=Number((numerator+denominator/2n)/denominator);
  if(!Number.isSafeInteger(units))throw new RangeError("money_out_of_range");return units;
}
export function percentageAmount(total:number,percent:number,decimals=0):number{
  if(total<0||percent>100)throw new RangeError("invalid_money");
  const [n,d]=decimalRatio(percent),units=BigInt(toMinorUnits(total,decimals));
  return fromMinorUnits(roundedRatio(units*n,d*100n),decimals);
}
export function splitGrossTax(total:number,rate:number,decimals=0){
  if(total<0||rate>1)throw new RangeError("invalid_tax_input");
  const [n,d]=decimalRatio(rate),units=toMinorUnits(total,decimals),net=roundedRatio(BigInt(units)*d,n+d);
  return {subtotal:fromMinorUnits(net,decimals),tax:fromMinorUnits(units-net,decimals),total:fromMinorUnits(units,decimals)};
}

export function distributeMoney(total: number, people: number, decimals = 0): number[] {
  if (total < 0 || !Number.isInteger(people) || people < 1 || people > 100) throw new RangeError("invalid_split");
  const units = toMinorUnits(total, decimals);
  const base = Math.floor(units / people);
  const remainder = units % people;
  return Array.from({ length: people }, (_, i) => fromMinorUnits(base + (i < remainder ? 1 : 0), decimals));
}
