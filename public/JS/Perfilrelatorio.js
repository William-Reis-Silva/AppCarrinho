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
            const selectMes = document.getElementById("selectMes");
            const btnMostrarRelatorios = document.getElementById("btnMostrarRelatorios");
            const relatoriosElement = document.getElementById("relatorios");
            const relatoriosRef = firebase.database().ref("relatorios/" + userId);

            // Event listener para o botão "Mostrar Relatórios"
            btnMostrarRelatorios.addEventListener("click", function () {
                const mesSelecionado = selectMes.value;
                renderizarRelatoriosPorMes(mesSelecionado);
            });
        
            // Função para preencher o select com opções de meses
            function preencherSelectComMeses(relatorios) {
                const relatoriosPorMes = agruparRelatoriosPorMes(relatorios);
                for (const mesAno in relatoriosPorMes) {
                    const option = document.createElement("option");
                    option.value = mesAno;
                    option.textContent = mesAno;
                    selectMes.appendChild(option);
                }
            }
        
            // Função para agrupar relatórios por mês
            function agruparRelatoriosPorMes(relatorios) {
                const relatoriosPorMes = {};
                for (const relatorioId in relatorios) {
                    const relatorio = relatorios[relatorioId];
                    const data = relatorio.data; // Substitua pelo nome correto da propriedade de data
                    const mesAno = data.substr(0, 7);

                    if (!relatoriosPorMes[mesAno]) {
                        relatoriosPorMes[mesAno] = [];
                    }
                    relatoriosPorMes[mesAno].push(relatorio);
                }
                return relatoriosPorMes;
            }

            // Função para renderizar relatórios do mês selecionado
            function renderizarRelatoriosPorMes(mesSelecionado) {
                relatoriosElement.innerHTML = ""; // Limpar conteúdo anterior

                relatoriosRef.once("value")
                    .then(function (snapshot) {
                        const relatorios = snapshot.val();
                        const relatoriosPorMes = agruparRelatoriosPorMes(relatorios);
                        const relatoriosDoMes = relatoriosPorMes[mesSelecionado];

                        if (relatoriosDoMes) {
                            for (const relatorio of relatoriosDoMes) {
                                const listItem = document.createElement("li");
                                listItem.innerHTML = `
                            <p><strong>Experiências:</strong> ${escapeHtml(relatorio.experiencias)}</p>
                            <p><strong>Hora Trabalhada:</strong> ${escapeHtml(relatorio.horaTrabalhada)}</p>
                            <p><strong>Local de Trabalho:</strong> ${escapeHtml(relatorio.localTrabalho)}</p>
                            <p><strong>Publicações:</strong> ${escapeHtml(relatorio.publicacoes)}</p>
                            <p><strong>Vídeos Mostrados:</strong> ${escapeHtml(relatorio.videosMostrados)}</p>
                        `;
                                relatoriosElement.appendChild(listItem);
                                const linhaSeparadorrelatorio = document.createElement("hr");
                                relatoriosElement.appendChild(linhaSeparadorrelatorio);
                            }
                        } else {
                            const semRelatoriosMessage = document.createElement("p");
                            semRelatoriosMessage.textContent = "Não há relatórios para o mês selecionado.";
                            relatoriosElement.appendChild(semRelatoriosMessage);
                        }
                    })
                    .catch(function (error) {
                        console.error("Erro ao recuperar histórico de relatórios:", error);
                    });
            }

            // Recuperar relatórios do banco de dados e preencher o select
            relatoriosRef.once("value")
                .then(function (snapshot) {
                    const relatorios = snapshot.val();
                    preencherSelectComMeses(relatorios);
                })
                .catch(function (error) {
                    console.error("Erro ao recuperar histórico de relatórios:", error);
                });
            }
        })
    })