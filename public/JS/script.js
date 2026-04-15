// Definição dos carrinhos disponíveis
const carrinhosDisponiveis = [
  "Carrinho 1",
  "Carrinho 2",
  "Display"
];

// Função para obter o input do nome do publicador
function setNomePublicador(userData) {
  const nomePublicadorInput = document.getElementById("nomePublicador");
  if (nomePublicadorInput) {
    nomePublicadorInput.value = userData && userData.usuario ? userData.usuario : "Nome não definido";
  }
}

// Armazena o nome do publicador autenticado (nunca lido do DOM)
let _nomePublicador = null;

// Observar alterações no estado de autenticação do usuário
firebase.auth().onAuthStateChanged(user => {
  if (user) {
    const userId = user.uid;
    const databaseRef = firebase.database().ref("usuarios/" + userId);
    databaseRef.once("value")
      .then(snapshot => {
        const userData = snapshot.val();
        _nomePublicador = userData && userData.usuario ? userData.usuario : null;
        setNomePublicador(userData);
      })
      .catch(error => console.error("Erro ao recuperar os dados do usuário:", error));
  } else {
    window.location.href = "login.html";
  }
});

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Função para baixar dados do Firebase e configurar o autocompletar
function baixarDadosDoFirebase() {
  firebase.database().ref("usuarios").once("value")
    .then(snapshot => {
      const usuarios = [];
      snapshot.forEach(childSnapshot => {
        const usuario = childSnapshot.val().usuario;
        usuarios.push(usuario);
      });
      localStorage.setItem("usuariosCache", JSON.stringify(usuarios));
    })
    .catch(error => console.error("Erro ao recuperar os dados do Firebase:", error));
}

// Função para inicializar o autocompletar
function inicializarAutocompletar() {
  const nomeCompanheiroInput = document.getElementById("nomeCompanheiro");
  const autocompleteList = document.getElementById("autocomplete-list");

  if (nomeCompanheiroInput && autocompleteList) {
    nomeCompanheiroInput.addEventListener("input", () => {
      const searchTerm = nomeCompanheiroInput.value.toLowerCase().trim();
      const usuariosCache = JSON.parse(localStorage.getItem("usuariosCache")) || [];

      autocompleteList.innerHTML = "";

      const filteredUsuarios = usuariosCache.filter(usuario => usuario.toLowerCase().startsWith(searchTerm));

      filteredUsuarios.forEach(usuario => {
        const option = document.createElement("div");
        option.textContent = usuario;
        option.addEventListener("click", () => {
          nomeCompanheiroInput.value = usuario;
          autocompleteList.innerHTML = "";
        });

        autocompleteList.appendChild(option);
      });
    });
  }
}

// Função para converter horário em minutos
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

