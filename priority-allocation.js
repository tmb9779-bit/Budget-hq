export const allocationKeys=['debt','sinking','goals','wishes','flex'];
export const defaultAllocations={debt:35,sinking:15,goals:10,wishes:25,flex:15};

// Add 15 percentage points to the chosen goal's category. Divide the
// reduction among the other categories in their previous proportions.
export function boostAllocation(base,chosen,boost=15){
 if(!allocationKeys.includes(chosen))throw Error('Choose a goal category.');
 const weights=Object.fromEntries(allocationKeys.map(k=>[k,Number(base?.[k]??defaultAllocations[k])]));
 if(Object.values(weights).some(v=>!Number.isFinite(v)||v<0||v>100)||Math.abs(Object.values(weights).reduce((a,v)=>a+v,0)-100)>.001)throw Error('Allocation percentages must total 100%.');
 const increase=Math.min(boost,100-weights[chosen]),remainder=100-weights[chosen],out={...weights};
 out[chosen]=Math.round((weights[chosen]+increase)*100)/100;
 const others=allocationKeys.filter(k=>k!==chosen);
 if(remainder===0){for(const k of others)out[k]=0;return out;}
 let used=out[chosen];
 others.forEach((k,i)=>{out[k]=i===others.length-1?Math.round((100-used)*100)/100:Math.round((weights[k]*(remainder-increase)/remainder)*100)/100;used+=out[k];});
 return out;
}
