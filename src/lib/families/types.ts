import type {ParentProfile,ChildProfile} from "@/lib/parent/types";
export type FamilyParent=ParentProfile&{email:string|null;linked:boolean};
export type FamilyChild=ChildProfile&{active:boolean};
export type FamilyRecord={id:string;name:string;status:string;notes?:string|null;updatedAt:string;parents:FamilyParent[];children:FamilyChild[];totalParents:number;totalChildren:number};
export type FamilyChangeView={id:string;action:string;memberId:string|null;actorKind:string;actorName:string;changedFields:string[];needsNewWaiver:boolean;createdAt:string};
export type FamilyDetail={family:FamilyRecord;changes:FamilyChangeView[];canEdit:boolean;canManage:boolean};
export type FamilyMatch={id:string;name:string;status:string;parents:{id:string;firstName:string;lastName:string;email:string|null;phone:string|null}[];_count:{children:number}};
export type FamilyEditResult={saved:boolean;replayed?:boolean;needsNewWaiver?:boolean};
