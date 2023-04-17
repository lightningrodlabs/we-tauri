/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
let e;function t(){if(void 0===e){const t=document.createElement("div");t.innerHTML='<div><template shadowroot="open"></template></div>',e=!!t.firstElementChild.shadowRoot}return e}
/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const n=e=>null===e.parentElement,l=e=>e.nodeType===Node.ELEMENT_NODE,o=e=>{var o;if(t())return;const i=[];let r=e.firstElementChild;for(;r!==e&&null!==r;)if("TEMPLATE"===r.tagName)i.push(r),r=r.content;else if(null!==r.firstElementChild)r=r.firstElementChild;else if(l(r)&&null!==r.nextElementSibling)r=r.nextElementSibling;else{let t;for(;r!==e&&null!==r;)if(n(r)){t=i.pop();const e=t.parentElement,n=t.getAttribute("shadowroot");if(r=t,"open"===n||"closed"===n){const l=t.hasAttribute("shadowrootdelegatesfocus");try{e.attachShadow({mode:n,delegatesFocus:l}).append(t.content)}catch{}}else t=void 0}else{const e=r.nextElementSibling;if(null!=e){r=e,void 0!==t&&t.parentElement.removeChild(t);break}const n=null===(o=r.parentElement)||void 0===o?void 0:o.nextElementSibling;if(null!=n){r=n,void 0!==t&&t.parentElement.removeChild(t);break}r=r.parentElement,void 0!==t&&(t.parentElement.removeChild(t),t=void 0)}}};export{t as hasNativeDeclarativeShadowRoots,o as hydrateShadowRoots};
