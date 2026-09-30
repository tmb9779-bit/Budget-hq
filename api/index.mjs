import {createStore} from '../server/store-factory.mjs';
import {storeNames} from '../server/config.mjs';

const send=(res,status,data)=>{
  res.statusCode=status;
  res.setHeader('Content-Type','application/json');
  res.setHeader('Cache-Control','no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.end(JSON.stringify(data));
};

export default async function handler(req,res){
  try{
    if(String(process.env.BUDGET_HQ_STORE||'').toLowerCase()!=='hosted'){
      return send(res,503,{
        ok:false,
        error:'Hosted storage is not enabled.'
      });
    }

    const url=new URL(req.url,'https://budget-hq.invalid');

    if(req.method==='GET' && url.pathname==='/api/health'){
      const store=createStore(storeNames.budget);
      const budget=await store.get('budget',null);

      return send(res,200,{
        ok:true,
        storage:'hosted',
        database:'connected',
        encryptedStore:'ready',
        budgetPresent:!!budget,
        migrationRequired:!budget
      });
    }

    return send(res,503,{
      ok:false,
      error:'Budget HQ hosted migration is not complete yet.'
    });
  }catch(error){
    console.error('Budget HQ hosted request failed:',error);
    return send(res,500,{
      ok:false,
      error:'Hosted storage check failed.'
    });
  }
}
