document.addEventListener("DOMContentLoaded", function () {
    const mensagemAcessoNegado = document.getElementById("mensagem-acesso-negado");
    const links = document.querySelectorAll("#link-agendar, #link-relatorio, #link-perfil");

    firebase.auth().onAuthStateChanged(function (user) {
        const usuarioLogado = !!user;

        if (!usuarioLogado) {
            mensagemAcessoNegado.style.display = "none";

            links.forEach(function (link) {
                link.addEventListener("click", function (event) {
                    event.preventDefault();
                    mensagemAcessoNegado.style.display = "block";
                });
            });
        } else {
            document.getElementById("user-greeting").style.display = "block";

            // Verificar se o usuário tem uma propriedade 'uid' antes de acessá-la
            if (user.uid) {
                const userId = user.uid;
                const databaseRef = firebase.database().ref("usuarios/" + userId);
                databaseRef.once("value")
                    .then(function (snapshot) {
                        const userData = snapshot.val();
                        if (userData && userData.usuario) {
                            document.getElementById("username").textContent = userData.usuario;
                        } else {
                            document.getElementById("username").textContent = "Usuário";
                        }
                    })
                    .catch(function (error) {
                        console.error("Erro ao recuperar os dados do usuário:", error);
                    });
            }
        }
    });


    // controle de agenda 
    const database = firebase.database(); // Inicializa o banco de dados do Firebase
    const agendamentosSemanaElement = document.querySelector(".lista-agendamentos");
    const tituloAgendamentosElement = document.getElementById("tituloAgendamentos");

    function ordenarCompromissosPorHora(compromissos) {
        return compromissos.sort((a, b) => {
            const horaInicioA = luxon.DateTime.fromFormat(a.horaInicio, 'HH:mm', { zone: 'UTC' });
            const horaInicioB = luxon.DateTime.fromFormat(b.horaInicio, 'HH:mm', { zone: 'UTC' });
            return horaInicioA - horaInicioB;
        });
    }

    function escapeHtml(str) {
        if (str == null) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function exibirDetalhesCompromisso(agendamento) {
        return `
            <strong>Carrinho:</strong> ${escapeHtml(agendamento.carrinho)}<br>
            <strong>Nome do Publicador:</strong> ${escapeHtml(agendamento.nomePublicador)}<br>
            <strong>Nome do Companheiro:</strong> ${escapeHtml(agendamento.nomeCompanheiro)}<br>
            <strong>Hora:</strong> ${escapeHtml(agendamento.horaInicio)} às ${escapeHtml(agendamento.horaFim)}<br>
            <strong>Local:</strong> ${escapeHtml(agendamento.local)}
        `;
    }


    function exibirAgendamentosSemana() {
        agendamentosSemanaElement.innerHTML = ""; // Limpa o conteúdo existente do elemento

        // Calcula as datas de início e fim da semana atual
        const hoje = luxon.DateTime.now().setLocale('pt-BR');
        const primeiraSegundaDaSemana = hoje.startOf('week').plus({ days: 0 });
        const ultimoDomingoDaSemana = hoje.endOf('week').minus({ days: 0 });

        // Formata as datas para exibição
        const dataInicio = primeiraSegundaDaSemana.toFormat('dd LLLL', { locale: 'pt-BR' });
        const dataFim = ultimoDomingoDaSemana.toFormat('dd LLLL', { locale: 'pt-BR' });

        // Atualiza o título para mostrar as datas da semana
        tituloAgendamentosElement.innerHTML = `Semana de ${dataInicio} a ${dataFim}`;

        // Obtém uma referência ao nó "agendamentos" no banco de dados
        const agendamentosRef = database.ref("agendamentos");

        // Obtém os dados dos compromissos do banco de dados
        agendamentosRef.once("value")
            .then(function (snapshot) {
                const agendamentos = snapshot.val(); // Recupera os dados dos compromissos

                const agendamentosAgrupados = {}; // Cria um objeto para agrupar os compromissos por data

                // Percorre cada compromisso e os agrupa por data
                for (const chave in agendamentos) {
                    const agendamento = agendamentos[chave];
                    const agendamentoDate = luxon.DateTime.fromISO(agendamento.selectedDate);

                    // Verifica se o compromisso está dentro da semana atual
                    if (agendamentoDate >= primeiraSegundaDaSemana && agendamentoDate <= ultimoDomingoDaSemana) {
                        // Formata a data para agrupamento (usando o formato ISO)
                        const diaAgendamentoISO = agendamentoDate.toISODate();

                        // Inicializa o array para a data atual, caso ainda não exista
                        if (!agendamentosAgrupados[diaAgendamentoISO]) {
                            agendamentosAgrupados[diaAgendamentoISO] = [];
                        }

                        // Adiciona o compromisso ao grupo de datas apropriado
                        agendamentosAgrupados[diaAgendamentoISO].push(agendamento);
                    }
                }

                // Reorganiza as chaves do objeto agendamentosAgrupados em ordem cronológica
                const datasOrdenadas = Object.keys(agendamentosAgrupados).sort();

                // Percorre cada data ordenada e seus compromissos agrupados
                for (const diaAgendamento of datasOrdenadas) {
                    const agendamentosDoDia = agendamentosAgrupados[diaAgendamento];
                    const diaAgendamentoDate = luxon.DateTime.fromISO(diaAgendamento);

                    // Formata o dia da semana para exibição
                    const diaSemanaInicialMaiuscula = diaAgendamentoDate.toLocaleString({ weekday: 'long', locale: 'pt-BR' }).charAt(0).toUpperCase() + diaAgendamentoDate.toLocaleString({ weekday: 'long', locale: 'pt-BR' }).slice(1);

                    // Cria um elemento para exibir o dia da semana e a data
                    const agendamentoItem = document.createElement("li");
                    agendamentoItem.classList.add("dia-agendamento");
                    agendamentoItem.innerHTML = `<strong>${diaSemanaInicialMaiuscula}, ${diaAgendamentoDate.day} de ${diaAgendamentoDate.monthLong} de ${diaAgendamentoDate.year}</strong>`;
                    agendamentosSemanaElement.appendChild(agendamentoItem);

                    // Ordena os compromissos do dia por hora
                    const agendamentosOrdenados = ordenarCompromissosPorHora(agendamentosDoDia);

                    // Percorre os compromissos do dia
                    agendamentosOrdenados.forEach(function (agendamento) {
                        const agendamentoDetalhes = document.createElement("li");
                        agendamentoDetalhes.innerHTML = exibirDetalhesCompromisso(agendamento);
                        agendamentosSemanaElement.appendChild(agendamentoDetalhes);

                        // Adiciona um separador de linha após cada compromisso
                        const linhaSeparadoraAgendamento = document.createElement("hr");
                        agendamentosSemanaElement.appendChild(linhaSeparadoraAgendamento);
                    });
                }
            })
            .catch(function (error) {
                console.error("Erro ao recuperar os compromissos:", error);
            });
    }

    window.addEventListener("load", function () {
        exibirAgendamentosSemana();
    });

    setInterval(function () {
        exibirAgendamentosSemana();
    }, 60000)
})