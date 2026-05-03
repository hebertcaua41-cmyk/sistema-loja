const token = localStorage.getItem("token");

if(!token){
  window.location.href="/";
}

async function criarOS(){
  const cliente=document.getElementById("cliente").value;
  const aparelho=document.getElementById("aparelho").value;
  const problema=document.getElementById("problema").value;
  const valor=Number(document.getElementById("valor").value);

  await fetch("/os",{
    method:"POST",
    headers:{
      "Content-Type":"application/json",
      "Authorization":token
    },
    body:JSON.stringify({cliente,aparelho,problema,valor})
  });

  carregarOS();
}

async function carregarOS(){
  const res=await fetch("/os",{
    headers:{Authorization:token}
  });

  const lista=await res.json();

  const div=document.getElementById("listaOS");
  div.innerHTML="";

  let total=0;

  lista.forEach(os=>{
    total+=os.valor;

    div.innerHTML+=`
      <div style="border-bottom:1px solid #333;padding:5px">
        ${os.cliente} - ${os.aparelho} - R$ ${os.valor}
      </div>
    `;
  });

  document.getElementById("totalMes").innerText="Total do mês: R$ "+total;
}

function logout(){
  localStorage.removeItem("token");
  window.location.href="/";
}

carregarOS();