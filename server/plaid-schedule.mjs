export class PlaidSchedule{
 constructor({store,refresh,connected,now=()=>new Date(),timeZone=Intl.DateTimeFormat().resolvedOptions().timeZone}){Object.assign(this,{store,refresh,connected,now,timeZone});this.running=null;}
 async status(){return {hour:6,timeZone:this.timeZone,...await this.store.get('daily-plaid-refresh',{})};}
 tick(){if(this.running)return this.running;this.running=this.run().finally(()=>{this.running=null;});return this.running;}
 async run(){const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:this.timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'}).formatToParts(this.now()).map(p=>[p.type,p.value]));const day=parts.year+'-'+parts.month+'-'+parts.day;if(Number(parts.hour)<6)return;
 const previous=await this.store.get('daily-plaid-refresh',{});if(previous.day===day||!await this.connected())return;
 // Persist attempt before I/O; restarting cannot multiply scheduled API calls.
 const attempt={day,attemptedAt:this.now().toISOString(),state:'running'};await this.store.put('daily-plaid-refresh',attempt);
 try{const result=await this.refresh();await this.store.put('daily-plaid-refresh',{...attempt,state:result.accountSync?.notes.length?'review':'completed',finishedAt:this.now().toISOString()});return result;}
 catch{await this.store.put('daily-plaid-refresh',{...attempt,state:'failed',message:'Scheduled refresh failed. Use Refresh to retry.'});}
 }
}
