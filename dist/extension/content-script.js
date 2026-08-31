(function(){var e=function(e){return e[e.ELEMENT_NODE=1]=`ELEMENT_NODE`,e[e.ATTRIBUTE_NODE=2]=`ATTRIBUTE_NODE`,e[e.TEXT_NODE=3]=`TEXT_NODE`,e[e.CDATA_SECTION_NODE=4]=`CDATA_SECTION_NODE`,e[e.PROCESSING_INSTRUCTION_NODE=7]=`PROCESSING_INSTRUCTION_NODE`,e[e.COMMENT_NODE=8]=`COMMENT_NODE`,e[e.DOCUMENT_NODE=9]=`DOCUMENT_NODE`,e[e.DOCUMENT_TYPE_NODE=10]=`DOCUMENT_TYPE_NODE`,e[e.DOCUMENT_FRAGMENT_NODE=11]=`DOCUMENT_FRAGMENT_NODE`,e}({}),t=class{nextId=1;nodeToIdMap=new WeakMap;idToNodeMap=new Map;identities=new Map;parentHistory=new Map;getOrCreateId(t,n=0){if(this.nodeToIdMap.has(t))return this.nodeToIdMap.get(t);let r=this.nextId++;this.nodeToIdMap.set(t,r),this.idToNodeMap.set(r,t);let i=t.nodeType===e.ELEMENT_NODE||t.nodeType===1?t:null,a=i&&i.tagName?i.tagName.toLowerCase():void 0,o=a?a.includes(`-`):!1,s={id:r,nodeType:t.nodeType,tagName:a,createdAt:n,initialSelectorHint:i?this.computeSelector(i):void 0,isCustomElement:o};return this.identities.set(r,s),r}getId(e){return this.nodeToIdMap.get(e)}getNode(e){return this.idToNodeMap.get(e)}getIdentity(e){return this.identities.get(e)}recordParent(e,t){if(!t)return;let n=this.parentHistory.get(e)||[];n[n.length-1]!==t&&(n.push(t),this.parentHistory.set(e,n))}getParentHistory(e){return this.parentHistory.get(e)||[]}computeSelector(e){try{if(e.id&&/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(e.id))return`#${e.id}`;let t=e.tagName.toLowerCase();if(t===`body`||t===`html`||t===`head`)return t;let n=``;if(e.classList&&e.classList.length>0){let t=Array.from(e.classList).filter(e=>/^[a-zA-Z0-9_-]+$/.test(e)&&!e.startsWith(`ng-`)&&!e.startsWith(`_ng`)).slice(0,3);t.length>0&&(n=`.`+t.join(`.`))}if(e.parentElement){let r=Array.from(e.parentElement.children).filter(e=>e.tagName.toLowerCase()===t);if(r.length>1){let i=r.indexOf(e)+1;return`${t}${n}:nth-of-type(${i})`}}return`${t}${n}`}catch{return e.tagName.toLowerCase()}}computeFullSelectorPath(e){let t=[],n=e;for(;n&&n.tagName&&n.tagName.toLowerCase()!==`html`;){let e=this.computeSelector(n);if(t.unshift(e),n.id&&/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(n.id))break;n=n.parentElement}return t.join(` > `)}removeNode(e){this.idToNodeMap.get(e)&&this.idToNodeMap.delete(e)}reset(){this.nextId=1,this.nodeToIdMap=new WeakMap,this.idToNodeMap.clear(),this.identities.clear(),this.parentHistory.clear()}},n={maskAllInputs:!1,maskInputTypes:[`password`,`hidden`,`tel`,`email`],maskSelectors:[`[data-private]`,`.private-data`,`.sensitive`,`[data-testid="sensitive"]`],blockSelectors:[`.recording-blocked`,`[data-recording-ignore]`],redactHeaders:[`authorization`,`cookie`,`set-cookie`,`x-api-key`,`proxy-authorization`,`token`],redactQueryParams:[`token`,`key`,`auth`,`secret`,`password`,`access_token`,`apiKey`,`bearer`],maxTextLength:1e5},r=class{config;constructor(e={}){this.config={...n,...e}}shouldBlockNode(e){if(!e||!e.matches)return!1;for(let t of this.config.blockSelectors)try{if(e.matches(t)||e.closest(t))return!0}catch{}return!1}shouldMaskText(e){if(!e||!e.matches)return!1;for(let t of this.config.maskSelectors)try{if(e.matches(t)||e.closest(t))return!0}catch{}return!1}maskValue(e,t,n){return e&&(this.config.maskAllInputs?`*`.repeat(Math.min(e.length,12)):t&&this.config.maskInputTypes.includes(t.toLowerCase())||n&&/(password|token|secret|cvv|credit|auth|ssn)/i.test(n)?`••••••••`:e)}sanitizeText(e,t=!1){return e&&(t?e.replace(/[^\s\n\r\t]/g,`*`):e.length>this.config.maxTextLength?e.substring(0,this.config.maxTextLength)+`... [TRUNCATED]`:e)}sanitizeHeaders(e){if(!e)return;let t={};for(let[n,r]of Object.entries(e)){let e=n.toLowerCase();t[n]=this.config.redactHeaders.some(t=>e.includes(t))?`[REDACTED]`:r}return t}sanitizeUrl(e){try{let t=new URL(e);for(let e of this.config.redactQueryParams)t.searchParams.has(e)&&t.searchParams.set(e,`[REDACTED]`);return t.toString()}catch{return e}}},i=class{currentSequence=0;sessionStartTime;sessionStartWallClock;constructor(){this.sessionStartTime=typeof performance<`u`?performance.now():0,this.sessionStartWallClock=Date.now()}nextSequence(){return this.currentSequence+=1,this.currentSequence}getSequence(){return this.currentSequence}getRelativeTimestamp(){return typeof performance<`u`?Math.round((performance.now()-this.sessionStartTime)*100)/100:Date.now()-this.sessionStartWallClock}getWallClock(){return Date.now()}generateEventId(e=`evt`){return`${e}_${this.nextSequence()}_${Math.random().toString(36).substring(2,8)}`}reset(){this.currentSequence=0,this.sessionStartTime=typeof performance<`u`?performance.now():0,this.sessionStartWallClock=Date.now()}},a=class{registry;privacy;sequenceCounter;constructor(e,t,n){this.registry=e,this.privacy=t,this.sequenceCounter=n}captureSnapshot(t=document,n=``){let r=this.sequenceCounter.getRelativeTimestamp(),i=this.sequenceCounter.nextSequence(),a={},o=t.documentElement||t.body,s=this.registry.getOrCreateId(t,r);if(a[s]={id:s,nodeType:e.DOCUMENT_NODE,tagName:`#document`,children:[],parentId:null},t.doctype){let n=this.registry.getOrCreateId(t.doctype,r);a[n]={id:n,nodeType:e.DOCUMENT_TYPE_NODE,tagName:t.doctype.name||`html`,parentId:s},a[s].children.push(n)}if(o){let e=this.serializeNode(o,s,a,r);e&&a[s].children.push(e)}let c=this.getViewportInfo();return{snapshotId:`snap_${i}_${Date.now()}`,sessionId:n,timestamp:r,sequence:i,rootId:s,nodes:a,title:t.title||``,url:typeof window<`u`?window.location.href:``,origin:typeof window<`u`?window.location.origin:``,viewport:c,doctype:t.doctype?t.doctype.name:void 0,totalNodeCount:Object.keys(a).length}}serializeNode(t,n,r,i){if(!t||t.nodeType===Node.ELEMENT_NODE&&this.privacy.shouldBlockNode(t))return null;let a=this.registry.getOrCreateId(t,i);this.registry.recordParent(a,n);let o={id:a,nodeType:t.nodeType,parentId:n};if(t.nodeType===Node.ELEMENT_NODE){let n=t;o.tagName=n.tagName.toLowerCase(),o.isCustomElement=o.tagName.includes(`-`),o.namespaceURI=n.namespaceURI;let s={};if(n.attributes)for(let e=0;e<n.attributes.length;e++){let t=n.attributes[e],r=t.value;if(t.name.toLowerCase()===`value`&&n.tagName.toLowerCase()===`input`){let e=n.getAttribute(`type`)||`text`;r=this.privacy.maskValue(r,e,n.getAttribute(`name`)||void 0)}s[t.name]=r}if(n.tagName.toLowerCase()===`input`){let e=n,t=e.type||`text`;s.value=this.privacy.maskValue(e.value,t,e.name),e.checked&&(s.checked=`true`)}else if(n.tagName.toLowerCase()===`textarea`){let e=n;o.textContent=this.privacy.maskValue(e.value,`textarea`,e.name)}else n.tagName.toLowerCase()===`select`&&(s.value=n.value);if(o.attributes=s,this.enrichElementMetrics(n,o),n.shadowRoot){o.isShadowHost=!0;let t=this.registry.getOrCreateId(n.shadowRoot,i),s={id:t,nodeType:e.DOCUMENT_FRAGMENT_NODE,isShadowRoot:!0,shadowMode:n.shadowRoot.mode,parentId:a,children:[]};r[t]=s;for(let e=0;e<n.shadowRoot.childNodes.length;e++){let a=n.shadowRoot.childNodes[e],o=this.serializeNode(a,t,r,i);o&&s.children.push(o)}}o.children=[];for(let e=0;e<n.childNodes.length;e++){let t=n.childNodes[e],s=this.serializeNode(t,a,r,i);s&&o.children.push(s)}}else if(t.nodeType===Node.TEXT_NODE){let e=t.parentElement,n=e?this.privacy.shouldMaskText(e):!1;o.textContent=this.privacy.sanitizeText(t.textContent||``,n)}else t.nodeType===Node.COMMENT_NODE&&(o.textContent=t.textContent||``);return r[a]=o,a}enrichElementMetrics(e,t){try{if(typeof window<`u`&&window.getComputedStyle){let n=window.getComputedStyle(e),r=n.display===`none`,i=n.visibility===`hidden`||n.visibility===`collapse`,a=parseFloat(n.opacity||`1`)===0;if(t.isHidden=r||i||a,e.getBoundingClientRect){let n=e.getBoundingClientRect();t.boundingClientRect={x:Math.round(n.x),y:Math.round(n.y),width:Math.round(n.width),height:Math.round(n.height),top:Math.round(n.top),left:Math.round(n.left),bottom:Math.round(n.bottom),right:Math.round(n.right)}}}}catch{}}getViewportInfo(){return typeof window>`u`?{width:1920,height:1080,scrollX:0,scrollY:0,devicePixelRatio:1}:{width:window.innerWidth||document.documentElement?.clientWidth||1920,height:window.innerHeight||document.documentElement?.clientHeight||1080,scrollX:window.scrollX||window.pageXOffset||0,scrollY:window.scrollY||window.pageYOffset||0,devicePixelRatio:window.devicePixelRatio||1}}},o=class{observer=null;registry;privacy;sequenceCounter;snapshotEngine;callback;sessionId;isObserving=!1;constructor(e,t,n,r,i,a=``){this.registry=e,this.privacy=t,this.sequenceCounter=n,this.snapshotEngine=r,this.callback=i,this.sessionId=a}setSessionId(e){this.sessionId=e}start(e=document){this.isObserving||typeof MutationObserver>`u`||(this.observer=new MutationObserver(this.handleMutations.bind(this)),this.observer.observe(e,{childList:!0,attributes:!0,characterData:!0,subtree:!0,attributeOldValue:!0,characterDataOldValue:!0}),this.isObserving=!0)}stop(){this.observer&&=(this.observer.disconnect(),null),this.isObserving=!1}takeRecords(){if(this.observer){let e=this.observer.takeRecords();e.length>0&&this.handleMutations(e)}}handleMutations(e){let t=this.sequenceCounter.getRelativeTimestamp(),n=this.sequenceCounter.getWallClock();for(let r=0;r<e.length;r++){let i=e[r];try{switch(i.type){case`childList`:this.handleChildListMutation(i,t,n);break;case`attributes`:this.handleAttributeMutation(i,t,n);break;case`characterData`:this.handleCharacterDataMutation(i,t,n)}}catch(e){typeof console<`u`&&console.error(`[DOMMutationObserver] Error processing mutation:`,e)}}}handleChildListMutation(e,t,n){let r=e.target,i=this.registry.getOrCreateId(r,t),a=r.nodeType===Node.ELEMENT_NODE?r:null;if(a&&this.registry.computeSelector(a),e.removedNodes&&e.removedNodes.length>0)for(let r=0;r<e.removedNodes.length;r++){let a=e.removedNodes[r],o=this.registry.getId(a);if(!o)continue;let s=a.nodeType===Node.ELEMENT_NODE,c=s?a:null,l=c?this.registry.computeSelector(c):void 0,u=this.sequenceCounter.nextSequence(),d={id:this.sequenceCounter.generateEventId(`mut_rem`),sessionId:this.sessionId,timestamp:t,sequence:u,wallClockTime:n,type:`DOM_MUTATION_REMOVE`,category:`DOM`,source:`BROWSER_RUNTIME`,targetNodeId:o,targetSelector:l,payload:{nodeId:o,tagName:c?c.tagName.toLowerCase():void 0,parentId:i,index:r,selectorHint:l,removedSubtreeNodeCount:s?c.querySelectorAll(`*`).length+1:1}};this.callback(d)}if(e.addedNodes&&e.addedNodes.length>0)for(let r=0;r<e.addedNodes.length;r++){let a=e.addedNodes[r];if(a.nodeType===Node.ELEMENT_NODE&&this.privacy.shouldBlockNode(a))continue;let o={},s=this.snapshotEngine.serializeNode(a,i,o,t);if(!s||!o[s])continue;let c=e.previousSibling?this.registry.getId(e.previousSibling):null,l=e.nextSibling?this.registry.getId(e.nextSibling):null,u=a.nodeType===Node.ELEMENT_NODE?a:null,d=u?this.registry.computeSelector(u):void 0,f=this.sequenceCounter.nextSequence(),p={id:this.sequenceCounter.generateEventId(`mut_add`),sessionId:this.sessionId,timestamp:t,sequence:f,wallClockTime:n,type:`DOM_MUTATION_ADD`,category:`DOM`,source:`BROWSER_RUNTIME`,targetNodeId:s,targetSelector:d,payload:{node:o[s],parentId:i,previousSiblingId:c,nextSiblingId:l,index:r}};this.callback(p)}}handleAttributeMutation(e,t,n){let r=e.target;if(r.nodeType!==Node.ELEMENT_NODE)return;let i=r;if(this.privacy.shouldBlockNode(i))return;let a=this.registry.getOrCreateId(i,t),o=e.attributeName;if(!o)return;let s=i.getAttribute(o);if(o.toLowerCase()===`value`&&i.tagName.toLowerCase()===`input`){let e=i;s=this.privacy.maskValue(e.value,e.type,e.name)}let c=e.oldValue;if(c===s)return;let l=this.registry.computeSelector(i),u=this.sequenceCounter.nextSequence(),d={id:this.sequenceCounter.generateEventId(`mut_attr`),sessionId:this.sessionId,timestamp:t,sequence:u,wallClockTime:n,type:`DOM_MUTATION_ATTR`,category:`DOM`,source:`BROWSER_RUNTIME`,targetNodeId:a,targetSelector:l,payload:{nodeId:a,attributeName:o,oldValue:c,newValue:s,selectorHint:l}};this.callback(d)}handleCharacterDataMutation(e,t,n){let r=e.target,i=this.registry.getOrCreateId(r,t),a=r.parentElement,o=a&&this.registry.getId(a)||null,s=a?this.privacy.shouldMaskText(a):!1,c=r.textContent||``,l=this.privacy.sanitizeText(c,s),u=e.oldValue?this.privacy.sanitizeText(e.oldValue,s):``;if(u===l)return;let d=this.sequenceCounter.nextSequence(),f={id:this.sequenceCounter.generateEventId(`mut_txt`),sessionId:this.sessionId,timestamp:t,sequence:d,wallClockTime:n,type:`DOM_MUTATION_TEXT`,category:`DOM`,source:`BROWSER_RUNTIME`,targetNodeId:i,targetSelector:a?this.registry.computeSelector(a):void 0,payload:{nodeId:i,parentId:o,oldText:u,newText:l}};this.callback(f)}},s=class{registry;privacy;sequenceCounter;callback;sessionId;isListening=!1;cleanups=[];constructor(e,t,n,r,i=``){this.registry=e,this.privacy=t,this.sequenceCounter=n,this.callback=r,this.sessionId=i}setSessionId(e){this.sessionId=e}start(){this.isListening||typeof window>`u`||typeof document>`u`||(this.isListening=!0,this.cleanups=[],this.attachUserEventListeners(),this.attachNavigationListeners(),this.attachViewportListeners())}stop(){this.cleanups.forEach(e=>{try{e()}catch{}}),this.cleanups=[],this.isListening=!1}attachUserEventListeners(){[{type:`click`,handler:e=>this.handlePointerEvent(e,`USER_CLICK`),options:{capture:!0,passive:!0}},{type:`dblclick`,handler:e=>this.handlePointerEvent(e,`USER_DBLCLICK`),options:{capture:!0,passive:!0}},{type:`input`,handler:e=>this.handleInputEvent(e),options:{capture:!0,passive:!0}},{type:`change`,handler:e=>this.handleInputEvent(e,`USER_CHANGE`),options:{capture:!0,passive:!0}},{type:`submit`,handler:e=>this.handleSubmitEvent(e),options:{capture:!0,passive:!0}},{type:`keydown`,handler:e=>this.handleKeyboardEvent(e,`USER_KEYDOWN`),options:{capture:!0,passive:!0}},{type:`keyup`,handler:e=>this.handleKeyboardEvent(e,`USER_KEYUP`),options:{capture:!0,passive:!0}},{type:`focus`,handler:e=>this.handleFocusBlurEvent(e,`USER_FOCUS`),options:{capture:!0,passive:!0}},{type:`blur`,handler:e=>this.handleFocusBlurEvent(e,`USER_BLUR`),options:{capture:!0,passive:!0}}].forEach(({type:e,handler:t,options:n})=>{document.addEventListener(e,t,n),this.cleanups.push(()=>document.removeEventListener(e,t,n))})}handlePointerEvent(e,t){let n=e,r=e.target,i=this.sequenceCounter.getRelativeTimestamp(),a=this.sequenceCounter.getWallClock(),o=r?this.registry.getOrCreateId(r,i):void 0,s=r&&r.nodeType===Node.ELEMENT_NODE?this.registry.computeSelector(r):void 0,c=this.sequenceCounter.nextSequence(),l={id:this.sequenceCounter.generateEventId(`usr_clk`),sessionId:this.sessionId,timestamp:i,sequence:c,wallClockTime:a,type:t,category:`USER`,source:`USER_INTERACTION`,targetNodeId:o,targetSelector:s,payload:{eventType:e.type,targetNodeId:o,targetSelector:s,clientX:n.clientX,clientY:n.clientY,button:n.button,isTrusted:e.isTrusted}};this.callback(l)}handleInputEvent(e,t=`USER_INPUT`){let n=e.target;if(!n)return;let r=this.sequenceCounter.getRelativeTimestamp(),i=this.sequenceCounter.getWallClock(),a=this.registry.getOrCreateId(n,r),o=this.registry.computeSelector(n),s=``;if(n.tagName.toLowerCase()===`input`){let e=n;s=this.privacy.maskValue(e.value,e.type,e.name)}else if(n.tagName.toLowerCase()===`textarea`){let e=n;s=this.privacy.maskValue(e.value,`textarea`,e.name)}else n.tagName.toLowerCase()===`select`&&(s=n.value);let c=this.sequenceCounter.nextSequence(),l={id:this.sequenceCounter.generateEventId(`usr_inp`),sessionId:this.sessionId,timestamp:r,sequence:c,wallClockTime:i,type:t,category:`USER`,source:`USER_INTERACTION`,targetNodeId:a,targetSelector:o,payload:{eventType:e.type,targetNodeId:a,targetSelector:o,inputValue:s,isTrusted:e.isTrusted}};this.callback(l)}handleSubmitEvent(e){let t=e.target,n=this.sequenceCounter.getRelativeTimestamp(),r=this.sequenceCounter.getWallClock(),i=t?this.registry.getOrCreateId(t,n):void 0,a=t?this.registry.computeSelector(t):void 0,o=this.sequenceCounter.nextSequence(),s={id:this.sequenceCounter.generateEventId(`usr_sub`),sessionId:this.sessionId,timestamp:n,sequence:o,wallClockTime:r,type:`USER_SUBMIT`,category:`USER`,source:`USER_INTERACTION`,targetNodeId:i,targetSelector:a,payload:{eventType:`submit`,targetNodeId:i,targetSelector:a}};this.callback(s)}handleKeyboardEvent(e,t){let n=e.target,r=this.sequenceCounter.getRelativeTimestamp(),i=this.sequenceCounter.getWallClock(),a=n?this.registry.getOrCreateId(n,r):void 0,o=n?this.registry.computeSelector(n):void 0,s=e.key;n&&n.tagName.toLowerCase()===`input`&&n.type===`password`&&(s=`*`);let c=this.sequenceCounter.nextSequence(),l={id:this.sequenceCounter.generateEventId(`usr_key`),sessionId:this.sessionId,timestamp:r,sequence:c,wallClockTime:i,type:t,category:`USER`,source:`USER_INTERACTION`,targetNodeId:a,targetSelector:o,payload:{eventType:e.type,targetNodeId:a,targetSelector:o,key:s,code:e.code,isTrusted:e.isTrusted}};this.callback(l)}handleFocusBlurEvent(e,t){let n=e.target,r=this.sequenceCounter.getRelativeTimestamp(),i=this.sequenceCounter.getWallClock(),a=n?this.registry.getOrCreateId(n,r):void 0,o=n?this.registry.computeSelector(n):void 0,s=this.sequenceCounter.nextSequence(),c={id:this.sequenceCounter.generateEventId(`usr_foc`),sessionId:this.sessionId,timestamp:r,sequence:s,wallClockTime:i,type:t,category:`USER`,source:`USER_INTERACTION`,targetNodeId:a,targetSelector:o,payload:{eventType:e.type,targetNodeId:a,targetSelector:o}};this.callback(c)}attachNavigationListeners(){if(typeof window>`u`||!window.history)return;let e=window.history.pushState,t=window.history.replaceState;window.history.pushState=(...t)=>{let n=e.apply(window.history,t);return this.recordNavigation(`pushState`,window.location.href,t[0],t[2]?String(t[2]):void 0),n},window.history.replaceState=(...e)=>{let n=t.apply(window.history,e);return this.recordNavigation(`replaceState`,window.location.href,e[0],e[2]?String(e[2]):void 0),n};let n=e=>{this.recordNavigation(`popstate`,window.location.href,e.state)};window.addEventListener(`popstate`,n);let r=e=>{this.recordNavigation(`hashchange`,e.newURL,void 0,void 0,e.oldURL)};window.addEventListener(`hashchange`,r);let i=()=>{this.recordNavigation(`visibilitychange`,window.location.href,{visibilityState:document.visibilityState,hidden:document.hidden})};document.addEventListener(`visibilitychange`,i),this.cleanups.push(()=>{window.history.pushState=e,window.history.replaceState=t,window.removeEventListener(`popstate`,n),window.removeEventListener(`hashchange`,r),document.removeEventListener(`visibilitychange`,i)})}recordNavigation(e,t,n,r,i){let a=this.sequenceCounter.getRelativeTimestamp(),o=this.sequenceCounter.getWallClock(),s=this.sequenceCounter.nextSequence(),c={id:this.sequenceCounter.generateEventId(`nav`),sessionId:this.sessionId,timestamp:a,sequence:s,wallClockTime:o,type:`NAV_${e.toUpperCase()}`,category:`NAVIGATION`,source:`PAGE`,payload:{navigationType:e,url:this.privacy.sanitizeUrl(t),previousUrl:i?this.privacy.sanitizeUrl(i):void 0,state:n,title:r||document.title}};this.callback(c)}attachViewportListeners(){if(typeof window>`u`)return;let e=null,t=()=>{e&&clearTimeout(e),e=setTimeout(()=>{let e=this.sequenceCounter.getRelativeTimestamp(),t=this.sequenceCounter.getWallClock(),n=this.sequenceCounter.nextSequence(),r={id:this.sequenceCounter.generateEventId(`vp_res`),sessionId:this.sessionId,timestamp:e,sequence:n,wallClockTime:t,type:`VIEWPORT_RESIZE`,category:`VIEWPORT`,source:`BROWSER_RUNTIME`,payload:{width:window.innerWidth,height:window.innerHeight,devicePixelRatio:window.devicePixelRatio}};this.callback(r)},100)};window.addEventListener(`resize`,t,{passive:!0});let n=null,r=()=>{n&&clearTimeout(n),n=setTimeout(()=>{let e=this.sequenceCounter.getRelativeTimestamp(),t=this.sequenceCounter.getWallClock(),n=this.sequenceCounter.nextSequence(),r={id:this.sequenceCounter.generateEventId(`vp_scr`),sessionId:this.sessionId,timestamp:e,sequence:n,wallClockTime:t,type:`VIEWPORT_SCROLL`,category:`VIEWPORT`,source:`BROWSER_RUNTIME`,payload:{scrollX:window.scrollX,scrollY:window.scrollY}};this.callback(r)},100)};window.addEventListener(`scroll`,r,{passive:!0}),this.cleanups.push(()=>{e&&clearTimeout(e),n&&clearTimeout(n),window.removeEventListener(`resize`,t),window.removeEventListener(`scroll`,r)})}},c=class{privacy;sequenceCounter;callback;sessionId;isInstrumented=!1;originalConsole={};originalOnError=null;cleanups=[];constructor(e,t,n,r=``){this.privacy=e,this.sequenceCounter=t,this.callback=n,this.sessionId=r}setSessionId(e){this.sessionId=e}start(){this.isInstrumented||typeof window>`u`||(this.isInstrumented=!0,this.cleanups=[],this.instrumentConsole(),this.instrumentGlobalErrors(),this.instrumentUnhandledRejections())}stop(){this.cleanups.forEach(e=>{try{e()}catch{}}),this.cleanups=[],this.isInstrumented=!1}instrumentConsole(){typeof console>`u`||[`log`,`warn`,`error`,`info`,`debug`].forEach(e=>{let t=console[e];t&&(this.originalConsole[e]=t,console[e]=(...n)=>{try{this.recordConsole(e,n)}catch{}return t.apply(console,n)},this.cleanups.push(()=>{console[e]=t}))})}recordConsole(e,t){let n=this.sequenceCounter.getRelativeTimestamp(),r=this.sequenceCounter.getWallClock(),i=this.sequenceCounter.nextSequence(),a=t.map(e=>{let t=typeof e,n=``;try{n=e instanceof Error?`${e.name}: ${e.message}\n${e.stack||``}`:t===`object`&&e!==null?JSON.stringify(e,(e,t)=>typeof t==`function`?`[Function]`:t):String(e)}catch{n=`[Unserializable Object]`}return{type:t,value:this.privacy.sanitizeText(n)}}),o=a.map(e=>e.value).join(` `),s;try{let e=Error().stack;e&&(s=e.split(`
`).slice(2,8).join(`
`))}catch{}let c={id:this.sequenceCounter.generateEventId(`con`),sessionId:this.sessionId,timestamp:n,sequence:i,wallClockTime:r,type:`RUNTIME_CONSOLE_${e.toUpperCase()}`,category:e===`error`?`ERROR`:`CONSOLE`,source:`PAGE`,payload:{level:e,args:a,formattedMessage:o,stackTrace:s}};this.callback(c)}instrumentGlobalErrors(){if(typeof window>`u`)return;let e=e=>{let t=this.sequenceCounter.getRelativeTimestamp(),n=this.sequenceCounter.getWallClock(),r=this.sequenceCounter.nextSequence(),i={id:this.sequenceCounter.generateEventId(`err`),sessionId:this.sessionId,timestamp:t,sequence:r,wallClockTime:n,type:`RUNTIME_ERROR`,category:`ERROR`,source:`PAGE`,payload:{message:e.message||`Unknown runtime error`,filename:e.filename,lineno:e.lineno,colno:e.colno,stack:e.error?.stack||void 0,name:e.error?.name||`Error`}};this.callback(i)};window.addEventListener(`error`,e),this.cleanups.push(()=>window.removeEventListener(`error`,e))}instrumentUnhandledRejections(){if(typeof window>`u`)return;let e=e=>{let t=this.sequenceCounter.getRelativeTimestamp(),n=this.sequenceCounter.getWallClock(),r=this.sequenceCounter.nextSequence(),i=`Unhandled Promise Rejection`,a;if(e.reason instanceof Error)i=e.reason.message,a=e.reason.stack;else if(typeof e.reason==`string`)i=e.reason;else if(e.reason)try{i=JSON.stringify(e.reason)}catch{i=String(e.reason)}let o={id:this.sequenceCounter.generateEventId(`rej`),sessionId:this.sessionId,timestamp:t,sequence:r,wallClockTime:n,type:`RUNTIME_UNHANDLED_REJECTION`,category:`ERROR`,source:`PAGE`,payload:{message:i,stack:a,isUnhandledRejection:!0}};this.callback(o)};window.addEventListener(`unhandledrejection`,e),this.cleanups.push(()=>window.removeEventListener(`unhandledrejection`,e))}},l=class{privacy;sequenceCounter;callback;sessionId;isInstrumented=!1;originalFetch=null;originalXHROpen=null;originalXHRSend=null;cleanups=[];constructor(e,t,n,r=``){this.privacy=e,this.sequenceCounter=t,this.callback=n,this.sessionId=r}setSessionId(e){this.sessionId=e}start(){this.isInstrumented||typeof window>`u`||(this.isInstrumented=!0,this.cleanups=[],this.instrumentFetch(),this.instrumentXHR())}stop(){this.cleanups.forEach(e=>{try{e()}catch{}}),this.cleanups=[],this.isInstrumented=!1}instrumentFetch(){if(typeof window.fetch!=`function`)return;this.originalFetch=window.fetch;let e=this;window.fetch=async function(...t){let n=e.sequenceCounter.generateEventId(`req_f`),r=t[0],i=t[1],a=``;typeof r==`string`?a=r:r instanceof URL?a=r.toString():r&&typeof r==`object`&&`url`in r&&(a=r.url);let o=(i?.method||(typeof r==`object`&&`method`in r?r.method:`GET`)).toUpperCase(),s=e.privacy.sanitizeUrl(a),c=e.sequenceCounter.getRelativeTimestamp(),l=e.sequenceCounter.getWallClock(),u=e.sequenceCounter.nextSequence(),d={id:n,sessionId:e.sessionId,timestamp:c,sequence:u,wallClockTime:l,type:`NETWORK_REQUEST_START`,category:`NETWORK`,source:`PAGE`,payload:{requestId:n,url:s,method:o,resourceType:`fetch`,hasBody:!!i?.body}};e.callback(d);try{let r=await e.originalFetch.apply(this,t),i=e.sequenceCounter.getRelativeTimestamp(),a=e.sequenceCounter.getWallClock(),l=e.sequenceCounter.nextSequence(),u=Math.max(0,Math.round((i-c)*100)/100),d={id:e.sequenceCounter.generateEventId(`res_f`),sessionId:e.sessionId,timestamp:i,sequence:l,wallClockTime:a,type:`NETWORK_RESPONSE_COMPLETE`,category:`NETWORK`,source:`PAGE`,causality:{triggeredBy:n,precededBy:n},payload:{requestId:n,url:s,method:o,status:r.status,statusText:r.statusText,durationMs:u}};return e.callback(d),r}catch(t){let r=e.sequenceCounter.getRelativeTimestamp(),i=e.sequenceCounter.getWallClock(),a=e.sequenceCounter.nextSequence(),l=Math.max(0,Math.round((r-c)*100)/100),u={id:e.sequenceCounter.generateEventId(`res_err`),sessionId:e.sessionId,timestamp:r,sequence:a,wallClockTime:i,type:`NETWORK_REQUEST_FAILED`,category:`NETWORK`,source:`PAGE`,causality:{triggeredBy:n,precededBy:n},payload:{requestId:n,url:s,method:o,status:0,statusText:`Failed`,durationMs:l,error:t?.message||`Network request failed`}};throw e.callback(u),t}},this.cleanups.push(()=>{this.originalFetch&&(window.fetch=this.originalFetch)})}instrumentXHR(){if(typeof XMLHttpRequest>`u`)return;this.originalXHROpen=XMLHttpRequest.prototype.open,this.originalXHRSend=XMLHttpRequest.prototype.send;let e=this;XMLHttpRequest.prototype.open=function(t,n,...r){return this._forensicRequestId=e.sequenceCounter.generateEventId(`req_x`),this._forensicMethod=(t||`GET`).toUpperCase(),this._forensicUrl=typeof n==`string`?n:n.toString(),e.originalXHROpen.apply(this,[t,n,...r])},XMLHttpRequest.prototype.send=function(t){let n=this._forensicRequestId||e.sequenceCounter.generateEventId(`req_x`),r=this._forensicMethod||`GET`,i=e.privacy.sanitizeUrl(this._forensicUrl||``),a=e.sequenceCounter.getRelativeTimestamp(),o=e.sequenceCounter.getWallClock(),s=e.sequenceCounter.nextSequence();this._forensicStartTime=a;let c={id:n,sessionId:e.sessionId,timestamp:a,sequence:s,wallClockTime:o,type:`NETWORK_REQUEST_START`,category:`NETWORK`,source:`PAGE`,payload:{requestId:n,url:i,method:r,resourceType:`xhr`,hasBody:!!t}};e.callback(c);let l=()=>{let t=e.sequenceCounter.getRelativeTimestamp(),o=e.sequenceCounter.getWallClock(),s=e.sequenceCounter.nextSequence(),c=Math.max(0,Math.round((t-(this._forensicStartTime||a))*100)/100),l={id:e.sequenceCounter.generateEventId(`res_x`),sessionId:e.sessionId,timestamp:t,sequence:s,wallClockTime:o,type:this.status>=200&&this.status<400?`NETWORK_RESPONSE_COMPLETE`:`NETWORK_REQUEST_FAILED`,category:`NETWORK`,source:`PAGE`,causality:{triggeredBy:n,precededBy:n},payload:{requestId:n,url:i,method:r,status:this.status,statusText:this.statusText,durationMs:c,error:this.status===0?`XHR Network Error or Aborted`:void 0}};e.callback(l)};return this.addEventListener(`load`,l),this.addEventListener(`error`,l),this.addEventListener(`abort`,l),e.originalXHRSend.apply(this,[t])},this.cleanups.push(()=>{this.originalXHROpen&&(XMLHttpRequest.prototype.open=this.originalXHROpen),this.originalXHRSend&&(XMLHttpRequest.prototype.send=this.originalXHRSend)})}},u=class{sequenceCounter;registry;privacy;snapshotEngine;mutationObserver;eventCollector;diagnostics;networkMonitor;metadata;isRecording=!1;isPaused=!1;eventListeners=new Set;checkpointListeners=new Set;lastCheckpointSequence=0;lastCheckpointTimestamp=0;checkpointTimer=null;checkpointIntervalEvents=200;checkpointIntervalMs=3e4;constructor(e={}){this.sequenceCounter=new i,this.registry=new t,this.privacy=new r(e.privacy),this.snapshotEngine=new a(this.registry,this.privacy,this.sequenceCounter);let n=e=>this.handleEvent(e);this.mutationObserver=new o(this.registry,this.privacy,this.sequenceCounter,this.snapshotEngine,n),this.eventCollector=new s(this.registry,this.privacy,this.sequenceCounter,n),this.diagnostics=new c(this.privacy,this.sequenceCounter,n),this.networkMonitor=new l(this.privacy,this.sequenceCounter,n),e.checkpointIntervalEvents&&(this.checkpointIntervalEvents=e.checkpointIntervalEvents),e.checkpointIntervalMs&&(this.checkpointIntervalMs=e.checkpointIntervalMs);let u=e.sessionId||`session_${Date.now()}_${Math.random().toString(36).substring(2,7)}`;this.metadata=this.createInitialMetadata(u,e.sessionName)}getSessionId(){return this.metadata.id}getMetadata(){return{...this.metadata,durationMs:this.sequenceCounter.getRelativeTimestamp(),endTime:this.metadata.endTime||Date.now()}}getRegistry(){return this.registry}onEvent(e){return this.eventListeners.add(e),()=>this.eventListeners.delete(e)}onCheckpoint(e){return this.checkpointListeners.add(e),()=>this.checkpointListeners.delete(e)}start(e=typeof document<`u`?document:{}){if(this.isRecording)throw Error(`Recorder session ${this.metadata.id} is already active`);this.sequenceCounter.reset(),this.registry.reset(),this.isRecording=!0,this.isPaused=!1,this.metadata.status=`recording`,this.metadata.startTime=Date.now(),this.mutationObserver.setSessionId(this.metadata.id),this.eventCollector.setSessionId(this.metadata.id),this.diagnostics.setSessionId(this.metadata.id),this.networkMonitor.setSessionId(this.metadata.id);let t=this.snapshotEngine.captureSnapshot(e,this.metadata.id);this.metadata.stats.nodeCount=t.totalNodeCount;let n={id:this.sequenceCounter.generateEventId(`snap_init`),sessionId:this.metadata.id,timestamp:t.timestamp,sequence:t.sequence,wallClockTime:Date.now(),type:`DOM_SNAPSHOT`,category:`DOM`,source:`PAGE`,payload:{snapshot:t}};return this.createCheckpoint(t,`INITIAL`),this.mutationObserver.start(e),this.eventCollector.start(),this.diagnostics.start(),this.networkMonitor.start(),this.handleEvent(n),this.checkpointIntervalMs>0&&typeof setInterval<`u`&&(this.checkpointTimer=setInterval(()=>{this.isRecording&&!this.isPaused&&this.captureCheckpoint(`PERIODIC`,e)},this.checkpointIntervalMs)),t}stop(){return this.isRecording?(this.mutationObserver.takeRecords(),this.mutationObserver.stop(),this.eventCollector.stop(),this.diagnostics.stop(),this.networkMonitor.stop(),this.checkpointTimer&&=(clearInterval(this.checkpointTimer),null),this.isRecording=!1,this.metadata.status=`stopped`,this.metadata.endTime=Date.now(),this.metadata.durationMs=this.sequenceCounter.getRelativeTimestamp(),this.getMetadata()):this.getMetadata()}pause(){!this.isRecording||this.isPaused||(this.isPaused=!0,this.metadata.status=`paused`)}resume(){!this.isRecording||!this.isPaused||(this.isPaused=!1,this.metadata.status=`recording`)}captureCheckpoint(e=`MANUAL`,t=document){if(!this.isRecording)return null;let n=this.snapshotEngine.captureSnapshot(t,this.metadata.id);return this.createCheckpoint(n,e)}recordCustomEvent(e,t,n,r){let i=this.sequenceCounter.getRelativeTimestamp(),a=this.sequenceCounter.getWallClock(),o=this.sequenceCounter.nextSequence(),s={id:this.sequenceCounter.generateEventId(`ext`),sessionId:this.metadata.id,timestamp:i,sequence:o,wallClockTime:a,type:e,category:`EXTENSION`,source:`CONTENT_SCRIPT`,targetNodeId:n,targetSelector:r,payload:t};return this.handleEvent(s),s}recordScreenshot(e,t=`MANUAL`){let n=this.sequenceCounter.getRelativeTimestamp(),r=this.sequenceCounter.getWallClock(),i=this.sequenceCounter.nextSequence(),a={id:this.sequenceCounter.generateEventId(`scr`),sessionId:this.metadata.id,timestamp:n,sequence:i,wallClockTime:r,type:`SCREENSHOT_CHECKPOINT`,category:`SCREENSHOT`,source:`BROWSER_RUNTIME`,payload:{screenshotId:`shot_${i}`,dataUrl:e,viewport:{width:typeof window<`u`?window.innerWidth:1920,height:typeof window<`u`?window.innerHeight:1080,scrollX:typeof window<`u`?window.scrollX:0,scrollY:typeof window<`u`?window.scrollY:0,devicePixelRatio:typeof window<`u`?window.devicePixelRatio:1},triggerReason:t}};return this.handleEvent(a),a}addAnnotation(e,t,n=`AGENT`,r){let i=this.sequenceCounter.getRelativeTimestamp(),a=this.sequenceCounter.nextSequence(),o={id:`ann_${a}_${Math.random().toString(36).substring(2,6)}`,sessionId:this.metadata.id,timestamp:i,sequence:a,nodeId:r,author:n,label:e,comment:t,createdAt:Date.now()},s={id:o.id,sessionId:this.metadata.id,timestamp:i,sequence:a,wallClockTime:Date.now(),type:`ANNOTATION`,category:`ANNOTATION`,source:n===`USER`?`USER_INTERACTION`:`BROWSER_RUNTIME`,targetNodeId:r,payload:{annotation:o}};return this.handleEvent(s),o}createCheckpoint(e,t){let n=this.sequenceCounter.getSequence()-this.lastCheckpointSequence;this.lastCheckpointSequence=this.sequenceCounter.getSequence(),this.lastCheckpointTimestamp=e.timestamp,this.metadata.stats.checkpointCount+=1;let r={checkpointId:`chk_${e.sequence}_${Date.now()}`,sessionId:this.metadata.id,timestamp:e.timestamp,sequence:e.sequence,wallClockTime:Date.now(),snapshot:e,eventIndex:this.metadata.stats.eventCount,eventsSinceLastCheckpoint:n,trigger:t},i={id:r.checkpointId,sessionId:this.metadata.id,timestamp:e.timestamp,sequence:e.sequence,wallClockTime:r.wallClockTime,type:`CHECKPOINT`,category:`CHECKPOINT`,source:`BROWSER_RUNTIME`,payload:{checkpointId:r.checkpointId,snapshot:e,eventsSinceLastCheckpoint:n,totalEventsSoFar:this.metadata.stats.eventCount}};return this.checkpointListeners.forEach(e=>{try{e(r)}catch(e){console.error(`[ForensicRecorder] Checkpoint listener error:`,e)}}),this.handleEvent(i),r}handleEvent(e){this.isPaused&&e.type!==`CHECKPOINT`&&e.type!==`ANNOTATION`||(this.metadata.stats.eventCount+=1,e.category===`DOM`&&(this.metadata.stats.mutationCount+=1),e.category===`ERROR`&&(this.metadata.stats.errorCount+=1),e.category===`CONSOLE`&&(this.metadata.stats.consoleCount+=1),e.category===`NETWORK`&&(this.metadata.stats.networkCount+=1),e.category===`SCREENSHOT`&&(this.metadata.stats.screenshotCount+=1),this.isRecording&&e.type!==`CHECKPOINT`&&e.type!==`DOM_SNAPSHOT`&&this.sequenceCounter.getSequence()-this.lastCheckpointSequence>=this.checkpointIntervalEvents&&typeof document<`u`&&this.captureCheckpoint(`PERIODIC`),this.eventListeners.forEach(t=>{try{t(e)}catch(e){console.error(`[ForensicRecorder] Event listener error:`,e)}}))}createInitialMetadata(e,t){let n={domRecording:typeof MutationObserver<`u`?`HEALTHY`:`UNAVAILABLE`,userEvents:typeof window<`u`?`HEALTHY`:`UNAVAILABLE`,console:typeof console<`u`?`HEALTHY`:`UNAVAILABLE`,network:typeof window<`u`&&window.fetch!==void 0?`HEALTHY`:`PARTIAL`,screenshots:`HEALTHY`,shadowDom:typeof Element<`u`&&`attachShadow`in Element.prototype?`HEALTHY`:`RESTRICTED`,iframes:`PARTIAL`};return{id:e,name:t||`Recording ${new Date().toLocaleTimeString()}`,url:typeof window<`u`?window.location.href:`about:blank`,origin:typeof window<`u`?window.location.origin:``,title:typeof document<`u`?document.title:`Forensic Session`,userAgent:typeof navigator<`u`?navigator.userAgent:`Node.js/ForensicAgent`,schemaVersion:`2.0.0`,recorderVersion:`2.0.0`,extensionVersion:`2.0.0`,startTime:Date.now(),status:`recording`,health:n,stats:{eventCount:0,mutationCount:0,errorCount:0,consoleCount:0,networkCount:0,checkpointCount:0,screenshotCount:0,nodeCount:0}}}},d=class{hostElement=null;shadowRoot=null;callbacks;isRecording=!1;isPaused=!1;isMinimized=!1;startTime=0;eventCount=0;timerInterval=null;isDragging=!1;dragStartX=0;dragStartY=0;posX=window.innerWidth-340;posY=40;constructor(e){this.callbacks=e,this.loadPosition()}mount(){this.hostElement&&document.body.contains(this.hostElement)||(this.hostElement=document.createElement(`div`),this.hostElement.id=`forensic-recorder-floating-host`,this.hostElement.style.all=`initial`,this.hostElement.style.position=`fixed`,this.hostElement.style.zIndex=`2147483647`,this.hostElement.style.left=`${this.posX}px`,this.hostElement.style.top=`${this.posY}px`,this.shadowRoot=this.hostElement.attachShadow({mode:`open`}),this.render(),this.attachEvents(),(document.body||document.documentElement).appendChild(this.hostElement))}unmount(){this.timerInterval&&=(clearInterval(this.timerInterval),null),this.hostElement&&this.hostElement.parentNode&&this.hostElement.parentNode.removeChild(this.hostElement),this.hostElement=null,this.shadowRoot=null}updateState(e,t=!1,n=0,r=0){this.isRecording=e,this.isPaused=t,this.startTime=n||(e?Date.now():0),this.eventCount=r,this.shadowRoot&&(this.render(),this.attachEvents()),this.isRecording&&!this.isPaused?this.startTimer():this.stopTimer()}incrementEventCount(){this.eventCount++;let e=this.shadowRoot?.querySelector(`#evt-badge`);e&&(e.textContent=`${this.eventCount} evts`)}startTimer(){this.stopTimer(),this.timerInterval=setInterval(()=>{let e=this.shadowRoot?.querySelector(`#timer-display`);if(e&&this.startTime){let t=(Date.now()-this.startTime)/1e3;e.textContent=`${Math.floor(t/60).toString().padStart(2,`0`)}:${(t%60).toFixed(1).padStart(4,`0`)}`}},200)}stopTimer(){this.timerInterval&&=(clearInterval(this.timerInterval),null)}savePosition(){try{sessionStorage.setItem(`forensic_overlay_pos`,JSON.stringify({x:this.posX,y:this.posY,min:this.isMinimized}))}catch{}}loadPosition(){try{let e=sessionStorage.getItem(`forensic_overlay_pos`);if(e){let t=JSON.parse(e);this.posX=Math.max(10,Math.min(window.innerWidth-300,t.x||this.posX)),this.posY=Math.max(10,Math.min(window.innerHeight-150,t.y||this.posY)),this.isMinimized=!!t.min}}catch{}}render(){if(!this.shadowRoot)return;let e=`
      :host {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        font-size: 12px;
        color: #f1f5f9;
        user-select: none;
      }
      * {
        box-sizing: border-box;
      }
      .panel {
        background: rgba(15, 23, 42, 0.88);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 14px;
        box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.05);
        width: 320px;
        overflow: hidden;
        transition: transform 0.15s ease, box-shadow 0.15s ease;
      }
      .panel.minimized {
        width: auto;
        border-radius: 30px;
      }
      .header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 14px;
        background: rgba(30, 41, 59, 0.7);
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        cursor: grab;
      }
      .panel.minimized .header {
        border-bottom: none;
        padding: 6px 12px;
      }
      .header:active {
        cursor: grabbing;
      }
      .title-area {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .brand-icon {
        width: 16px;
        height: 16px;
        fill: #38bdf8;
      }
      .title-text {
        font-weight: 700;
        font-size: 12px;
        letter-spacing: 0.3px;
        color: #f8fafc;
      }
      .status-pill {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 2px 8px;
        border-radius: 20px;
        font-size: 10px;
        font-weight: 700;
        text-transform: uppercase;
        background: rgba(71, 85, 105, 0.4);
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: #94a3b8;
      }
      .status-pill.recording {
        background: rgba(239, 68, 68, 0.2);
        border-color: rgba(239, 68, 68, 0.4);
        color: #f87171;
      }
      .pulse-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #94a3b8;
      }
      .status-pill.recording .pulse-dot {
        background: #ef4444;
        box-shadow: 0 0 8px #ef4444;
        animation: pulse 1.2s infinite;
      }
      @keyframes pulse {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.4; transform: scale(1.3); }
      }
      .actions-top {
        display: flex;
        align-items: center;
        gap: 4px;
      }
      .icon-btn {
        background: transparent;
        border: none;
        color: #94a3b8;
        cursor: pointer;
        padding: 4px;
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.15s;
      }
      .icon-btn:hover {
        background: rgba(255, 255, 255, 0.1);
        color: #ffffff;
      }
      .content {
        padding: 12px 14px;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .metrics-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: rgba(15, 23, 42, 0.6);
        padding: 8px 12px;
        border-radius: 8px;
        border: 1px solid rgba(255, 255, 255, 0.05);
      }
      .metric-box {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .metric-label {
        font-size: 9px;
        color: #64748b;
        text-transform: uppercase;
        font-weight: 700;
      }
      .metric-value {
        font-size: 13px;
        font-weight: 700;
        font-family: monospace;
        color: #38bdf8;
      }
      .btn-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 6px;
      }
      .btn-main {
        grid-column: span 2;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 8px 12px;
        border-radius: 8px;
        font-weight: 700;
        font-size: 12px;
        cursor: pointer;
        border: none;
        transition: all 0.15s ease;
      }
      .btn-record-start {
        background: linear-gradient(135deg, #ef4444, #dc2626);
        color: #ffffff;
        box-shadow: 0 4px 12px rgba(239, 68, 68, 0.35);
      }
      .btn-record-start:hover {
        filter: brightness(1.1);
        transform: translateY(-1px);
      }
      .btn-record-stop {
        background: linear-gradient(135deg, #475569, #334155);
        color: #f8fafc;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      }
      .btn-record-stop:hover {
        background: #dc2626;
        color: #ffffff;
      }
      .btn-secondary {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        padding: 7px 10px;
        background: rgba(30, 41, 59, 0.8);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        color: #cbd5e1;
        font-weight: 600;
        font-size: 11px;
        cursor: pointer;
        transition: all 0.15s;
      }
      .btn-secondary:hover:not(:disabled) {
        background: rgba(51, 65, 85, 0.9);
        border-color: rgba(56, 189, 248, 0.4);
        color: #ffffff;
      }
      .btn-secondary:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }
      .btn-dashboard {
        grid-column: span 2;
        background: linear-gradient(135deg, #0284c7, #0369a1);
        color: #ffffff;
        border: none;
        box-shadow: 0 4px 12px rgba(2, 132, 199, 0.3);
      }
      .btn-dashboard:hover {
        filter: brightness(1.1);
      }
    `,t=this.isRecording;if(this.isMinimized){this.shadowRoot.innerHTML=`
        <style>${e}</style>
        <div class="panel minimized">
          <div class="header" id="drag-header">
            <div class="title-area">
              <span class="status-pill ${t?`recording`:``}">
                <span class="pulse-dot"></span>
                <span id="mini-status">${t?`REC`:`STANDBY`}</span>
              </span>
              <span id="timer-display" style="font-family: monospace; font-weight: 700; color: #38bdf8;">00:00.0</span>
            </div>
            <button class="icon-btn" id="btn-toggle-min" title="Expand Panel">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
            </button>
          </div>
        </div>
      `;return}this.shadowRoot.innerHTML=`
      <style>${e}</style>
      <div class="panel">
        <div class="header" id="drag-header">
          <div class="title-area">
            <svg class="brand-icon" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
            <span class="title-text">Forensic Debugger</span>
            <span class="status-pill ${t?`recording`:``}">
              <span class="pulse-dot"></span>
              <span>${t?`RECORDING`:`READY`}</span>
            </span>
          </div>
          <div class="actions-top">
            <button class="icon-btn" id="btn-toggle-min" title="Minimize">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 14h6v6M20 10h-6V4M14 10l7-7M10 14l-7 7"/></svg>
            </button>
            <button class="icon-btn" id="btn-close" title="Close Overlay">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
        </div>

        <div class="content">
          <div class="metrics-row">
            <div class="metric-box">
              <span class="metric-label">Session Elapsed</span>
              <span class="metric-value" id="timer-display">00:00.0</span>
            </div>
            <div class="metric-box" style="text-align: right;">
              <span class="metric-label">Recorded Stream</span>
              <span class="metric-value" id="evt-badge">${this.eventCount} evts</span>
            </div>
          </div>

          <button class="btn-main ${t?`btn-record-stop`:`btn-record-start`}" id="btn-record">
            ${t?`⏹ Stop Recording`:`🔴 Start Forensic Recording`}
          </button>

          <div class="btn-grid">
            <button class="btn-secondary" id="btn-checkpoint" ${t?``:`disabled`}>
              📸 Checkpoint
            </button>
            <button class="btn-secondary" id="btn-inspect" ${t?``:`disabled`}>
              🎯 Inspect Element
            </button>
            <button class="btn-secondary" id="btn-annotate" ${t?``:`disabled`} style="grid-column: span 2;">
              📝 Add Hypothesis / Note
            </button>
            <button class="btn-main btn-dashboard" id="btn-dashboard">
              📊 Open Forensic Dashboard
            </button>
          </div>
        </div>
      </div>
    `}attachEvents(){if(!this.shadowRoot)return;let e=this.shadowRoot.querySelector(`#drag-header`);e&&e.addEventListener(`mousedown`,e=>{this.isDragging=!0,this.dragStartX=e.clientX-this.posX,this.dragStartY=e.clientY-this.posY;let t=e=>{!this.isDragging||!this.hostElement||(this.posX=Math.max(10,Math.min(window.innerWidth-80,e.clientX-this.dragStartX)),this.posY=Math.max(10,Math.min(window.innerHeight-50,e.clientY-this.dragStartY)),this.hostElement.style.left=`${this.posX}px`,this.hostElement.style.top=`${this.posY}px`)},n=()=>{this.isDragging=!1,window.removeEventListener(`mousemove`,t),window.removeEventListener(`mouseup`,n),this.savePosition()};window.addEventListener(`mousemove`,t),window.addEventListener(`mouseup`,n)}),this.shadowRoot.querySelector(`#btn-toggle-min`)?.addEventListener(`click`,()=>{this.isMinimized=!this.isMinimized,this.savePosition(),this.render(),this.attachEvents()}),this.shadowRoot.querySelector(`#btn-close`)?.addEventListener(`click`,()=>{this.unmount()}),this.shadowRoot.querySelector(`#btn-record`)?.addEventListener(`click`,()=>{this.isRecording?this.callbacks.onStopRecord():this.callbacks.onStartRecord()});let t=this.shadowRoot.querySelector(`#btn-checkpoint`);t?.addEventListener(`click`,()=>{if(this.callbacks.onCaptureCheckpoint(),t){let e=t.textContent;t.textContent=`✔ Saved!`,setTimeout(()=>t.textContent=e,1e3)}}),this.shadowRoot.querySelector(`#btn-inspect`)?.addEventListener(`click`,()=>{this.callbacks.onInspectElement()}),this.shadowRoot.querySelector(`#btn-annotate`)?.addEventListener(`click`,()=>{let e=prompt(`Enter observation, bug note, or hypothesis at this exact moment:`);e&&e.trim()&&this.callbacks.onAddAnnotation(e.trim())}),this.shadowRoot.querySelector(`#btn-dashboard`)?.addEventListener(`click`,()=>{this.callbacks.onOpenDashboard()})}};(function(){let e=null,t=[],n=null,r=null,i=!1;function a(){try{if(typeof chrome<`u`&&chrome.runtime?.getURL){let e=document.createElement(`script`);e.src=chrome.runtime.getURL(`dist/extension/page-script.js`),e.onload=()=>e.remove(),(document.head||document.documentElement).appendChild(e)}}catch{}}function o(){if(t.length===0||!e)return;let n=[...t];t=[];try{typeof chrome<`u`&&chrome.runtime?.sendMessage&&chrome.runtime.sendMessage({type:`FORENSIC_EVENTS_CHUNK`,sessionId:e.getSessionId(),events:n})}catch{}}function s(i,a,s){if(e)return e.getMetadata();e=new u({sessionId:a,sessionName:i||`Recording on ${document.title||window.location.hostname}`}),e.onEvent(e=>{t.push(e),r&&r.incrementEventCount(),t.length>=25&&o()}),e.onCheckpoint(e=>{try{typeof chrome<`u`&&chrome.runtime?.sendMessage&&chrome.runtime.sendMessage({type:`FORENSIC_CHECKPOINT`,sessionId:e.sessionId,checkpoint:e})}catch{}});let c=e.start(document);try{typeof chrome<`u`&&chrome.runtime?.sendMessage&&chrome.runtime.sendMessage({type:`FORENSIC_SESSION_START`,metadata:e.getMetadata(),initialSnapshot:c})}catch{}return n||=setInterval(o,1e3),r&&r.updateState(!0,!1,s||Date.now(),0),e.getMetadata()}function c(){if(!e)return null;o(),n&&=(clearInterval(n),null);let t=e.stop();try{typeof chrome<`u`&&chrome.runtime?.sendMessage&&chrome.runtime.sendMessage({type:`FORENSIC_SESSION_STOP`,sessionId:t.id,metadata:t})}catch{}let i={...t};return e=null,r&&r.updateState(!1,!1,0,0),i}function l(){if(i){i=!1,document.body.style.cursor=`default`;return}i=!0,document.body.style.cursor=`crosshair`;let t=document.createElement(`div`);t.id=`forensic-inspect-highlighter`,t.style.position=`fixed`,t.style.pointerEvents=`none`,t.style.zIndex=`2147483640`,t.style.border=`2px dashed #38bdf8`,t.style.background=`rgba(56, 189, 248, 0.15)`,t.style.transition=`all 0.05s ease`,document.body.appendChild(t);let n=e=>{if(!i)return;let n=e.target;if(!n||n.id===`forensic-recorder-floating-host`||n.closest(`#forensic-recorder-floating-host`)){t.style.display=`none`;return}let r=n.getBoundingClientRect();t.style.display=`block`,t.style.left=`${r.left}px`,t.style.top=`${r.top}px`,t.style.width=`${r.width}px`,t.style.height=`${r.height}px`},r=a=>{if(!i)return;let o=a.target;if(!o.closest(`#forensic-recorder-floating-host`)&&(a.preventDefault(),a.stopPropagation(),i=!1,document.body.style.cursor=`default`,t.remove(),window.removeEventListener(`mousemove`,n,!0),window.removeEventListener(`click`,r,!0),e)){let t=o.id?`#${o.id}`:o.className?`.${o.className.split(` `)[0]}`:o.tagName.toLowerCase();e.addAnnotation(`Inspect Element`,`Inspected element <${o.tagName.toLowerCase()}> with selector '${t}'`,`USER`),alert(`🎯 Inspected element <${o.tagName.toLowerCase()}> recorded! Checkpoint saved.`)}};window.addEventListener(`mousemove`,n,!0),window.addEventListener(`click`,r,!0)}function f(){return r||=new d({onStartRecord:()=>{s()},onStopRecord:()=>{c()},onTogglePause:()=>{e&&(e.getMetadata().status===`recording`?e.pause():e.resume())},onCaptureCheckpoint:()=>{e&&e.captureCheckpoint(`MANUAL`,document)},onAddAnnotation:t=>{e&&e.addAnnotation(`User Note`,t,`USER`)},onInspectElement:()=>{l()},onOpenDashboard:()=>{let t=e?e.getSessionId():void 0;chrome.runtime.sendMessage({type:`OPEN_DASHBOARD_TAB`,sessionId:t})}}),r}function p(){try{typeof chrome<`u`&&chrome.runtime?.sendMessage&&chrome.runtime.sendMessage({type:`GET_TAB_RECORDING_STATE`},e=>{chrome.runtime.lastError||!e||e.isRecording&&e.recording&&(f().mount(),s(e.recording.sessionName,e.recording.sessionId,e.recording.startTime))})}catch{}}typeof chrome<`u`&&chrome.runtime?.onMessage&&chrome.runtime.onMessage.addListener((t,n,r)=>{if(t.type===`START_RECORDING`){let e=s(t.sessionName);f().mount(),r({success:!0,metadata:e})}else if(t.type===`STOP_RECORDING`)r({success:!0,metadata:c()});else if(t.type===`TOGGLE_FLOATING_OVERLAY`){let t=f();document.getElementById(`forensic-recorder-floating-host`)?(t.unmount(),r({isOpen:!1})):(t.mount(),t.updateState(e?.getMetadata().status===`recording`,!1,e?.getMetadata().startTime||0,0),r({isOpen:!0}))}else t.type===`GET_RECORDER_STATUS`?r({isRecording:e?.getMetadata().status===`recording`,metadata:e?.getMetadata()||null}):t.type===`CAPTURE_CHECKPOINT`&&r(e?{success:!0,checkpoint:e.captureCheckpoint(`MANUAL`,document)}:{success:!1,error:`Not currently recording`});return!0}),a(),document.readyState===`loading`?document.addEventListener(`DOMContentLoaded`,p):p()})()})();