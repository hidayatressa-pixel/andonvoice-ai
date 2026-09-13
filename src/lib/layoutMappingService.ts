import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db, COLLECTIONS } from "./firebase";
import { IS_DEMO_MODE, cleanFirestorePayload } from "./firestoreService";
export interface LayoutMappingItem { lineId:string; row:number; column:number; sequence:number; }
const DEMO_KEY="layout_mapping_2d_demo_v1";
const normalize=(items:LayoutMappingItem[])=>items.filter(x=>x.lineId&&Number.isInteger(x.row)&&x.row>0&&Number.isInteger(x.column)&&x.column>0&&Number.isInteger(x.sequence)&&x.sequence>0).sort((a,b)=>a.sequence-b.sequence);
export function subscribeLayoutMapping(callback:(items:LayoutMappingItem[])=>void):()=>void {
 if(IS_DEMO_MODE){const emit=()=>{try{callback(normalize(JSON.parse(localStorage.getItem(DEMO_KEY)||"[]")))}catch{callback([])}};emit();window.addEventListener("layout-mapping-updated",emit);return()=>window.removeEventListener("layout-mapping-updated",emit);}
 return onSnapshot(doc(db,COLLECTIONS.CONFIG,"layout_mapping"),snap=>{const data=snap.exists()?snap.data():{};callback(normalize(Array.isArray(data.items)?data.items as LayoutMappingItem[]:[]));},()=>callback([]));
}
export async function saveLayoutMapping(items:LayoutMappingItem[],currentUser?:{role:string}):Promise<void>{if(!currentUser||currentUser.role!=="admin")throw new Error("Unauthorized: administrator privileges required.");const normalized=normalize(items);if(IS_DEMO_MODE){localStorage.setItem(DEMO_KEY,JSON.stringify(normalized));window.dispatchEvent(new Event("layout-mapping-updated"));return;}await setDoc(doc(db,COLLECTIONS.CONFIG,"layout_mapping"),cleanFirestorePayload({items:normalized,updatedAt:Date.now()}));}
