/** @format */

// Variável
let vagasDisponiveis = {};
let carrinhosDisponiveis = [
  "Carrinho 1",
  "Carrinho 2",

];

// Adicionar um ouvinte de evento que será disparado quando os dados do Firebase forem carregados ou alterados
firebase
  .database()
  .ref("formularios")
  .on("value", function (snapshot) {
    // Função que será executada quando os dados do Firebase forem carregados ou alterados
    var congregacoes = snapshot.val(); // Obtém os dados do Firebase

    // Verifica se há dados
    if (congregacoes) {
      vagasDisponiveis = {}; // Reseta o objeto para armazenar o número de vagas disponíveis para cada data e hora

      // Itera sobre as congregações e seus registros para calcular o número de vagas disponíveis
      for (var congregacao in congregacoes) {
        var registros = congregacoes[congregacao];
        for (var id in registros) {
          var registro = registros[id];
          // Verifica se o registro contém data, hora e carrinho
          if (registro.data && registro.hpora && registro.carrinho) {
            // Verifica se a data já está no objeto de vagas disponíveis
            if (!vagasDisponiveis[registro.data]) {
              // Se não estiver, inicializa a contagem de vagas disponíveis para essa data
              vagasDisponiveis[registro.data] = {};
            }
            // Verifica se a hora já está no objeto de vagas disponíveis para essa data
            if (!vagasDisponiveis[registro.data][registro.hpora]) {
              // Se não estiver, inicializa a contagem de vagas disponíveis para essa hora
              vagasDisponiveis[registro.data][registro.hpora] = {
                total: 20,
                carrinhos: carrinhosDisponiveis.slice(),
              }; // 20 é o número inicial de vagas para cada horário
            }
            // Decrementa o número de vagas disponíveis para essa hora
            vagasDisponiveis[registro.data][registro.hpora].total--;
            // Remove o carrinho usado
            const carrinhoIndex = vagasDisponiveis[registro.data][
              registro.hpora
            ].carrinhos.indexOf(registro.carrinho);
            if (carrinhoIndex > -1) {
              vagasDisponiveis[registro.data][registro.hpora].carrinhos.splice(
                carrinhoIndex,
                1
              );
            }
          }
        }
      }

      // Exibe o número de vagas disponíveis na interface do usuário (você pode fazer isso da maneira que preferir)
      console.log("Vagas disponíveis:", vagasDisponiveis);
      atualizarInfoVagas();
    } else {
      console.log("Sem dados disponíveis no banco de dados.");
    }
  });

function atualizarInfoVagas() {
  const infoVagas = document.getElementById("infoVagas");
  const data = document.getElementById("data").value;
  const hpora = document.getElementById("hpora").value;

  if (vagasDisponiveis[data] && vagasDisponiveis[data][hpora]) {
    infoVagas.innerHTML = `Vagas disponíveis para ${data} às ${hpora}: <span class="total-vagas">${vagasDisponiveis[data][hpora].total}</span>`;
    preencherCarrinhoDisponivel(data, hpora);
} else {
    infoVagas.textContent = `Sem vagas disponíveis para ${data} às ${hpora}`;
    document.getElementById("carrinho").value = "";
}

}

function preencherCarrinhoDisponivel(data, hpora) {
  const carrinhoInput = document.getElementById("carrinho");
  if (
    vagasDisponiveis[data] &&
    vagasDisponiveis[data][hpora] &&
    vagasDisponiveis[data][hpora].carrinhos.length > 0
  ) {
    carrinhoInput.value = vagasDisponiveis[data][hpora].carrinhos[0]; // Seleciona o primeiro carrinho disponível
  } else {
    carrinhoInput.value = "";
  }
}

document.getElementById("data").addEventListener("change", atualizarInfoVagas);
document.getElementById("hpora").addEventListener("change", atualizarInfoVagas);

document.getElementById("meuForm").addEventListener("submit", function (e) {
  e.preventDefault();

  const congregacao = document.getElementById("congregacao").value;
  const publicador1 = document.getElementById("publicador1").value;
  const publicador2 = document.getElementById("publicador2").value;
  const hpora = document.getElementById("hpora").value;
  const data = document.getElementById("data").value;
  const carrinho = document.getElementById("carrinho").value;

  // Valide os campos (exemplo: verifique se a data está preenchida)
  if (!data) {
    alert("Por favor, preencha a data.");
    return;
  }

  // Verifica se há vagas disponíveis
  if (
    vagasDisponiveis[data] &&
    vagasDisponiveis[data][hpora] &&
    vagasDisponiveis[data][hpora].total > 0
  ) {
    const confirmacao = confirm(`Confirme os dados:
Congregação: ${congregacao}
Publicador 1: ${publicador1}
Publicador 2: ${publicador2}
HORA: ${hpora}
Data: ${data}
Carrinho: ${carrinho}`);

    if (confirmacao) {
      // Enviar dados para o Firebase
      firebase
        .database()
        .ref("formularios/" + congregacao)
        .push({
          publicador1,
          publicador2,
          hpora,
          data,
          carrinho,
        })
        .then(function () {
          alert("Dados enviados com sucesso!");
          // Limpe os campos após o envio
          document.getElementById("publicador1").value = "";
          document.getElementById("publicador2").value = "";
        })
        .catch(function (error) {
          console.error("Erro ao enviar o formulário:", error.message);
          alert(
            "Ocorreu um erro ao enviar o formulário. Por favor, tente novamente mais tarde."
          );
        });
    } else {
      // Cancelado: Limpe os campos
      document.getElementById("publicador1").value = "";
      document.getElementById("publicador2").value = "";
    }
  } else {
    alert("Não há vagas disponíveis para a data e hora selecionadas.");
  }
});
