// SDK de Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, sendPasswordResetEmail, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, setDoc, collection, getDocs, getDoc, query, where, addDoc, documentId, deleteDoc, updateDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDPhlURFKPd1lbMfxjigejFniYXrljKbr0",
    authDomain: "planmatchpro.firebaseapp.com",
    projectId: "planmatchpro",
    storageBucket: "planmatchpro.firebasestorage.app",
    messagingSenderId: "591477261460",
    appId: "1:591477261460:web:32f397176de3de4af2a081"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const firestore = getFirestore(app);

// Registrar cuenta en Firebase
window.fRegistrar = function () {
    const username = document.getElementById("input_reg_user").value;
    const email = document.getElementById("input_reg_email").value;
    const password = document.getElementById("input_reg_password").value;
    const repassword = document.getElementById("input_reg_re_password").value;

    if (!username || !email || !password || !repassword) {
        alert("Por favor, complete todos los campos.");
    }

    if (password !== repassword) {
        alert("Las contraseñas no coinciden.");
    }

    if (password.length < 6) {
        alert("La contraseña debe tener al menos 6 carácteres")
    }

    createUserWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            const user = userCredential.user;
            return setDoc(doc(firestore, "usuarios", user.uid), {
                email: user.email,
                uid: user.uid,
                username: username,
            });
        })
        .then(() => {
            alert("Cuenta registrada con éxito");
            fOcultarTodo('modal_home');
            fTraerActividades();
            fTraerUsuario();
        })
        .catch(() => {
            alert("No se ha podido registrar");
        })
}

window.fIniciarSesion = function () {
    const email = document.getElementById("input_login_email").value;
    const password = document.getElementById("input_login_password").value;
    const checkbox = document.getElementById("check_recordar");

    if (!email || !password) {
        alert("Por favor, complete todos los campos.");
    }

    signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            const user = userCredential.user;

            if (checkbox.checked) {
                fGuardarPreferencias();
            }

            fOcultarTodo('modal_home');
            fTraerActividades();
            fTraerUsuario();
        })
        .catch(() => {
            alert("Error al iniciar sesión")
        })
}

window.fGuardarPreferencias = async function () {
    localStorage.setItem("recordarSesion", "true");
}

window.onload = function () {
    emailjs.init({
        publicKey: "gXauqSnE4hToT4Gfy"
    });

    const recordar = localStorage.getItem("recordarSesion") === "true";

    onAuthStateChanged(auth, (user) => {
        if (user && recordar) {
            fOcultarTodo('modal_home');
            fTraerActividades();
            fTraerUsuario();
        }
    });
};

window.fCambiarPassword = async function () {
    const correo = document.getElementById("input_cambiar_correo").value;

    try {
        await sendPasswordResetEmail(auth, correo);
        alert("Te hemos enviado un correo para restablecer tu contraseña.");

    } catch (error) {
        console.error("Error al enviar el correo de recuperación:", error);
    }
}

// Oculta todos los formularios (login, registro y cambio de contraseña)
window.fOcultarForms = function (form_que_se_muestra) {
    let elementos = document.querySelectorAll("#modal_formularios > .formulario");

    for (let i = 0; i < elementos.length; i++) {
        elementos[i].style.display = "none";
    }

    document.querySelector("#" + form_que_se_muestra).style.display = "flex"
}

// Oculta todo lo que haya en section
window.fOcultarTodo = function (modal_visible) {
    let elementos = document.querySelectorAll("section > div");

    for (let i = 0; i < elementos.length; i++) {
        elementos[i].style.display = "none";
    }

    document.querySelector("#" + modal_visible).style.display = "flex"
}

// Esta función pinta en el home las actividades desde Firebase
window.fTraerActividades = async function () {
    const coleccion = collection(firestore, "actividades");
    let html = ""
    try {
        const snapshot = await getDocs(coleccion);

        snapshot.forEach((doc) => {
            const { nombre, imagen } = doc.data();
            const uid = doc.id;

            html += "<div>"
            html += `<div class='div_contenedor_icono' onclick="fGrupos('${uid}')">`
            html += `<img src='assets/imagenes/${imagen}.png' alt='Actividad'>`
            html += "</div>"
            html += `<p class='nombre_actividad'>${nombre}</p>`
            html += "</div>"

        });

        document.querySelector("#modal_home").innerHTML = html;

    } catch (error) {
        console.error("Error al obtener actividades:", error);
    }
}

