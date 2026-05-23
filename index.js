/* === Imports === */
// Importa a configuração do Firebase (chaves e identificadores do projeto).
import { firebaseConfig } from "./firebaseConfig.js"

// SDK principal do Firebase para inicializar o app.
import { initializeApp } from "firebase/app"

// Módulo de autenticação do Firebase — funções usadas neste app.
// Comentários: usamos autenticação por email/senha e com Google (popup).
import { getAuth,
         createUserWithEmailAndPassword,
         signInWithEmailAndPassword,
         signOut,
         onAuthStateChanged, 
         GoogleAuthProvider,
         signInWithPopup } from "firebase/auth"

// Módulo do Firestore (banco de dados em tempo real/NoSQL).
// Usamos coleções, documentos, consultas e atualização em tempo real.
import { getFirestore,
         collection,
         addDoc,
         serverTimestamp,
         onSnapshot,
         query,
         where,
         orderBy,
         doc,
         updateDoc,
         deleteDoc } from "firebase/firestore"

/* === Firebase Setup === */
// Inicializa o app Firebase com as credenciais (firebaseConfig).
// Após a inicialização, obtemos instâncias de Auth e Firestore
// para usar nas operações de autenticação e banco de dados.
const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const provider = new GoogleAuthProvider() // provedor para login com Google
const db = getFirestore(app) // instância do Cloud Firestore

/* === UI === */

/* == UI - Elements == */
// Mapeia elementos do DOM para manipular a interface.
const viewLoggedOut = document.getElementById("logged-out-view")
const viewLoggedIn = document.getElementById("logged-in-view")

// Botão para login com conta Google (popup)
const signInWithGoogleButtonEl = document.getElementById("sign-in-with-google-btn")

// Campos de autenticação por email e senha
const emailInputEl = document.getElementById("email-input")
const passwordInputEl = document.getElementById("password-input")

// Botões para ações de autenticação por email
const signInButtonEl = document.getElementById("sign-in-btn")
const createAccountButtonEl = document.getElementById("create-account-btn")

// Botão para deslogar
const signOutButtonEl = document.getElementById("sign-out-btn")

// Elementos para exibir informações do usuário
const userProfilePictureEl = document.getElementById("user-profile-picture")
const userGreetingEl = document.getElementById("user-greeting")

// Emojis de humor (coleção de botões) usados para classificar o post
const moodEmojiEls = document.getElementsByClassName("mood-emoji-btn")
const textareaEl = document.getElementById("post-input") // área de texto do post
const postButtonEl = document.getElementById("post-btn") // botão publicar

// Filtros de período (todos, hoje, semana, mês)
const allFilterButtonEl = document.getElementById("all-filter-btn")
const filterButtonEls = document.getElementsByClassName("filter-btn")

// Container onde os posts serão renderizados
const postsEl = document.getElementById("posts")

/* == UI - Event Listeners == */
// Conecta eventos dos elementos DOM às funções que implementam
// a lógica do app (autenticação, seleção de humor, filtros, posts).
signInWithGoogleButtonEl.addEventListener("click", authSignInWithGoogle)

signInButtonEl.addEventListener("click", authSignInWithEmail)
createAccountButtonEl.addEventListener("click", authCreateAccountWithEmail)

signOutButtonEl.addEventListener("click", authSignOut)

// Cada emoji de humor recebe um listener para marcar o estado escolhido
for (let moodEmojiEl of moodEmojiEls) {
    moodEmojiEl.addEventListener("click", selectMood)
}

// Botões de filtro por período (hoje, semana, mês, todos)
for (let filterButtonEl of filterButtonEls) {
    filterButtonEl.addEventListener("click", selectFilter)
}

// Publicar novo post
postButtonEl.addEventListener("click", postButtonPressed)

/* === State === */
// Estado local simples: guarda o valor do humor selecionado.
// 0 significa "nenhum humor selecionado"; valores 1..n correspondem
// aos emojis disponíveis na IU.
let moodState = 0

/* === Global Constants === */
// Nome da coleção no Firestore onde os posts serão salvos.
const collectionName = "posts"

/* === Main Code === */

