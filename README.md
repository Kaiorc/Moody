# Moody

Aplicação frontend simples para registrar e visualizar posts relacionados ao humor (mood journal) com autenticação e armazenamento no Firebase. O usuário pode registrar como está se sentindo (1-5), publicar um texto com esse estado e filtrar posts por período (hoje, semana, mês, todos).

## Recursos

- Autenticação com Google (Sign in with Google) e e-mail/senha.
- Publicação de posts com um mood (1 a 5) e texto multilinha.
- Edição e exclusão de posts pelo autor.
- Filtro de posts por período: Hoje, Semana, Mês, Todos.
- Atualização em tempo real usando Firestore `onSnapshot`.

## Tecnologias

- **Vite (devDependency: "latest")**: bundler e servidor de desenvolvimento rápido usado para servir e empacotar o frontend durante o desenvolvimento.
- **Firebase (10.1.0)**: SDK do Firebase usado para Authentication (login com Google / e-mail) e Cloud Firestore (armazenamento e sincronização em tempo real).
- **Vanilla JavaScript (ES6+)**: lógica da aplicação, manipulação do DOM e integração com o Firebase (arquivo `index.js`).
- **HTML5**: marcação e estrutura da interface (arquivo `index.html`).
- **CSS3**: estilos e layout da interface (arquivo `index.css`).

## Estrutura do projeto

```
.
├── index.html         # Estrutura principal da interface
├── index.css          # Estilos visuais da aplicação
├── index.js           # Lógica da aplicação e integração com Firebase
├── firebase-config.js # Configuração do Firebase
└── assets/            # Imagens, emojis, ícones e outros arquivos estáticos
```

## Requisitos

- **Node.js** (v14+ recomendado)
- **Conta no Firebase** para configurar Authentication e Firestore

## Configuração do Firebase

1. Crie um projeto no console do Firebase (https://console.firebase.google.com/).
2. No projeto, adicione um aplicativo Web e copie o snippet de configuração.
3. Habilite os provedores de autenticação necessários em "Authentication" (Google e Email/Password).
4. Crie uma coleção do Firestore chamada `posts` (o app cria documentos automaticamente, mas verifique regras de segurança).
5. Crie o arquivo `firebase-config.js` na raiz do projeto com o conteúdo similar a:

```js
// firebase-config.js
export const firebaseConfig = {
	apiKey: "SUA_API_KEY",
	authDomain: "SEU_AUTH_DOMAIN",
	projectId: "SEU_PROJECT_ID",
	storageBucket: "SEU_STORAGE_BUCKET",
	messagingSenderId: "SEU_MESSAGING_SENDER_ID",
	appId: "SEU_APP_ID"
}
```

Observação: por segurança este repositório não inclui chaves do Firebase — mantenha esse arquivo fora do controle de versão ou use variáveis de ambiente conforme sua preferência.

## Modelo de dados no Firestore

Coleção: `posts`
- `body` (string): conteúdo do post (texto com quebras de linha)
- `uid` (string): ID do usuário que criou o post
- `createdAt` (timestamp): carimbo de data/hora do post (usado para ordenação/filtragem)
- `mood` (number): valor de 1 a 5 representando o emoji selecionado

Referências à implementação: a lógica de leitura/escrita e renderização está em [index.js](index.js).

## Boas práticas e notas de desenvolvimento

- O arquivo `index.js` contém comentários e funções responsáveis por autenticação, manipulação de UI e interações com o Firestore. Consulte [index.js](index.js) para entender fluxos como `addPostToDB`, `fetchTodayPosts` e `onAuthStateChanged`.
- Para evitar exposição de chaves em repositórios públicos, mantenha `firebase-config.js` fora do Git ou utilize variáveis de ambiente no processo de build.
- Teste regras de segurança do Firestore usando o emulador local do Firebase quando for fazer alterações nas regras.

## Instalação e execução (desenvolvimento)

1. Instale dependências:

```bash
npm install
```

2. Inicie o servidor de desenvolvimento:

```bash
npm start
```

Abra `http://localhost:5173` (ou a porta informada pelo Vite) no seu navegador.