// esta función trae los datos del usuario actual
window.fTraerUsuario = async function () {
    const user = auth.currentUser;

    if (user) {
        try {
            const userRef = doc(firestore, "usuarios", user.uid);
            const userSnap = await getDoc(userRef);

            const data = userSnap.data();
            const username = data.username;

            let html = ""
            html += username
            html += `<div id="menu_usuario">`
            html += `<p onclick="fMisGrupos()" id='mis_grupos'>Mis grupos »</p>`
            html += `<p onclick="fPerfil()">Perfil »</p>`
            html += `</div>`

            document.querySelector("#div_username").innerHTML = html

        } catch (error) {
            console.error("Error al obtener el usuario:", error);
        }
    }
}

// Esta función carga los grupos y los genera dinámicamente en la modal de los grupos
window.fGrupos = async function (actividad) {
    const user = auth.currentUser;
    const userUid = user.uid;
    sessionStorage.setItem("actividad_actual", actividad);

    fOcultarTodo('modal_grupos');

    const coleccion = collection(firestore, "grupos");
    const consulta = query(coleccion, where("uid_actividad", "==", actividad));

    const qUsuarioGrupos = query(
        collection(firestore, "usuarios_grupos"),
        where("uid_usuario", "==", userUid)
    );

    const usuarioGruposSnap = await getDocs(qUsuarioGrupos);
    const gruposUnidos = new Set();
    usuarioGruposSnap.forEach((doc) => {
        gruposUnidos.add(doc.data().uid_grupo);
    });

    let html = "";

    try {
        const snapshot = await getDocs(consulta);
        snapshot.forEach((doc) => {
            const { fecha, horario, zona, uid_creador } = doc.data();
            const uid = doc.id;

            sessionStorage.setItem("grupo_actual", uid);

            html += "<div class='div_grupo'>"
            html += `<div class='div_datos_grupo'>`
            html += `<p class='txt_zona'>${zona}</p>`
            html += `<p class='txt_dia'>${fecha}</p>`
            html += `<p class='txt_hora'>${horario}</p>`
            html += "</div>"

            if (uid_creador === userUid) {
                html += "<div class='div_acciones'>"
                html += "<div class='div_btn_modificar'>"
                html += `<p class='btn_modificar' onclick="fOcultarTodo('modal_formularios'); fOcultarForms('div_modal_modificar'); fCargarGrupo();">Editar</p>`
                html += "</div>"
                html += "<div class='div_btn_borrar'>"
                html += `<p class='btn_borrar' onclick="fBorrarGrupo('${uid}')">Borrar</p>`
                html += "</div>"
                html += "</div>"
            }

            html += "<div class='div_btn_grupo'>"
            if (gruposUnidos.has(uid)) {
                html += `<p class='btn_unete' id='btn_unete_${uid}' style="pointer-events: none; opacity: 0.6;">Unido ✔</p>`
            } else {
                html += `<p class='btn_unete' id='btn_unete_${uid}' onclick="fUnirUsuario('${uid}')">Únete</p>`
            }
            html += "</div>"
            html += "</div>"
        });

        html += `<div id="div_agregar_grupo" onclick="fOcultarTodo('modal_formularios'); fOcultarForms('div_modal_agregar');">`
        html += `<img src="assets/imagenes/mas.png" alt="Agregar" title="Añadir grupo">`
        html += `</div>`
        html += `<div id="div_atras_grupo" onclick="fOcultarTodo('modal_home')">`
        html += `<img src="assets/imagenes/atras.png" alt="Atrás" title="Atrás">`
        html += `</div>`

        document.querySelector("#modal_grupos").innerHTML = html;

    } catch (error) {
        console.error("Error al obtener actividades:", error);
    }
}


