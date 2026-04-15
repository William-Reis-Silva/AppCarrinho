document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("cadastro-form");
  const mensagemErro = document.getElementById("mensagem-erro");
  const mensagemSucesso = document.getElementById("mensagem-sucesso");

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const nomeCompleto = form.nomeCompleto.value;
    const usuario = form.usuário.value;
    const email = form.email.value;
    const senha = form.senha.value;
    const confirmarSenha = form.confirmarSenha.value;

    // Verificar se as senhas coincidem
    if (senha !== confirmarSenha) {
      mensagemErro.textContent = "As senhas não coincidem.";
      mensagemSucesso.textContent = "";
      return;
    }

    // Verificar se a senha atende aos requisitos (por exemplo, pelo menos 6 caracteres)
    if (senha.length < 6) {
      mensagemErro.textContent = "A senha deve ter pelo menos 6 caracteres.";
      mensagemSucesso.textContent = "";
      return;
    }

    // Criar usuário no Firebase Authentication
    firebase.auth().createUserWithEmailAndPassword(email, senha)
      .then((userCredential) => {
        const user = userCredential.user;

        const userData = {
          nomeCompleto: nomeCompleto,
          usuario: usuario,
          email: email
        };

        const db = firebase.database();

        // Verificar se o usuário já existe no Realtime Database
        db.ref("usuarios/" + user.uid).once("value")
          .then((snapshot) => {
            if (snapshot.exists()) {
              mensagemErro.textContent = "Usuário já cadastrado.";
              mensagemSucesso.textContent = "";
              return;
            }

            // Salvar as informações no nó 'usuarios'
            db.ref("usuarios/" + user.uid).set(userData)
              .then(() => {
                mensagemErro.textContent = "";
                mensagemSucesso.textContent = "Usuário cadastrado com sucesso!";
                // Redirecionar para a página  home
                window.location.href = "index.html";
              })
              .catch((error) => {
                mensagemErro.textContent = "Erro ao salvar informações no banco de dados.";
                mensagemSucesso.textContent = "";
                console.error("Erro ao salvar informações no banco de dados:", error);
              });
          })
          .catch((error) => {
            mensagemErro.textContent = "Erro ao verificar informações no banco de dados.";
            mensagemSucesso.textContent = "";
            console.error("Erro ao verificar informações no banco de dados:", error);
          });
      })
      .catch((error) => {
        mensagemErro.textContent = "Erro ao criar usuário.";
        mensagemSucesso.textContent = "";
        console.error("Erro ao criar usuário:", error);
      });
  });
});
