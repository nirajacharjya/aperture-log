import{T as e,_ as t,a as n,d as r,f as i,i as a,l as o,p as s,r as c,t as l}from"./navbar-DhsFrSM_.js";var u=e((()=>{a(),n();var e=document.getElementById(`scroll-bar`),l=document.getElementById(`totop`);window.addEventListener(`scroll`,()=>{let t=document.documentElement,n=t.scrollTop/(t.scrollHeight-t.clientHeight)*100;e.style.width=n+`%`,l&&l.classList.toggle(`show`,t.scrollTop>500)}),l&&l.addEventListener(`click`,()=>{window.scrollTo({top:0,behavior:`smooth`})});var u=document.getElementById(`ticker`);u&&(u.innerHTML+=u.innerHTML);async function d(){let e=document.getElementById(`home-gallery`),n=await o(s(t(c,`photos`),i(`createdAt`,`desc`),r(8)));e.innerHTML=``,n.forEach(t=>{let n=t.data(),r=document.createElement(`div`);r.className=`photo-tile`,r.innerHTML=`
    <a href="photography.html">
        <img src="${n.image}" alt="${n.title}" loading="lazy">

        <div class="tile-overlay">
            <span class="t-cat">${n.category?n.category.charAt(0).toUpperCase()+n.category.slice(1):``}</span>
        </div>
    </a>
`,e.appendChild(r)})}d()}));l(),u();