// Função para atualizar disponibilidade de vagas
function atualizarVagasDisponiveis() {
  const selectedDate = document.getElementById("selectedDate")?.value;
  const horaInicio = document.getElementById("horaInicio")?.value;
  const horaFim = document.getElementById("horaFim")?.value;
  const infoVagas = document.getElementById("infoVagas");
  const carrinhoSelect = document.getElementById("carrinho");

  if (
    !selectedDate ||
    !horaInicio ||
    !horaFim ||
    !infoVagas ||
    !carrinhoSelect
  ) {
    console.log("Campos obrigatórios não encontrados");
    return;
  }

  carrinhoSelect.innerHTML = '<option value="">Selecione um carrinho</option>';

  firebase
    .database()
    .ref("agendamentos")
    .orderByChild("selectedDate")
    .equalTo(selectedDate)
    .once("value")
    .then((snapshot) => {
      const agendamentos = snapshot.val() || {};

      const statusCarrinhos = {};
      carrinhosDisponiveis.forEach((carrinho) => {
        statusCarrinhos[carrinho] = {
          disponivel: true,
          conflitos: [],
        };
      });

      Object.values(agendamentos).forEach((agendamento) => {
        if (
          verificarSobreposicao(
            horaInicio,
            horaFim,
            agendamento.horaInicio,
            agendamento.horaFim
          )
        ) {
          if (statusCarrinhos[agendamento.carrinho]) {
            statusCarrinhos[agendamento.carrinho].disponivel = false;
            statusCarrinhos[agendamento.carrinho].conflitos.push({
              usuario: agendamento.nomePublicador,
              horario: `${agendamento.horaInicio} às ${agendamento.horaFim}`,
            });
          }
        }
      });

      const carrinhosDisponivelArray = Object.entries(statusCarrinhos)
        .filter(([_, status]) => status.disponivel)
        .map(([carrinho, _]) => carrinho);

      // Exibir pop-up se não houver vagas disponíveis
      if (carrinhosDisponivelArray.length === 0) {
        showModal(); // Mostra o modal se não houver vagas
      }

      carrinhosDisponivelArray.forEach((carrinho) => {
        const option = document.createElement("option");
        option.value = carrinho;
        option.textContent = carrinho;
        carrinhoSelect.appendChild(option);
      });

      if (carrinhosDisponivelArray.length > 0) {
        carrinhoSelect.value = carrinhosDisponivelArray[0];
      }

      let data =
        luxon.DateTime.fromISO(selectedDate).setZone("America/Sao_Paulo");
      let dataFormatada = data.toLocaleString(luxon.DateTime.DATE_SHORT, {
        locale: "pt-BR",
      });

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
            ${
              !status.disponivel && status.conflitos.length > 0
                ? `<div class="conflitos-info">
                  ${status.conflitos
                    .map(
                      (conflito) => `
                    <div class="conflito">
                      Agendado por ${escapeHtml(conflito.usuario)}<br>
                      Horário: ${escapeHtml(conflito.horario)}
                    </div>
                  `
                    )
                    .join("")}
                </div>`
                : ""
            }
          </div>`;
      });

      infoHtml += "</div>";
      const vagasRestantes = carrinhosDisponivelArray.length;
      infoHtml =
        `<div class="total-vagas">Vagas disponíveis: ${vagasRestantes}</div>` +
        infoHtml;

      infoVagas.innerHTML = infoHtml;
    })
    .catch((error) => {
      console.error("Erro ao verificar disponibilidade:", error);
      infoVagas.innerHTML =
        '<div class="erro">Erro ao verificar disponibilidade dos carrinhos.</div>';
    });
}
function showModal() {
  // Pega o modal
  const modal = document.getElementById("noAvailabilityModal");

  // Pega o botão de fechar
  const span = modal.querySelector(".close");

  // Exibe o modal
  modal.style.display = "block";

  // Quando o usuário clica no X, fecha o modal
  span.onclick = function () {
    modal.style.display = "none";
  };

  // Quando o usuário clica fora do modal, fecha ele
  window.onclick = function (event) {
    if (event.target === modal) {
      modal.style.display = "none";
    }
  };
}

// Garante que o modal começa oculto
document.addEventListener("DOMContentLoaded", function () {
  const modal = document.getElementById("noAvailabilityModal");
  modal.style.display = "none";
});
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
  const nomePublicador = _nomePublicador;
  if (!nomePublicador) {
    alert("Sessão expirada. Faça login novamente.");
    window.location.href = "login.html";
    return;
  }
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
    userId: user.uid,
  };

  const database = firebase.database();
  const agendamentosRef = database.ref("agendamentos");

  const chaveUnica = criarChaveUnica(
    selectedDate,
    horaInicio,
    horaFim,
    carrinho
  );

  agendamentosRef.child(chaveUnica).once("value")
    .then(snapshot => {
      if (snapshot.exists()) {
        alert("Já existe um agendamento para esse horário e carrinho. Por favor, escolha outro horário ou carrinho.");
      } else {
        agendamentosRef.child(chaveUnica).set(agendamentoData)
          .then(() => {
            alert("Agendamento salvo com sucesso!");
            limparFormulario();
            window.location.href = "index.html";
          })
          .catch(error => alert("Ocorreu um erro ao salvar o agendamento: " + error.message));
      }
    });

  function limparFormulario() {
    document.querySelector("#agendamento-form").reset();
  }
}

// Inicialização
document.addEventListener("DOMContentLoaded", () => {
  const selectedDateInput = document.getElementById("selectedDate");
  const diaSemanaInput = document.getElementById("diaSemana");
  const horaInicioInput = document.getElementById("horaInicio");
  const horaFimInput = document.getElementById("horaFim");

  selectedDateInput?.addEventListener("change", () => {
    const selectedDate = luxon.DateTime.fromISO(selectedDateInput.value);
    const diaDaSemana = selectedDate.toFormat("EEEE", { locale: "pt" });
    const diaDaSemanaCapitalized = diaDaSemana.charAt(0).toUpperCase() + diaDaSemana.slice(1);
    diaSemanaInput.value = diaDaSemanaCapitalized;
    atualizarVagasDisponiveis();
  });

  horaInicioInput?.addEventListener("change", atualizarVagasDisponiveis);
  horaFimInput?.addEventListener("change", atualizarVagasDisponiveis);

  const form = document.querySelector("#agendamento-form");
  form?.addEventListener("submit", event => {
    event.preventDefault();
    validarAgendamento();
  });

  if (diaSemanaInput) {
    diaSemanaInput.readOnly = true;
  }

  if (selectedDateInput?.value && horaInicioInput?.value && horaFimInput?.value) {
    atualizarVagasDisponiveis();
  }

  const usuariosCache = localStorage.getItem("usuariosCache");
  if (!usuariosCache) {
    baixarDadosDoFirebase();
  }

  inicializarAutocompletar();
});