// Observa mudanças no estado de autenticação do usuário.
// Essa função é chamada sempre que o usuário faz login ou logout.
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Usuário autenticado: exibe view logada e carrega posts
        showLoggedInView()
        showProfilePicture(userProfilePictureEl, user)
        showUserGreeting(userGreetingEl, user)
        updateFilterButtonStyle(allFilterButtonEl) // marca filtro 'todos'
        fetchAllPosts(user) // carrega posts do usuário em tempo real
    } else {
        // Usuário desconectado: mostra tela de login
        showLoggedOutView()
    }
})

/* === Functions === */

/* = Functions - Firebase - Authentication = */
// Funções relacionadas à autenticação. Mantemos a lógica separada
// para ficar mais simples de explicar e testar.

// Abre um popup para autenticação com Google. O Firebase cuida da
// maior parte do fluxo; aqui só tratamos o sucesso/erro.
function authSignInWithGoogle() {
    signInWithPopup(auth, provider)
        .then((result) => {
            console.log("Signed in with Google")
        }).catch((error) => {
            console.error(error.message)
        })
}

// Faz login usando email e senha. Em caso de sucesso limpamos os campos.
function authSignInWithEmail() {
    const email = emailInputEl.value
    const password = passwordInputEl.value
    
    signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            clearAuthFields()
        })
        .catch((error) => {
            console.error(error.message)
        })
}

// Cria uma nova conta com email e senha.
function authCreateAccountWithEmail() {
    const email = emailInputEl.value
    const password = passwordInputEl.value

    createUserWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            clearAuthFields()
        })
        .catch((error) => {
            console.error(error.message) 
        })
}

// Desconecta o usuário atual.
function authSignOut() {
    signOut(auth)
        .then(() => {
        }).catch((error) => {
            console.error(error.message)
        })
}

/* = Functions - Firebase - Cloud Firestore = */
// Operações de leitura/escrita no Firestore. O Firestore é um
// banco NoSQL organizado em coleções e documentos.

// Adiciona um novo post na coleção 'posts'. Usamos `serverTimestamp()`
// para salvar a hora do servidor (evita inconsistências com o relógio do cliente).
async function addPostToDB(postBody, user) {
    try {
        const docRef = await addDoc(collection(db, collectionName), {
            body: postBody,
            uid: user.uid,
            createdAt: serverTimestamp(),
            mood: moodState
        })
        console.log("Document written with ID: ", docRef.id)
    } catch (error) {
        console.error(error.message)
    }
}

// Atualiza o campo `body` de um documento (post) existente.
async function updatePostInDB(docId, newBody) {
    const postRef = doc(db, collectionName, docId);

    await updateDoc(postRef, {
        body: newBody
    })
}

// Remove um post do Firestore pelo ID do documento.
async function deletePostFromDB(docId) {
    await deleteDoc(doc(db, collectionName, docId))
}

// Inscreve em uma query do Firestore e renderiza resultados em tempo real.
// `onSnapshot` é a forma de receber atualizações "push" sempre que os
// dados mudam no servidor.
function fetchInRealtimeAndRenderPostsFromDB(query, user) {
    onSnapshot(query, (querySnapshot) => {
        clearAll(postsEl)
        
        querySnapshot.forEach((doc) => {
            renderPost(postsEl, doc)
        })
    })
}

function fetchTodayPosts(user) {
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)
    
    const endOfDay = new Date()
    endOfDay.setHours(23, 59, 59, 999)
    
    const postsRef = collection(db, collectionName)
    
    const q = query(postsRef, where("uid", "==", user.uid),
                              where("createdAt", ">=", startOfDay),
                              where("createdAt", "<=", endOfDay),
                              orderBy("createdAt", "desc"))
                              
    fetchInRealtimeAndRenderPostsFromDB(q, user)                  
}