window.fUnirUsuario = async function (grupoId) {
    const user = auth.currentUser;
    const userUid = user.uid;
    const userEmail = user.email;
    const actividadUID = sessionStorage.getItem("actividad_actual");

    const btn = document.getElementById(`btn_unete_${grupoId}`);
    if (btn) {
        btn.innerText = "Unido ✔";
        btn.style.pointerEvents = "none";
        btn.style.opacity = "0.6";
    }

    try {
        await addDoc(collection(firestore, "usuarios_grupos"), {
            uid_grupo: grupoId,
            uid_usuario: userUid,
        });

        const grupoRef = doc(firestore, "grupos", grupoId);
        const grupoSnap = await getDoc(grupoRef);
        const grupo = grupoSnap.data();

        const txtZona = grupo.zona;
        const txtFecha = grupo.fecha;
        const txtHora = grupo.horario;
        const txtUbicacion = grupo.ubicacion;
        const uidCreador = grupo.uid_creador;

        const actividadRef = doc(firestore, "actividades", actividadUID);
        const actividadSnap = await getDoc(actividadRef);
        const nombreActividad = actividadSnap.data().nombre;

        const usuarioRef = doc(firestore, "usuarios", userUid);
        const usuarioSnap = await getDoc(usuarioRef);
        const nombreUsuario = usuarioSnap.data().username;

        const usuariosGrupoQuery = query(
            collection(firestore, "usuarios_grupos"),
            where("uid_grupo", "==", grupoId)
        );
        const usuariosGrupoSnap = await getDocs(usuariosGrupoQuery);
        const cantidad = usuariosGrupoSnap.size;

        const creadorRef = doc(firestore, "usuarios", uidCreador);
        const creadorSnap = await getDoc(creadorRef);
        const correoCreador = creadorSnap.data().email;
        console.log("correo: ", correoCreador)

        const asunto = "Bienvenido al grupo de " + nombreActividad;
        const mensaje = 
            "Hola!\n\nGracias por unirte al grupo de " + nombreActividad + ".\n\n" +
            "📍 Zona: " + txtZona + "\n📅 Fecha: " + txtFecha + "\n🕐 Hora: " + txtHora + "\n\n" +
            "Ubicación exacta: " + txtUbicacion + "\n\n" +
            "¡Te esperamos con ganas! 🎉";

        enviarCorreo(asunto, mensaje, userEmail);

        const asuntoCreador = "Nuevo participante en tu grupo de " + nombreActividad;
        const mensajeCreador = 
            "Hola!\n\nEl usuario " + nombreUsuario + " se ha unido a tu grupo de " + nombreActividad + ".\n\n" +
            "📍 Zona: " + txtZona + "\n📅 Fecha: " + txtFecha + "\n🕐 Hora: " + txtHora + "\n\n" +
            "💬 Ahora sois " + cantidad + " en el grupo." + "\n\n" +
            "¡Sigue creando comunidad en PlanMatch! 🚀";

        enviarCorreo(asuntoCreador, mensajeCreador, correoCreador);

    } catch (error) {
        alert("Ocurrió un error al intentar unirte al grupo.");

        if (btn) {
            btn.innerText = "Únete";
            btn.style.pointerEvents = "auto";
            btn.style.opacity = "1";
        }
    }
};


window.fAgregar = async function () {
    const user = auth.currentUser;
    const userUid = user.uid;

    const zona = document.querySelector("#input_agregar_zona").value;
    const hora = document.querySelector("#input_agregar_hora").value;
    const fecha = document.querySelector("#input_agregar_fecha").value;
    const ubicacion = document.querySelector("#input_agregar_ubicacion").value;
    const actividad = sessionStorage.getItem("actividad_actual");
    console.log("actividad en agregar:", actividad)

    addDoc(collection(firestore, "grupos"), {
        fecha: fecha,
        horario: hora,
        ubicacion: ubicacion,
        uid_actividad: actividad,
        uid_creador: userUid,
        zona: zona,
    });

    fGrupos(actividad)
}


