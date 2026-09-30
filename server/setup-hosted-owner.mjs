import {randomBytes} from 'node:crypto';
import {createInterface} from 'node:readline';
import {Writable} from 'node:stream';
import {createStore} from './store-factory.mjs';
import {hashPassword} from './owner-auth.mjs';

if(String(process.env.BUDGET_HQ_STORE||'').toLowerCase()!=='hosted'){
  console.error('BUDGET_HQ_STORE must be hosted.');
  process.exit(1);
}

let hidden=false;
const output=new Writable({
  write(chunk,encoding,callback){
    if(!hidden)process.stdout.write(chunk);
    callback();
  }
});
const rl=createInterface({input:process.stdin,output,terminal:true});
const ask=prompt=>new Promise(resolve=>{
  hidden=false;
  rl.question(prompt,value=>{
    hidden=false;
    process.stdout.write('\n');
    resolve(value);
  });
  hidden=true;
});

try{
  const password=await ask('Create the hosted Budget HQ password (at least 12 characters): ');
  const confirm=await ask('Enter it again: ');
  if(password.length<12||password.length>256||password!==confirm)
    throw Error('Passwords must match and contain 12–256 characters.');

  const salt=randomBytes(24).toString('hex');
  const owner={salt,hash:hashPassword(password,salt)};
  await createStore('owner-config').put('owner',owner);

  console.log('Hosted Budget HQ sign-in is ready.');
}catch(e){
  console.error(e.message);
  process.exitCode=1;
}finally{
  rl.close();
}