function fetchWeekPosts(user) {
    const startOfWeek = new Date()
    startOfWeek.setHours(0, 0, 0, 0)
    
    if (startOfWeek.getDay() === 0) { // If today is Sunday
        startOfWeek.setDate(startOfWeek.getDate() - 6) // Go to previous Monday
    } else {
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1)
    }
    
    const endOfDay = new Date()
    endOfDay.setHours(23, 59, 59, 999)
    
    const postsRef = collection(db, collectionName)
    
    const q = query(postsRef, where("uid", "==", user.uid),
                              where("createdAt", ">=", startOfWeek),
                              where("createdAt", "<=", endOfDay),
                              orderBy("createdAt", "desc"))
                              
    fetchInRealtimeAndRenderPostsFromDB(q, user)
}

function fetchMonthPosts(user) {
    const startOfMonth = new Date()
    startOfMonth.setHours(0, 0, 0, 0)
    startOfMonth.setDate(1)

    const endOfDay = new Date()
    endOfDay.setHours(23, 59, 59, 999)

	const postsRef = collection(db, collectionName)
    
    const q = query(postsRef, where("uid", "==", user.uid),
                              where("createdAt", ">=", startOfMonth),
                              where("createdAt", "<=", endOfDay),
                              orderBy("createdAt", "desc"))

    fetchInRealtimeAndRenderPostsFromDB(q, user)
}

function fetchAllPosts(user) {
    const postsRef = collection(db, collectionName)
    
    const q = query(postsRef, where("uid", "==", user.uid),
                              orderBy("createdAt", "desc"))

    fetchInRealtimeAndRenderPostsFromDB(q, user)
}

/* == Functions - UI Functions == */

function createPostHeader(postData) {
    /*
        <div class="header">
        </div>
    */
    const headerDiv = document.createElement("div")
    headerDiv.className = "header"
    
        /* 
            <h3>21 Sep 2023 - 14:35</h3>
        */
        const headerDate = document.createElement("h3")
        headerDate.textContent = displayDate(postData.createdAt)
        headerDiv.appendChild(headerDate)
        
        /* 
            <img src="assets/emojis/5.png">
        */
        const moodImage = document.createElement("img")
        moodImage.src = `assets/emojis/${postData.mood}.png`
        headerDiv.appendChild(moodImage)
        
    return headerDiv
}

function createPostBody(postData) {
    /*
        <p>This is a post</p>
    */
    const postBody = document.createElement("p")
    postBody.innerHTML = replaceNewlinesWithBrTags(postData.body)
    
    return postBody
}

function createPostUpdateButton(wholeDoc) {
    const postId = wholeDoc.id
    const postData = wholeDoc.data()
    
    /* 
        <button class="edit-color">Edit</button>
    */
    const button = document.createElement("button")
    button.textContent = "Edit"
    button.classList.add("edit-color")
    button.addEventListener("click", function() {
        const newBody = prompt("Edit the post", postData.body)
        
        if (newBody) {
            updatePostInDB(postId, newBody)
        }
    })
    
    return button
}

function createPostDeleteButton(wholeDoc) {
    const postId = wholeDoc.id
    
    /* 
        <button class="delete-color">Delete</button>
    */
    const button = document.createElement('button')
    button.textContent = 'Delete'
    button.classList.add("delete-color")
    button.addEventListener('click', function() {
        deletePostFromDB(postId)
    })
    return button
}

function createPostFooter(wholeDoc) {
    /* 
        <div class="footer">
            <button>Edit</button>
            <button>Delete</button>
        </div>
    */
    const footerDiv = document.createElement("div")
    footerDiv.className = "footer"
    
    footerDiv.appendChild(createPostUpdateButton(wholeDoc))
    footerDiv.appendChild(createPostDeleteButton(wholeDoc))
    
    return footerDiv
}

function renderPost(postsEl, wholeDoc) {
    const postData = wholeDoc.data()
    
    const postDiv = document.createElement("div")
    postDiv.className = "post"
    
    postDiv.appendChild(createPostHeader(postData))
    postDiv.appendChild(createPostBody(postData))
    postDiv.appendChild(createPostFooter(wholeDoc))
    
    postsEl.appendChild(postDiv)
}

function replaceNewlinesWithBrTags(inputString) {
    return inputString.replace(/\n/g, "<br>")
}