window.fMisGrupos = async function () {
    fOcultarTodo('modal_mis_grupos');

    const user = auth.currentUser;
    const userUid = user.uid;
    let html = "";

    const coleccion = collection(firestore, "usuarios_grupos");
    const consulta = query(coleccion, where("uid_usuario", "==", userUid));

    const snapshot = await getDocs(consulta);
    const uidGrupo = snapshot.docs.map(doc => doc.data().uid_grupo);

    if (uidGrupo.length > 0) {
        const coleccionGrupos = collection(firestore, "grupos");
        const consultaGrupos = query(coleccionGrupos, where(documentId(), "in", uidGrupo));

        const snapshotGrupos = await getDocs(consultaGrupos);
        snapshotGrupos.forEach(doc => {
            const grupo = doc.data();
            const uidG = doc.id;
            console.log("Grupo:", grupo.zona, grupo.fecha, grupo.horario, uidG);

            html += "<div class='div_grupo'>"
            html += `<div class='div_datos_grupo'>`
            html += `<p class='txt_zona'>${grupo.zona}</p>`
            html += `<p class='txt_dia'>${grupo.fecha}</p>`
            html += `<p class='txt_hora'>${grupo.horario}</p>`
            html += "</div>"
            html += "<div class='div_btn_grupo'>"
            html += `<p class='btn_salir' onclick="fSalirGrupo('${uidG}')">Salir</p>`
            html += "</div>"
            html += "</div>"
        });

    } else {

    }

    html += `<div id="div_atras_grupo" onclick="fOcultarTodo('modal_home')">`
    html += `<img src="assets/imagenes/atras.png" alt="Atrás" title="Atrás">`
    html += `</div>`

    document.querySelector("#modal_mis_grupos").innerHTML = html;

}

window.fPerfil = async function () {
    fOcultarTodo('modal_perfil');

    const user = auth.currentUser;
    const userUid = user.uid;

    try {
        const userRef = doc(firestore, "usuarios", userUid);
        const userSnap = await getDoc(userRef);

        const data = userSnap.data();

        let html = ""
        html += `<div id='contenedor_perfil'>`
        html += `<div id='imgs_perfil'>`
        html += `<div id='div_img1_perfil' onclick="fOcultarTodo('modal_home')">`
        html += `<img src="assets/imagenes/atras.png" alt="Imagen atrás">`
        html += `</div>`
        html += `<div id='div_img2_perfil'>`
        html += `<img src="assets/imagenes/perfil.png" alt="Imagen perfil">`
        html += `</div>`
        html += `<div id='div_img3_perfil' onclick="fModificarPerfil()">`
        html += `<img src="assets/imagenes/confirmar.png" alt="Imagen confirmar">`
        html += `</div>`
        html += `</div>`
        html += `<label for="input_perfil_user">Nombre de usuario*</label>`
        html += `<input type="text" id="input_perfil_user" placeholder="Ingrese su nuevo nombre de usuario" value='${data.username}'>`
        html += `<label for="input_perfil_correo">Correo electrónico*</label>`
        html += `<input type="text" id="input_perfil_correo" placeholder="Ingrese su nuevo correo electrónico" value='${data.email}'>`
        html += `</div>`
        html += "<div class='div_btn_cerrar'>"
        html += `<p class='btn_cerrar' onclick="fCerrarSesion()">Cerrar sesión</p>`
        html += "</div>"

        document.querySelector("#modal_perfil").innerHTML = html

    } catch (error) {
        console.error("Error al obtener el usuario:", error);
    }

}

window.fCerrarSesion = async function () {
    await signOut(auth);
    console.log("Sesión cerrada correctamente.");
    localStorage.removeItem("recordarSesion");
    fOcultarTodo('modal_formularios')
    fOcultarForms('div_modal_login')

    document.getElementById("input_login_email").value = "";
    document.getElementById("input_login_password").value = "";
}

