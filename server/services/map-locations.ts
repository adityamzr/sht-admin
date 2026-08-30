import { and, asc, count, eq, ilike, or } from 'drizzle-orm'
import { mapLocations } from '../db/schema'
import type { DbLike } from '../db'
export type LocationInput={sourceKey?:string|null;name:string;city:string;category:string;shortDescription:string;latitude:number;longitude:number;googleMapsUrl?:string|null;imageUrl?:string|null;imageFileId?:string|null;altText?:string|null;tags:string[];sortOrder:number;isActive:boolean}
type F={search?:string;city?:string;category?:string;active?:string;limit?:number;offset?:number}
function whereFor(f:F){const c=[];if(f.city)c.push(eq(mapLocations.city,f.city));if(f.category)c.push(eq(mapLocations.category,f.category));if(f.active==='true')c.push(eq(mapLocations.isActive,true));if(f.active==='false')c.push(eq(mapLocations.isActive,false));if(f.search)c.push(or(ilike(mapLocations.name,`%${f.search}%`),ilike(mapLocations.shortDescription,`%${f.search}%`)));return c.length?and(...c):undefined}
export async function listLocations(db:DbLike,f:F){const q=db.select().from(mapLocations).where(whereFor(f)).orderBy(asc(mapLocations.sortOrder),asc(mapLocations.name));if(f.limit!==undefined)q.limit(f.limit);if(f.offset!==undefined)q.offset(f.offset);return q}
export async function countLocations(db:DbLike,f:Omit<F,'limit'|'offset'>){const r=await db.select({value:count()}).from(mapLocations).where(whereFor(f));return Number(r[0]?.value??0)}
export async function getLocation(db:DbLike,id:number){const r=await db.select().from(mapLocations).where(eq(mapLocations.id,id)).limit(1);return r[0]??null}
export async function getActiveLocation(db:DbLike,id:number){const r=await db.select().from(mapLocations).where(and(eq(mapLocations.id,id),eq(mapLocations.isActive,true))).limit(1);return r[0]??null}
export async function createLocation(db:DbLike,i:LocationInput){const r=await db.insert(mapLocations).values({...i,latitude:String(i.latitude),longitude:String(i.longitude),updatedAt:new Date()}).returning();return r[0]}
export async function updateLocation(db:DbLike,id:number,i:LocationInput){const r=await db.update(mapLocations).set({...i,latitude:String(i.latitude),longitude:String(i.longitude),updatedAt:new Date()}).where(eq(mapLocations.id,id)).returning();return r[0]??null}
export async function deleteLocation(db:DbLike,id:number){const r=await db.delete(mapLocations).where(eq(mapLocations.id,id)).returning({id:mapLocations.id});return r[0]??null}
