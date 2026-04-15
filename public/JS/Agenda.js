// Definição dos carrinhos disponíveis
const carrinhosDisponiveis = [
  "Carrinho 1",
  "Carrinho 2",
];

// Observar alterações no estado de autenticação do usuário
firebase.auth().onAuthStateChanged(function (user) {
  if (user) {
    // Recuperar o nome do usuário do Realtime Database
    const userId = user.uid;
    const databaseRef = firebase.database().ref("usuarios/" + userId);
    databaseRef
      .once("value")
      .then(function (snapshot) {
        const userData = snapshot.val();
        if (userData && userData.usuario) {
          // Preencher o campo "Nome do Publicador" com o nome do usuário
          const nomePublicadorInput = document.getElementById("nomePublicador");
          if (nomePublicadorInput) {
            nomePublicadorInput.value = userData.usuario;
          }
        } else {
          // Use um valor padrão caso o nome não esteja definido
          const nomePublicadorInput = document.getElementById("nomePublicador");
          if (nomePublicadorInput) {
            nomePublicadorInput.value = "Nome não definido";
          }
        }
      })
      .catch(function (error) {
        console.error("Erro ao recuperar os dados do usuário:", error);
      });
  } else {
    console.log("Usuário não autenticado.");
  }
});

// Função para baixar dados do Firebase e configurar o autocompletar
function baixarDadosDoFirebase() {
  firebase
    .database()
    .ref("usuarios")
    .once("value")
    .then(function (snapshot) {
      // Convertendo os dados para um array de nomes
      const usuarios = [];
      snapshot.forEach(function (childSnapshot) {
        const usuario = childSnapshot.val().usuario;
        usuarios.push(usuario);
      });

      // Armazenando os dados em cache temporariamente
      localStorage.setItem("usuariosCache", JSON.stringify(usuarios));
    })
    .catch(function (error) {
      console.error("Erro ao recuperar os dados do Firebase:", error);
    });
}

// Verificar cache de usuários
const usuariosCache = localStorage.getItem("usuariosCache");
if (!usuariosCache) {
  baixarDadosDoFirebase();
}

// Autocompletar ao digitar no campo de pesquisa
const nomeCompanheiroInput = document.getElementById("nomeCompanheiro");
const autocompleteList = document.getElementById("autocomplete-list");

if (nomeCompanheiroInput && autocompleteList) {
  nomeCompanheiroInput.addEventListener("input", function () {
    const searchTerm = nomeCompanheiroInput.value.toLowerCase().trim();
    const usuariosCache =
      JSON.parse(localStorage.getItem("usuariosCache")) || [];

    // Limpar a lista de autocompletar
    autocompleteList.innerHTML = "";

    // Filtrar os usuários com base no termo de pesquisa
    const filteredUsuarios = usuariosCache.filter(function (usuario) {
      return usuario.toLowerCase().startsWith(searchTerm);
    });

    // Adicionar opções à lista de autocompletar
    filteredUsuarios.forEach(function (usuario) {
      const option = document.createElement("div");
      option.textContent = usuario;
      option.addEventListener("click", function () {
        nomeCompanheiroInput.value = usuario;
        autocompleteList.innerHTML = "";
      });

      autocompleteList.appendChild(option);
    });
  });
}

// Função auxiliar para converter horário em minutos
function converterHoraParaMinutos(hora) {
  const [hours, minutes] = hora.split(":").map(Number);
  return hours * 60 + minutes;
}

// Função para verificar sobreposição de horários
function verificarSobreposicao(inicio1, fim1, inicio2, fim2) {
  const inicio1Min = converterHoraParaMinutos(inicio1);
  const fim1Min = converterHoraParaMinutos(fim1);
  const inicio2Min = converterHoraParaMinutos(inicio2);
  const fim2Min = converterHoraParaMinutos(fim2);

  return inicio1Min < fim2Min && fim1Min > inicio2Min;
}