window.fSalirGrupo = async function (grupoId) {
    const user = auth.currentUser;
    const userUid = user.uid;

    try {
        const consulta = query(
            collection(firestore, "usuarios_grupos"),
            where("uid_grupo", "==", grupoId),
            where("uid_usuario", "==", userUid)
        );

        const snapshot = await getDocs(consulta);
        snapshot.forEach(async (doc) => {
            await deleteDoc(doc.ref);
        });

        const btn = document.getElementById(`btn_unete_${grupoId}`);
        if (btn) {
            btn.innerText = "Únete";
            btn.style.pointerEvents = "auto";
            btn.style.opacity = "1";
        }

        const grupoRef = doc(firestore, "grupos", grupoId);
        const grupoSnap = await getDoc(grupoRef);
        if (!grupoSnap.exists()) {
            console.error("El grupo no existe");
            return;
        }

        const grupo = grupoSnap.data();
        const uidActividad = grupo.uid_actividad;
        const uidCreador = grupo.uid_creador;

        const actividadRef = doc(firestore, "actividades", uidActividad);
        const actividadSnap = await getDoc(actividadRef);
        const nombreActividad = actividadSnap.data().nombre;

        const miembrosQuery = query(collection(firestore, "usuarios_grupos"), where("uid_grupo", "==", grupoId));
        const miembrosSnap = await getDocs(miembrosQuery);
        const cantidad = miembrosSnap.size;

        const creadorRef = doc(firestore, "usuarios", uidCreador);
        const creadorSnap = await getDoc(creadorRef);
        const correoCreador = creadorSnap.data().email;

        const asunto = "Un participante ha salido de tu grupo de " + nombreActividad;
        const mensaje =
            "Hola,\n\nUn participante ha salido de tu grupo de " + nombreActividad + ".\n\n" +
            "💬 Ahora sois " + cantidad + " en el grupo.\n\n" +
            "Te animamos a seguir promoviendo tu grupo 💪\n\n" +
            "¡Gracias por seguir usando PlanMatch! ✨";

        enviarCorreo(asunto, mensaje, correoCreador);

        await fMisGrupos();

    } catch (error) {
        console.error("Error al salir del grupo ", error);
    }
};


// Debido a las reglas de seguridad de Firebase, esta función solo modifica en Firestore
window.fModificarPerfil = async function () {
    const user = auth.currentUser;
    const userUid = user.uid;

    const newUsername = document.getElementById("input_perfil_user").value;
    const newEmail = document.getElementById("input_perfil_correo").value;

    try {
        const usuarioRef = doc(firestore, "usuarios", userUid);
        await updateDoc(usuarioRef, { username: newUsername, email: newEmail });

        fOcultarTodo('modal_formularios')
        fOcultarForms('div_modal_login')

        alert("Perfil actualizado, requiere del antiguo correo electrónico para iniciar sesión hasta que el nuevo sea verificado.");

    } catch (error) {
        console.error("Error al actualizar perfil:", error);
    }
}

window.fCargarGrupo = async function () {

    const grupoId = sessionStorage.getItem("grupo_actual");

    try {
        const grupoRef = doc(firestore, "grupos", grupoId);
        const grupoSnap = await getDoc(grupoRef);

        const grupo = grupoSnap.data();

        console.log("Grupo: ", grupo.zona, grupo.fecha, grupo.horario, grupo.ubicacion)

        document.getElementById("input_modificar_zona").value = grupo.zona;
        document.getElementById("input_modificar_fecha").value = grupo.fecha;
        document.getElementById("input_modificar_hora").value = grupo.horario;
        document.getElementById("input_modificar_ubicacion").value = grupo.ubicacion;

    } catch (error) {
        console.error("Error al obtener el grupo:", error);
    }
}

window.fModificarGrupo = async function () {
    const grupoId = sessionStorage.getItem("grupo_actual");

    const nuevaZona = document.getElementById("input_modificar_zona").value.trim();
    const nuevaFechaRaw = document.getElementById("input_modificar_fecha").value;
    const nuevaHora = document.getElementById("input_modificar_hora").value.trim();
    const nuevaUbicacion = document.getElementById("input_modificar_ubicacion").value.trim();

    const partesFecha = nuevaFechaRaw.split("-");
    const nuevaFechaFormateada = `${partesFecha[2]}/${partesFecha[1]}/${partesFecha[0]}`;

    try {
        const grupoRef = doc(firestore, "grupos", grupoId);
        await updateDoc(grupoRef, {
            zona: nuevaZona,
            fecha: nuevaFechaFormateada,
            horario: nuevaHora,
            ubicacion: nuevaUbicacion
        });

        const participantesQuery = query(
            collection(firestore, "usuarios_grupos"),
            where("uid_grupo", "==", grupoId)
        );
        const participantesSnap = await getDocs(participantesQuery);

        for (const docu of participantesSnap.docs) {
            const uidUsuario = docu.data().uid_usuario;

            const usuarioRef = doc(firestore, "usuarios", uidUsuario);
            const usuarioSnap = await getDoc(usuarioRef);

            if (!usuarioSnap.exists()) continue;

            const correoUsuario = usuarioSnap.data().email;

            const asunto = "Grupo actualizado";
            const mensaje =
                "Hola!\n\nEl grupo ha sido actualizado:\n\n" +
                "📍 Zona: " + nuevaZona + "\n📅 Día: " + nuevaFechaFormateada + "\n🕐 Hora: " + nuevaHora + "\n\n" +
                "Ubicación exacta: " + nuevaUbicacion + "\n\n" +
                "¡Nos vemos pronto!";

            enviarCorreo(asunto, mensaje, correoUsuario);
        }

        await fGrupos(sessionStorage.getItem("actividad_actual"));
        fOcultarTodo('modal_grupos');

    } catch (error) {
        console.error("Error al actualizar el grupo:", error);
    }
};



