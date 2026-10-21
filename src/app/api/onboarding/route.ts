import {NextResponse} from "next/server";
import {prisma} from "@/lib/prisma";
import {accessErrorResponse,assertSameOrigin,getVerifiedUser} from "@/lib/auth/staff";
import {provisionWorkspace} from "@/lib/workspaces/provision";
import {WorkspaceError} from "@/lib/workspaces/rules";
const headers={"Cache-Control":"private, no-store"};
function failure(error:unknown){
 if(error instanceof WorkspaceError)return NextResponse.json({error:error.message,code:error.code},{status:error.status,headers});
 if(error&&typeof error==="object"&&"code" in error&&error.code==="P2002")return NextResponse.json({error:"The account or business address was just registered. Refresh to check your workspace or choose another address.",code:"WORKSPACE_CONFLICT"},{status:409,headers});
 const response=accessErrorResponse(error);response.headers.set("Cache-Control","private, no-store");return response;
}
export async function GET(){try{
 const user=await getVerifiedUser();
 const employee=await prisma.employee.findUnique({where:{authUserId:user.id},select:{status:true,accessApproved:true,accessRole:true,tenant:{select:{name:true,slug:true}}}});
 const invitation=!employee&&!!await prisma.employee.findFirst({where:{email:{equals:user.email.trim(),mode:"insensitive"},authUserId:null,accessApproved:true,status:"ACTIVE"},select:{id:true}});
 return NextResponse.json({user:{name:user.name,email:user.email},workspace:employee?{name:employee.tenant.name,slug:employee.tenant.slug,active:employee.status==="ACTIVE"&&employee.accessApproved}:null,invitation,billing:{status:"NOT_AVAILABLE",message:"PlayFlow subscription billing is not active. Creating a workspace does not start a paid subscription."}},{headers});
}catch(error){return failure(error);}}
export async function POST(request:Request){try{
 assertSameOrigin(request);const user=await getVerifiedUser();
 const body=await request.json().catch(()=>null);
 const result=await prisma.$transaction(tx=>provisionWorkspace(tx,user,body,process.env.VERCEL_ENV==="production"?"live":"sandbox"),{maxWait:10000,timeout:15000});
 return NextResponse.json(result,{status:result.created?201:200,headers});
}catch(error){return failure(error);}}