// Event Listeners e Inicialização
document.addEventListener("DOMContentLoaded", function () {
  const selectedDateInput = document.getElementById("selectedDate");
  const diaSemanaInput = document.getElementById("diaSemana");
  const horaInicioInput = document.getElementById("horaInicio");
  const horaFimInput = document.getElementById("horaFim");

  // Listener para atualização da data e dia da semana
  selectedDateInput?.addEventListener("change", function () {
    const selectedDate = luxon.DateTime.fromISO(selectedDateInput.value);
    const diaDaSemana = selectedDate.toFormat("EEEE", { locale: "pt" });
    const diaDaSemanaCapitalized =
      diaDaSemana.charAt(0).toUpperCase() + diaDaSemana.slice(1);
    diaSemanaInput.value = diaDaSemanaCapitalized;
    atualizarVagasDisponiveis();
  });

  // Listeners para atualização de disponibilidade quando horários mudam
  horaInicioInput?.addEventListener("change", atualizarVagasDisponiveis);
  horaFimInput?.addEventListener("change", atualizarVagasDisponiveis);

  // Listener para submissão do formulário
  const form = document.querySelector("#agendamento-form");
  form?.addEventListener("submit", function (event) {
    event.preventDefault();
    validarAgendamento();
  });

  // Bloquear edição do campo "Dia da Semana"
  if (diaSemanaInput) {
    diaSemanaInput.readOnly = true;
  }

  // Inicializar verificação de disponibilidade se campos necessários estiverem preenchidos
  if (
    selectedDateInput?.value &&
    horaInicioInput?.value &&
    horaFimInput?.value
  ) {
    atualizarVagasDisponiveis();
  }
});