window.fBorrarGrupo = async function () {
    const grupoId = sessionStorage.getItem("grupo_actual");

    const confirmacion = confirm("¿Seguro que quieres borrar el grupo?");

    if (!confirmacion) return;

    try {
        // 1. Obtener los participantes antes de eliminar el grupo
        const participantesQuery = query(
            collection(firestore, "usuarios_grupos"),
            where("uid_grupo", "==", grupoId)
        );
        const participantesSnap = await getDocs(participantesQuery);

        // 2. Enviar correo a cada participante
        for (const docu of participantesSnap.docs) {
            const uidUsuario = docu.data().uid_usuario;

            const usuarioRef = doc(firestore, "usuarios", uidUsuario);
            const usuarioSnap = await getDoc(usuarioRef);

            if (!usuarioSnap.exists()) continue;

            const correoUsuario = usuarioSnap.data().email;

            const asunto = "Grupo cancelado";
            const mensaje =
                "Hola!\n\nEl grupo al que te habías unido ha sido cancelado. 😢\n\n" +
                "Gracias por participar en PlanMatch. ¡Esperamos verte pronto en nuevos grupos!";

            enviarCorreo(asunto, mensaje, correoUsuario);
        }

        // 3. Eliminar las entradas en usuarios_grupos
        for (const docu of participantesSnap.docs) {
            await deleteDoc(docu.ref);
        }

        // 4. Eliminar el grupo
        await deleteDoc(doc(firestore, "grupos", grupoId));

        // 5. Refrescar vista
        await fGrupos(sessionStorage.getItem("actividad_actual"));
        fOcultarTodo('modal_grupos');

    } catch (error) {
        console.error("Error al borrar el grupo:", error);
    }
};


window.enviarCorreo = async function (asunto, mensaje, destinatario) {
    const params = {
        destinatario: destinatario,
        asunto: asunto,
        mensaje: mensaje
    }
    const serviceID = "service_xk6khkj";
    const templateID = "template_76vu8qm";

    emailjs.send(serviceID, templateID, params)
        .then((res) => {
            console.log("Correo enviado correctamente ", res.status);
        })
        .catch((err) => {
            console.error("Error al enviar el correo ", err);
        });
}

window.fVerPasswordLogin = function () {
    let password = document.querySelector("#input_login_password");
    let imagen = document.querySelector("#login_imagen_ojo");

    if (password.type === "text") {
        password.type = "password"
        imagen.src = "assets/imagenes/ojo_cerrado.png"
        
    } else {
        password.type = "text"
        imagen.src = "assets/imagenes/ojo_abierto.png"
    }
}

window.fVerPasswordRegistro = function () {
    let password = document.querySelector("#input_reg_password");
    let imagen = document.querySelector("#registro_imagen_ojo");

    if (password.type === "text") {
        password.type = "password"
        imagen.src = "assets/imagenes/ojo_cerrado.png"
        
    } else {
        password.type = "text"
        imagen.src = "assets/imagenes/ojo_abierto.png"
    }
}

window.fVerPasswordReRegistro = function () {
    let password = document.querySelector("#input_reg_re_password");
    let imagen = document.querySelector("#registro_reg_imagen_ojo");

    if (password.type === "text") {
        password.type = "password"
        imagen.src = "assets/imagenes/ojo_cerrado.png"
        
    } else {
        password.type = "text"
        imagen.src = "assets/imagenes/ojo_abierto.png"
    }
}