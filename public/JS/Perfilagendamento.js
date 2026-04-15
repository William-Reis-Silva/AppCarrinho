function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

document.addEventListener("DOMContentLoaded", function () {
    firebase.auth().onAuthStateChanged(function (user) {
        if (!user) {
            window.location.href = "login.html";
            return;
        }
        if (user) {
            const userId = user.uid;
            const selectMesAgendamento = document.getElementById("selectMesAgendamento");
            const btnMostrarAgendamentos = document.getElementById("btnMostrarAgendamentos");
            const agendamentosElement = document.getElementById("agendamentos");
            const agendamentosRef = firebase.database().ref("agendamentos").orderByChild("userId").equalTo(userId);

            const mesesNomes = [
                "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
                "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
            ];

            // Função para converter o formato do mês
            function converterParaNomeMesAno(mesAno) {
                const [ano, mes] = mesAno.split("-");
                const nomeMes = mesesNomes[parseInt(mes, 10) - 1];
                return `${nomeMes} ${ano}`;
            }

            // Event listener para o botão "Mostrar Agendamentos"
            btnMostrarAgendamentos.addEventListener("click", function () {
                const mesSelecionado = selectMesAgendamento.value;
                renderizarAgendamentosPorMes(mesSelecionado);
            });

            // Função para preencher o select com opções de meses
            function preencherSelectComMesesAgendamento(agendamentos) {
                const agendamentosPorMes = agruparAgendamentosPorMes(agendamentos);
                for (const mesAno in agendamentosPorMes) {
                    const option = document.createElement("option");
                    option.value = mesAno;
                    option.textContent = converterParaNomeMesAno(mesAno); // Aqui você chama a função
                    selectMesAgendamento.appendChild(option);
                }
            }

            // Função para agrupar agendamentos por mês
            function agruparAgendamentosPorMes(agendamentos) {
                const agendamentosPorMes = {};
                for (const agendamentoId in agendamentos) {
                    const agendamento = agendamentos[agendamentoId];
                    const data = agendamento.selectedDate;
                    const mesAno = data.substr(0, 7);

                    if (!agendamentosPorMes[mesAno]) {
                        agendamentosPorMes[mesAno] = [];
                    }
                    agendamentosPorMes[mesAno].push(agendamento);
                }
                return agendamentosPorMes;
            }

            // Função para renderizar agendamentos do mês selecionado
            function renderizarAgendamentosPorMes(mesSelecionado) {
                agendamentosElement.innerHTML = ""; // Limpar conteúdo anterior

                agendamentosRef.once("value")
                    .then(function (snapshot) {
                        const agendamentos = snapshot.val();
                        const agendamentosPorMes = agruparAgendamentosPorMes(agendamentos);
                        const agendamentosDoMes = agendamentosPorMes[mesSelecionado];

                        if (agendamentosDoMes) {
                            for (const agendamento of agendamentosDoMes) {
                                const listItem = document.createElement("li");
                                listItem.innerHTML = `
                                    <p><strong>Carrinho:</strong> ${escapeHtml(agendamento.carrinho)}</p>
                                    <p><strong>Hora:</strong> ${escapeHtml(agendamento.horaInicio)}-${escapeHtml(agendamento.horaFim)}</p>
                                    <p><strong>Local:</strong> ${escapeHtml(agendamento.local)}</p>
                                    <p><strong>Nome do Companheiro:</strong> ${escapeHtml(agendamento.nomeCompanheiro)}</p>
                                `;
                                agendamentosElement.appendChild(listItem);
                                // Adicionar separador de linha após o item de agendamento
                                const linhaSeparadoraAgendamento = document.createElement("hr");
                                agendamentosElement.appendChild(linhaSeparadoraAgendamento);
                            }
                        } else {
                            const semAgendamentosMessage = document.createElement("p");
                            semAgendamentosMessage.textContent = "Não há agendamentos para o mês selecionado.";
                            agendamentosElement.appendChild(semAgendamentosMessage);
                        }
                    })
                    .catch(function (error) {
                        console.error("Erro ao recuperar histórico de agendamentos:", error);
                    });
            }

            // Recuperar agendamentos do banco de dados e preencher o select
            agendamentosRef.once("value")
                .then(function (snapshot) {
                    const agendamentos = snapshot.val();
                    preencherSelectComMesesAgendamento(agendamentos);
                })
                .catch(function (error) {
                    console.error("Erro ao recuperar histórico de agendamentos:", error);
                });
        }
    });
});