// Função para atualizar disponibilidade de vagas
function atualizarVagasDisponiveis() {
  const selectedDate = document.getElementById("selectedDate")?.value;
  const horaInicio = document.getElementById("horaInicio")?.value;
  const horaFim = document.getElementById("horaFim")?.value;
  const infoVagas = document.getElementById("infoVagas");
  const carrinhoSelect = document.getElementById("carrinho");

  if (!selectedDate || !horaInicio || !horaFim || !infoVagas || !carrinhoSelect) {
    console.log("Campos obrigatórios não encontrados");
    return;
  }

  // Limpar o select de carrinhos
  carrinhoSelect.innerHTML = '<option value="">Selecione um carrinho</option>';

  firebase
    .database()
    .ref("agendamentos")
    .orderByChild("selectedDate")
    .equalTo(selectedDate)
    .once("value")
    .then((snapshot) => {
      const agendamentos = snapshot.val() || {};

      // Criar mapa de status dos carrinhos
      const statusCarrinhos = {};
      carrinhosDisponiveis.forEach((carrinho) => {
        statusCarrinhos[carrinho] = {
          disponivel: true,
          conflitos: [],
        };
      });

      // Verificar conflitos
      Object.values(agendamentos).forEach((agendamento) => {
        if (verificarSobreposicao(horaInicio, horaFim, agendamento.horaInicio, agendamento.horaFim)) {
          if (statusCarrinhos[agendamento.carrinho]) {
            statusCarrinhos[agendamento.carrinho].disponivel = false;
            statusCarrinhos[agendamento.carrinho].conflitos.push({
              usuario: agendamento.nomePublicador,
              horario: `${agendamento.horaInicio} às ${agendamento.horaFim}`,
            });
          }
        }
      });

      // Filtrar carrinhos disponíveis
      const carrinhosDisponivelArray = Object.entries(statusCarrinhos)
        .filter(([_, status]) => status.disponivel)
        .map(([carrinho, _]) => carrinho);

      // Atualizar select de carrinhos
      carrinhosDisponivelArray.forEach((carrinho) => {
        const option = document.createElement("option");
        option.value = carrinho;
        option.textContent = carrinho;
        carrinhoSelect.appendChild(option);
      });

      // Selecionar automaticamente o primeiro carrinho disponível
      if (carrinhosDisponivelArray.length > 0) {
        carrinhoSelect.value = carrinhosDisponivelArray[0];
      }
let data = new Date(selectedDate);
let dataFormatada = data.toLocaleDateString("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});
      // Atualizar visualização do status
  let infoHtml = '<div class="info-carrinhos">';
  infoHtml += `<h4> Carrinhos para ${dataFormatada}</h4>`;
  infoHtml += `<p class="horario-selecionado">Horário : ${horaInicio} às ${horaFim}</p>`;

      Object.entries(statusCarrinhos).forEach(([carrinho, status]) => {
        const statusClass = status.disponivel ? "disponivel" : "ocupado";
        infoHtml += `
          <div class="carrinho-status ${statusClass}">
            <span class="carrinho-nome">${carrinho}:</span>
            <span class="carrinho-disponibilidade">
              ${status.disponivel ? "✅ Disponível" : "❌ Ocupado"}
            </span>
            ${!status.disponivel && status.conflitos.length > 0 
              ? `<div class="conflitos-info">
                  ${status.conflitos.map(conflito => `
                    <div class="conflito">
                      Agendado por ${conflito.usuario}<br>
                      Horário: ${conflito.horario}
                    </div>
                  `).join("")}
                </div>`
              : ""}
          </div>
        `;
      });

      infoHtml += "</div>";

      // Mostrar total de vagas disponíveis
      const vagasRestantes = carrinhosDisponivelArray.length;
      infoHtml = `<div class="total-vagas">Vagas disponíveis: ${vagasRestantes}</div>` + infoHtml;

      infoVagas.innerHTML = infoHtml;
    
    })
    .catch((error) => {
      console.error("Erro ao verificar disponibilidade:", error);
      infoVagas.innerHTML =
        '<div class="erro">Erro ao verificar disponibilidade dos carrinhos.</div>';
    });
}

// Função para validar agendamento
function validarAgendamento() {
  const selectedDate = luxon.DateTime.fromISO(
    document.getElementById("selectedDate").value
  );
  mostrarConfirmacaoAgendamento();
}

// Função para mostrar confirmação do agendamento
function mostrarConfirmacaoAgendamento() {
  const nomePublicador = document.getElementById("nomePublicador").value;
  const nomeCompanheiro = document.getElementById("nomeCompanheiro").value;
  const carrinho = document.getElementById("carrinho").value;
  const local = document.getElementById("local").value;
  const horaInicio = document.getElementById("horaInicio").value;
  const horaFim = document.getElementById("horaFim").value;

  const selectedDate = luxon.DateTime.fromISO(
    document.getElementById("selectedDate").value
  );
  const formattedDate = selectedDate.toFormat("dd/MM/yyyy");

  const confirmacaoTexto = `
Data: ${formattedDate}
Dia da Semana: ${document.getElementById("diaSemana").value}
Nome do Publicador: ${nomePublicador}
Nome do Companheiro: ${nomeCompanheiro}
Carrinho: ${carrinho}
Local: ${local}
Hora de Início: ${horaInicio}
Hora de Fim: ${horaFim}
`;

  if (confirm("Confirme os dados do agendamento:\n\n" + confirmacaoTexto)) {
    enviarAgendamento();
  }
}

// Função para criar chave única
function criarChaveUnica(selectedDate, horaInicio, horaFim, carrinho) {
  return (
    selectedDate.toISODate() + "_" + horaInicio + "_" + horaFim + "_" + carrinho
  );
}

// Função para enviar agendamento
function enviarAgendamento() {
  const selectedDate = luxon.DateTime.fromISO(
    document.getElementById("selectedDate").value
  );
  const horaInicio = document.getElementById("horaInicio").value;
  const nomePublicador = document.getElementById("nomePublicador").value;
  const nomeCompanheiro = document.getElementById("nomeCompanheiro").value;
  const carrinho = document.getElementById("carrinho").value;
  const local = document.getElementById("local").value;
  const horaFim = document.getElementById("horaFim").value;

  const user = firebase.auth().currentUser;

  if (!user) {
    alert("Usuário não autenticado. Faça login para agendar.");
    return;
  }

  const agendamentoData = {
    nomePublicador: nomePublicador,
    nomeCompanheiro: nomeCompanheiro,
    carrinho: carrinho,
    selectedDate: selectedDate.toISODate(),
    horaInicio: horaInicio,
    horaFim: horaFim,
    local: local,
    userId: user.uid, // Adicione o UID do usuário ao agendamento
  };

  const database = firebase.database();
  const agendamentosRef = database.ref("agendamentos");

  const chaveUnica = criarChaveUnica(
    selectedDate,
    horaInicio,
    horaFim,
    carrinho
  );

  // Verificar se já existe um agendamento com a mesma chave única
  agendamentosRef
    .child(chaveUnica)
    .once("value")
    .then(function (snapshot) {
      if (snapshot.exists()) {
        alert(
          "Já existe um agendamento para esse horário e carrinho. Por favor, escolha outro horário ou carrinho."
        );
      } else {
        // Caso não haja conflito, salvar o agendamento
        agendamentosRef
          .child(chaveUnica)
          .set(agendamentoData)
          .then(function () {
            alert("Agendamento salvo com sucesso!");
            limparFormulario();
            window.location.href = "index.html";
          })
          .catch(function (error) {
            alert("Ocorreu um erro ao salvar o agendamento: " + error.message);
          });
      }

      function limparFormulario() {
        const formulario = document.querySelector("#agendamento-form");
        formulario.reset();
      }
    });
}
