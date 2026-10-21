export class WorkspaceError extends Error {
  constructor(message:string,public status=400,public code="INVALID_WORKSPACE"){super(message);}
}
const reserved=new Set(["admin","api","auth","bookings","calendar","check-in","company-settings","dashboard","help","login","onboarding","parent","parties","playflow","pos","reports","settings","start","support","www"]);
export function businessTimezone(value:unknown){
  if(typeof value!=="string"||value.length>100)throw new WorkspaceError("Choose a valid business timezone.");
  const timezone=value.trim();
  if(timezone!=="UTC"&&!/^[A-Za-z_]+(?:\/[A-Za-z0-9_+.-]+)+$/.test(timezone))throw new WorkspaceError("Choose a valid business timezone.");
  try{new Intl.DateTimeFormat("en-US",{timeZone:timezone}).format();}catch{throw new WorkspaceError("Choose a valid business timezone.");}
  return timezone;
}
export function businessProfileFields(input:unknown){
  if(!input||typeof input!=="object"||Array.isArray(input))throw new WorkspaceError("Enter your business details.");
  const body=input as Record<string,unknown>;
  const text=(key:string,max:number)=>{const value=body[key];if(value==null)return null;if(typeof value!=="string"||value.length>max)throw new WorkspaceError(`Enter a valid ${key}.`);return value.trim()||null;};
  const name=text("name",120);if(!name)throw new WorkspaceError("Business name is required.");
  const email=text("email",254);if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new WorkspaceError("Enter a valid business email.");
  const website=text("website",2048);if(website){try{const url=new URL(website);if(!["http:","https:"].includes(url.protocol))throw new Error();}catch{throw new WorkspaceError("Use an http or https website address.");}}
  return {name,email,website,phone:text("phone",50),address1:text("address1",200),address2:text("address2",200),city:text("city",100),state:text("state",100),zip:text("zip",30),timezone:businessTimezone(body.timezone??"America/New_York")};
}
export function workspaceFields(input:unknown){
  if(!input||typeof input!=="object"||Array.isArray(input))throw new WorkspaceError("Enter your business details.");
  const body=input as Record<string,unknown>;
  const text=(key:string,max:number)=>{const value=body[key];if(typeof value!=="string"||!value.trim()||value.length>max)throw new WorkspaceError(`Enter a valid ${key}.`);return value.trim();};
  const name=text("name",120),slug=text("slug",60).toLowerCase(),timezone=businessTimezone(body.timezone);
  if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)||slug.length<3||reserved.has(slug))throw new WorkspaceError("Use 3–60 letters, numbers and single hyphens for your business address.");
  // The authenticated identity owns the workspace. Ignore client-supplied IDs or roles.
  return {name,slug,timezone};
}
export function suggestedSlug(name:string){return name.normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,60).replace(/-$/g,"");}
