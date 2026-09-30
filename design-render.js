// Mutation observers run before rendering. Disconnect during our own design writes
// so text/icon replacements cannot create an observer loop.
export function observeBeforePaint(root,apply,Observer=MutationObserver){
 if(!root)return null;
 const options={childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['open','data-design-dialog']};
 const observer=new Observer(()=>{observer.disconnect();try{apply();}finally{observer.observe(root,options);}});
 observer.observe(root,options);return observer;
}
