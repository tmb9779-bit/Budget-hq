import test from 'node:test';import assert from 'node:assert/strict';import {designDefaults,validateDesign} from '../design-schema.js';import {elementCSS,validateElements} from '../design-elements.js';
test('individual popup designs survive export and do not affect a second popup',()=>{const d=designDefaults();d.elements['dialog:plan-a-need:h2.0']={label:'My Need',icon:'target',states:{normal:{fontSize:26,weight:400,background:'#123456'},disabled:{text:'#999999'}}};const restored=validateDesign(JSON.parse(JSON.stringify(d)));assert.deepEqual(restored,d);const css=elementCSS('dialog:plan-a-need:h2.0',restored.elements['dialog:plan-a-need:h2.0']);assert.match(css,/font-size:26px/);assert.match(css,/:disabled/);assert.doesNotMatch(css,/dialog:financial-goal/);});
test('element import rejects selectors, injected styles, huge dimensions and unsupported states',()=>{for(const raw of [{'body > *':{states:{}}},{a:{states:{normal:{width:99999}}}},{a:{states:{normal:{text:'red;display:none'}}}},{a:{icon:'<svg>'}},{a:{states:{madeup:{}}}}])assert.throws(()=>validateElements(raw));});
test('legacy design files load without element settings and forced previews stay out of exports',()=>{const d=designDefaults();delete d.elements;assert.deepEqual(validateDesign(d).elements,{});assert.match(elementCSS('a',{states:{hover:{background:'#123456'}}},'hover'),/:hover,\[data-ui-element="a"\]/);assert.equal(JSON.stringify(validateDesign(d)).includes('forced'),false);});
test('removed elements round trip and hide only their own selector',()=>{const d=designDefaults(),key='dialog:delete-wishes:button.0';d.elements[key]={hidden:true,hiddenName:'Delete',states:{normal:{text:'#bc3249'}}};const restored=validateDesign(JSON.parse(JSON.stringify(d)));assert.deepEqual(restored,d);assert.match(elementCSS(key,restored.elements[key]),/\[data-ui-element="dialog:delete-wishes:button.0"\]\{display:none!important\}/);delete restored.elements[key].hidden;assert.doesNotMatch(elementCSS(key,restored.elements[key]),/display:none/);assert.throws(()=>validateElements({a:{hidden:'false',states:{}}}));});

test('a chosen text weight also unbolds the bold text inside the element',()=>{
 const css=elementCSS('card.1',{states:{normal:{weight:400}}});
 assert.match(css,/\[data-ui-element="card\.1"\]\{font-weight:400!important\}/);
 for(const tag of ['strong','b','h2','summary','label'])assert.ok(css.includes(tag),'inner '+tag+' follows the chosen weight');
 assert.match(css,/:is\(\[data-ui-element="card\.1"\]\) :is\([^)]*\)\{font-weight:400!important\}/);
 assert.doesNotMatch(elementCSS('card.1',{states:{normal:{fontSize:16}}}),/font-weight/,'nothing changes unless a weight is chosen');
 for(const bad of [100,350,800,'700'])assert.throws(()=>validateElements({k:{states:{normal:{weight:bad}}}}),/weight/i,'only the offered weights are accepted');
 assert.deepEqual(validateElements({k:{states:{normal:{weight:400}}}}).k.states.normal,{weight:400});
});
