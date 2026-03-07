
const PRODUCTS=[
{img:'./merch01.png',name:'Bundle',price:60},
{img:'./merch02.png',name:'Hat',price:25},
{img:'./merch03.png',name:'Shirt',price:20},
{img:'./merch04.png',name:'Hoodie',price:40}
];

const grid=document.getElementById('merchGrid');
grid.innerHTML=PRODUCTS.map(p=>`
<div>
<img src="${p.img}" style="width:200px"/>
<p>${p.name}</p>
<p>$${p.price}</p>
</div>
`).join('');