function postButtonPressed() {
    const postBody = textareaEl.value
    const user = auth.currentUser
    
    if (postBody && moodState) {
        addPostToDB(postBody, user)
        clearInputField(textareaEl)
        resetAllMoodElements(moodEmojiEls)
    }
}

function clearAll(element) {
    element.innerHTML = ""
}

function showLoggedOutView() {
    hideView(viewLoggedIn)
    showView(viewLoggedOut)
}

function showLoggedInView() {
    hideView(viewLoggedOut)
    showView(viewLoggedIn)
}

function showView(view) {
    view.style.display = "flex" 
}

function hideView(view) {
    view.style.display = "none"
}

function clearInputField(field) {
	field.value = ""
}

function clearAuthFields() {
	clearInputField(emailInputEl)
	clearInputField(passwordInputEl)
}

function showProfilePicture(imgElement, user) {
    const photoURL = user.photoURL
    
    if (photoURL) {
        imgElement.src = photoURL
    } else {
        imgElement.src = "assets/images/default-profile-picture.jpeg"
    }
}

function showUserGreeting(element, user) {
    const displayName = user.displayName
    
    if (displayName) {
        const userFirstName = displayName.split(" ")[0]
        
        element.textContent = `Hey ${userFirstName}, how are you?`
    } else {
        element.textContent = `Hey friend, how are you?`
    }
}

function displayDate(firebaseDate) {
    if (!firebaseDate) {
        return "Date processing"
    }
    
    const date = firebaseDate.toDate()
    
    const day = date.getDate()
    const year = date.getFullYear()
    
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    const month = monthNames[date.getMonth()]

    let hours = date.getHours()
    let minutes = date.getMinutes()
    hours = hours < 10 ? "0" + hours : hours
    minutes = minutes < 10 ? "0" + minutes : minutes

    return `${day} ${month} ${year} - ${hours}:${minutes}`
}

/* = Functions - UI Functions - Mood = */

function selectMood(event) {
    const selectedMoodEmojiElementId = event.currentTarget.id
    
    changeMoodsStyleAfterSelection(selectedMoodEmojiElementId, moodEmojiEls)
    
    const chosenMoodValue = returnMoodValueFromElementId(selectedMoodEmojiElementId)
    
    moodState = chosenMoodValue
}

function changeMoodsStyleAfterSelection(selectedMoodElementId, allMoodElements) {
    for (let moodEmojiEl of moodEmojiEls) {
        if (selectedMoodElementId === moodEmojiEl.id) {
            moodEmojiEl.classList.remove("unselected-emoji")          
            moodEmojiEl.classList.add("selected-emoji")
        } else {
            moodEmojiEl.classList.remove("selected-emoji")
            moodEmojiEl.classList.add("unselected-emoji")
        }
    }
}

function resetAllMoodElements(allMoodElements) {
    for (let moodEmojiEl of allMoodElements) {
        moodEmojiEl.classList.remove("selected-emoji")
        moodEmojiEl.classList.remove("unselected-emoji")
    }
    
    moodState = 0
}

function returnMoodValueFromElementId(elementId) {
    return Number(elementId.slice(5))
}

/* == Functions - UI Functions - Date Filters == */

function resetAllFilterButtons(allFilterButtons) {
    for (let filterButtonEl of allFilterButtons) {
        filterButtonEl.classList.remove("selected-filter")
    }
}

function updateFilterButtonStyle(element) {
    element.classList.add("selected-filter")
}

function fetchPostsFromPeriod(period, user) {
    if (period === "today") {
        fetchTodayPosts(user)
    } else if (period === "week") {
        fetchWeekPosts(user)
    } else if (period === "month") {
        fetchMonthPosts(user)
    } else {
        fetchAllPosts(user)
    }
}

function selectFilter(event) {
    const user = auth.currentUser
    
    const selectedFilterElementId = event.target.id
    
    const selectedFilterPeriod = selectedFilterElementId.split("-")[0]
    
    const selectedFilterElement = document.getElementById(selectedFilterElementId)
    
    resetAllFilterButtons(filterButtonEls)
    
    updateFilterButtonStyle(selectedFilterElement)
    
    fetchPostsFromPeriod(selectedFilterPeriod, user)
}