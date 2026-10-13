export interface PageResult<T>{data:T[]|null;error:unknown;}
export async function readAllPages<T>(read:(from:number,to:number)=>PromiseLike<PageResult<T>>,size=500,maximum=100000):Promise<T[]> {
 const result:T[]=[];
 for(let offset=0;offset<maximum;offset+=size){
  const {data,error}=await read(offset,offset+size-1);
  if(error || !data)throw new Error("No se pudo completar la consulta paginada.");
  result.push(...data);if(data.length<size)return result;
 }
 throw new Error("El resultado supera el límite de exportación. Reduce el período.");
}
